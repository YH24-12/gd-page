import { useState, useEffect } from 'react'
import { useCustomerStore } from '../stores/customerStore'
import { parseLocalFile } from '../services/wpsSync'
import type { Customer, CustomerFormData } from '../types/customer'
import { Search, Plus, Edit2, Trash2, Upload, Download, X } from 'lucide-react'

const emptyForm: CustomerFormData = {
  companyName: '',
  shortName: '',
  city: '',
  address: '',
  contactPerson: '',
  phone: '',
  notes: ''
}

export function CustomerPage() {
  const store = useCustomerStore()
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CustomerFormData>(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    store.loadCustomers()
    store.loadSettings()
  }, [])

  const handleOpenAdd = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setShowModal(true)
  }

  const handleOpenEdit = (customer: Customer) => {
    setFormData({
      companyName: customer.companyName,
      shortName: customer.shortName,
      city: customer.city,
      address: customer.address,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      notes: customer.notes
    })
    setEditingId(customer.id)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      return
    }

    try {
      if (editingId) {
        await store.updateCustomer(editingId, formData)
      } else {
        await store.addCustomer(formData)
      }
      setShowModal(false)
      setFormData(emptyForm)
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await store.deleteCustomer(id)
      setDeleteConfirm(null)
    } catch {
      // ignore
    }
  }

  const handleExportJson = () => {
    const json = store.exportToJson()
    downloadFile(json, 'customers.json', 'application/json')
  }

  const handleExportCsv = () => {
    const csv = store.exportToCsv()
    downloadFile(csv, 'customers.csv', 'text/csv')
  }

  const handleImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls,.csv'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const customers = await parseLocalFile(file)
        const result = await store.bulkAdd(customers)
        setImportMessage({
          type: 'success',
          text: `成功导入 ${result.added} 条，更新 ${result.updated} 条`
        })
      } catch {
        setImportMessage({ type: 'error', text: '导入失败，请检查文件格式' })
      }
    }
    input.click()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">客户管理</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportJson}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-100 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-100 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={handleImportClick}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-100 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            导入
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加客户
          </button>
        </div>
      </div>

      {importMessage && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            importMessage.type === 'success'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {importMessage.text}
        </div>
      )}

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="搜索公司名、联系人、城市..."
          value={store.searchQuery}
          onChange={(e) => (store.searchQuery = e.target.value)}
          className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">公司名</th>
              <th className="px-4 py-3 text-left text-sm font-medium">简称</th>
              <th className="px-4 py-3 text-left text-sm font-medium">城市</th>
              <th className="px-4 py-3 text-left text-sm font-medium">联系人</th>
              <th className="px-4 py-3 text-left text-sm font-medium">电话</th>
              <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {store.filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  {store.customers.length === 0 ? '暂无客户数据' : '未找到匹配的客户'}
                </td>
              </tr>
            ) : (
              store.filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{customer.companyName}</td>
                  <td className="px-4 py-3">{customer.shortName}</td>
                  <td className="px-4 py-3">{customer.city}</td>
                  <td className="px-4 py-3">{customer.contactPerson}</td>
                  <td className="px-4 py-3">{customer.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenEdit(customer)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(customer.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editingId ? '编辑客户' : '添加客户'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">公司名 *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如：杭州昊睿化工有限公司"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">简称</label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如：昊睿化工"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">城市</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例如：杭州"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">联系人</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">地址</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">电话</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.companyName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {editingId ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold mb-2">确认删除</h3>
            <p className="text-gray-500 mb-4">确定要删除这个客户吗？此操作无法撤销。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}