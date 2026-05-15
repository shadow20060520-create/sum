/**
 * 录音记录初始化接口
 * POST /api/records/init
 * 
 * 架构红线遵守:
 * 1. 使用 Service Role Key 绕过 RLS 写入 student_records
 * 2. 前端无权直接 UPDATE 成绩，必须通过此接口初始化记录
 * 3. 后续成绩更新也由后端使用 Service Role 完成
 */

import { NextRequest } from 'next/server'
import { createClientServer } from '@/lib/supabase'
import { fail, ok, resolveUserId } from '@/lib/api'
import { AppError, ErrorCodes } from '@/lib/error'
import type { InsertTables } from '@/types/database.types'

/**
 * 请求体类型
 */
interface InitRecordRequest {
  task_sentence_id: string
  student_id?: string
}

/**
 * POST 请求处理
 * 初始化录音记录
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: InitRecordRequest = await request.json()
    const { task_sentence_id } = body

    // 参数校验
    if (!task_sentence_id) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        '缺少必要参数: task_sentence_id',
        400
      )
    }

    const student_id = await resolveUserId(request, body.student_id)

    if (!student_id) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        '缺少必要参数: student_id',
        400
      )
    }

    // 使用 Service Role 客户端（绕过 RLS）
    const supabase = createClientServer()

    const { data: sentenceScope, error: scopeError } = await supabase
      .from('task_sentences')
      .select(`
        id,
        tasks!inner (
          class_id
        )
      `)
      .eq('id', task_sentence_id)
      .eq('is_deleted', false)
      .single()

    if (scopeError || !sentenceScope) {
      throw new AppError(
        ErrorCodes.TASK_NOT_FOUND,
        '题目不存在或已删除',
        404
      )
    }

    const classId = sentenceScope.tasks.class_id
    const { data: membership, error: membershipError } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('class_id', classId)
      .eq('student_id', student_id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (membershipError) {
      console.error('[Records Init] 校验学生班级关系失败:', membershipError)
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        '校验学生班级关系失败',
        500
      )
    }

    if (!membership) {
      throw new AppError(
        ErrorCodes.AUTH_FORBIDDEN,
        '学生不属于该任务班级',
        403
      )
    }

    // 检查是否已存在未完成的记录
    const { data: existingRecord, error: queryError } = await supabase
      .from('student_records')
      .select('id, attempt_num')
      .eq('task_sentence_id', task_sentence_id)
      .eq('student_id', student_id)
      .eq('is_completed', false)
      .eq('is_deleted', false)
      .order('attempt_num', { ascending: false })
      .limit(1)
      .single()

    if (queryError && queryError.code !== 'PGRST116') {
      // PGRST116 = 未找到记录，这是正常的
      console.error('[Records Init] 查询现有记录失败:', queryError)
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        '查询记录失败',
        500
      )
    }

    // 如果存在未完成的记录，直接返回
    if (existingRecord) {
      return ok({
          record_id: existingRecord.id,
          attempt_num: existingRecord.attempt_num,
          is_existing: true,
      })
    }

    // 计算新的 attempt_num
    const { data: lastRecord, error: lastRecordError } = await supabase
      .from('student_records')
      .select('attempt_num')
      .eq('task_sentence_id', task_sentence_id)
      .eq('student_id', student_id)
      .eq('is_deleted', false)
      .order('attempt_num', { ascending: false })
      .limit(1)
      .single()

    if (lastRecordError && lastRecordError.code !== 'PGRST116') {
      console.error('[Records Init] 查询最近记录失败:', lastRecordError)
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        '查询最近记录失败',
        500
      )
    }

    const nextAttemptNum = lastRecord ? lastRecord.attempt_num + 1 : 1

    // 创建新记录
    const newRecord: InsertTables<'student_records'> = {
      task_sentence_id,
      student_id,
      is_completed: false,
      attempt_num: nextAttemptNum,
      error_word_count: 0,
      is_deleted: false,
    }

    const { data: createdRecord, error: insertError } = await supabase
      .from('student_records')
      .insert(newRecord)
      .select('id, attempt_num')
      .single()

    if (insertError) {
      console.error('[Records Init] 创建记录失败:', insertError)
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        '创建录音记录失败',
        500
      )
    }

    // 返回成功响应
    return ok({
        record_id: createdRecord.id,
        attempt_num: createdRecord.attempt_num,
        is_existing: false,
    }, 201)

  } catch (error) {
    console.error('[Records Init] 初始化录音记录失败:', error)

    if (error instanceof AppError) {
      return fail(error.message, error.statusCode)
    }

    // 内部错误不暴露详细信息
    return fail(ErrorCodes.INTERNAL_ERROR.message, 500)
  }
}
