import { NextRequest } from 'next/server'
import { createClientServer, createClientWithAuth } from '@/lib/supabase'
import { fail, getErrorMessage, ok, resolveUserId } from '@/lib/api'
import type { Class } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const userId = await resolveUserId(request)

    if (!userId) {
      return fail('Unauthorized: 缺少用户鉴权信息', 401)
    }

    const isMockMode = !authHeader?.startsWith('Bearer ')
    const supabase = isMockMode ? createClientServer() : createClientWithAuth(authHeader?.substring(7) || '')

    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API /classes GET] Supabase error:', error)
      return fail(error.message, 500)
    }

    return ok<Class[]>(classes || [])
  } catch (error) {
    console.error('[API /classes GET] Error:', error)
    return fail(getErrorMessage(error, '获取班级失败'), 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return fail('班级名称不能为空', 400)
    }

    const authHeader = request.headers.get('authorization')
    const userId = await resolveUserId(request)

    if (!userId) {
      return fail('Unauthorized: 缺少用户鉴权信息', 401)
    }

    const isMockMode = !authHeader?.startsWith('Bearer ')
    const supabase = isMockMode ? createClientServer() : createClientWithAuth(authHeader?.substring(7) || '')

    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        name: name.trim(),
        teacher_id: userId,
        is_deleted: false
      })
      .select()
      .single()

    if (error) {
      console.error('[API /classes POST] Supabase error:', error)
      return fail(error.message, 500)
    }

    return ok<Class>(newClass, 201)
  } catch (error) {
    console.error('[API /classes POST] Error:', error)
    return fail(getErrorMessage(error, '创建班级失败'), 500)
  }
}
