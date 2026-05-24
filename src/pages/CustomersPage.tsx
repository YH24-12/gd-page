import { useEffect, useState } from 'react'
import { useCustomerStore } from '../stores/customerStore'
import type { Customer } from '../stores/customerStore'

export default function CustomersPage() {
  const { customers, loadCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    shortName: '',
    companyName: '',
    city: '',
    address: '',
    contactPerson: '',
    phone: '',
    notes: ''
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  const filteredCustomers = searchQuery
    ? customers.filter(c =>
        c.companyName.includes(searchQuery) ||
        c.shortName.includes(searchQuery) ||
        c.city.includes(searchQuery)
      )
    : customers

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, formData)
    } else {
      await addCustomer(formData)
    }
    setShowModal(false)
    setEditingCustomer(null)
    setFormData({
      shortName: '',
      companyName: '',
      city: '',
      address: '',
      contactPerson: '',
      phone: '',
      notes: ''
    })
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      shortName: customer.shortName,
      companyName: customer.companyName,
      city: customer.city || '',
      address: customer.address || '',
      contactPerson: customer.contactPerson || '',
      phone: customer.phone || '',
      notes: customer.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个客户吗？')) {
      await deleteCustomer(id)
    }
  }

  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">客户管理</h1>
          <p className="text-gray-500 text-sm">共 {customers.length} 个客户</p>
        </div>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          onClick={() => setShowModal(true)}
        >
          + 添加客户
        </button>
      </header>

      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索客户名称、地址..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer: Customer) => (
          <div key={customer.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="font-bold text-lg">{customer.shortName}</h3>
            <p className="text-gray-600 text-sm mb-2">{customer.companyName}</p>
            {customer.city && <p className="text-sm">🏙️ {customer.city}</p>}
            {customer.address && <p className="text-sm">📍 {customer.address}</p>}
            {customer.contactPerson && <p className="text-sm">👤 {customer.contactPerson}</p>}
            {customer.phone && <p className="text-sm">📞 {customer.phone}</p>}
            <div className="flex gap-2 mt-3">
              <button
                className="text-blue-500 text-sm"
                onClick={() => handleEdit(customer)}
              >
                编辑
              </button>
              <button
                className="text-red-500 text-sm"
                onClick={() => handleDelete(customer.id)}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>暂无客户数据</p>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => { setShowModal(false); setEditingCustomer(null) }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">
              {editingCustomer ? '编辑客户' : '添加客户'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="简称 *"
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  required
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="公司全称 *"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="城市"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="地址"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="联系人"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="tel"
                  placeholder="电话"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
                <textarea
                  placeholder="备注"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingCustomer(null) }}
                  className="px-4 py-2 border rounded"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  {editingCustomer ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}