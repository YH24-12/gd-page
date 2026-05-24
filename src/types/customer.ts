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

export interface CustomerFormData {
  companyName: string
  shortName: string
  city: string
  address: string
  contactPerson: string
  phone: string
  notes: string
}

export interface SyncResult {
  added: number
  updated: number
  skipped: number
  errors: string[]
}