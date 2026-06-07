import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useCustomerStore } from '../stores/customerStore'
import { useScheduleStore } from '../stores/scheduleStore'
import { useFileStore } from '../stores/fileStore'
import { parseFile, type ParseProgress } from '../services/fileParser'
import FilePreviewModal, { ParseProgressBar } from '../components/FilePreviewModal'
import type { ImportedFile } from '../stores/fileStore'

interface ParsedCustomer {
  id: string
  shortName: string
  companyName: string
  city: string
  address: string
  contactPerson: string
  phone: string
  notes: string
}

function AIGeneratePage() {
  const { customers, addCustomer, loadCustomers } = useCustomerStore()
  const { addSchedule } = useScheduleStore()
  const { files, loadFiles, addFile, removeFile } = useFileStore()
  const [prompt, setPrompt] = useState('')
  const [apiKey, setApiKey] = useState(localStorage.getItem('doubao_api_key') || 'ark-496795c4-f13c-4c2d-9921-a304ea8a0a30-55f4b')
  const [endpointId, setEndpointId] = useState(localStorage.getItem('doubao_endpoint_id') || 'ep-20260525002240-9qn86')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any[]>([])
  const [aiMemory, setAiMemory] = useState('')
  const [previewFile, setPreviewFile] = useState<ImportedFile | null>(null)
  const [parsedCustomers, setParsedCustomers] = useState<ParsedCustomer[]>([])
  const [parsingCustomers, setParsingCustomers] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [parseProgress, setParseProgress] = useState<ParseProgress | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadFiles()
    loadCustomers()
  }, [loadFiles, loadCustomers])

  const callArkAPI = async (messages: Array<{ role: string; content: string }>, jsonMode = false) => {
    localStorage.setItem('doubao_api_key', apiKey)
    localStorage.setItem('doubao_endpoint_id', endpointId)

    const body: any = {
      model: endpointId,
      messages
    }
    if (jsonMode) {
      body.response_format = { type: 'json_object' }
    }

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API 请求失败 (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    for (const file of selectedFiles) {
      // 检查文件大小（≤10MB）
      if (file.size > 10 * 1024 * 1024) {
        alert(`文件 ${file.name} 超过10MB限制`)
        continue
      }

      setShowProgress(true)
      setParseProgress({ percent: 0, stage: '准备中', message: '开始解析文件...' })

      try {
        const parsed = await parseFile(file, (progress) => {
          setParseProgress(progress)
        })

        const fileData: ImportedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: parsed.mimeType,
          size: file.size,
          content: parsed.content,
          rawBlob: parsed.rawBlob,
          sheets: parsed.sheets,
          uploadedAt: new Date().toISOString()
        }

        await addFile(fileData)

        // 解析完成后自动显示预览
        setPreviewFile(fileData)
      } catch (err) {
        alert(`文件 ${file.name} 解析失败: ${(err as Error).message}`)
      } finally {
        setShowProgress(false)
        setParseProgress(null)
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const buildFileContext = () => {
    if (files.length === 0) return ''
    const fileContents = files.map(f => `### 文件: ${f.name}\n${f.content.substring(0, 3000)}`).join('\n\n')
    return `\n## 用户导入的文件内容\n${fileContents}\n`
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || !apiKey.trim()) {
      alert('请输入行程描述和 API Key')
      return
    }

    setLoading(true)
    try {
      const matchedCustomers = customers.filter(c =>
        prompt.includes(c.shortName) || prompt.includes(c.companyName)
      )

      const fileContext = buildFileContext()

      const fullPrompt = `你是一个销售出差行程规划助手。根据用户需求生成出差日程。

## 可用客户资料
${matchedCustomers.map(c => `- ${c.shortName}（${c.companyName}）：地址=${c.address}，联系人=${c.contactPerson}，电话=${c.phone}`).join('\n')}
${fileContext}
## 用户需求
${prompt}

## 输出要求
返回 JSON，格式为 {"schedules": [{"date": "YYYY-MM-DD", "time": "HH:mm", "task": "任务描述", "location": "地点", "contactPerson": "联系人", "type": "客户拜访|交通|餐饮|住宿|工作"}]}

只返回 JSON，不要其他内容。`

      const content = await callArkAPI([{ role: 'user', content: fullPrompt }], true)
      const parsed = JSON.parse(content)

      let scheduleItems: any[] = []
      if (Array.isArray(parsed)) {
        scheduleItems = parsed
      } else if (parsed.schedules || parsed.items || parsed.data) {
        scheduleItems = parsed.schedules || parsed.items || parsed.data
      } else {
        scheduleItems = [parsed]
      }

      // 为每个结果生成唯一ID
      const resultsWithIds = scheduleItems.map(item => ({
        ...item,
        id: uuidv4()
      }))
      setResult(resultsWithIds)
    } catch (error) {
      alert('生成失败：' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateMemory = async () => {
    if (!apiKey.trim() || files.length === 0) {
      alert('请先导入文件并填写 API Key')
      return
    }

    setLoading(true)
    try {
      const fileContext = buildFileContext()
      const memoryPrompt = `你是一个智能助手。请阅读以下文件内容，提取关键信息并生成结构化的记忆摘要。

${fileContext}

## 输出要求
生成一份结构化的记忆摘要，包含：
1. 关键实体（公司名、人名、地点等）
2. 关键事件和时间节点
3. 重要数据和指标
4. 行动项和待办事项

用中文输出，格式清晰。`

      const content = await callArkAPI([{ role: 'user', content: memoryPrompt }])
      setAiMemory(content)
    } catch (error) {
      alert('记忆生成失败：' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleParseCustomers = async () => {
    if (!apiKey.trim() || files.length === 0) {
      alert('请先导入文件并填写 API Key')
      return
    }

    setParsingCustomers(true)
    try {
      const fileContext = buildFileContext()
      const parsePrompt = `你是一个客户信息提取助手。请从以下文件内容中提取所有客户/公司信息。

${fileContext}

## 输出要求
返回 JSON，格式为 {"customers": [{"shortName": "客户简称", "companyName": "公司全称", "city": "城市", "address": "详细地址", "contactPerson": "联系人姓名", "phone": "联系电话", "notes": "备注"}]}

规则：
- shortName 是公司简称，如无简称则取公司名前几个字
- 只提取明确的客户/公司信息，不要编造
- 如果某个字段没有对应信息，填空字符串
- 只返回 JSON，不要其他内容`

      const content = await callArkAPI([{ role: 'user', content: parsePrompt }], true)
      const parsed = JSON.parse(content)

      const customerList: ParsedCustomer[] = (parsed.customers || parsed.data || parsed.items || []).map((c: any) => ({
        id: uuidv4(),
        shortName: c.shortName || '',
        companyName: c.companyName || '',
        city: c.city || '',
        address: c.address || '',
        contactPerson: c.contactPerson || '',
        phone: c.phone || '',
        notes: c.notes || ''
      }))
      setParsedCustomers(customerList)
      setSelectedCustomers(new Set(customerList.map(c => c.id)))
    } catch (error) {
      alert('客户信息解析失败：' + (error as Error).message)
    } finally {
      setParsingCustomers(false)
    }
  }

  const handleConfirmAddCustomers = async () => {
    const toAdd = parsedCustomers.filter(c => selectedCustomers.has(c.id))
    let added = 0
    let skipped = 0

    for (const c of toAdd) {
      const exists = customers.some(
        existing => existing.companyName === c.companyName || existing.shortName === c.shortName
      )
      if (exists) {
        skipped++
        continue
      }
      await addCustomer(c)
      added++
    }

    alert(`成功添加 ${added} 个客户${skipped > 0 ? `，跳过 ${skipped} 个已存在客户` : ''}`)
    setParsedCustomers([])
    setSelectedCustomers(new Set())
  }

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomers(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDownloadFile = (file: ImportedFile) => {
    const blob = file.rawBlob || new Blob([file.content], { type: file.type || 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSaveSchedules = () => {
    if (result.length === 0) return
    for (const item of result) {
      addSchedule({
        date: item.date,
        time: item.time || '09:00',
        task: item.task,
        location: item.location || '',
        contactPerson: item.contactPerson || '',
        type: item.type || '工作',
        notes: ''
      })
    }
    alert(`已保存 ${result.length} 条日程`)
    setResult([])
  }

  const getFileIcon = (file: ImportedFile): string => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊'
    if (['docx', 'doc'].includes(ext)) return '📝'
    if (['pptx', 'ppt'].includes(ext)) return '📽️'
    if (ext === 'pdf') return '📄'
    return '📃'
  }

  return (
    <div className="p-4 space-y-4">
      {/* API 设置 */}
      <div className="bg-white border rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">豆包 API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="输入你的 API Key"
          className="w-full border rounded px-3 py-2"
        />
        <label className="block text-sm font-medium mb-2 mt-3">推理接入点 ID (Endpoint ID)</label>
        <input
          type="text"
          value={endpointId}
          onChange={(e) => setEndpointId(e.target.value)}
          placeholder="例：ep-20260525002240-9qn86"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">在火山方舟控制台创建推理接入点后获取</p>
      </div>

      {/* 文件导入区域 */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium">文件导入</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-500 text-white px-3 py-1.5 rounded text-sm"
            >
              + 导入文件
            </button>
            {files.length > 0 && (
              <>
                <button
                  onClick={handleGenerateMemory}
                  disabled={loading}
                  className="bg-purple-500 text-white px-3 py-1.5 rounded text-sm disabled:bg-gray-300"
                >
                  {loading ? '生成中...' : 'AI 生成记忆'}
                </button>
                <button
                  onClick={handleParseCustomers}
                  disabled={parsingCustomers}
                  className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm disabled:bg-gray-300"
                >
                  {parsingCustomers ? '解析中...' : 'AI 提取客户'}
                </button>
              </>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.pdf,.txt,.md"
          onChange={handleFileImport}
          className="hidden"
        />
        {files.length === 0 ? (
          <p className="text-gray-400 text-sm">支持 Excel、Word、PPT、PDF、TXT 等文件（≤10MB）</p>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between border rounded px-3 py-2 hover:bg-gray-50">
                <div
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                  onClick={() => setPreviewFile(f)}
                >
                  <span className="text-lg shrink-0">{getFileIcon(f)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-blue-600 hover:text-blue-800">{f.name}</p>
                    <p className="text-xs text-gray-400">
                      {(f.size / 1024).toFixed(1)} KB · {f.sheets?.length || 0}个工作表
                      {f.sheets?.some(s => s.data.length > 0) && ' · 已解析'}
                      · 点击预览
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <button
                    onClick={() => setPreviewFile(f)}
                    className="text-blue-500 text-sm"
                    title="预览"
                  >
                    预览
                  </button>
                  <button
                    onClick={() => handleDownloadFile(f)}
                    className="text-green-500 text-sm"
                    title="下载原文件"
                  >
                    下载
                  </button>
                  <button
                    onClick={() => removeFile(f.id)}
                    className="text-red-400 text-sm"
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 文件预览弹窗 */}
      {previewFile && (
         <FilePreviewModal
          fileName={previewFile.name}
          sheets={previewFile.sheets || []}
          onClose={() => setPreviewFile(null)}
          onDownload={() => handleDownloadFile(previewFile)}
          onParseCustomers={handleParseCustomers}
          parsingCustomers={parsingCustomers}
        />
      )}

      {/* 解析进度条 */}
      <ParseProgressBar progress={parseProgress!} visible={showProgress} />

      {/* AI 解析客户结果 */}
      {parsedCustomers.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-orange-700">AI 提取的客户信息 ({parsedCustomers.length} 个)</h3>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmAddCustomers}
                className="bg-orange-500 text-white px-4 py-1.5 rounded text-sm"
              >
                确认添加到客户管理
              </button>
              <button
                onClick={() => { setParsedCustomers([]); setSelectedCustomers(new Set()) }}
                className="text-gray-500 text-sm border px-3 py-1.5 rounded"
              >
                取消
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {parsedCustomers.map((c) => (
              <div key={c.id} className="flex items-start gap-3 bg-white border rounded p-3">
                <input
                  type="checkbox"
                  checked={selectedCustomers.has(c.id)}
                  onChange={() => toggleCustomerSelection(c.id)}
                  className="mt-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 flex-wrap">
                    <span className="font-medium">{c.shortName}</span>
                    <span className="text-gray-600">{c.companyName}</span>
                  </div>
                  <div className="text-sm text-gray-500 flex gap-3 flex-wrap mt-1">
                    {c.city && <span>🏙️ {c.city}</span>}
                    {c.address && <span>📍 {c.address}</span>}
                    {c.contactPerson && <span>👤 {c.contactPerson}</span>}
                    {c.phone && <span>📞 {c.phone}</span>}
                  </div>
                  {c.notes && <p className="text-xs text-gray-400 mt-1">{c.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 记忆摘要 */}
      {aiMemory && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-bold mb-2 text-purple-700">AI 记忆摘要</h3>
          <div className="text-sm whitespace-pre-wrap">{aiMemory}</div>
        </div>
      )}

      {/* 行程描述 */}
      <div className="bg-white border rounded-lg p-4">
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
        {loading ? '生成中...' : 'AI 智能生成'}
      </button>

      {/* 生成结果 */}
      {result.length > 0 && (
        <div className="mt-4 bg-white border rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">生成结果预览</h3>
            <button
              onClick={handleSaveSchedules}
              className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm"
            >
              保存到日程
            </button>
          </div>
          <div className="space-y-2">
            {result.map((item) => (
              <div key={item.id} className="border-b pb-2">
                <div className="text-sm text-gray-500">{item.date} {item.time}</div>
                <div className="font-medium">{item.task}</div>
                <div className="text-sm text-gray-600">{item.location}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                  item.type === '客户拜访' ? 'bg-blue-100 text-blue-800' :
                  item.type === '交通' ? 'bg-green-100 text-green-800' :
                  item.type === '餐饮' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AIGeneratePage