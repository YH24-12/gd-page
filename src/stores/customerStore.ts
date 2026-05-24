import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { Customer, CustomerFormData, SyncResult } from '../types/customer'
import { db } from '../db/customerDb'

export const useCustomerStore = defineStore('customer', () => {
  const customers = ref<Customer[]>([])
  const searchQuery = ref('')
  const loading = ref(false)
  const lastSyncTime = ref<string | null>(null)
  const csvUrl = ref<string>('')

  const filteredCustomers = computed(() => {
    if (!searchQuery.value.trim()) {
      return customers.value
    }
    const q = searchQuery.value.toLowerCase()
    return customers.value.filter(c =>
      c.companyName.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.phone.includes(q)
    )
  })

  async function loadCustomers() {
    loading.value = true
    try {
      customers.value = await db.customers.toArray()
    } finally {
      loading.value = false
    }
  }

  async function addCustomer(data: CustomerFormData): Promise<string> {
    const customer: Customer = {
      id: nanoid(),
      ...data,
      updateTime: new Date().toISOString()
    }
    await db.customers.add(customer)
    customers.value.push(customer)
    return customer.id
  }

  async function updateCustomer(id: string, data: CustomerFormData): Promise<void> {
    const updateData = {
      ...data,
      updateTime: new Date().toISOString()
    }
    await db.customers.update(id, updateData)
    const index = customers.value.findIndex(c => c.id === id)
    if (index !== -1) {
      customers.value[index] = { ...customers.value[index], ...updateData }
    }
  }

  async function deleteCustomer(id: string): Promise<void> {
    await db.customers.delete(id)
    customers.value = customers.value.filter(c => c.id !== id)
  }

  function getCustomerById(id: string): Customer | undefined {
    return customers.value.find(c => c.id === id)
  }

  async function searchCustomer(query: string): Promise<Customer[]> {
    const q = query.toLowerCase()
    return customers.value.filter(c =>
      c.companyName.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.phone.includes(q)
    )
  }

  function exportToJson(): string {
    return JSON.stringify(customers.value, null, 2)
  }

  async function importFromJson(jsonStr: string): Promise<number> {
    try {
      const imported = JSON.parse(jsonStr) as Customer[]
      for (const c of imported) {
        c.id = nanoid()
        c.updateTime = new Date().toISOString()
      }
      await db.customers.bulkPut(imported)
      await loadCustomers()
      return imported.length
    } catch {
      throw new Error('JSON 格式无效')
    }
  }

  function exportToCsv(): string {
    const headers = ['公司名', '简称', '城市', '地址', '联系人', '电话', '备注', '更新时间']
    const rows = customers.value.map(c => [
      c.companyName,
      c.shortName,
      c.city,
      c.address,
      c.contactPerson,
      c.phone,
      c.notes,
      c.updateTime
    ])
    return [headers.join(','), ...rows.map(r => r.map(v => `"${v || ''}"`).join(','))].join('\n')
  }

  async function bulkAdd(customersToAdd: Omit<Customer, 'id' | 'updateTime'>[]): Promise<SyncResult> {
    const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

    for (const c of customersToAdd) {
      try {
        const existing = customers.value.find(x => x.companyName === c.companyName)
        if (existing) {
          await db.customers.update(existing.id, { ...c, updateTime: new Date().toISOString() })
          result.updated++
        } else {
          const newCustomer: Customer = {
            id: nanoid(),
            ...c,
            updateTime: new Date().toISOString()
          }
          await db.customers.add(newCustomer)
          result.added++
        }
      } catch (e) {
        result.errors.push(`${c.companyName}: ${e instanceof Error ? e.message : '未知错误'}`)
      }
    }

    lastSyncTime.value = new Date().toISOString()
    await loadCustomers()
    return result
  }

  function setCsvUrl(url: string) {
    csvUrl.value = url
    localStorage.setItem('csvUrl', url)
  }

  function loadSettings() {
    csvUrl.value = localStorage.getItem('csvUrl') || ''
    lastSyncTime.value = localStorage.getItem('lastSyncTime')
  }

  function saveLastSyncTime(time: string) {
    lastSyncTime.value = time
    localStorage.setItem('lastSyncTime', time)
  }

  return {
    customers,
    searchQuery,
    loading,
    filteredCustomers,
    lastSyncTime,
    csvUrl,
    loadCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    searchCustomer,
    exportToJson,
    importFromJson,
    exportToCsv,
    bulkAdd,
    setCsvUrl,
    loadSettings,
    saveLastSyncTime
  }
})