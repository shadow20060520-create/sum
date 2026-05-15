'use client'

/**
 * React 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，防止整个应用崩溃
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // 调用外部错误处理回调
    this.props.onError?.(error, errorInfo)

    // 可以在这里发送错误到监控服务 (如 Sentry)
    // sendErrorToMonitoring(error, errorInfo)
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  public render() {
    if (this.state.hasError) {
      // 使用自定义 fallback 或默认错误 UI
      return (
        this.props.fallback || (
          <ErrorFallback
            error={this.state.error}
            onRetry={this.handleRetry}
          />
        )
      )
    }

    return this.props.children
  }
}

/**
 * 默认错误回退 UI
 */
interface ErrorFallbackProps {
  error: Error | null
  onRetry: () => void
}

function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* 玻璃态卡片 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-glass border border-white/50 p-8 text-center">
          {/* 错误图标 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center"
          >
            <AlertCircle className="w-10 h-10 text-error-500" />
          </motion.div>

          {/* 错误标题 */}
          <h2 className="text-2xl font-semibold text-neutral-800 mb-2">
            出错了
          </h2>

          {/* 错误描述 */}
          <p className="text-neutral-500 mb-6">
            应用遇到了一个错误，请尝试刷新页面或返回首页
          </p>

          {/* 错误详情 (仅在开发环境显示) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-6 p-4 bg-red-50 rounded-xl text-left">
              <p className="text-sm font-mono text-red-600 break-all">
                {error.message}
              </p>
              {error.stack && (
                <pre className="mt-2 text-xs text-red-400 overflow-auto max-h-32">
                  {error.stack}
                </pre>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </button>
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-neutral-700 border border-neutral-200 rounded-xl font-medium hover:bg-neutral-50 transition-colors"
            >
              <Home className="w-4 h-4" />
              返回首页
            </Link>
          </div>
        </div>

        {/* 底部提示 */}
        <p className="mt-6 text-center text-sm text-neutral-400">
          如果问题持续存在，请联系技术支持
        </p>
      </motion.div>
    </div>
  )
}

/**
 * API 错误边界
 * 专门处理 API 请求错误
 */
interface ApiErrorBoundaryProps {
  children: ReactNode
  onApiError?: (error: any) => void
}

interface ApiErrorBoundaryState {
  hasError: boolean
  error: any
}

export class ApiErrorBoundary extends Component<ApiErrorBoundaryProps, ApiErrorBoundaryState> {
  public state: ApiErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: any): ApiErrorBoundaryState {
    // 检查是否是 API 错误
    if (error?.code && error?.message) {
      return { hasError: true, error }
    }
    return { hasError: false, error: null }
  }

  public componentDidCatch(error: any) {
    if (error?.code && error?.message) {
      this.props.onApiError?.(error)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <ApiErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}

/**
 * API 错误回退 UI
 */
interface ApiErrorFallbackProps {
  error: any
  onRetry: () => void
}

function ApiErrorFallback({ error, onRetry }: ApiErrorFallbackProps) {
  const getErrorIcon = () => {
    switch (error.level) {
      case 'warning':
        return <AlertCircle className="w-10 h-10 text-yellow-500" />
      case 'info':
        return <AlertCircle className="w-10 h-10 text-blue-500" />
      default:
        return <AlertCircle className="w-10 h-10 text-error-500" />
    }
  }

  return (
    <div className="p-6">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-card border border-white/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            {getErrorIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-800 mb-1">
              请求失败
            </h3>
            <p className="text-neutral-500 mb-4">
              {error.message || '网络请求失败，请稍后重试'}
            </p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 全局错误处理器 Hook
 */
export function useErrorHandler() {
  const handleError = (error: any) => {
    console.error('Handled error:', error)
    
    // 可以在这里集成错误监控服务
    // Sentry.captureException(error)
    
    // 显示错误提示
    // toast.error(error.message || '发生错误')
  }

  return { handleError }
}
