import { useState, useEffect } from 'react'
import { useScheduleStore, type ScheduleType } from '../stores/scheduleStore'
import { useCustomerStore } from '../stores/customerStore'

function SchedulesPage() {
  const { schedules, loadSchedules, addSchedule, updateSchedule, deleteSchedule } = useScheduleStore()
  const { customers, loadCustomers } = useCustomerStore()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingSchedule, setViewingSchedule] = useState<typeof schedules[0] | null>(null)
  const [viewMode, setViewMode] = useState<'day' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    task: '',
    location: '',
    contactPerson: '',
    notes: '',
    type: '工作' as ScheduleType,
    customerId: ''
  })

  useEffect(() => {
    loadSchedules()
    loadCustomers()
  }, [])

  // 搜索过滤
  const filteredSchedules = schedules.filter(s => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.task.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q) ||
      s.contactPerson?.toLowerCase().includes(q) ||
      s.notes?.toLowerCase().includes(q) ||
      s.date.includes(q)
    )
  })

  // 按日期分组
  const groupedByDate = filteredSchedules.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {} as Record<string, typeof schedules>)

  //排序后的日期列表
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  const filteredByDate = filteredSchedules.filter(s => s.date === selectedDate)

  const resetForm = () => {
    setFormData({
      date: selectedDate,
      time: '09:00',
      task: '',
      location: '',
      contactPerson: '',
      notes: '',
      type: '工作',
      customerId: ''
    })
    setEditingId(null)
  }

  const handleOpenModal = (isEdit = false, schedule?: typeof schedules[0]) => {
    if (isEdit && schedule) {
      setEditingId(schedule.id)
      setFormData({
        date: schedule.date,
        time: schedule.time,
        task: schedule.task,
        location: schedule.location || '',
        contactPerson: schedule.contactPerson || '',
        notes: schedule.notes || '',
        type: schedule.type,
        customerId: schedule.customerId || ''
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.task.trim()) {
      alert('请输入任务内容')
      return
    }

    if (editingId) {
      updateSchedule(editingId, formData)
    } else {
      addSchedule(formData)
    }
    handleCloseModal()
  }

  const handleCustomerSelect = (customerId: string) => {
    setFormData(prev => ({ ...prev, customerId }))
    if (customerId) {
      const customer = customers.find(c => c.id === customerId)
      if (customer) {
        setFormData(prev => ({
          ...prev,
          customerId,
          location: customer.address || prev.location,
          contactPerson: customer.contactPerson || prev.contactPerson,
          type: '客户拜访'
        }))
      }
    }
  }

  const getTypeColor = (type: ScheduleType) => {
    switch (type) {
      case '客户拜访': return 'bg-blue-100 text-blue-800'
      case '交通': return 'bg-green-100 text-green-800'
      case '餐饮': return 'bg-yellow-100 text-yellow-800'
      case '住宿': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (dateStr === today.toISOString().split('T')[0]) return '今天'
    if (dateStr === tomorrow.toISOString().split('T')[0]) return '明天'

    return `${date.getMonth() + 1}月${date.getDate()}日 ${['周日','周一','周二','周三','周四','周五','周六'][date.getDay()]}`
  }

  const ScheduleCard = ({ schedule, onClick }: { schedule: typeof schedules[0]; onClick?: () => void }) => (
    <div
      className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold">{schedule.time}</span>
            <span className={`px-2 py-0.5 text-xs rounded ${getTypeColor(schedule.type)}`}>
              {schedule.type}
            </span>
          </div>
          <h3 className="font-medium text-lg">{schedule.task}</h3>
          {schedule.location && (
            <p className="text-gray-600 text-sm mt-1">📍 {schedule.location}</p>
          )}
          {schedule.contactPerson && (
            <p className="text-gray-600 text-sm">👤 {schedule.contactPerson}</p>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold">日程管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            + 添加日程
          </button>
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索日程（任务、地点、联系人、日期）..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>

      {/* 视图切换 + 日期选择 */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex rounded border overflow-hidden">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'day' ? 'bg-blue-500 text-white' : 'bg-white'}`}
          >
            当日视图
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white'}`}
          >
           全部日程
          </button>
        </div>

        {viewMode === 'day' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-1.5"
            />
            <span className="text-gray-500 text-sm">
              {filteredByDate.length} 条日程
            </span>
          </div>
        )}

        {viewMode === 'list' && (
          <span className="text-gray-500 text-sm">
            共 {filteredSchedules.length} 条日程
          </span>
        )}
      </div>

      {/* 当日视图 */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          {filteredByDate.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">当日无日程安排</p>
              <button
                onClick={() => handleOpenModal()}
                className="text-blue-500"
              >
                + 添加新日程
              </button>
            </div>
          ) : (
            filteredByDate
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  onClick={() => setViewingSchedule(schedule)}
                />
              ))
          )}
        </div>
      )}

      {/* 全部日程列表视图 */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {searchQuery && (
            <p className="text-sm text-gray-500">
              搜索 "{searchQuery}" 找到 {filteredSchedules.length} 条结果
            </p>
          )}

          {sortedDates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>暂无日程数据</p>
             <button
                onClick={() => handleOpenModal()}
                className="text-blue-500 mt-2"
              >
                + 添加第一条日程
              </button>
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date}>
                <h3 className="font-bold text-lg mb-2 sticky top-0 bg-gray-50 py-2 z-10">
                  {formatDate(date)} ({groupedByDate[date].length} 条)
                </h3>
                <div className="space-y-2">
                  {groupedByDate[date]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((schedule) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        onClick={() => setViewingSchedule(schedule)}
                      />
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 日程详情弹窗 */}
      {viewingSchedule && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingSchedule(null)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">日程详情</h2>
              <button
                onClick={() => setViewingSchedule(null)}
                className="text-gray-500 text-xl px-2"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xl">{viewingSchedule.time}</span>
                <span className={`px-2 py-1 text-sm rounded ${getTypeColor(viewingSchedule.type)}`}>
                  {viewingSchedule.type}
                </span>
              </div>
              <div>
                <label className="text-sm text-gray-500">日期</label>
                <p className="text-lg">{viewingSchedule.date}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">任务</label>
                <p className="text-lg font-medium">{viewingSchedule.task}</p>
              </div>
              {viewingSchedule.location && (
                <div>
                  <label className="text-sm text-gray-500">地点</label>
                  <p className="text-lg">📍 {viewingSchedule.location}</p>
                </div>
              )}
              {viewingSchedule.contactPerson && (
                <div>
                  <label className="text-sm text-gray-500">联系人</label>
                  <p className="text-lg">👤 {viewingSchedule.contactPerson}</p>
                </div>
              )}
              {viewingSchedule.notes && (
                <div>
                  <label className="text-sm text-gray-500">备注</label>
                  <p className="bg-gray-50 rounded p-3 whitespace-pre-wrap">{viewingSchedule.notes}</p>
                </div>
              )}
              <div className="text-xs text-gray-400 pt-2">
                更新时间：{new Date(viewingSchedule.updateTime).toLocaleString('zh-CN')}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setViewingSchedule(null)
                  handleOpenModal(true, viewingSchedule)
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                编辑
              </button>
              <button
                onClick={() => {
                  if (confirm('确定要删除这个日程吗？')) {
                    deleteSchedule(viewingSchedule.id)
                    setViewingSchedule(null)
                  }
                }}
                className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑日程弹窗 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">
              {editingId ? '编辑日程' : '添加日程'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">日期 *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">时间 *</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">日程类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ScheduleType })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="客户拜访">客户拜访</option>
                    <option value="交通">交通</option>
                    <option value="餐饮">餐饮</option>
                    <option value="住宿">住宿</option>
                    <option value="工作">工作</option>
                  </select>
                </div>

                {formData.type === '客户拜访' && customers.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">关联客户</label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">选择客户（可选）</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.shortName} - {c.companyName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-600 mb-1">任务内容 *</label>
                  <input
                    type="text"
                    value={formData.task}
                    onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                    placeholder="例：拜访XX公司"
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">地点</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="例：广州市天河区XX路XX号"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">联系人</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="联系人姓名"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">备注</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="其他备注信息"
                    rows={3}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingId ? '保存修改' : '添加日程'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SchedulesPage