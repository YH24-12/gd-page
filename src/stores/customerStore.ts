import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { CUSTOMER_STAGES, type CustomerStage } from '../types/customer'

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

// 从 Excel 数据中解析客户阶段
export function parseCustomerStage(value: string | undefined): CustomerStage {
  if (!value) return CUSTOMER_STAGES[0]
  const normalized = value.trim().toLowerCase()
  // 支持多种格式：数字+文字、纯文字
  const stageMap: Record<string, CustomerStage> = {
    '1线索跟踪': '线索跟踪',
    '1': '线索跟踪',
    '线索跟踪': '线索跟踪',
    '2送样完成': '送样完成',
    '2': '送样完成',
    '送样完成': '送样完成',
    '3内部准备': '内部准备',
    '3': '内部准备',
    '内部准备': '内部准备',
    '4客户评估': '客户评估',
    '4': '客户评估',
    '客户评估': '客户评估',
    '5投标竞争': '投标竞争',
    '5': '投标竞争',
    '投标竞争': '投标竞争',
    '6客户下单': '客户下单',
    '6': '客户下单',
    '客户下单': '客户下单'
  }
  return stageMap[normalized] || CUSTOMER_STAGES[0]
}

interface CustomerState {
  customers: Customer[]
  searchQuery: string
  loading: boolean
  lastSyncTime: string | null
  loadCustomers: () => Promise<void>
  addCustomer: (data: Omit<Customer, 'id' | 'updateTime'>) => Promise<string>
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  getCustomerById: (id: string) => Customer | undefined
  searchCustomer: (query: string) => Customer[]
  setSearchQuery: (query: string) => void
}

// 使用 localStorage 作为简单存储
const STORAGE_KEY = 'customers'

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  searchQuery: '',
  loading: false,
  lastSyncTime: null,

  loadCustomers: async () => {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      set({ customers: JSON.parse(data) })
    }
  },

  addCustomer: async (data) => {
    const customer: Customer = {
      id: nanoid(),
      ...data,
      stage: data.stage || CUSTOMER_STAGES[0],
      updateTime: new Date().toISOString()
    }
    const customers = [...get().customers, customer]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers))
    set({ customers })
    return customer.id
  },

  updateCustomer: async (id, data) => {
    const customers = get().customers.map(c =>
      c.id === id ? { ...c, ...data, updateTime: new Date().toISOString() } : c
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers))
    set({ customers })
  },

  deleteCustomer: async (id) => {
    const customers = get().customers.filter(c => c.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers))
    set({ customers })
  },

  getCustomerById: (id) => {
    return get().customers.find(c => c.id === id)
  },

  searchCustomer: (query) => {
    const q = query.toLowerCase()
    return get().customers.filter(c =>
      c.companyName.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q)
    )
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  }
}))