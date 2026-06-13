import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCustomerStore } from '../stores/customerStore'
import { useScheduleStore } from '../stores/scheduleStore'
import { CUSTOMER_STAGES, type CustomerStage } from '../types/customer'
import CustomerMap from '../components/CustomerMap'
import StageChart from '../components/StageChart'
import ErrorBoundary from '../components/ErrorBoundary'
import { batchGeocode } from '../utils/geocoder'

// 阶段颜色
const STAGE_COLORS: Record<CustomerStage, string> = {
  '线索跟踪': '#9CA3AF',
  '送样完成': '#84CC16',
  '内部准备': '#F59E0B',
  '客户评估': '#8B5CF6',
  '投标竞争': '#3B82F6',
  '客户下单': '#10B981'
}

interface CustomerMarker {
  name: string
  companyName: string
  address: string
  stage: CustomerStage
  value: [number, number]
  id: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { customers, loadCustomers, updateCustomer } = useCustomerStore()
  const { schedules, loadSchedules } = useScheduleStore()
  const [selectedStage, setSelectedStage] = useState<CustomerStage | null>(null)
  const [showCustomerList, setShowCustomerList] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeProgress, setGeocodeProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    loadCustomers()
    loadSchedules()
  }, [])

  const todaySchedules = schedules.filter(s => s.date === new Date().toISOString().split('T')[0])

  // 统计各阶段客户数量
  const stageStats = useMemo(() => {
    return CUSTOMER_STAGES.map(stage => ({
      stage,
      count: customers.filter(c => c.stage === stage).length
    }))
  }, [customers])

  // 准备地图数据（只包含有经纬度的客户）
  const mapCustomers = useMemo((): CustomerMarker[] => {
    return customers
      .filter(c => c.longitude && c.latitude)
      .map(c => ({
        name: c.companyName,
        companyName: c.companyName,
        address: c.address || c.city || '无地址',
        stage: c.stage,
        value: [c.longitude!, c.latitude!],
        id: c.id
      }))
  }, [customers])

  // 批量地理编码
  const handleBatchGeocode = async () => {
    const customersNeedGeocode = customers.filter(c => !c.longitude || !c.latitude)
    if (customersNeedGeocode.length === 0) {
      alert('所有客户已有位置信息')
      return
    }

    if (!confirm(`将为 ${customersNeedGeocode.length} 个客户获取位置信息，是否继续？`)) {
      return
    }

    setGeocoding(true)
    setGeocodeProgress({ current: 0, total: customersNeedGeocode.length })

    try {
      const results = await batchGeocode(customersNeedGeocode, (current, total) => {
        setGeocodeProgress({ current, total })
      })

      // 更新每个客户的位置
      for (const result of results) {
        if (result.longitude && result.latitude) {
          await updateCustomer(result.id, {
            longitude: result.longitude,
            latitude: result.latitude
          })
        }
      }

      alert(`位置获取完成！`)
      loadCustomers()
    } catch (error) {
      console.error('Geocoding error:', error)
      alert('获取位置信息失败，请重试')
    } finally {
      setGeocoding(false)
      setGeocodeProgress({ current: 0, total: 0 })
    }
  }

  // 点击客户标记
  const handleCustomerClick = (_customer: CustomerMarker) => {
    navigate('/customers')
  }

  // 点击阶段
  const handleStageClick = (stage: CustomerStage | null) => {
    setSelectedStage(stage)
    if (stage) {
      setShowCustomerList(true)
    }
  }

  // 筛选后的客户列表
  const filteredCustomers = selectedStage
    ? customers.filter(c => c.stage === selectedStage)
    : customers

  // 统计
  const stats = [
    { title: '客户总数', value: customers.length },
    { title: '日程总数', value: schedules.length },
    { title: '今日日程', value: todaySchedules.length }
  ]

  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('zh-CN')}</p>
      </header>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.title} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="text-gray-500 text-sm mt-1">{stat.title}</div>
          </div>
        ))}
      </div>

      {/* 快捷操作 */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">快捷操作</h2>
          <button
            onClick={handleBatchGeocode}
            disabled={geocoding}
            className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {geocoding
              ? `获取位置... ${geocodeProgress.current}/${geocodeProgress.total}`
              : '批量获取位置'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Link
            to="/ai-generate"
            className="bg-blue-50 text-blue-600 p-4 rounded-lg text-center"
          >
            🤖 AI生成行程
          </Link>
          <Link
            to="/customers"
            className="bg-green-50 text-green-600 p-4 rounded-lg text-center"
          >
            👥 添加客户
          </Link>
          <Link
            to="/schedules"
            className="bg-purple-50 text-purple-600 p-4 rounded-lg text-center"
          >
            📅 查看日程
          </Link>
        </div>
      </div>

      {/* 可视化区域 */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">客户分布地图</h2>
          {selectedStage && (
            <button
              onClick={() => setSelectedStage(null)}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              显示全部
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 左侧：阶段统计图表 */}
          <div className="lg:col-span-1">
            <div className="h-48">
              <StageChart
                data={stageStats}
                selectedStage={selectedStage}
                onStageClick={handleStageClick}
              />
            </div>
            {/* 阶段图例 */}
            <div className="mt-4 space-y-1">
              {CUSTOMER_STAGES.map(stage => (
                <div
                  key={stage}
                  className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-gray-50 ${
                    selectedStage === stage ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => handleStageClick(stage)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: STAGE_COLORS[stage] }}
                    />
                    <span className="text-sm">{stage}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {stageStats.find(s => s.stage === stage)?.count || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* 右侧：地图 */}
          <div className="lg:col-span-3 h-[400px] border rounded-lg overflow-hidden">
            <ErrorBoundary>
              <CustomerMap
                customers={mapCustomers}
                selectedStage={selectedStage}
                onMarkerClick={handleCustomerClick}
              />
            </ErrorBoundary>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          已有位置客户：{mapCustomers.length} / {customers.length}
          {mapCustomers.length < customers.length && '（点击"批量获取位置"获取更多）'}
        </p>
      </div>

      {/* 今日日程 */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-bold text-lg mb-4">今日日程</h2>
        <div className="space-y-2">
          {todaySchedules.map(s => (
            <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <span className="font-medium">{s.time}</span>
              <span>{s.task}</span>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">{s.type}</span>
            </div>
          ))}
          {todaySchedules.length === 0 && (
            <p className="text-gray-500 text-center py-4">今日无日程安排</p>
          )}
        </div>
      </div>

      {/* 客户列表弹窗 */}
      {showCustomerList && selectedStage && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCustomerList(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedStage} 客户列表
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredCustomers.length} 个)
                </span>
              </h2>
              <button
                onClick={() => setShowCustomerList(false)}
                className="text-gray-500 text-xl px-2"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="border px-3 py-2 text-left">公司名称</th>
                    <th className="border px-3 py-2 text-left">城市</th>
                    <th className="border px-3 py-2 text-left">联系人</th>
                    <th className="border px-3 py-2 text-left">电话</th>
                    <th className="border px-3 py-2 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="border px-3 py-2">{c.companyName}</td>
                      <td className="border px-3 py-2">{c.city || '-'}</td>
                      <td className="border px-3 py-2">{c.contactPerson || '-'}</td>
                      <td className="border px-3 py-2">{c.phone || '-'}</td>
                      <td className="border px-3 py-2">
                        <button
                          onClick={() => {
                            navigate('/customers')
                            setShowCustomerList(false)
                          }}
                          className="text-blue-500 text-sm"
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCustomers.length === 0 && (
                <p className="text-center py-8 text-gray-500">该阶段暂无客户</p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <button
                onClick={() => setShowCustomerList(false)}
                className="px-4 py-2 border rounded"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  navigate('/customers')
                  setShowCustomerList(false)
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                查看全部客户
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}