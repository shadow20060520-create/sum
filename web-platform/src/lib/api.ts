import { NextRequest, NextResponse } from 'next/server'
import { createClientWithAuth } from '@/lib/supabase'

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null }, { status })
}

export function fail(error: string, status = 500) {
  return NextResponse.json<ApiResponse<null>>({ data: null, error }, { status })
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export async function resolveUserId(
  request: NextRequest,
  fallbackUserId?: string | null
) {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.substring(7)
    const supabase = createClientWithAuth(accessToken)
    const { data: { user } } = await supabase.auth.getUser()

    if (user?.id) {
      return user.id
    }
  }

  return request.headers.get('x-mock-user-id') || fallbackUserId || null
}
