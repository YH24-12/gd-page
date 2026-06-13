import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import type { CustomerStage } from '../types/customer'
import { CUSTOMER_STAGES } from '../types/customer'

interface StageChartProps {
  data: Array<{ stage: CustomerStage; count: number }>
  selectedStage: CustomerStage | null
  onStageClick: (stage: CustomerStage | null) => void
}

// 阶段颜色（与客户卡片颜色一致）
const STAGE_COLORS: Record<CustomerStage, string> = {
  '线索跟踪': '#9CA3AF',
  '送样完成': '#84CC16',
  '内部准备': '#F59E0B',
  '客户评估': '#8B5CF6',
  '投标竞争': '#3B82F6',
  '客户下单': '#10B981'
}

export default function StageChart({ data, selectedStage, onStageClick }: StageChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current)

    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [])

  useEffect(() => {
    updateChart()
  }, [data, selectedStage])

  const updateChart = () => {
    if (!chartInstance.current) return

    // 按阶段顺序排列数据
    const orderedData = CUSTOMER_STAGES.map(stage => {
      const item = data.find(d => d.stage === stage)
      return {
        stage,
        count: item?.count || 0
      }
    })

    const option: EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          const { name, value } = params[0]
          return `<div style="padding: 4px;">
            <div style="font-weight: bold;">${name}</div>
            <div style="color: #666;">${value} 个客户</div>
          </div>`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: orderedData.map(d => d.stage),
        axisLabel: {
          rotate: 0,
          fontSize: 10,
          interval: 0
        },
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value',
        minInterval: 1
      },
      series: [
        {
          type: 'bar',
          data: orderedData.map(d => ({
            value: d.count,
            stage: d.stage,
            itemStyle: {
              color: selectedStage === d.stage || !selectedStage
                ? STAGE_COLORS[d.stage]
                : '#E5E7EB',
              borderRadius: selectedStage === d.stage ? [4, 4, 0, 0] : [2, 2, 0, 0],
              borderWidth: selectedStage === d.stage ? 2 : 0,
              borderColor: STAGE_COLORS[d.stage]
            }
          })),
          barWidth: '60%',
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          }
        }
      ]
    }

    chartInstance.current.setOption(option)

    // 点击事件
    chartInstance.current.off('click')
    chartInstance.current.on('click', (params: any) => {
      const clickedStage = params.data?.stage as CustomerStage
      if (clickedStage) {
        // 切换选中状态
        onStageClick(selectedStage === clickedStage ? null : clickedStage)
      }
    })
  }

  return (
    <div className="w-full h-full min-h-[200px]">
      <div ref={chartRef} className="w-full h-full" />
      {data.every(d => d.count === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
          <div className="text-center text-gray-500">
            <p className="text-sm">暂无客户数据</p>
          </div>
        </div>
      )}
    </div>
  )
}