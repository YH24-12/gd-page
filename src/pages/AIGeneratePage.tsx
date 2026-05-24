import { useState } from 'react'
import { useCustomerStore } from '../stores/customerStore'

function AIGeneratePage() {
  const [prompt, setPrompt] = useState('')
  const [apiKey, setApiKey] = useState(localStorage.getItem('doubao_api_key') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any[]>([])
  const { customers } = useCustomerStore()

  const handleGenerate = async () => {
    if (!prompt.trim() || !apiKey.trim()) {
      alert('请输入行程描述和 API Key')
      return
    }

    setLoading(true)
    localStorage.setItem('doubao_api_key', apiKey)

    try {
      // 查找相关客户
      const matchedCustomers = customers.filter(c =>
        prompt.includes(c.shortName) || prompt.includes(c.companyName)
      )

      const fullPrompt = `
你是一个销售出差行程规划助手。根据用户需求生成出差日程。

## 可用客户资料
${matchedCustomers.map(c => `- ${c.shortName}（${c.companyName}）：地址=${c.address}，联系人=${c.contactPerson}，电话=${c.phone}`).join('\n')}

## 用户需求
${prompt}

## 输出要求
返回 JSON 数组，每个元素格式：
{"date": "YYYY-MM-DD", "time": "HH:mm", "task": "任务描述", "location": "地点", "contactPerson": "联系人", "type": "客户拜访|交通|餐饮|住宿|工作"}

只返回 JSON，不要其他内容。
`

      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, apiKey })
      })

      const data = await response.json()
      setResult(JSON.parse(data.choices[0].message.content))
    } catch (error) {
      alert('生成失败：' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="bg-white border rounded-lg p-4 mb-4">
        <label className="block text-sm font-medium mb-2">豆包 API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="输入你的 API Key"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="bg-white border rounded-lg p-4 mb-4">
        <label className="block text-sm font-medium mb-2">行程描述</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例：下周去广州拜访广州莱索和深圳优宝，安排2天的行程..."
          rows={6}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium disabled:bg-gray-300"
      >
        {loading ? '生成中...' : '🤖 AI 智能生成'}
      </button>

      {result.length > 0 && (
        <div className="mt-4 bg-white border rounded-lg p-4">
          <h3 className="font-bold mb-3">生成结果预览</h3>
          <div className="space-y-2">
            {result.map((item, i) => (
              <div key={i} className="border-b pb-2">
                <div className="text-sm text-gray-500">{item.date} {item.time}</div>
                <div className="font-medium">{item.task}</div>
                <div className="text-sm">📍 {item.location}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AIGeneratePage