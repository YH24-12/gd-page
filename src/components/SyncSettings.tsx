import { useState } from 'react'
import { useCustomerStore } from '../stores/customerStore'
import { syncFromCsvUrl } from '../services/wpsSync'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { RefreshCw, Link, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export function SyncSettings() {
  const store = useCustomerStore()
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('autoSync') === 'true')

  const handleSync = async () => {
    if (!store.csvUrl) {
      setError('请先输入 CSV 链接')
      return
    }

    setSyncing(true)
    setError(null)
    setResult(null)

    try {
      const { customers, result: syncResult } = await syncFromCsvUrl(store.csvUrl, store.customers)
      await store.bulkAdd(customers)
      setResult(syncResult)
      store.saveLastSyncTime(new Date().toISOString())
    } catch (e) {
      setError(e instanceof Error ? e.message : '同步失败')
    } finally {
      setSyncing(false)
    }
  }

  const handleUrlChange = (url: string) => {
    store.setCsvUrl(url)
  }

  const toggleAutoSync = () => {
    const newValue = !autoSync
    setAutoSync(newValue)
    localStorage.setItem('autoSync', String(newValue))
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">同步设置</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">CSV/XLSX 链接</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={store.csvUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com/customers.xlsx"
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              onClick={handleSync}
              disabled={syncing || !store.csvUrl}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {syncing ? '同步中...' : '立即同步'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">支持 WPS 或其他在线文档导出的 XLSX 文件</p>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium">自动同步</p>
            <p className="text-sm text-gray-500">每 30 分钟自动从链接同步一次</p>
          </div>
          <button
            onClick={toggleAutoSync}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              autoSync ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                autoSync ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {store.lastSyncTime && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>上次同步: {format(new Date(store.lastSyncTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</span>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">同步完成</span>
            </div>
            <ul className="text-sm space-y-1">
              <li>新增: {result.added} 条</li>
              <li>更新: {result.updated} 条</li>
              <li>跳过: {result.skipped} 条</li>
            </ul>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">同步失败</span>
            </div>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}