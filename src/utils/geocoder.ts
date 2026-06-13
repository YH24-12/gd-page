/**
 * 地理编码工具
 * 使用 Nominatim 免费 API 将地址转换为经纬度
 */

interface GeocodeResult {
  longitude: number
  latitude: number
}

// 缓存已编码的地址
const CACHE_KEY = 'geocode_cache'

function getCache(): Record<string, GeocodeResult> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function setCache(cache: Record<string, GeocodeResult>): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

/**
 * 地理编码单个地址
 * @param address 地址
 * @returns 经纬度或 null
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address) return null

  // 检查缓存
  const cache = getCache()
  const cacheKey = address.trim()
  if (cache[cacheKey]) {
    return cache[cacheKey]
  }

  try {
    // 使用 Nominatim API
    const query = encodeURIComponent(`${address}, China`)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CalendarApp/1.0'
      }
    })

    if (!response.ok) {
      console.warn('Geocoding failed:', response.status)
      return null
    }

    const results = await response.json()
    if (results && results.length > 0) {
      const result: GeocodeResult = {
        longitude: parseFloat(results[0].lon),
        latitude: parseFloat(results[0].lat)
      }

      // 缓存结果
      cache[cacheKey] = result
      setCache(cache)

      return result
    }

    return null
  } catch (error) {
    console.warn('Geocoding error:', error)
    return null
  }
}

/**
 * 从城市名称获取经纬度
 * @param city 城市名称
 * @returns 经纬度或 null
 */
export async function geocodeCity(city: string): Promise<GeocodeResult | null> {
  if (!city) return null

  // 检查缓存
  const cache = getCache()
  const cacheKey = `city:${city.trim()}`
  if (cache[cacheKey]) {
    return cache[cacheKey]
  }

  try {
    const query = encodeURIComponent(`${city}, China`)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&featuretype=city&featuretype=town`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CalendarApp/1.0'
      }
    })

    if (!response.ok) {
      return null
    }

    const results = await response.json()
    if (results && results.length > 0) {
      const result: GeocodeResult = {
        longitude: parseFloat(results[0].lon),
        latitude: parseFloat(results[0].lat)
      }

      cache[cacheKey] = result
      setCache(cache)

      return result
    }

    return null
  } catch (error) {
    console.warn('City geocoding error:', error)
    return null
  }
}

/**
 * 批量地理编码客户地址
 * @param customers 客户列表
 * @param onProgress 进度回调
 * @returns 更新后的客户列表
 */
export async function batchGeocode<T extends { address?: string; city?: string; longitude?: number; latitude?: number }>(
  customers: T[],
  onProgress?: (current: number, total: number) => void
): Promise<T[]> {
  const results: T[] = []
  const total = customers.length
  let current = 0

  for (const customer of customers) {
    current++

    // 如果已有经纬度，直接使用
    if (customer.longitude && customer.latitude) {
      results.push(customer)
      onProgress?.(current, total)
      continue
    }

    // 优先使用详细地址编码
    let geocodeResult: GeocodeResult | null = null
    if (customer.address) {
      geocodeResult = await geocodeAddress(customer.address)
    }

    // 如果地址没找到，尝试用城市编码
    if (!geocodeResult && customer.city) {
      geocodeResult = await geocodeCity(customer.city)
    }

    if (geocodeResult) {
      results.push({
        ...customer,
        longitude: geocodeResult.longitude,
        latitude: geocodeResult.latitude
      })
    } else {
      results.push(customer)
    }

    onProgress?.(current, total)

    // 批量请求间隔 1 秒避免限流
    if (current < total) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

/**
 * 清除地理编码缓存
 */
export function clearGeocodeCache(): void {
  localStorage.removeItem(CACHE_KEY)
}