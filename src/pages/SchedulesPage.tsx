import { useState } from 'react'
import { useScheduleStore } from '../stores/scheduleStore'

function SchedulesPage() {
  const { schedules } = useScheduleStore()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const filteredSchedules = schedules.filter(s => s.date === selectedDate)

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      <div className="space-y-3">
        {filteredSchedules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">当日无日程安排</p>
        ) : (
          filteredSchedules.map((schedule) => (
            <div key={schedule.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-lg">{schedule.time}</span>
                  <h3 className="font-medium">{schedule.task}</h3>
                  {schedule.location && (
                    <p className="text-gray-600 text-sm">📍 {schedule.location}</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  schedule.type === '客户拜访' ? 'bg-blue-100 text-blue-800' :
                  schedule.type === '交通' ? 'bg-green-100 text-green-800' :
                  schedule.type === '餐饮' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {schedule.type}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default SchedulesPage
