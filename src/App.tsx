import { useState, useEffect, useCallback } from 'react'
import './App.css'

// 日程数据
const scheduleData = [
  { sheet_name: "5.25周一", date: "2025-05-25", time_segment: "10:00", task: "前往衢州机场", location: "衢州机场", contact: "携带身份证、名片、行李物品", city: "衢州", type: "交通" },
  { sheet_name: "5.25周一", date: "2025-05-25", time_segment: "", task: "值机，用餐，休息", location: "", contact: "讨论行程及下午拜访重点", city: "衢州", type: "餐饮" },
  { sheet_name: "5.25周一", date: "2025-05-25", time_segment: "13:00", task: "登机", location: "", contact: "", city: "衢州", type: "交通" },
  { sheet_name: "5.25周一", date: "2025-05-25", time_segment: "14:55", task: "抵达广州白云机场", location: "广州白云机场 T2", contact: "提取托运行李", city: "广州", type: "交通" },
  { sheet_name: "5.25周一", date: "2025-05-25", time_segment: "15:30", task: "神州租车取车，出发拜访", location: "2号航站楼 到达大厅一层T21R0商铺", contact: "检查车辆外观、油量、行驶证", city: "广州", type: "交通" },
  { sheet_name: "5.25周一", date: "2025-05-25", time_segment: "16:20", task: "拜访广州莱索", location: "广州市黄埔区沧海三路5号", contact: "距离白云机场53.9km，约47分钟", city: "广州", type: "客户拜访" },
  { sheet_name: "5.25周一", date: "2025-05-25", time_segment: "", task: "酒店办理入住", location: "广州市增城区新塘镇港口大道中128号亚朵X酒店", contact: "距离广州莱索约11.7km，约28min", city: "广州", type: "住宿" },
  { sheet_name: "5.25周一", date: "2025-05-25", time_segment: "", task: "晚餐", location: "", contact: "讨论次日拜访重点", city: "广州", type: "餐饮" },
  { sheet_name: "5.26周二", date: "2025-05-26", time_segment: "9:00", task: "出发拜访", location: "", contact: "", city: "广州", type: "交通" },
  { sheet_name: "5.26周二", date: "2025-05-26", time_segment: "10:00", task: "忍嘉有机硅拜访", location: "", contact: "距离广州增城亚朵酒店约63.6km，约1小时", city: "深圳", type: "客户拜访" },
  { sheet_name: "5.26周二", date: "2025-05-26", time_segment: "11:00", task: "出发", location: "深圳光明新区公明镇合水口第六工业园区旭发科技园10号", contact: "距离忍嘉约43.5km，约57min", city: "深圳", type: "交通" },
  { sheet_name: "5.26周二", date: "2025-05-26", time_segment: "", task: "午餐，休息", location: "", contact: "讨论下午拜访重点", city: "深圳", type: "餐饮" },
  { sheet_name: "5.26周二", date: "2025-05-26", time_segment: "13:00", task: "拜访深圳优宝", location: "深圳光明新区公明镇合水口第六工业园区旭发科技园10号", contact: "岳凤阳，老板", city: "深圳", type: "客户拜访" },
  { sheet_name: "5.26周二", date: "2025-05-26", time_segment: "14:00", task: "出发", location: "深圳三益", contact: "", city: "深圳", type: "交通" },
  { sheet_name: "5.26周二", date: "2025-05-26", time_segment: "15:00", task: "拜访深圳三益", location: "", contact: "", city: "深圳", type: "客户拜访" },
  { sheet_name: "5.26周二", date: "2025-05-26", time_segment: "", task: "出发", location: "中山市黄圃镇兴圃大道西61号铂顿国际公寓", contact: "距离深圳优宝约81.5km，约1h15min；高级大，234元左右", city: "中山", type: "交通" },
  { sheet_name: "5.26周二", date: "2025-05-26", time_segment: "", task: "晚餐", location: "", contact: "讨论次日拜访重点", city: "中山", type: "餐饮" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "8:20", task: "出发拜访", location: "黄圃镇新柳西路6号", contact: "距离酒店1.8km，6min；王文华。研发", city: "中山", type: "交通" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "9:20", task: "出发", location: "江门盈创", contact: "约1小时", city: "江门", type: "交通" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "10:20", task: "拜访江门盈创", location: "", contact: "", city: "江门", type: "客户拜访" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "", task: "午餐，休息", location: "", contact: "讨论下午拜访重点", city: "江门", type: "餐饮" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "13:00", task: "出发", location: "肇庆欧迪斯", contact: "约114km，1h20min", city: "肇庆", type: "交通" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "14:30", task: "拜访肇庆欧迪斯", location: "", contact: "", city: "肇庆", type: "客户拜访" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "15:30", task: "出发", location: "盈富工业区36号新安天玉", contact: "距离欧迪斯约62.6km，约48min", city: "广州", type: "交通" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "16:10", task: "拜访新安天玉", location: "", contact: "", city: "广州", type: "客户拜访" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "", task: "晚餐", location: "", contact: "", city: "广州", type: "餐饮" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "", task: "出发", location: "桔子酒店（广州天河奥体中心店）", contact: "距离新安天玉约85.2km，约1h10min", city: "广州", type: "交通" },
  { sheet_name: "5.27周三", date: "2025-05-27", time_segment: "", task: "讨论次日拜访重点", location: "", contact: "", city: "广州", type: "工作" },
  { sheet_name: "5.28周四", date: "2025-05-28", time_segment: "8:30", task: "出发拜访", location: "姬堂长庚西街560号202厂房广州采润", contact: "距离酒店约8.4km，约15分钟", city: "广州", type: "交通" },
  { sheet_name: "5.28周四", date: "2025-05-28", time_segment: "8:50", task: "拜访广州采润", location: "", contact: "", city: "广州", type: "客户拜访" },
  { sheet_name: "5.28周四", date: "2025-05-28", time_segment: "10:00", task: "出发拜访", location: "广州知易", contact: "", city: "广州", type: "交通" },
  { sheet_name: "5.28周四", date: "2025-05-28", time_segment: "10:30", task: "拜访广州知易", location: "", contact: "", city: "广州", type: "客户拜访" },
  { sheet_name: "5.28周四", date: "2025-05-28", time_segment: "", task: "午餐，休息", location: "", contact: "讨论下午拜访重点", city: "广州", type: "餐饮" },
  { sheet_name: "5.28周四", date: "2025-05-28", time_segment: "13:30", task: "出发", location: "何香凝工业区14幢厂房", contact: "", city: "广州", type: "交通" },
  { sheet_name: "5.28周四", date: "2025-05-28", time_segment: "14:30", task: "拜访广州友乐", location: "", contact: "", city: "广州", type: "客户拜访" },
  { sheet_name: "5.28周四", date: "2025-05-28", time_segment: "", task: "出发", location: "桔子酒店（广州白云国际机场店）", contact: "距离广州友乐约54.1km，约48min", city: "广州", type: "交通" },
  { sheet_name: "5.28周四", date: "2025-05-28", time_segment: "", task: "晚餐", location: "", contact: "复盘信息", city: "广州", type: "餐饮" },
  { sheet_name: "5.29周五", date: "2025-05-29", time_segment: "7:30", task: "出发", location: "广州白云机场", contact: "距离酒店约6.1km，约12分钟", city: "广州", type: "交通" },
  { sheet_name: "5.29周五", date: "2025-05-29", time_segment: "8:00", task: "还车", location: "T2号航站楼 P8地下停车场B1层K16", contact: "", city: "广州", type: "交通" },
  { sheet_name: "5.29周五", date: "2025-05-29", time_segment: "", task: "值机，休息", location: "", contact: "", city: "广州", type: "交通" },
  { sheet_name: "5.29周五", date: "2025-05-29", time_segment: "9:50", task: "登机", location: "", contact: "", city: "广州", type: "交通" },
  { sheet_name: "5.29周五", date: "2025-05-29", time_segment: "11:50", task: "到达衢州机场", location: "衢州机场", contact: "提取托运行李", city: "衢州", type: "交通" },
]

// 类型颜色映射
const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  "客户拜访": { bg: "bg-blue-100", border: "border-blue-500", text: "text-blue-800" },
  "交通": { bg: "bg-green-100", border: "border-green-500", text: "text-green-800" },
  "餐饮": { bg: "bg-yellow-100", border: "border-yellow-500", text: "text-yellow-800" },
  "住宿": { bg: "bg-purple-100", border: "border-purple-500", text: "text-purple-800" },
  "工作": { bg: "bg-gray-100", border: "border-gray-500", text: "text-gray-800" },
}

// 类型图标映射
const typeIcons: Record<string, string> = {
  "客户拜访": "👥",
  "交通": "🚗",
  "餐饮": "🍽️",
  "住宿": "🏨",
  "工作": "💼",
}

// 日期列表
const dateList = [
  { value: "2025-05-25", label: "5月25日 (周一)" },
  { value: "2025-05-26", label: "5月26日 (周二)" },
  { value: "2025-05-27", label: "5月27日 (周三)" },
  { value: "2025-05-28", label: "5月28日 (周四)" },
  { value: "2025-05-29", label: "5月29日 (周五)" },
]

// 城市列表
const cityList = ["全部城市", "衢州", "广州", "深圳", "中山", "江门", "肇庆"]

interface Task {
  sheet_name: string
  date: string
  time_segment: string
  task: string
  location: string
  contact: string
  city: string
  type: string
}

function App() {
  const [currentDate, setCurrentDate] = useState(() => {
    // 自动定位到当前日期
    const today = new Date().toISOString().split('T')[0]
    const validDates = ["2025-05-25", "2025-05-26", "2025-05-27", "2025-05-28", "2025-05-29"]
    return validDates.includes(today) ? today : "2025-05-25"
  })
  const [currentView, setCurrentView] = useState<"timeline" | "list">("timeline")
  const [currentCity, setCurrentCity] = useState("全部城市")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // 检查是否为小组件模式
  const isWidgetMode = new URLSearchParams(window.location.search).get('widget') === 'true'

  // 通知权限请求
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('您的浏览器不支持通知功能')
      return false
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true)
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
        return true
      }
    }

    alert('通知权限被拒绝，请在浏览器设置中开启')
    return false
  }, [])

  // 发送通知
  const sendNotification = useCallback((task: Task) => {
    if (Notification.permission === 'granted') {
      new Notification(`📅 日程提醒：${task.task}`, {
        body: `${task.time_segment} - ${task.location || task.city}`,
        icon: '/pwa-192x192.png',
        tag: task.task,
        requireInteraction: true,
      })
    }
  }, [])

  // 安排提醒
  const scheduleReminder = useCallback((task: Task) => {
    if (!task.time_segment) return

    const [hours, minutes] = task.time_segment.split(':').map(Number)
    const taskDate = new Date(task.date)
    taskDate.setHours(hours, minutes, 0, 0)

    // 提前15分钟提醒
    const reminderTime = new Date(taskDate.getTime() - 15 * 60 * 1000)
    const now = new Date()

    if (reminderTime > now) {
      const timeout = reminderTime.getTime() - now.getTime()
      console.log(`[提醒] ${task.task} - 将在 ${Math.round(timeout / 1000 / 60)} 分钟后提醒`)
      setTimeout(() => sendNotification(task), timeout)
    }
  }, [sendNotification])

  // 初始化提醒
  useEffect(() => {
    if (notificationsEnabled) {
      scheduleData.forEach(task => {
        if (task.date >= new Date().toISOString().split('T')[0]) {
          scheduleReminder(task)
        }
      })
    }
  }, [notificationsEnabled, scheduleReminder])

  // 过滤数据
  const filteredData = scheduleData.filter(task => {
    const dateMatch = task.date === currentDate
    const cityMatch = currentCity === "全部城市" || task.city === currentCity
    return dateMatch && cityMatch
  })

  // 打开地图导航
  const openNavigation = (task: Task) => {
    if (!task.location) return

    const encodedAddress = encodeURIComponent(task.location)
    const encodedTask = encodeURIComponent(task.task)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    // 高德地图 - 支持移动端原生调用
    const amapUrl = `https://uri.amap.com/navigation?to=0,0,${encodedAddress}&mode=car&coordinate=gaode&callnative=${isMobile ? '1' : '0'}`

    // 腾讯地图
    const tencentUrl = `https://apis.map.qq.com/uri/v1/marker?marker=coord:0,0;title:${encodedTask};addr:${encodedAddress}&referer=myapp`

    // 百度地图
    const baiduUrl = `https://api.map.baidu.com/geocoder?address=${encodedAddress}&output=html&src=webapp.baidu.openAPIdemo`

    // 移动端直接尝试高德导航
    if (isMobile) {
      window.location.href = amapUrl
    } else {
      // 桌面端显示选择菜单
      const choice = confirm('是否使用高德地图导航？\n取消则使用腾讯地图')
      window.open(choice ? amapUrl : tencentUrl, '_blank')
    }
  }

  // 定位当前时间
  const locateCurrentTime = () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    if (dateList.some(d => d.value === today)) {
      setCurrentDate(today)
      setCurrentCity("全部城市")
    }
  }

  // 启用通知
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    if (granted) {
      setShowReminderModal(true)
      setReminderTask(scheduleData[0])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📅 广东出差日程</h1>
            <p className="text-xs text-gray-500">5月25日 - 5月29日</p>
          </div>
          {!notificationsEnabled && (
            <button
              onClick={handleEnableNotifications}
              className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium nav-btn"
            >
              🔔 开启提醒
            </button>
          )}
          {notificationsEnabled && (
            <span className="text-green-600 text-sm">🔔 提醒已开启</span>
          )}
        </div>
      </header>

      {/* 日期切换 */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex px-2 py-2 gap-1 min-w-max">
          {dateList.map(date => (
            <button
              key={date.value}
              onClick={() => setCurrentDate(date.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors nav-btn ${
                currentDate === date.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {date.label}
            </button>
          ))}
        </div>
      </div>

      {/* 控制栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap gap-3 items-center">
        {/* 视图切换 */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setCurrentView("timeline")}
            className={`px-3 py-2 text-sm font-medium nav-btn ${
              currentView === "timeline" ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
            }`}
          >
            📌 时间轴
          </button>
          <button
            onClick={() => setCurrentView("list")}
            className={`px-3 py-2 text-sm font-medium nav-btn ${
              currentView === "list" ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
            }`}
          >
            📋 列表
          </button>
        </div>

        {/* 城市筛选 */}
        <select
          value={currentCity}
          onChange={(e) => setCurrentCity(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {cityList.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        {/* 定位按钮 */}
        <button
          onClick={locateCurrentTime}
          className="ml-auto bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium nav-btn flex items-center gap-1"
        >
          📍 今日
        </button>
      </div>

      {/* 日程内容 */}
      <div className="p-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">当日无日程安排</p>
          </div>
        ) : currentView === "timeline" ? (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {filteredData.map((task, index) => {
                const colors = typeColors[task.type] || typeColors["工作"]
                const icon = typeIcons[task.type] || "📌"

                return (
                  <div
                    key={index}
                    className="relative pl-12 fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div
                      className={`absolute left-0 w-8 h-8 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center text-sm`}
                    >
                      {icon}
                    </div>
                    <div
                      className={`task-card bg-white border-l-4 ${colors.border} rounded-lg shadow-sm p-3`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="text-sm font-bold text-gray-800 mb-1">
                        {task.time_segment || "待定"}
                      </div>
                      <h3 className="font-bold text-base text-gray-800 mb-1">{task.task}</h3>
                      {task.location && (
                        <p
                          className="text-sm text-blue-600 mb-1 flex items-center gap-1 map-nav-btn rounded px-2 py-1 -mx-2"
                          onClick={(e) => { e.stopPropagation(); openNavigation(task) }}
                        >
                          📍 {task.location}
                        </p>
                      )}
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors.bg} ${colors.text}`}>
                        {task.city}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-3 px-3 font-bold text-sm text-gray-700">时间</th>
                  <th className="text-left py-3 px-3 font-semibold text-sm text-gray-700">任务</th>
                  <th className="text-left py-3 px-3 font-semibold text-sm text-gray-700">城市</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((task, index) => {
                  const colors = typeColors[task.type] || typeColors["工作"]
                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                      <td className="py-3 px-3 font-bold text-sm">{task.time_segment || "待定"}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-sm">{task.task}</div>
                        {task.location && (
                          <div
                            className="text-xs text-blue-600 flex items-center gap-1 map-nav-btn w-fit rounded px-1 py-0.5 -mx-1"
                            onClick={(e) => { e.stopPropagation(); openNavigation(task) }}
                          >
                            📍 {task.location}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors.bg} ${colors.text}`}>
                          {task.city}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">{selectedTask.task}</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">🕐</span>
                <span className="font-medium">{selectedTask.time_segment || "待定时间"}</span>
                <span className="text-gray-400">•</span>
                <span>{selectedTask.sheet_name}</span>
              </div>

              {selectedTask.location && (
                <div
                  className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => openNavigation(selectedTask)}
                >
                  <span className="text-blue-500">📍</span>
                  <div>
                    <div className="font-medium text-blue-800">{selectedTask.location}</div>
                    <div className="text-xs text-blue-600 mt-1">点击打开导航 →</div>
                  </div>
                </div>
              )}

              {selectedTask.contact && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400">📝</span>
                  <span className="text-gray-600">{selectedTask.contact}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-gray-400">🏷️</span>
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                  typeColors[selectedTask.type]?.bg || 'bg-gray-100'
                } ${typeColors[selectedTask.type]?.text || 'text-gray-800'}`}>
                  {selectedTask.type}
                </span>
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                  typeColors[selectedTask.type]?.bg || 'bg-gray-100'
                } ${typeColors[selectedTask.type]?.text || 'text-gray-800'}`}>
                  {selectedTask.city}
                </span>
              </div>

              {/* 导航快捷按钮 */}
              {selectedTask.location && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">快捷导航</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        const url = `https://uri.amap.com/navigation?to=0,0,${encodeURIComponent(selectedTask.location)}&mode=car&callnative=1`
                        window.location.href = url
                      }}
                      className="py-2 px-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 nav-btn"
                    >
                      🗺️ 高德
                    </button>
                    <button
                      onClick={() => {
                        const url = `https://apis.map.qq.com/uri/v1/marker?marker=coord:0,0;title:${encodeURIComponent(selectedTask.task)};addr:${encodeURIComponent(selectedTask.location)}&referer=myapp`
                        window.open(url, '_blank')
                      }}
                      className="py-2 px-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 nav-btn"
                    >
                      🗺️ 腾讯
                    </button>
                    <button
                      onClick={() => {
                        const url = `https://api.map.baidu.com/geocoder?address=${encodeURIComponent(selectedTask.location)}&output=html&src=webapp.baidu.openAPIdemo`
                        window.open(url, '_blank')
                      }}
                      className="py-2 px-3 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 nav-btn"
                    >
                      🗺️ 百度
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
