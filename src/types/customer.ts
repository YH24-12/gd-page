// 客户阶段选项
export const CUSTOMER_STAGES = [
  '线索跟踪',
  '送样完成',
  '内部准备',
  '客户评估',
  '投标竞争',
  '客户下单'
] as const

export type CustomerStage = typeof CUSTOMER_STAGES[number]

export interface Customer {
  id: string
  companyName: string
  city: string
  address: string
  contactPerson: string
  phone: string
  stage: CustomerStage
  notes: string
  longitude?: number
  latitude?: number
  updateTime: string
}

export interface CustomerFormData {
  companyName: string
  city: string
  address: string
  contactPerson: string
  phone: string
  stage: CustomerStage
  notes: string
  longitude?: number
  latitude?: number
}

export interface SyncResult {
  added: number
  updated: number
  skipped: number
  errors: string[]
}