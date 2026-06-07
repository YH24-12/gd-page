import { useState } from 'react'
import type { ParsedSheet, ParseProgress } from '../services/fileParser'

interface FilePreviewModalProps {
  fileName: string
  sheets: ParsedSheet[]
  onClose: () => void
  onDownload: () => void
  onParseCustomers: () => void
  parsingCustomers: boolean
}

export default function FilePreviewModal({
  fileName,
  sheets,
  onClose,
  onDownload,
  onParseCustomers,
  parsingCustomers
}: FilePreviewModalProps) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  const [headerRowIndex, setHeaderRowIndex] = useState(0)
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [hiddenRows, setHiddenRows] = useState<Set<number>>(new Set())
  const [hiddenCols, setHiddenCols] = useState<Set<number>>(new Set())

  const activeSheet = sheets[activeSheetIndex] || { name: '', headers: [], data: [], rawData: [] }

  // 计算可见数据 - 根据新的 ParsedRow 类型调整
  const allRows = headerRowIndex > 0
    ? [{ _id: 'header', _rowIndex: -1, cells: activeSheet.headers }, ...activeSheet.data]
    : activeSheet.data

  const visibleRows = allRows.map((row) => ({ row, index: row._rowIndex }))
    .filter(item => !hiddenRows.has(item.index))

  const visibleCols = activeSheet.headers.map((h, i) => ({ header: h, index: i }))
    .filter(item => !hiddenCols.has(item.index))

  const handleCellEdit = (_rowIndex: number, _colIndex: number, _value: string) => {
    // 编辑功能暂时只更新本地状态
    setEditingCell(null)
  }

  const toggleRow = (index: number) => {
    setHiddenRows(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleCol = (index: number) => {
    setHiddenCols(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const resetView = () => {
    setHeaderRowIndex(0)
    setHiddenRows(new Set())
    setHiddenCols(new Set())
  }

  const getFileTypeIcon = (): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊'
    if (['docx', 'doc'].includes(ext)) return '📝'
    if (['pptx', 'ppt'].includes(ext)) return '📽️'
    if (ext === 'pdf') return '📄'
    return '📃'
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getFileTypeIcon()}</span>
            <div>
              <h3 className="font-bold text-lg">{fileName}</h3>
              <p className="text-xs text-gray-500">
                {sheets.length} 个工作表 · {activeSheet.data.length} 行数据
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onParseCustomers}
              disabled={parsingCustomers || activeSheet.data.length === 0}
              className="bg-orange-500 text-white px-4 py-2 rounded text-sm disabled:bg-gray-300"
            >
              {parsingCustomers ? 'AI解析中...' : 'AI提取客户'}
            </button>
            <button
              onClick={onDownload}
              className="text-green-600 text-sm border border-green-600 px-4 py-2 rounded hover:bg-green-50"
            >
              下载原文件
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 text-xl px-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sheet切换 */}
        {sheets.length > 1 && (
          <div className="flex gap-2 p-3 border-b bg-gray-50 overflow-x-auto shrink-0">
            {sheets.map((sheet, i) => (
              <button
                key={sheet.name}
                onClick={() => {
                  setActiveSheetIndex(i)
                  resetView()
                }}
                className={`px-3 py-1.5 rounded text-sm whitespace-nowrap ${
                  i === activeSheetIndex
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border hover:bg-gray-100'
                }`}
              >
                {sheet.name} ({sheet.data.length}行)
              </button>
            ))}
          </div>
        )}

        {/* 工具栏 */}
        <div className="flex items-center gap-4 p-3 border-b bg-gray-50 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">表头行：</label>
            <select
              value={headerRowIndex}
              onChange={(e) => setHeaderRowIndex(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              {Array.from({ length: Math.min(3, allRows.length) }, (_, i) => (
                <option key={i} value={i}>第 {i + 1} 行</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500">
            已隐藏 {hiddenRows.size} 行, {hiddenCols.size} 列
          </div>
          <button
            onClick={resetView}
            className="text-blue-500 text-sm hover:underline"
          >
            重置视图
          </button>
        </div>

        {/* 表格区域 */}
        <div className="flex-1 overflow-auto p-4">
          {activeSheet.data.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>此工作表没有数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border text-sm">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border px-2 py-2 w-12 shrink-0">#</th>
                    {visibleCols.map((col, _colIdx) => (
                      <th key={col.index} className="border px-3 py-2 text-left min-w-[100px]">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{col.header || `列${col.index + 1}`}</span>
                          <button
                            onClick={() => toggleCol(col.index)}
                            className="text-gray-400 hover:text-gray-600 ml-2"
                            title="隐藏此列"
                          >
                            ✕
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((item) => (
                    <tr
                      key={item.row._id}
                      className={`hover:bg-yellow-50 ${item.index === headerRowIndex ? 'bg-blue-50' : ''}`}
                    >
                      <td className="border px-2 py-1 w-12 shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs">{item.index + 1}</span>
                          <button
                            onClick={() => toggleRow(item.index)}
                            className="text-gray-300 hover:text-gray-500"
                            title="隐藏此行"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                                           {visibleCols.map((col) => {
                        const cellValue = item.row.cells[col.index] || ''
                        const isEditing = editingCell?.row === item.index && editingCell?.col === col.index

                        return (
                          <td
                            key={`${item.row._id}-col-${col.index}`}
                            className="border px-3 py-2 min-w-[100px]"
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellEdit(item.index, col.index, editValue)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCellEdit(item.index, col.index, editValue)
                                  if (e.key === 'Escape') setEditingCell(null)
                                }}
                                className="w-full border-blue-300 px-1 py-0.5"
                                autoFocus
                              />
                            ) : (
                              <div
                                className="cursor-text min-h-[20px]"
                                onDoubleClick={() => {
                                  setEditingCell({ row: item.index, col: col.index })
                                  setEditValue(cellValue)
                                }}
                              >
                                {cellValue || <span className="text-gray-300 italic">空</span>}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 底部统计 */}
        <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 shrink-0">
          显示 {visibleRows.length} 行 × {visibleCols.length} 列 | 双击单元格可编辑 | 右键或点击 ✕ 可隐藏行/列
        </div>
      </div>
    </div>
  )
}

// 进度条组件
interface ParseProgressBarProps {
  progress: ParseProgress
  visible: boolean
}

export function ParseProgressBar({ progress, visible }: ParseProgressBarProps) {
  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 w-80 z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{progress.stage}</span>
        <span className="text-sm text-gray-500">{Math.round(progress.percent)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">{progress.message}</p>
    </div>
  )
}