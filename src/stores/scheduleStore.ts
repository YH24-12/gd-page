import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ScheduleItem, ScheduleType } from '../types'

export type { ScheduleItem, ScheduleType }

export const useScheduleStore = defineStore('schedule', () => {
  const schedules = ref<ScheduleItem[]>([])

  const addSchedule = (schedule: Omit<ScheduleItem, 'id' | 'updateTime'>) => {
    const newSchedule: ScheduleItem = {
      ...schedule,
      id: Date.now().toString(),
      updateTime: new Date().toISOString()
    }
    schedules.value.push(newSchedule)
    saveToLocalStorage()
  }

  const updateSchedule = (id: string, data: Partial<ScheduleItem>) => {
    const index = schedules.value.findIndex(s => s.id === id)
    if (index !== -1) {
      schedules.value[index] = {
        ...schedules.value[index],
        ...data,
        updateTime: new Date().toISOString()
      }
      saveToLocalStorage()
    }
  }

  const deleteSchedule = (id: string) => {
    schedules.value = schedules.value.filter(s => s.id !== id)
    saveToLocalStorage()
  }

  const batchUpdate = (ids: string[], data: Partial<ScheduleItem>) => {
    ids.forEach(id => updateSchedule(id, data))
  }

  const batchDelete = (ids: string[]) => {
    schedules.value = schedules.value.filter(s => !ids.includes(s.id))
    saveToLocalStorage()
  }

  const copyToDate = (sourceDate: string, targetDate: string) => {
    const sourceSchedules = schedules.value.filter(s => s.date === sourceDate)
    sourceSchedules.forEach(s => {
      addSchedule({
        ...s,
        date: targetDate
      })
    })
  }

  const saveToLocalStorage = () => {
    localStorage.setItem('schedules', JSON.stringify(schedules.value))
  }

  const loadFromLocalStorage = () => {
    const data = localStorage.getItem('schedules')
    if (data) {
      schedules.value = JSON.parse(data)
    }
  }

  // 初始化时加载
  loadFromLocalStorage()

  return {
    schedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    batchUpdate,
    batchDelete,
    copyToDate
  }
})