import { create } from 'zustand'
import { nanoid } from 'nanoid'

export interface Customer {
  id: string
  companyName: string
  shortName: string
  city: string
  address: string
  contactPerson: string
  phone: string
  notes: string
  updateTime: string
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
      c.shortName.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q)
    )
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  }
}))