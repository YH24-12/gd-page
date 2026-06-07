import { useState } from 'react'

function SettingsPage() {
  const [doubaoKey, setDoubaoKey] = useState(localStorage.getItem('doubao_api_key') || '')
  const [amapKey, setAmapKey] = useState(localStorage.getItem('amap_api_key') || '')
  const [endpointId, setEndpointId] = useState(localStorage.getItem('doubao_endpoint_id') || 'ep-20260525002240-9qn86')

  const handleSave = () => {
    localStorage.setItem('doubao_api_key', doubaoKey)
    localStorage.setItem('amap_api_key', amapKey)
    localStorage.setItem('doubao_endpoint_id', endpointId)
    alert('设置已保存')
  }

  return (
    <div className="p-4">
      <h2 className="font-bold text-xl mb-4">系统设置</h2>

      <div className="bg-white border rounded-lg p-4 mb-4">
        <h3 className="font-medium mb-3">AI 生成设置</h3>
        <label className="block text-sm text-gray-600 mb-2">豆包 API Key</label>
        <input
          type="password"
          value={doubaoKey}
          onChange={(e) => setDoubaoKey(e.target.value)}
          placeholder="输入豆包 API Key"
          className="w-full border rounded px-3 py-2"
        />
        <label className="block text-sm text-gray-600 mb-2 mt-3">推理接入点 ID (Endpoint ID)</label>
        <input
          type="text"
          value={endpointId}
          onChange={(e) => setEndpointId(e.target.value)}
          placeholder="例：ep-20260525002240-9qn86"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-2">
          在火山方舟控制台创建推理接入点后获取，格式为 ep-xxxxx
        </p>
      </div>

      <div className="bg-white border rounded-lg p-4 mb-4">
        <h3 className="font-medium mb-3">地图服务设置</h3>
        <label className="block text-sm text-gray-600 mb-2">高德 API Key</label>
        <input
          type="password"
          value={amapKey}
          onChange={(e) => setAmapKey(e.target.value)}
          placeholder="输入高德 Web 服务 API Key"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-2">
          用于路线规划、天气查询等功能
        </p>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium"
      >
        保存设置
      </button>

      <div className="mt-4 bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium mb-2">使用说明</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>- 客户管理：支持手动添加、批量导入</li>
          <li>- 日程编辑：支持拖拽调整、批量操作</li>
          <li>- AI生成：输入自然语言描述，自动生成行程</li>
          <li>- 文件导入：支持 Excel、Word、PPT、PDF 等格式</li>
          <li>- 分享导出：支持Excel、PDF、图片导出</li>
        </ul>
      </div>
    </div>
  )
}

export default SettingsPage