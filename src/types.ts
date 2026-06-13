// 用户
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'manager' | 'member' | 'viewer'
  department?: string
  createdAt: string
}

// 客户管理 (与数据库 schema 保持一致)
export interface Customer {
  id: string
  companyName: string
  city: string
  address: string
  contactPerson: string
  phone: string
  notes: string
  updateTime: string
}

// 客户表单数据
export interface CustomerFormData {
  companyName: string
  city: string
  address: string
  contactPerson: string
  phone: string
  notes: string
}

// 同步结果
export interface SyncResult {
  added: number
  updated: number
  skipped: number
  errors: string[]
}

// 客户地址
export interface CustomerAddress {
  id: string
  customerId: string
  type: 'office' | 'factory' | 'warehouse' | 'shop'
  name: string
  address: string
  contacts?: string[]
  phone?: string[]
}

// 日程类型
export type ScheduleType = '客户拜访' | '交通' | '餐饮' | '住宿' | '工作'

// 日程项（简化版，适合出差行程）
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

// 行程项
export interface ItineraryItem {
  date: string
  time: string
  task: string
  location: string
  contactPerson: string
  type: 'client_visit' | 'transport' | 'meal' | 'accommodation' | 'work_session' | 'break'
}

// 行程计划
export interface ItineraryPlan {
  id: string
  name: string
  teams: string[]
  dates: string[]
  items: ItineraryItem[]
  totalTravelTime: number
  estimatedCost: number
  constraintWarnings?: string[]
  createdAt: string
  updatedAt: string
}

// 日程统计
export interface ScheduleStatistics {
  totalSchedules: number
  completed: number
  pending: number
  cancelled: number
  inProgress: number
  byType: Record<ScheduleType, number>
  byDate: Record<string, number>
}

// 天气信息
export interface WeatherInfo {
  city: string
  date: string
  temperature: number
  weatherCode: number
  description: string
  humidity: number
  windSpeed: number
  windDirection: string
  suggestions?: string[]
}

// 交通信息
export interface TrafficInfo {
  startLocation: string
  endLocation: string
  distance: number
  duration: number
  trafficStatus: 'clear' | 'moderate' | 'heavy' | 'congested'
  currentSpeed: number
  eta?: string
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface AIGeneratedSchedule {
  date: string
  time: string
  task: string
  location: string
  contactPerson: string
  type: ScheduleType
}

// 日程模板
export interface ScheduleTemplate {
  id: string
  name: string
  description: string
  items: TemplateItem[]
  createTime: string
  updateTime?: string
}

export interface TemplateItem {
  time: string
  task: string
  location: string
  contactPerson: string
  notes: string
  type: string
}

// 日程历史
export interface ScheduleHistory {
  id: string
  name: string
  dateRange: {
    start: string
    end: string
  }
  items: ScheduleItem[]
  createTime: string
}
