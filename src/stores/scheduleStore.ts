import { create } from 'zustand'

export type ScheduleType = '客户拜访' | '交通' | '餐饮' | '住宿' | '工作'

export interface ScheduleItem {
  id: string
  date: string
  time: string
  task: string
  location?: string
  contactPerson?: string
  notes?: string
  type: ScheduleType
  customerId?: string
  updateTime: string
}

interface ScheduleState {
  schedules: ScheduleItem[]
  addSchedule: (schedule: Omit<ScheduleItem, 'id' | 'updateTime'>) => void
  updateSchedule: (id: string, data: Partial<ScheduleItem>) => void
  deleteSchedule: (id: string) => void
  loadSchedules: () => void
}

const STORAGE_KEY = 'schedules'

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],

  loadSchedules: () => {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      set({ schedules: JSON.parse(data) })
    }
  },

  addSchedule: (schedule) => {
    const newItem: ScheduleItem = {
      ...schedule,
      id: Date.now().toString(),
      updateTime: new Date().toISOString()
    }
    const schedules = [...get().schedules, newItem]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
    set({ schedules })
  },

  updateSchedule: (id, data) => {
    const schedules = get().schedules.map(s =>
      s.id === id ? { ...s, ...data, updateTime: new Date().toISOString() } : s
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
    set({ schedules })
  },

  deleteSchedule: (id) => {
    const schedules = get().schedules.filter(s => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
    set({ schedules })
  }
}))