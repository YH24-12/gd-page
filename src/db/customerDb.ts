import Dexie, { type Table } from 'dexie'
import type { Customer } from '../types/customer'

export class ItineraryDB extends Dexie {
  customers!: Table<Customer, string>

  constructor() {
    super('ItineraryDB')
    this.version(1).stores({
      customers: 'id, companyName, shortName, city, contactPerson, updateTime'
    })
  }
}

export const db = new ItineraryDB()

export const customerDb = {
  async getAll(): Promise<Customer[]> {
    return db.customers.toArray()
  },

  async getById(id: string): Promise<Customer | undefined> {
    return db.customers.get(id)
  },

  async add(customer: Customer): Promise<string> {
    return db.customers.add(customer)
  },

  async update(id: string, changes: Partial<Customer>): Promise<number> {
    return db.customers.update(id, { ...changes, updateTime: new Date().toISOString() })
  },

  async delete(id: string): Promise<void> {
    return db.customers.delete(id)
  },

  async search(query: string): Promise<Customer[]> {
    const q = query.toLowerCase()
    return db.customers
      .filter(c =>
        c.companyName.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.phone.includes(q)
      )
      .toArray()
  },

  async findByCompanyName(companyName: string): Promise<Customer | undefined> {
    return db.customers.where('companyName').equals(companyName).first()
  },

  async bulkPut(customers: Customer[]): Promise<void> {
    await db.customers.bulkPut(customers)
  },

  async clear(): Promise<void> {
    await db.customers.clear()
  }
}