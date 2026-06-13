import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomerStore } from '../stores/customerStore'
import { CUSTOMER_STAGES, type CustomerStage } from '../types/customer'
import type { Customer } from '../stores/customerStore'

const STAGE_COLORS: Record<CustomerStage, string> = {
  '线索跟踪': 'bg-gray-100 text-gray-700 border-gray-300',
  '送样完成': 'bg-lime-50 text-lime-800 border-lime-400',
  '内部准备': 'bg-amber-50 text-amber-800 border-amber-400',
  '客户评估': 'bg-violet-50 text-violet-800 border-violet-400',
  '投标竞争': 'bg-blue-50 text-blue-800 border-blue-400',
  '客户下单': 'bg-emerald-50 text-emerald-800 border-emerald-400'
}

// 卡片整体样式（边框+背景）
const STAGE_CARD_COLORS: Record<CustomerStage, string> = {
  '线索跟踪': 'bg-gray-50 border-gray-300 hover:border-gray-400',
  '送样完成': 'bg-lime-50 border-lime-400 hover:border-lime-500',
  '内部准备': 'bg-amber-50 border-amber-400 hover:border-amber-500',
  '客户评估': 'bg-violet-50 border-violet-400 hover:border-violet-500',
  '投标竞争': 'bg-blue-50 border-blue-400 hover:border-blue-500',
  '客户下单': 'bg-emerald-50 border-emerald-400 hover:border-emerald-500'
}

// 阶段排序（优先级从高到低）
const STAGE_ORDER: Record<CustomerStage, number> = {
  '客户下单': 1,
  '投标竞争': 2,
  '客户评估': 3,
  '内部准备': 4,
  '送样完成': 5,
  '线索跟踪': 6
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const { customers, loadCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    companyName: '',
    city: '',
    address: '',
    contactPerson: '',
    phone: '',
    stage: CUSTOMER_STAGES[0] as CustomerStage,
    notes: ''
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  const filteredCustomers = searchQuery
    ? customers.filter(c =>
        c.companyName.includes(searchQuery) ||
        c.city.includes(searchQuery)
      )
    : customers

  // 按阶段排序（优先级：客户下单 > 投标竞争 > 客户评估 > 内部准备 > 送样完成 > 线索跟踪）
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const orderA = STAGE_ORDER[a.stage as CustomerStage] || 99
    const orderB = STAGE_ORDER[b.stage as CustomerStage] || 99
    return orderA - orderB
  })

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
      companyName: '',
      city: '',
      address: '',
      contactPerson: '',
      phone: '',
      stage: CUSTOMER_STAGES[0] as CustomerStage,
      notes: ''
    })
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      companyName: customer.companyName,
      city: customer.city || '',
      address: customer.address || '',
      contactPerson: customer.contactPerson || '',
      phone: customer.phone || '',
      stage: customer.stage || CUSTOMER_STAGES[0],
      notes: customer.notes || ''
    })
    setShowModal(true)
  }

  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">客户管理</h1>
          <p className="text-gray-500 text-sm">共 {customers.length} 个客户</p>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-lg"
            onClick={() => navigate('/import')}
          >
            导入客户
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            onClick={() => setShowModal(true)}
          >
            + 添加客户
          </button>
        </div>
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
        {sortedCustomers.map((customer: Customer) => (
          <div
            key={customer.id}
            className={`rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition-all border-2 ${
              customer.stage && STAGE_CARD_COLORS[customer.stage]
                ? STAGE_CARD_COLORS[customer.stage]
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setViewingCustomer(customer)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-gray-800">{customer.companyName}</h3>
              {customer.stage && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[customer.stage] || 'bg-gray-100 text-gray-700'}`}>
                  {customer.stage}
                </span>
              )}
            </div>
            {customer.city && <p className="text-sm text-gray-600">🏙️ {customer.city}</p>}
            {customer.address && <p className="text-sm text-gray-600">📍 {customer.address}</p>}
            {customer.contactPerson && <p className="text-sm text-gray-600">👤 {customer.contactPerson}</p>}
            {customer.phone && <p className="text-sm text-gray-600">📞 {customer.phone}</p>}
            <p className="text-xs text-gray-400 mt-2">点击查看详情</p>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>暂无客户数据</p>
        </div>
      )}

      {/* 客户详情弹窗 */}
      {viewingCustomer && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingCustomer(null)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">客户详情</h2>
              <button
                onClick={() => setViewingCustomer(null)}
                className="text-gray-500 text-xl px-2"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">公司全称</label>
                <p className="font-medium text-lg">{viewingCustomer.companyName}</p>
              </div>
              {viewingCustomer.stage && (
                <div>
                  <label className="text-sm text-gray-500">客户阶段</label>
                  <p className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${STAGE_COLORS[viewingCustomer.stage] || 'bg-gray-100'}`}>
                    {viewingCustomer.stage}
                  </p>
                </div>
              )}
              {viewingCustomer.city && (
                <div>
                  <label className="text-sm text-gray-500">城市</label>
                  <p className="text-lg">🏙️ {viewingCustomer.city}</p>
                </div>
              )}
              {viewingCustomer.address && (
                <div>
                  <label className="text-sm text-gray-500">详细地址</label>
                  <p className="text-lg">📍 {viewingCustomer.address}</p>
                </div>
              )}
              {viewingCustomer.contactPerson && (
                <div>
                  <label className="text-sm text-gray-500">联系人</label>
                  <p className="text-lg">👤 {viewingCustomer.contactPerson}</p>
                </div>
              )}
              {viewingCustomer.phone && (
                <div>
                  <label className="text-sm text-gray-500">联系电话</label>
                  <p className="text-lg">📞 {viewingCustomer.phone}</p>
                </div>
              )}
              {viewingCustomer.notes && (
                <div>
                  <label className="text-sm text-gray-500">备注</label>
                  <p className="bg-gray-50 rounded p-3 whitespace-pre-wrap">{viewingCustomer.notes}</p>
                </div>
              )}
              <div className="text-xs text-gray-400 pt-2">
                更新时间：{new Date(viewingCustomer.updateTime).toLocaleString('zh-CN')}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setViewingCustomer(null)
                  handleEdit(viewingCustomer)
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                编辑
              </button>
              <button
                onClick={() => {
                  if (confirm('确定要删除这个客户吗？')) {
                    deleteCustomer(viewingCustomer.id)
                    setViewingCustomer(null)
                  }
                }}
                className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑客户弹窗 */}
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
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value as CustomerStage })}
                  className="w-full border rounded px-3 py-2"
                >
                  {CUSTOMER_STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
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