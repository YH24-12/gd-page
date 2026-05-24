import Dexie, { Table } from 'dexie'
import { Customer, CustomerAddress, ScheduleItem } from './types'

export class TeamCalendarDB extends Dexie {
  users!: Table<any>
  customers!: Table<Customer>
  customerAddresses!: Table<CustomerAddress>
  scheduleItems!: Table<ScheduleItem>
  itineraryPlans!: Table<any>

  constructor() {
    super('TeamCalendarDB')
    this.version(1).stores({
      users: 'id, name, email, role, department',
      customers: 'id, shortName, companyName, industry, createdAt, updatedAt',
      customerAddresses: 'id, customerId, type',
      scheduleItems: 'id, teamId, date, time, type, status, createdAt, updatedAt',
      itineraryPlans: 'id, name, createdAt, updatedAt'
    })
  }
}

export const db = new TeamCalendarDB()
