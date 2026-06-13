import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, ECharts } from 'echarts'
import type { CustomerStage } from '../types/customer'

interface CustomerMarker {
  name: string
  companyName: string
  address: string
  city?: string
  stage: CustomerStage
  value: [number, number]
  id: string
}

interface CustomerMapProps {
  customers: CustomerMarker[]
  selectedStage: CustomerStage | null
  onMarkerClick?: (customer: CustomerMarker) => void
}

// 阶段颜色（与客户卡片颜色一致）
const STAGE_COLORS: Record<CustomerStage, string> = {
  '线索跟踪': '#9CA3AF',
  '送样完成': '#84CC16',
  '内部准备': '#F59E0B',
  '客户评估': '#8B5CF6',
  '投标竞争': '#3B82F6',
  '客户下单': '#10B981'
}

export default function CustomerMap({ customers, selectedStage, onMarkerClick }: CustomerMapProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<ECharts | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [mapData, setMapData] = useState<any>(null)

  // 过滤客户（根据选中阶段）
  const filteredCustomers = selectedStage
    ? customers.filter(c => c.stage === selectedStage)
    : customers

  // 加载地图数据
  useEffect(() => {
    fetch('/maps/china.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load map')
        return res.json()
      })
      .then(data => {
        setMapData(data)
        echarts.registerMap('china', data)
        setMapLoaded(true)
        setLoadError(false)
      })
      .catch(err => {
        console.error('Map load error:', err)
        setLoadError(true)
      })
  }, [])

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current)

    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
      chartInstance.current = null
    }
  }, [])

  // 更新图表
  useEffect(() => {
    if (!chartInstance.current) return

    const updateChart = () => {
      if (!chartInstance.current) return

      // 如果有经纬度数据且地图已加载，使用散点图
      if (mapLoaded && mapData && customers.length > 0 && customers.some(c => c.value)) {
        const scatterData = filteredCustomers
          .filter(c => c.value && c.value[0] && c.value[1])
          .map(c => ({
            name: c.name,
            value: c.value,
            stage: c.stage,
            companyName: c.companyName,
            address: c.address || c.city || '无地址',
            id: c.id
          }))

        const option: EChartsOption = {
          tooltip: {
            trigger: 'item',
            formatter: (params: any) => {
              const data = params.data as CustomerMarker | undefined
              if (!data) return ''
              const stageColor = STAGE_COLORS[data.stage as CustomerStage] || '#666'
              return `
                <div style="padding: 8px; min-width: 150px;">
                  <div style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">${data.companyName}</div>
                  <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📍 ${data.address || '无地址'}</div>
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${stageColor}20; color: ${stageColor}; font-size: 12px;">
                    ${data.stage}
                  </span>
                </div>
              `
            }
          },
          geo: {
            map: 'china',
            roam: true,
            zoom: 1.2,
            center: [105, 36],
            scaleLimit: { min: 1, max: 6 },
            itemStyle: {
              areaColor: '#E8F4E8',
              borderColor: '#B8D4B8',
              borderWidth: 1
            },
            emphasis: {
              itemStyle: {
                areaColor: '#D0EED0'
              },
              label: {
                show: false
              }
            },
            label: { show: false }
          },
          series: [{
            type: 'scatter',
            coordinateSystem: 'geo',
            data: scatterData,
            symbolSize: 16,
            itemStyle: {
              color: (params: any) => {
                const stage = params.data?.stage as CustomerStage
                return STAGE_COLORS[stage] || '#666'
              },
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.3)'
            },
            emphasis: {
              scale: 1.5
            }
          }]
        }

        chartInstance.current!.setOption(option, true)
      }
      // 如果没有经纬度数据，显示省份统计柱状图
      else if (loadError || !mapLoaded) {
        // 统计各城市/省份客户数量
        const cityStats: Record<string, { count: number; stage: CustomerStage }> = {}
        filteredCustomers.forEach(c => {
          const city = c.city || '未知'
          if (!cityStats[city]) {
            cityStats[city] = { count: 0, stage: c.stage }
          }
          cityStats[city].count++
        })

        const sortedCities = Object.entries(cityStats)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 15)

        const option: EChartsOption = {
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: sortedCities.map(([city]) => city),
            axisLabel: { rotate: 45, fontSize: 10 }
          },
          yAxis: { type: 'value', minInterval: 1 },
          series: [{
            type: 'bar',
            data: sortedCities.map(([, data]) => ({
              value: data.count,
              itemStyle: { color: STAGE_COLORS[data.stage] }
            })),
            barWidth: '50%'
          }]
        }

        chartInstance.current!.setOption(option, true)
      }
    }

    updateChart()
  }, [filteredCustomers, mapLoaded, mapData, loadError, customers])

  // 点击事件
  useEffect(() => {
    if (!chartInstance.current) return

    const handleClick = (params: any) => {
      if (params.componentType === 'series' && params.data && onMarkerClick) {
        onMarkerClick(params.data as CustomerMarker)
      }
    }

    chartInstance.current.on('click', handleClick)
    return () => {
      chartInstance.current?.off('click', handleClick)
    }
  }, [onMarkerClick])

  // 渲染
  if (loadError && customers.length > 0) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center text-gray-500 p-4">
          <p className="text-lg mb-2">地图加载失败</p>
          <p className="text-sm text-gray-400">显示城市统计柱状图</p>
        </div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">暂无客户位置数据</p>
          <p className="text-sm">请先在客户管理中添加地址信息</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={chartRef} className="w-full h-full" />
      {!mapLoaded && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-2">加载地图中...</p>
          </div>
        </div>
      )}
    </div>
  )
}