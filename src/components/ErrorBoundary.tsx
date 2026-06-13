import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-center text-gray-500 p-4">
            <p className="text-lg mb-2">地图加载失败</p>
            <p className="text-sm text-gray-400">请刷新页面重试</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}