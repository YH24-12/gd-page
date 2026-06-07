/**
 * 升级版文件解析引擎
 * 支持 Excel/PDF/Word 表格解析，保留原始格式和数据结构
 */

import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'
import Tesseract from 'tesseract.js'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// ==================== 类型定义 ====================

export interface ParsedFileResult {
  content: string        // 解析后的文本内容
  rawBlob: Blob          // 原始文件Blob
  mimeType: string       // MIME类型
  sheets: ParsedSheet[]  // 解析后的表格数据
}

export interface ParsedRow {
  _id: string            // 唯一ID
  _rowIndex: number     // 行索引
  cells: string[]       // 单元格数据
}

export interface ParsedSheet {
  name: string           // Sheet名称
  headers: string[]       // 表头行
  data: ParsedRow[]     // 数据行（不含表头）
  rawData: any[][]      // 原始数据（含类型信息）
}

export interface ParseProgress {
  percent: number
  stage: string
  message: string
}

export type ProgressCallback = (progress: ParseProgress) => void

// ==================== 工具函数 ====================

/**
 * 去除单元格中的多余空格和换行
 */
function cleanCellValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'boolean') return value ? '是' : '否'

  let str = String(value)
  // 去除多余空白
  str = str.replace(/\s+/g, ' ')
  str = str.trim()
  return str
}

/**
 * 判断是否为空值
 */
function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (typeof value === 'number' && isNaN(value)) return true
  return false
}

/**
 * 统一日期格式
 */
function normalizeDate(value: any): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  if (typeof value === 'number') {
    // Excel日期序列号
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }
  if (typeof value === 'string') {
    // 尝试解析常见日期格式
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  return cleanCellValue(value)
}

/**
 * 统一时间格式
 */
function normalizeTime(value: any): string {
  if (typeof value === 'number') {
    // Excel时间序列号（分数部分）
    const totalMinutes = Math.round(value * 24 * 60)
    const hours = Math.floor(totalMinutes / 60) % 24
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  if (typeof value === 'string') {
    // 尝试解析时间格式
    const match = value.match(/(\d{1,2}):(\d{2})/)
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`
    }
  }
  return cleanCellValue(value)
}

/**
 * 根据文件名获取MIME类型
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'csv': 'text/csv',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'ppt': 'application/vnd.ms-powerpoint',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html'
  }
  return mimeMap[ext] || 'application/octet-stream'
}

/**
 * 过滤完全空白的行
 */
function filterEmptyRows(data: any[][], maxEmptyCells: number = 2): any[][] {
  return data.filter(row => {
    const nonEmpty = row.filter(cell => !isEmptyValue(cell)).length
    return nonEmpty > maxEmptyCells
  })
}

/**
 * 过滤完全空白的列
 */
function filterEmptyColumns(data: any[][], maxEmptyRatio: number = 0.8): any[][] {
  if (data.length === 0) return []

  const colCount = data[0].length
  const rowCount = data.length

  // 统计每列的非空单元格数量
  const nonEmptyCounts = Array(colCount).fill(0)
  for (const row of data) {
    for (let i = 0; i < row.length; i++) {
      if (!isEmptyValue(row[i])) {
        nonEmptyCounts[i]++
      }
    }
  }

  // 保留非空比例超过阈值的列
  const keepColumns = nonEmptyCounts.map(count => count / rowCount > maxEmptyRatio)
  return data.map(row => row.filter((_, i) => keepColumns[i]))
}

// ==================== Excel解析 ====================

// 表头关键词列表（用于智能检测）
const HEADER_KEYWORDS = [
  '客户', '公司', '联系人', '电话', '城市', '市', '地址',
  '产品', '阶段', '备注', '邮箱', '邮件', '姓名', '负责人',
  '手机', '传真', '邮编', '区域', '类型', '名称'
]

/**
 * 智能检测表头行（支持第1-3行）
 */
function detectHeaderRow(data: any[][], maxHeaderRows: number = 3): number {
  for (let i = 0; i < Math.min(maxHeaderRows, data.length); i++) {
    const row = data[i]
    const nonEmpty = row.filter(cell => !isEmptyValue(cell)).length
    const total = row.length

    // 如果超过60%的单元格非空，认为是表头行
    if (nonEmpty / total > 0.6) {
      return i
    }
  }
  return 0
}

/**
 * 智能表头检测（基于关键词匹配）
 * @param data原始数据行
 * @param maxCheckRows 最多检查前N行
 * @returns 表头行索引，如果未找到返回-1
 */
export function detectSmartHeaderRow(data: string[][], maxCheckRows: number = 8): number {
  if (data.length === 0) return -1

  for (let i = 0; i < Math.min(maxCheckRows, data.length); i++) {
    const row = data[i]
    const nonEmptyCount = row.filter(cell => !isEmptyValue(cell)).length

    // 跳过空行
    if (nonEmptyCount < 2) continue

    // 统计关键词匹配数
    const matchedCount = row.filter(cell => {
      const text = String(cell).toLowerCase()
      return HEADER_KEYWORDS.some(kw => text.includes(kw.toLowerCase()))
    }).length

    //匹配关键词超过2个，认为是表头行
    if (matchedCount >= 2) {
      return i
    }
  }

  return -1
}

/**
 * 处理Excel日期类型
 */
function processExcelCellValue(cell: any, cellType: string | number): any {
  // 日期类型 (1900 和 1904 日期系统)
  if (cellType === 'd' || cellType === 'n' && typeof cell === 'number' && cell > 25569 && cell < 2958465) {
    return normalizeDate(cell)
  }
  // 时间类型
  if (cellType === 't' || cellType === 'n' && typeof cell === 'number' && cell >= 0 && cell < 1) {
    return normalizeTime(cell)
  }
  return cell
}

/**
 * 解析Excel文件（增强版）-修复列显示不全问题
 * 强制解析所有列，保留所有行
 */
async function parseExcelEnhanced(
  file: File,
  onProgress?: ProgressCallback
): Promise<ParsedSheet[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer

        // 使用更完整的配置读取Excel
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellHTML: false,
          sheetStubs: true  // 保留空单元格
        })

        const sheets: ParsedSheet[] = []

        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
          onProgress?.({
            percent: 30 + (sheetIndex / workbook.SheetNames.length) * 60,
            stage: '解析中',
            message: `正在处理工作表: ${sheetName}`
          })

          const sheet = workbook.Sheets[sheetName]

          // 获取表格的实际范围（包括所有有内容的列）
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
          const maxRow = range.e.r // 0-indexed, so total rows = maxRow + 1
          const maxCol = range.e.c  // 0-indexed, so total cols = maxCol + 1

          // 获取合并单元格信息
          const merges = sheet['!merges'] || []

          // 生成完整的表头数组 - 从第0行获取所有列
          const headers: string[] = []
          for (let c = 0; c <= maxCol; c++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c })
            const cell = sheet[cellAddress]
            const headerValue = cell ? cleanCellValue(processExcelCellValue(cell.v, cell.t)) : ''
            headers.push(headerValue || `列${c + 1}`)  // 如果表头为空，显示"列X"
          }

          // 构建合并单元格的映射，用于快速查找
          const mergeMap = new Map<string, { r: number; c: number }>()
          for (const merge of merges) {
            for (let r = merge.s.r; r <= merge.e.r; r++) {
              for (let c = merge.s.c; c <= merge.e.c; c++) {
                mergeMap.set(XLSX.utils.encode_cell({ r, c }), { r: merge.s.r, c: merge.s.c })
              }
            }
          }

          // 生成完整的数据数组 -包含所有行和所有列
          const rawData: string[][] = []
          const dataRows: ParsedRow[] = []
          let rowCounter = 0

          for (let r = 1; r <= maxRow; r++) {
            const row: string[] = []
            let hasData = false

            for (let c = 0; c <= maxCol; c++) {
              const cellAddress = XLSX.utils.encode_cell({ r, c })

              // 检查是否是合并单元格的一部分
              const mergeInfo = mergeMap.get(cellAddress)
              if (mergeInfo) {
                // 使用合并范围的主单元格值
                const masterCell = sheet[cellAddress] // 复用当前cell引用
                const value = masterCell ? cleanCellValue(processExcelCellValue(masterCell.v, masterCell.t)) : ''
                row.push(value)
                if (value) hasData = true
              } else {
                // 普通单元格
                const cell = sheet[cellAddress]
                if (cell) {
                  const value = cleanCellValue(processExcelCellValue(cell.v, cell.t))
                  row.push(value)
                  if (value) hasData = true
                } else {
                  row.push('')
                }
              }
            }

            // 只保留至少有一个单元格有数据的行
            if (hasData) {
              rawData.push(row)
              dataRows.push({
                _id: crypto.randomUUID(),
                _rowIndex: rowCounter++,
                cells: row
              })
            }
          }

          // 如果没有数据行，使用表头数量生成空数据
          if (dataRows.length === 0) {
            dataRows.push({
              _id: crypto.randomUUID(),
              _rowIndex: 0,
              cells: []
            })
          }

          sheets.push({
            name: sheetName,
            headers,
            data: dataRows,
            rawData: [headers, ...rawData]
          })
        })

        onProgress?.({ percent: 100, stage: '完成', message: 'Excel解析完成' })
        resolve(sheets)
      } catch (err) {
        reject(new Error('Excel解析失败: ' + (err as Error).message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// ==================== PDF 解析 ====================

/**
 * 从PDF中提取表格
 */
async function extractTablesFromPDF(page: any): Promise<string[][]> {
  const textContent = await page.getTextContent()
  const textItems = textContent.items as any[]

  if (!textItems || textItems.length === 0) return []

  // 按Y坐标分组（同一行的文本）
  const lines: Map<number, any[]> = new Map()
  let currentLine: any[] = []
  let currentY: number | null = null

  for (const item of textItems) {
    if (!item.str.trim()) continue

    const y = Math.round(item.transform[5])
    if (currentY === null) {
      currentY = y
    }

    if (Math.abs(y - currentY) < 2) {
      currentLine.push(item)
    } else {
      if (currentLine.length > 0) {
        lines.set(currentY, currentLine)
      }
      currentLine = [item]
      currentY = y
    }
  }
  if (currentLine.length > 0 && currentY !== null) {
    lines.set(currentY, currentLine)
  }

  // 按X坐标排序每行
  const sortedLines: any[][] = []
  lines.forEach((lineItems, _y) => {
    const sorted = lineItems.sort((a, b) => a.transform[4] - b.transform[4])
    sortedLines.push(sorted)
  })

  // 按Y坐标降序排序（PDF Y坐标从上到下递减）
  sortedLines.sort((a, b) => b[0].transform[5] - a[0].transform[5])

  // 转换为字符串矩阵
  return sortedLines.map(line =>
    line.map(item => item.str || '')
  )
}

/**
 * 尝试OCR识别（用于扫描件PDF）
 */
async function performOCROnPDFPage(
  page: any,
  onProgress?: ProgressCallback
): Promise<string[][]> {
  const viewport = page.getViewport({ scale: 2.0 })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise

  onProgress?.({ percent: 50, stage: 'OCR识别', message: '正在进行文字识别...' })

  const result = await Tesseract.recognize(canvas, 'eng+chi_sim', {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        onProgress?.({
          percent: 50 + m.progress * 50,
          stage: 'OCR识别',
          message: `文字识别中 ${Math.round(m.progress * 100)}%`
        })
      }
    }
  })

  //解析OCR结果，转换为矩阵
  const lines = result.data.text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(/\s+/).filter(word => word.length > 0))

  return lines
}

/**
 * 解析PDF文件（增强版）
 */
async function parsePDFEnhanced(
  file: File,
  onProgress?: ProgressCallback
): Promise<ParsedSheet[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        const pdf = await pdfjsLib.getDocument({ data }).promise

        const totalPages = pdf.numPages
        const allRows: string[][] = []

        for (let i = 1; i <= totalPages; i++) {
          onProgress?.({
            percent: (i / totalPages) * 80,
            stage: '解析中',
            message: `正在处理第 ${i} 页，共 ${totalPages} 页`
          })

          const page = await pdf.getPage(i)

          // 先尝试直接提取表格
          const tableRows = await extractTablesFromPDF(page)

          if (tableRows.length > 3) {
            // 有足够的表格数据
            allRows.push(...tableRows)
          } else {
            // 表格数据太少，可能是扫描件，进行OCR
            onProgress?.({
              percent: (i / totalPages) * 80,
              stage: 'OCR识别',
              message: `第 ${i} 页表格数据不足，正在OCR识别...`
            })
            const ocrRows = await performOCROnPDFPage(page, (p) => {
              onProgress?.({
                percent: (i / totalPages) * 80 + p.percent * 0.2,
                stage: p.stage,
                message: p.message
              })
            })
            allRows.push(...ocrRows)
          }
        }

        onProgress?.({ percent: 90, stage: '处理中', message: '正在格式化数据...' })

        // 过滤空行
        const filteredRows = filterEmptyRows(allRows, 1)
        const filteredCols = filterEmptyColumns(filteredRows)

        if (filteredCols.length === 0) {
          resolve([{
            name: 'PDF内容',
            headers: [],
            data: [],
            rawData: []
          }])
          return
        }

        // 智能检测表头
        const headerRowIndex = detectHeaderRow(filteredCols)
        const headers = filteredCols[headerRowIndex].map(cleanCellValue)
        const dataRows = filteredCols.slice(headerRowIndex + 1).map(row =>
          row.map(cell => cleanCellValue(cell))
        )

        // 转换为 ParsedRow 格式
        const parsedRows: ParsedRow[] = dataRows.map((row, idx) => ({
          _id: crypto.randomUUID(),
          _rowIndex: idx,
          cells: row
        }))

        onProgress?.({ percent: 100, stage: '完成', message: 'PDF解析完成' })
        resolve([{
          name: 'PDF内容',
          headers,
          data: parsedRows,
          rawData: filteredCols
        }])
      } catch (err) {
        reject(new Error('PDF解析失败: ' + (err as Error).message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// ==================== Word 解析 ====================

/**
 * 从Word XML中提取表格
 */
function extractTablesFromWordXml(xml: string): string[][] {
  const tables: string[][] = []

  // 匹配表格行
  const rowRegex = /<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g
  // 匹配单元格
  const cellRegex = /<w:tc>([\s\S]*?)<\/w:tc>/g
  // 匹配文本
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g

  let rowMatch
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowContent = rowMatch[1]
    const row: string[] = []

    let cellMatch
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const cellContent = cellMatch[1]
      const textMatches = cellContent.match(textRegex)
      const cellText = textMatches ? textMatches.map(m => m.replace(/<[^>]*>/g, '')).join('') : ''
      row.push(cellText.trim())
    }

    if (row.length > 0) {
      tables.push(row)
    }
  }

  return tables
}

/**
 * 解析Word文件（增强版）
 */
async function parseWordEnhanced(
  file: File,
  onProgress?: ProgressCallback
): Promise<ParsedSheet[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        onProgress?.({ percent: 30, stage: '解析中', message: '正在读取Word文档...' })

        const arrayBuffer = e.target?.result as ArrayBuffer

        // 提取纯文本
        const textResult = await mammoth.extractRawText({ arrayBuffer })

        onProgress?.({ percent: 60, stage: '解析中', message: '正在提取表格...' })

        // 提取表格
        const zip = await JSZip.loadAsync(arrayBuffer)
        const documentXml = await zip.file('word/document.xml')?.async('string') || ''

        const tableRows = extractTablesFromWordXml(documentXml)

        onProgress?.({ percent: 80, stage: '处理中', message: '正在格式化数据...' })

        if (tableRows.length === 0) {
          // 没有表格，返回纯文本
          const lines = textResult.value.split('\n').filter(line => line.trim())
          resolve([{
            name: 'Word内容',
            headers: ['内容'],
            data: lines.map((line, idx) => ({ _id: crypto.randomUUID(), _rowIndex: idx, cells: [line] })),
            rawData: lines.map(line => [line])
          }])
          return
        }

        // 过滤空行空列
        let filteredRows = filterEmptyRows(tableRows, 1)
        filteredRows = filterEmptyColumns(filteredRows)

        if (filteredRows.length === 0) {
          resolve([{
            name: 'Word表格',
            headers: [],
            data: [],
            rawData: []
          }])
          return
        }

        // 检测表头
        const headerRowIndex = detectHeaderRow(filteredRows)
        const headers = filteredRows[headerRowIndex].map(cleanCellValue)
        const dataRows = filteredRows.slice(headerRowIndex + 1).map(row =>
          row.map(cell => cleanCellValue(cell))
        )

        // 转换为 ParsedRow 格式
        const parsedRows: ParsedRow[] = dataRows.map((row, idx) => ({
          _id: crypto.randomUUID(),
          _rowIndex: idx,
          cells: row
        }))

        onProgress?.({ percent: 100, stage: '完成', message: 'Word解析完成' })
        resolve([{
          name: 'Word表格',
          headers,
          data: parsedRows,
          rawData: filteredRows
        }])
      } catch (err) {
        reject(new Error('Word文档解析失败: ' + (err as Error).message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// ==================== PPT 解析 ====================

/**
 * 解析PowerPoint文件
 */
async function parsePowerPointEnhanced(
  file: File,
  onProgress?: ProgressCallback
): Promise<ParsedSheet[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const zip = await JSZip.loadAsync(arrayBuffer)

        onProgress?.({ percent: 50, stage: '解析中', message: '正在提取幻灯片...' })

        const slides: string[][] = []

        // 读取所有slide*.xml文件
        const slideFiles = Object.keys(zip.files)
          .filter(name => name.match(/ppt\/slides\/slide\d+\.xml/))
          .sort()

        for (const slideFile of slideFiles) {
          const content = await zip.file(slideFile)?.async('string')
          if (content) {
            const textMatches = content.match(/<a:t>([^<]*)<\/a:t>/g)
            if (textMatches) {
              const slideText = textMatches
                .map(m => m.replace(/<\/?a:t>/g, ''))
                .filter(text => text.trim())

              if (slideText.length > 0) {
                const slideNum = slideFile.match(/slide(\d+)/)?.[1] || '?'
                slides.push([`[幻灯片 ${slideNum}]`, ...slideText])
              }
            }
          }
        }

        onProgress?.({ percent: 100, stage: '完成', message: 'PPT解析完成' })

        // 转换为 ParsedRow 格式
        const parsedRows: ParsedRow[] = slides.map((slide, idx) => ({
          _id: crypto.randomUUID(),
          _rowIndex: idx,
          cells: slide
        }))

        resolve([{
          name: 'PPT内容',
          headers: ['位置', '内容'],
          data: parsedRows,
          rawData: slides
        }])
      } catch (err) {
        reject(new Error('PPT解析失败: ' + (err as Error).message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// ==================== 文本解析 ====================

/**
 * 解析文本文件
 */
async function parseTextEnhanced(
  file: File,
  onProgress?: ProgressCallback
): Promise<ParsedSheet[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string

      onProgress?.({ percent: 50, stage: '解析中', message: '正在格式化文本...' })

      // 根据文件扩展名选择分隔符
      const ext = file.name.split('.').pop()?.toLowerCase()

      if (ext === 'csv') {
        // CSV文件
        const lines = content.split('\n').filter(line => line.trim())
        const data = lines.map(line => {
          // 简单的CSV解析（处理引号包裹的字段）
          const fields: string[] = []
          let current = ''
          let inQuotes = false

          for (const char of line) {
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              fields.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          fields.push(current.trim())

          return fields.map(f => f.replace(/^"|"$/g, ''))
        })

        const headerRowIndex = detectHeaderRow(data)
        const headers = data[headerRowIndex].map(cleanCellValue)
        const dataRows = data.slice(headerRowIndex + 1).map(row =>
          row.map(cell => cleanCellValue(cell))
        )

        // 转换为 ParsedRow 格式
        const parsedRows: ParsedRow[] = dataRows.map((row, idx) => ({
          _id: crypto.randomUUID(),
          _rowIndex: idx,
          cells: row
        }))

        onProgress?.({ percent: 100, stage: '完成', message: 'CSV解析完成' })
        resolve([{
          name: 'CSV内容',
          headers,
          data: parsedRows,
          rawData: data
        }])
      } else {
        // 普通文本文件
        const lines = content.split('\n').filter(line => line.trim())

        // 转换为 ParsedRow 格式
        const parsedRows: ParsedRow[] = lines.map((line, i) => ({
          _id: crypto.randomUUID(),
          _rowIndex: i,
          cells: [String(i + 1), line.trim()]
        }))

        onProgress?.({ percent: 100, stage: '完成', message: '文本解析完成' })
        resolve([{
          name: '文本内容',
          headers: ['行号', '内容'],
          data: parsedRows,
          rawData: lines.map((line, i) => [String(i + 1), line])
        }])
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

// ==================== 主解析函数 ====================

/**
 * 解析文件（增强版），同时返回原始Blob和解析后的表格数据
 */
export async function parseFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<ParsedFileResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const mimeType = file.type

  onProgress?.({ percent: 10, stage: '读取中', message: '正在读取文件...' })

  // 读取原始文件
  const rawBlob = await file.arrayBuffer().then(ab => new Blob([ab], {
    type: mimeType || getMimeType(file.name)
  }))

  // 根据文件类型选择解析方法
  let sheets: ParsedSheet[] = []

  if (
    ['xlsx', 'xls', 'csv'].includes(extension) ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel')
  ) {
    sheets = await parseExcelEnhanced(file, onProgress)
  } else if (['docx', 'doc'].includes(extension) || mimeType.includes('word')) {
    sheets = await parseWordEnhanced(file, onProgress)
  } else if (['pptx', 'ppt'].includes(extension) || mimeType.includes('presentation')) {
    sheets = await parsePowerPointEnhanced(file, onProgress)
  } else if (extension === 'pdf' || mimeType === 'application/pdf') {
    sheets = await parsePDFEnhanced(file, onProgress)
  } else if (
    ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(extension) ||
    mimeType.startsWith('text/')
  ) {
    sheets = await parseTextEnhanced(file, onProgress)
  } else {
    // 默认尝试作为文本读取
    sheets = await parseTextEnhanced(file, onProgress)
  }

  // 将表格数据转换为文本（用于AI分析）
  const content = sheets.map(sheet => {
    if (sheet.headers.length === 0) return ''

    const headerLine = sheet.headers.join('\t')
    const dataLines = sheet.data.map(row => row.cells.join('\t')).join('\n')

    return `【工作表: ${sheet.name}】\n${headerLine}\n${dataLines}`
  }).join('\n\n')

  return {
    content,
    rawBlob,
    mimeType: mimeType || getMimeType(file.name),
    sheets
  }
}

/**
 * 兼容旧接口：只返回文本内容
 */
export async function parseFileContent(file: File): Promise<string> {
  const result = await parseFile(file)
  return result.content
}