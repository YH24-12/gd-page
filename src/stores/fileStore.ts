import { create } from 'zustand'
import Dexie, { type Table } from 'dexie'
import type { ParsedSheet } from '../services/fileParser'

export interface ImportedFile {
  id: string
  name: string
  type: string
  size: number
  content: string
  rawBlob?: Blob
  sheets: ParsedSheet[]
  uploadedAt: string
}

class FileDB extends Dexie {
  files!: Table<ImportedFile, string>

  constructor() {
    super('FileDB')
    this.version(3).stores({
      files: 'id, name, type, uploadedAt'
    })
  }
}

const fileDb = new FileDB()

interface FileStore {
  files: ImportedFile[]
  loadFiles: () => Promise<void>
  addFile: (file: ImportedFile) => Promise<void>
  updateFile: (id: string, data: Partial<ImportedFile>) => Promise<void>
  removeFile: (id: string) => Promise<void>
  clearFiles: () => Promise<void>
}

export const useFileStore = create<FileStore>((set) => ({
  files: [],
  loadFiles: async () => {
    const files = await fileDb.files.toArray()
    set({ files })
  },
  addFile: async (file: ImportedFile) => {
    await fileDb.files.add(file)
    const files = await fileDb.files.toArray()
    set({ files })
  },
  updateFile: async (id: string, data: Partial<ImportedFile>) => {
    await fileDb.files.update(id, data)
    const files = await fileDb.files.toArray()
    set({ files })
  },
  removeFile: async (id: string) => {
    await fileDb.files.delete(id)
    const files = await fileDb.files.toArray()
    set({ files })
  },
  clearFiles: async () => {
    await fileDb.files.clear()
    set({ files: [] })
  }
}))