// Calendar 2.0 Service Worker
// PWA 离线缓存与后台同步

const CACHE_NAME = 'calendar-2-0-v1'
const STATIC_CACHE_NAME = 'calendar-static-v1'
const DATA_CACHE_NAME = 'calendar-data-v1'

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
]

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('calendar-') &&
              name !== STATIC_CACHE_NAME &&
              name !== DATA_CACHE_NAME
          })
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// 请求拦截 - 网络优先，缓存备选
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API 请求 - 网络优先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DATA_CACHE_NAME))
    return
  }

  // 静态资源 - 缓存优先
  if (request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME))
    return
  }

  // HTML 页面 - 网络优先
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE_NAME))
    return
  }

  // 默认 - 缓存优先
  event.respondWith(cacheFirst(request, CACHE_NAME))
})

// 网络优先策略
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    // 返回离线页面
    return caches.match('/offline.html')
  }
}

// 缓存优先策略
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    // 后台更新缓存
    fetch(request).then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, response)
        })
      }
    }).catch(() => {})
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    // 返回默认占位图
    if (request.destination === 'image') {
      return caches.match('/icon-192.png')
    }
    throw error
  }
}

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData())
  }
})

// 同步数据
async function syncData() {
  // 获取待同步的数据
  const db = await openDB()
  const tx = db.transaction('pending-sync', 'readonly')
  const store = tx.objectStore('pending-sync')
  const pendingItems = await getAllFromStore(store)

  // 同步到服务器
  for (const item of pendingItems) {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })

      // 同步成功后删除
      const deleteTx = db.transaction('pending-sync', 'readwrite')
      deleteTx.objectStore('pending-sync').delete(item.id)
    } catch (error) {
      console.error('Sync failed for item:', item.id, error)
    }
  }
}

// 推送通知
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body || '您有新的日程提醒',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'view', title: '查看' },
      { action: 'dismiss', title: '忽略' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Calendar 2.0', options)
  )
})

// 通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 如果已有窗口，打开它
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus()
          }
        }
        // 否则打开新窗口
        return clients.openWindow(event.notification.data.url || '/')
      })
  )
})

// IndexedDB 辅助函数
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CalendarSyncDB', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('pending-sync')) {
        db.createObjectStore('pending-sync', { keyPath: 'id' })
      }
    }
  })
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
