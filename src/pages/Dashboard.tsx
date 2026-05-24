import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCustomerStore } from '../stores/customerStore'
import { useScheduleStore } from '../stores/scheduleStore'

export default function Dashboard() {
  const customerStore = useCustomerStore()
  const scheduleStore = useScheduleStore()

  useEffect(() => {
    customerStore.loadCustomers()
  }, [])

  const stats = [
    { title: '客户总数', value: customerStore.customers.length },
    { title: '日程总数', value: scheduleStore.schedules.length },
    { title: '本周日程', value: scheduleStore.schedules.filter(s => {
      const today = new Date()
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1))
      const weekEnd = new Date(weekStart.setDate(weekStart.getDate() + 6))
      const scheduleDate = new Date(s.date)
      return scheduleDate >= weekStart && scheduleDate <= weekEnd
    }).length }
  ]

  return (
    <div className="p-4">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('zh-CN')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.title} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="text-gray-500 text-sm mt-1">{stat.title}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-lg p-4 shadow-sm mb-8">
        <h2 className="font-bold text-lg mb-4">快捷操作</h2>
        <div className="grid grid-cols-3 gap-4">
          <Link
            to="/ai-generate"
            className="bg-blue-50 text-blue-600 p-4 rounded-lg text-center"
          >
            🤖 AI生成行程
          </Link>
          <Link
            to="/customers"
            className="bg-green-50 text-green-600 p-4 rounded-lg text-center"
          >
            👥 添加客户
          </Link>
          <Link
            to="/schedules"
            className="bg-purple-50 text-purple-600 p-4 rounded-lg text-center"
          >
            📅 查看日程
          </Link>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <h2 className="font-bold text-lg mb-4">今日日程</h2>
        <div className="space-y-2">
          {scheduleStore.schedules
            .filter(s => s.date === new Date().toISOString().split('T')[0])
            .map(s => (
              <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="font-medium">{s.time}</span>
                <span>{s.task}</span>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{s.type}</span>
              </div>
            ))}
          {scheduleStore.schedules.filter(s => s.date === new Date().toISOString().split('T')[0]).length === 0 && (
            <p className="text-gray-500 text-center py-4">今日无日程安排</p>
          )}
        </div>
      </div>
    </div>
  )
}