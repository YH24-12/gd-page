import axios from 'axios'
import * as XLSX from 'xlsx'
import type { Customer, SyncResult } from '../types/customer'

interface RawCustomer {
  公司名?: string
  简称?: string
  城市?: string
  地址?: string
  联系人?: string
  电话?: string
  备注?: string
  [key: string]: string | undefined
}

const columnMappings: Record<string, keyof Customer> = {
  '公司名': 'companyName',
  '公司名称': 'companyName',
  '客户名称': 'companyName',
  '简称': 'shortName',
  '客户简称': 'shortName',
  '城市': 'city',
  '地区': 'city',
  '地址': 'address',
  '公司地址': 'address',
  '联系人': 'contactPerson',
  '联系人姓名': 'contactPerson',
  'contact': 'contactPerson',
  '电话': 'phone',
  '手机': 'phone',
  '联系电话': 'phone',
  'tel': 'phone',
  '备注': 'notes',
  '说明': 'notes',
  'remark': 'notes'
}

export async function downloadAndParseCsv(url: string): Promise<RawCustomer[]> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000
  })

  const workbook = XLSX.read(response.data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json<RawCustomer>(sheet)

  return rawData
}

export function mapColumnsToCustomer(row: RawCustomer): Omit<Customer, 'id' | 'updateTime'> | null {
  const result: Record<string, string> = {}

  for (const [rawKey, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === '') continue

    const stringValue = String(value).trim()
    const mappedKey = columnMappings[rawKey]

    if (mappedKey) {
      result[mappedKey] = stringValue
    }
  }

  if (!result.companyName) {
    return null
  }

  return {
    companyName: result.companyName || '',
    shortName: result.shortName || '',
    city: result.city || '',
    address: result.address || '',
    contactPerson: result.contactPerson || '',
    phone: result.phone || '',
    notes: result.notes || ''
  }
}

export async function syncFromCsvUrl(
  url: string,
  existingCustomers: Customer[]
): Promise<{ customers: Omit<Customer, 'id' | 'updateTime'>[], result: SyncResult }> {
  const rawData = await downloadAndParseCsv(url)
  const customers: Omit<Customer, 'id' | 'updateTime'>[] = []
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] }

  const existingMap = new Map(existingCustomers.map(c => [c.companyName, c]))

  for (const row of rawData) {
    const mapped = mapColumnsToCustomer(row)
    if (!mapped) {
      result.skipped++
      continue
    }

    const existing = existingMap.get(mapped.companyName)
    if (existing) {
      const needsUpdate =
        existing.shortName !== mapped.shortName ||
        existing.city !== mapped.city ||
        existing.address !== mapped.address ||
        existing.contactPerson !== mapped.contactPerson ||
        existing.phone !== mapped.phone ||
        existing.notes !== mapped.notes

      if (needsUpdate) {
        customers.push(mapped)
        result.updated++
      } else {
        result.skipped++
      }
    } else {
      customers.push(mapped)
      result.added++
    }
  }

  return { customers, result }
}

export function parseLocalFile(file: File): Promise<Omit<Customer, 'id' | 'updateTime'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rawData = XLSX.utils.sheet_to_json<RawCustomer>(sheet)

        const customers: Omit<Customer, 'id' | 'updateTime'>[] = []
        for (const row of rawData) {
          const mapped = mapColumnsToCustomer(row)
          if (mapped) {
            customers.push(mapped)
          }
        }
        resolve(customers)
      } catch {
        reject(new Error('文件解析失败'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}