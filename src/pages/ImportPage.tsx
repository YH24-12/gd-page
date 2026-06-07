import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomerStore } from '../stores/customerStore'
import {
  DEFAULT_MAPPING_RULES,
  autoMatchColumns,
  cleanCustomerData,
  getMappingTemplates,
  saveMappingTemplate,
  deleteMappingTemplate,
  calculateMatchAccuracy,
  type CustomerData,
  type MappingTemplate
} from '../utils/customerMapping'

// Excel单元格接口
interface ExcelCell {
  v?: string | number | boolean | null
  t?: string
  w?: string
}

// 合并单元格范围
interface MergeRange {
  s: { r: number; c: number }
  e: { r: number; c: number }
}

// ExcelSheet使用索引签名
type ExcelSheet = Record<string, ExcelCell | ExcelCell[] | undefined> & {
  '!ref'?: string
  '!merges'?: MergeRange[]
}

// 获取单元格的值
function getCellValue(cell: ExcelCell | ExcelCell[] | undefined): string {
  if (!cell) return ''
  if (Array.isArray(cell)) return ''
  return cell.v !== undefined ? String(cell.v).trim() : ''
}

// 生成唯一的key（用于表头列）
function generateUniqueKey(field: string, header: string, index: number): string {
  return `header-${field}-${header}-${index}`
}

interface MappingItem {
  field: string
  label: string
  required: boolean
  column: string
  matched: boolean
  columnIndex: number // 添加列索引用于生成唯一key
}

interface ParsedSheetInfo {
  name: string
  rowCount: number
  hasCustomerData: boolean
}

interface SheetRawData {
  rawSheet: ExcelSheet
  allRows: string[][] // 所有原始行数据（不经过合并单元格处理）
  maxCol: number
  maxRow: number
}

function ImportPage() {
  const navigate = useNavigate()
  const { customers, loadCustomers, addCustomer } = useCustomerStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([])
  const [extractedCustomers, setExtractedCustomers] = useState<CustomerData[]>([])
  const [templates, setTemplates] = useState<Record<string, MappingTemplate>>({})
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [extractMode, setExtractMode] = useState<'rule' | 'ai'>('rule')
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState<CustomerData | null>(null)

  // 多Sheet支持
  const [sheets, setSheets] = useState<ParsedSheetInfo[]>([])
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0)
  const [headerRowIndex, setHeaderRowIndex] = useState(0)
  const [sheetRawData, setSheetRawData] = useState<Map<number, SheetRawData>>(new Map())

  // 映射列表
  const [mappingList, setMappingList] = useState<MappingItem[]>(() =>
    Object.keys(DEFAULT_MAPPING_RULES).map((field, index) => ({
      field,
      label: DEFAULT_MAPPING_RULES[field].label,
      required: DEFAULT_MAPPING_RULES[field].required,
      column: '',
      matched: false,
      columnIndex: index
    }))
  )

  // 当前映射
  const currentMapping = useMemo(() => {
    return mappingList.reduce((acc, item) => {
      if (item.column) {
        acc[item.field] = item.column
      }
      return acc
    }, {} as Record<string, string>)
  }, [mappingList])

  useEffect(() => {
    setTemplates(getMappingTemplates())
    loadCustomers()
  }, [loadCustomers])

  // 处理文件上传
  const handleUpload = () => {
    fileInputRef.current?.click()
  }

  // 从原始Sheet读取指定行的数据（不受合并单元格影响）
  const readRowFromSheet = (sheet: ExcelSheet, rowIndex: number, maxCol: number): string[] => {
    const row: string[] = []
    for (let c = 0; c <= maxCol; c++) {
      const cellAddress = `${String.fromCharCode(65 + c)}${rowIndex + 1}`
      const cell = sheet[cellAddress]
      row.push(getCellValue(cell))
    }
    return row
  }

  // 解析Sheet并保存原始数据
  const parseSheet = useCallback((sheet: ExcelSheet, _sheetIndex: number) => {
    const range = sheet['!ref'] || 'A1'
    const decoded = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (!decoded) return null

    const maxCol = decoded[3].charCodeAt(0) - 65
    const maxRow = parseInt(decoded[4]) - 1

    // 读取所有原始行（不处理合并单元格）
    const allRows: string[][] = []
    for (let r = 0; r < maxRow; r++) {
      const row = readRowFromSheet(sheet, r, maxCol)
      // 跳过完全空的行
      const hasData = row.some(cell => cell.trim() !== '')
      if (hasData || allRows.length === 0) {
        allRows.push(row)
      }
    }

    return {
      rawSheet: sheet,
      allRows,
      maxCol,
      maxRow
    }
  }, [])

  // 根据表头行解析数据
  const parseDataWithHeaderRow = useCallback((
    allRows: string[][],
    headerRow: number,
    maxCol: number
  ) => {
    // 生成表头
    const newHeaders: string[] = []
    for (let c = 0; c <= maxCol && c < (allRows[headerRow]?.length || 0); c++) {
      const value = allRows[headerRow]?.[c] || ''
      newHeaders.push(value || `列${c + 1}`)
    }

    // 生成数据行（跳过表头行）
    const newRows: string[][] = []
    for (let r = headerRow + 1; r < allRows.length; r++) {
      const row: string[] = []
      let hasData = false
      for (let c = 0; c < newHeaders.length; c++) {
        const value = allRows[r]?.[c] || ''
        row.push(value)
        if (value.trim()) hasData = true
      }
      if (hasData) {
        newRows.push(row)
      }
    }

    return { headers: newHeaders, rows: newRows }
  }, [])

  // 选择Sheet时的处理
  const handleSheetChange = useCallback((sheetIndex: number) => {
    setSelectedSheetIndex(sheetIndex)
    setHeaderRowIndex(0)

    const rawData = sheetRawData.get(sheetIndex)
    if (!rawData) return

    const { headers: newHeaders, rows: newRows } = parseDataWithHeaderRow(
      rawData.allRows,
      0,
      rawData.maxCol
    )
    setHeaders(newHeaders)
    setRawRows(newRows)

    // 转换为对象数组
    const dataObjects = newRows.map(row => {
      const obj: Record<string, string> = {}
      newHeaders.forEach((h, i) => {
        obj[h] = row[i] || ''
      })
      return obj
    })
    setParsedData(dataObjects)

    // 自动匹配列
    const autoMapping = autoMatchColumns(newHeaders)
    setMappingList(prev => prev.map((item, idx) => ({
      ...item,
      column: autoMapping[item.field] || '',
      matched: !!autoMapping[item.field],
      columnIndex: idx
    })))

    // 提取客户数据
    if (autoMapping.companyName) {
      extractCustomers(autoMapping, dataObjects)
    }
  }, [sheetRawData, parseDataWithHeaderRow])

  // 表头行变化时的处理
  const handleHeaderRowChange = useCallback((newHeaderRow: number) => {
    setHeaderRowIndex(newHeaderRow)

    const rawData = sheetRawData.get(selectedSheetIndex)
    if (!rawData) return

    // 直接从原始数据读取，不经过合并单元格处理
    const { headers: newHeaders, rows: newRows } = parseDataWithHeaderRow(
      rawData.allRows,
      newHeaderRow,
      rawData.maxCol
    )

    setHeaders(newHeaders)
    setRawRows(newRows)

    // 转换为对象数组
    const dataObjects = newRows.map(row => {
      const obj: Record<string, string> = {}
      newHeaders.forEach((h, i) => {
        obj[h] = row[i] || ''
      })
      return obj
    })
    setParsedData(dataObjects)

    // 自动匹配列
    const autoMapping = autoMatchColumns(newHeaders)
    setMappingList(prev => prev.map((item, idx) => ({
      ...item,
      column: autoMapping[item.field] || '',
      matched: !!autoMapping[item.field],
      columnIndex: idx
    })))

    // 提取客户数据
    if (autoMapping.companyName) {
      extractCustomers(autoMapping, dataObjects)
    }
  }, [sheetRawData, selectedSheetIndex, parseDataWithHeaderRow])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setFileName(file.name)

    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()

      const workbook = XLSX.read(arrayBuffer, {
        cellDates: true,
        cellNF: false,
        cellHTML: false
      })

      // 解析所有Sheet
      const sheetInfos: ParsedSheetInfo[] = []
      const newSheetRawData = new Map<number, SheetRawData>()

      workbook.SheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName]
        const parsed = parseSheet(sheet, index)

        if (parsed) {
          newSheetRawData.set(index, parsed)

          // 检查是否有客户数据
          const hasCustomerData = sheetName.includes('客户') ||
            sheetName.includes('customer') ||
            sheetName.includes('Customer')

          sheetInfos.push({
            name: sheetName,
            rowCount: parsed.allRows.length,
            hasCustomerData
          })
        }
      })

      setSheets(sheetInfos)
      setSheetRawData(newSheetRawData)

      // 默认选择包含"客户"的Sheet
      let defaultSheetIndex = 0
      const customerSheetIndex = sheetInfos.findIndex(s => s.hasCustomerData)
      if (customerSheetIndex >= 0) {
        defaultSheetIndex = customerSheetIndex
      }

      setSelectedSheetIndex(defaultSheetIndex)

      // 解析默认Sheet
      const rawData = newSheetRawData.get(defaultSheetIndex)
      if (rawData) {
        // 智能检测表头行
        const previewRows = rawData.allRows.slice(0, Math.min(8, rawData.allRows.length))
        const KEY_HEADER_KEYWORDS = ['客户', '公司', '联系人', '电话', '城市', '市', '地址', '产品']

        let detectedHeaderRow = 0
        for (let i = 0; i < previewRows.length; i++) {
          const row = previewRows[i]
          const matchedKeywords = row.filter(cell =>
            KEY_HEADER_KEYWORDS.some(kw =>
              cell.toLowerCase().includes(kw.toLowerCase())
            )
          ).length
          if (matchedKeywords >= 2) {
            detectedHeaderRow = i
            break
          }
        }

        setHeaderRowIndex(detectedHeaderRow)

        const { headers: newHeaders, rows: newRows } = parseDataWithHeaderRow(
          rawData.allRows,
          detectedHeaderRow,
          rawData.maxCol
        )

        setHeaders(newHeaders)
        setRawRows(newRows)

        const dataObjects = newRows.map(row => {
          const obj: Record<string, string> = {}
          newHeaders.forEach((h, i) => {
            obj[h] = row[i] || ''
          })
          return obj
        })
        setParsedData(dataObjects)

        // 自动匹配列
        const autoMapping = autoMatchColumns(newHeaders)
        setMappingList(prev => prev.map((item, idx) => ({
          ...item,
          column: autoMapping[item.field] || '',
          matched: !!autoMapping[item.field],
          columnIndex: idx
        })))

        // 提取客户数据
        if (autoMapping.companyName) {
          extractCustomers(autoMapping, dataObjects)
        }
      }

      alert(`文件解析成功，共 ${sheetInfos.length} 个工作表`)
    } catch (error) {
      console.error(error)
      alert('文件解析失败，请检查文件格式')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 映射变化时重新提取
  const handleMappingChange = (field: string, column: string) => {
    setMappingList(prev => prev.map(item =>
      item.field === field ? { ...item, column, matched: !!column } : item
    ))
  }

  // 提取客户数据
  const extractCustomers = (
    mapping?: Record<string, string>,
    data?: Record<string, string>[]
  ) => {
    const useMapping = mapping || currentMapping
    const useData = data || parsedData

    if (!useMapping.companyName) {
      setExtractedCustomers([])
      return
    }

    const results = cleanCustomerData(useData, useMapping)
    setExtractedCustomers(results)
  }

  // 应用模板
  const handleApplyTemplate = (name: string) => {
    const template = templates[name]
    if (!template) return

    setMappingList(prev => prev.map((item, idx) => ({
      ...item,
      column: template.mapping[item.field] || '',
      matched: !!template.mapping[item.field],
      columnIndex: idx
    })))

    setSelectedTemplate(name)
    extractCustomers(template.mapping, parsedData)
  }

  // 保存模板
  const handleSaveTemplate = () => {
    const name = prompt('请输入模板名称：')
    if (!name?.trim()) return

    saveMappingTemplate(name.trim(), currentMapping)
    setTemplates(getMappingTemplates())
    alert('模板保存成功')
  }

  // 删除模板
  const handleDeleteTemplate = (name: string) => {
    if (confirm(`确定要删除模板"${name}"吗？`)) {
      deleteMappingTemplate(name)
      setTemplates(getMappingTemplates())
      if (selectedTemplate === name) {
        setSelectedTemplate('')
      }
    }
  }

  // 编辑客户
  const handleEditCustomer = (index: number) => {
    setEditIndex(index)
    setEditData({ ...extractedCustomers[index] })
  }

  const handleSaveEdit = () => {
    if (editIndex === null || !editData) return

    setExtractedCustomers(prev => prev.map((c, i) =>
      i === editIndex ? { ...editData, updateTime: new Date().toISOString() } : c
    ))
    setEditIndex(null)
    setEditData(null)
  }

  // 删除客户
  const handleDeleteCustomer = (index: number) => {
    setExtractedCustomers(prev => prev.filter((_, i) => i !== index))
  }

  // 确认导入
  const handleConfirmImport = async () => {
    if (extractedCustomers.length === 0) {
      alert('没有可导入的客户数据')
      return
    }

    setImporting(true)

    try {
      let added = 0
      let skipped = 0

      for (const customer of extractedCustomers) {
        const exists = customers.some(
          c => c.companyName === customer.companyName || c.shortName === customer.shortName
        )
        if (exists) {
          skipped++
          continue
        }
        await addCustomer(customer)
        added++
      }

      alert(`成功导入 ${added} 个客户${skipped > 0 ? `，跳过 ${skipped} 个已存在客户` : ''}`)
      navigate('/customers')
    } catch (error) {
      console.error(error)
      alert('导入失败，请重试')
    } finally {
      setImporting(false)
    }
  }

  // 重置
  const handleReset = () => {
    setFileName(null)
    setSheets([])
    setSheetRawData(new Map())
    setSelectedSheetIndex(0)
    setHeaderRowIndex(0)
    setHeaders([])
    setRawRows([])
    setParsedData([])
    setExtractedCustomers([])
    setMappingList(prev => prev.map((item, idx) => ({
      ...item,
      column: '',
      matched: false,
      columnIndex: idx
    })))
    setSelectedTemplate('')
  }

  // 一键修复表头 - 针对苯基产品线客户跟踪周报
  const handleQuickFix = () => {
    // 1. 查找包含"客户开发与跟踪"的Sheet
    const targetSheetIndex = sheets.findIndex(s =>
      s.name.includes('客户开发与跟踪') ||
      s.name.includes('客户跟踪') ||
      s.hasCustomerData
    )

    if (targetSheetIndex >= 0) {
      setSelectedSheetIndex(targetSheetIndex)

      const rawData = sheetRawData.get(targetSheetIndex)
      if (!rawData) return

      // 2. 智能检测表头行
      const allRows = rawData.allRows
      const KEY_HEADER_KEYWORDS = ['客户', '公司', '联系人', '电话', '市', '城市', '地址', '产品', '阶段']

      let detectedHeaderRow = 0
      for (let i = 0; i < Math.min(8, allRows.length); i++) {
        const row = allRows[i]
        const matchedKeywords = row.filter(cell =>
          KEY_HEADER_KEYWORDS.some(kw =>
            cell.toLowerCase().includes(kw.toLowerCase())
          )
        ).length
        if (matchedKeywords >= 2) {
          detectedHeaderRow = i
          break
        }
      }

      setHeaderRowIndex(detectedHeaderRow)

      // 3. 解析数据
      const { headers: newHeaders, rows: newRows } = parseDataWithHeaderRow(
        allRows,
        detectedHeaderRow,
        rawData.maxCol
      )

      setHeaders(newHeaders)
      setRawRows(newRows)

      // 4. 手动指定映射
      const quickFixMapping: Record<string, string> = {}

      newHeaders.forEach((h) => {
        const headerLower = h.toLowerCase()

        // 客户/公司名称 - 优先匹配
        if (!quickFixMapping.companyName && headerLower.includes('客户') && !headerLower.includes('阶段')) {
          quickFixMapping.companyName = h
        }
        // 城市
        if (!quickFixMapping.city && (headerLower.includes('市') || headerLower.includes('城市') || headerLower.includes('区域'))) {
          quickFixMapping.city = h
        }
        // 联系人
        if (!quickFixMapping.contactPerson && (headerLower.includes('联系人') || headerLower.includes('对接人') || headerLower === '姓名')) {
          quickFixMapping.contactPerson = h
        }
        // 电话/联系方式
        if (!quickFixMapping.phone && (headerLower.includes('电话') || headerLower.includes('手机') || headerLower.includes('联系方式'))) {
          quickFixMapping.phone = h
        }
        // 地址
        if (!quickFixMapping.address && headerLower.includes('地址')) {
          quickFixMapping.address = h
        }
        // 备注/主要产品/阶段
        if (!quickFixMapping.notes && (headerLower.includes('备注') || headerLower.includes('产品') || headerLower.includes('阶段'))) {
          quickFixMapping.notes = h
        }
      })

      // 如果没找到"客户"列，尝试其他方式
      if (!quickFixMapping.companyName) {
        for (let i = 0; i < Math.min(5, newHeaders.length); i++) {
          const h = newHeaders[i]
          if (h && h.length > 2 && h.length < 20 && !h.startsWith('列')) {
            quickFixMapping.companyName = h
            break
          }
        }
      }

      // 5. 应用映射
      setMappingList(prev => prev.map((item, idx) => ({
        ...item,
        column: quickFixMapping[item.field] || '',
        matched: !!quickFixMapping[item.field],
        columnIndex: idx
      })))

      // 6. 转换为对象数组
      const dataObjects = newRows.map(row => {
        const obj: Record<string, string> = {}
        newHeaders.forEach((h, i) => {
          obj[h] = row[i] || ''
        })
        return obj
      })
      setParsedData(dataObjects)

      // 7. 提取客户数据
      extractCustomers(quickFixMapping, dataObjects)

      alert(`一键修复完成！已提取 ${extractedCustomers.length} 条客户数据`)
    } else {
      alert('未找到客户相关工作表，请手动选择Sheet和表头行')
    }
  }

  const accuracy = calculateMatchAccuracy(currentMapping)

  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">导入客户资料</h1>
          <p className="text-gray-500 text-sm">
            {fileName ? `已选择: ${fileName}` : '选择 Excel 文件导入客户信息'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setExtractMode('rule')}
            className={`px-4 py-2 rounded ${extractMode === 'rule' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            规则引擎提取
          </button>
          <button
            onClick={() => setExtractMode('ai')}
            className={`px-4 py-2 rounded ${extractMode === 'ai' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            AI 提取
          </button>
        </div>
      </header>

      {/* 文件上传区域 */}
      <div className="bg-white border rounded-lg p-6 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium disabled:bg-gray-300"
          >
            {uploading ? '解析中...' : '选择 Excel 文件'}
          </button>
          {fileName && (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                重新选择
              </button>
              <button
                onClick={handleQuickFix}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                title="针对苯基产品线客户跟踪周报格式自动修复"
              >
                一键修复表头
              </button>
            </>
          )}

          {/* Sheet选择下拉框 */}
          {sheets.length > 1 && (
            <select
              value={selectedSheetIndex}
              onChange={(e) => handleSheetChange(Number(e.target.value))}
              className="border rounded px-3 py-2 text-sm"
            >
              {sheets.map((sheet, index) => (
                <option key={sheet.name} value={index}>
                  {sheet.name} ({sheet.rowCount}行)
                </option>
              ))}
            </select>
          )}

          {/* 表头行选择 */}
          {headers.length > 0 && rawRows.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">表头行：</label>
              <select
                value={headerRowIndex}
                onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {Array.from({ length: Math.min(10, rawRows.length + 1) }, (_, i) => (
                  <option key={i} value={i}>第 {i + 1} 行</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">支持 .xlsx, .xls, .csv 格式</p>
      </div>

      {/* 表头预览 */}
      {headers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-blue-800 mb-2">检测到的表头（第 {headerRowIndex + 1} 行）：</h3>
          <div className="flex flex-wrap gap-2">
                       {headers.map((h, index) => {
              const matched = mappingList.find(m => m.column === h)?.matched
              const uniqueKey = h ? `preview-${h}` : `preview-col-${index}`
              return (
                <span
                  key={uniqueKey}
                  className={`px-2 py-1 rounded text-sm ${
                    matched
                      ? 'bg-green-200 text-green-800 border border-green-400'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  {h || `列${index + 1}`}
                </span>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">绿色边框表示已自动匹配到系统字段</p>
        </div>
      )}

      {/* 字段映射区域 */}
      {headers.length > 0 && extractMode === 'rule' && (
        <div className="bg-white border rounded-lg p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-bold text-lg">字段映射</h2>
              <p className="text-sm text-gray-500">
                匹配准确度: {accuracy}% · 已匹配 {Object.keys(currentMapping).length} 个字段
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={selectedTemplate}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">选择模板</option>
                {Object.keys(templates).map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveTemplate}
                className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
              >
                保存当前映射
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-4 py-2 text-left">系统字段</th>
                  <th className="border px-4 py-2 text-left">Excel 列</th>
                  <th className="border px-4 py-2 text-center">是否匹配</th>
                  <th className="border px-4 py-2 text-center">必填</th>
                </tr>
              </thead>
              <tbody>
                {mappingList.map(item => (
                  <tr
                    key={item.field}
                    className={`hover:bg-gray-50 ${item.matched ? 'bg-green-50' : ''}`}
                  >
                    <td className="border px-4 py-2">
                      {item.label}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </td>
                    <td className="border px-4 py-2">
                      <select
                        value={item.column}
                        onChange={(e) => handleMappingChange(item.field, e.target.value)}
                        className={`w-full border rounded px-2 py-1 ${
                          item.matched ? 'border-green-400 bg-green-50' : ''
                        }`}
                      >
                        <option value="">不映射</option>
                        {headers.map((h, idx) => (
                          <option key={generateUniqueKey(item.field, h, idx)} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border px-4 py-2 text-center">
                      {item.matched ? (
                        <span className="text-green-600 text-lg">✓</span>
                      ) : (
                        <span className="text-gray-300 text-lg">-</span>
                      )}
                    </td>
                    <td className="border px-4 py-2 text-center">
                      {item.required ? (
                        <span className="text-red-500 text-sm">必填</span>
                      ) : (
                        <span className="text-gray-400 text-sm">可选</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI提取模式提示 */}
      {extractMode === 'ai' && headers.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-4">
          <p className="text-purple-700">
            请前往「AI生成」页面，使用「AI 提取客户」功能从导入文件中提取客户信息
          </p>
        </div>
      )}

      {/* 提取结果预览 */}
      {extractedCustomers.length > 0 && (
        <div className="bg-white border rounded-lg p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">
              提取结果预览 (共 {extractedCustomers.length} 条)
            </h2>
            <button
              onClick={handleConfirmImport}
              disabled={importing}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium disabled:bg-gray-300"
            >
              {importing ? '导入中...' : '确认导入'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-3 py-2 text-left">公司名称</th>
                  <th className="border px-3 py-2 text-left">简称</th>
                  <th className="border px-3 py-2 text-left">城市</th>
                  <th className="border px-3 py-2 text-left">联系人</th>
                  <th className="border px-3 py-2 text-left">电话</th>
                  <th className="border px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {extractedCustomers.map((customer, index) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="border px-3 py-2">{customer.companyName}</td>
                    <td className="border px-3 py-2">{customer.shortName}</td>
                    <td className="border px-3 py-2">{customer.city}</td>
                    <td className="border px-3 py-2">{customer.contactPerson}</td>
                    <td className="border px-3 py-2">{customer.phone}</td>
                    <td className="border px-3 py-2">
                      <button
                        onClick={() => handleEditCustomer(index)}
                        className="text-blue-500 text-sm mr-2"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(index)}
                        className="text-red-500 text-sm"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 编辑客户弹窗 */}
      {editIndex !== null && editData && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setEditIndex(null); setEditData(null) }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">编辑客户信息</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">公司名称 *</label>
                <input
                  type="text"
                  value={editData.companyName}
                  onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">简称</label>
                  <input
                    type="text"
                    value={editData.shortName}
                    onChange={(e) => setEditData({ ...editData, shortName: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">城市</label>
                  <input
                    type="text"
                    value={editData.city}
                    onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">地址</label>
                <input
                  type="text"
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">联系人</label>
                  <input
                    type="text"
                    value={editData.contactPerson}
                    onChange={(e) => setEditData({ ...editData, contactPerson: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">电话</label>
                  <input
                    type="text"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">备注</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setEditIndex(null); setEditData(null) }}
                className="px-4 py-2 border rounded"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 模板管理 */}
      {Object.keys(templates).length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="font-medium mb-2">已保存的映射模板</h3>
          <div className="flex flex-wrap gap-2">
            {Object.keys(templates).map(name => (
              <div key={name} className="bg-white border rounded px-3 py-2 flex items-center gap-2">
                <span className="text-sm">{name}</span>
                <button
                  onClick={() => handleApplyTemplate(name)}
                  className="text-blue-500 text-sm"
                >
                  应用
                </button>
                <button
                  onClick={() => handleDeleteTemplate(name)}
                  className="text-red-500 text-sm"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportPage