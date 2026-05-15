/**
 * Supabase 客户端配置
 * 使用自动生成的类型定义: src/types/database.types.ts
 */

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database.types'

// 重新导出类型，方便其他模块使用
export type { Database }
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updateables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// 常用表类型
export type Role = Tables<'roles'>
export type Profile = Tables<'profiles'>
export type UserRole = Tables<'user_roles'>
export type Class = Tables<'classes'>
export type ClassStudent = Tables<'class_students'>
export type Task = Tables<'tasks'>
export type TaskSentence = Tables<'task_sentences'>
export type PronunciationVideo = Tables<'pronunciation_videos'>
export type StudentRecord = Tables<'student_records'>

/**
 * 浏览器端 Supabase 客户端
 * 用于客户端组件和页面
 */
export const createClientBrowser = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}

/**
 * 服务端 Supabase 客户端
 * 用于 API Routes 和 Server Actions
 * 使用 Service Role Key 进行敏感操作
 */
export const createClientServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role environment variables')
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * 带用户认证的 Supabase 客户端
 * 用于需要用户上下文的 API 路由
 */
export const createClientWithAuth = (accessToken: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
