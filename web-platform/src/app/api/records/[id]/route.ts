/**
 * 录音记录成绩回写接口
 * PATCH /api/records/[id]
 *
 * 架构红线遵守:
 * 1. 使用 Service Role Key 绕过 RLS 更新 student_records
 * 2. 前端无权直接 UPDATE 成绩，必须通过此接口
 * 3. 更新时自动标记 is_completed = true
 * 4. 计算 error_word_count 用于统计
 */

import { NextRequest } from 'next/server'
import { createClientServer } from '@/lib/supabase'
import { fail, ok, resolveUserId } from '@/lib/api'
import { AppError, ErrorCodes } from '@/lib/error'
import type { Json, UpdateTables } from '@/types/database.types'

/**
 * 讯飞评测结果中的单字详情
 */
interface WordResult {
  content: string
  dp_message?: string
  total_score?: number
  phone_score?: number
  tone_score?: number
  fluency_score?: number
  integrity_score?: number
}

/**
 * 清洗后的评测详情
 */
interface EvaluationDetails {
  total_score: number
  fluency_score: number
  integrity_score: number
  phone_score: number
  tone_score: number
  words: WordResult[]
  xml_result?: string
}

/**
 * 请求体类型
 */
interface UpdateRecordRequest {
  total_score: number
  evaluation_details: EvaluationDetails
  student_id?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordId = params.id

    if (!recordId) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        '缺少必要参数: record_id',
        400
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = await resolveUserId(request, searchParams.get('student_id'))

    if (!userId) {
      throw new AppError(
        ErrorCodes.AUTH_UNAUTHORIZED,
        '缺少用户鉴权信息',
        401
      )
    }

    const supabase = createClientServer()
    const { data: record, error } = await supabase
      .from('student_records')
      .select(`
        id,
        student_id,
        task_sentence_id,
        class_id,
        total_score,
        is_completed,
        error_word_count,
        audio_url,
        evaluation_details,
        attempt_num,
        created_at,
        updated_at,
        task_sentences (
          id,
          task_id,
          content_text,
          content_pinyin,
          order_num
        )
      `)
      .eq('id', recordId)
      .eq('student_id', userId)
      .eq('is_deleted', false)
      .single()

    if (error || !record) {
      throw new AppError(
        ErrorCodes.RECORD_NOT_FOUND,
        '录音记录不存在',
        404
      )
    }

    return ok(record)
  } catch (error) {
    console.error('[Records Detail] 获取录音记录失败:', error)

    if (error instanceof AppError) {
      return fail(error.message, error.statusCode)
    }

    return fail(ErrorCodes.INTERNAL_ERROR.message, 500)
  }
}

/**
 * 计算错误字数
 * dp_message !== '0' 或 tone_score < 70 视为错误
 */
function calculateErrorWordCount(details: EvaluationDetails): number {
  if (!details.words || !Array.isArray(details.words)) {
    return 0
  }

  return details.words.filter((word) => {
    // dp_message 不为 '0' 表示发音错误
    const hasDpError = word.dp_message !== undefined && word.dp_message !== '0'
    // 声调分低于 70 视为错误
    const hasToneError =
      word.tone_score !== undefined && word.tone_score < 70

    return hasDpError || hasToneError
  }).length
}

/**
 * 校验评测详情数据
 */
function validateEvaluationDetails(details: unknown): details is EvaluationDetails {
  if (typeof details !== 'object' || details === null) {
    return false
  }

  const d = details as Record<string, unknown>

  // 检查必要字段
  if (typeof d.total_score !== 'number') return false
  if (typeof d.fluency_score !== 'number') return false
  if (typeof d.integrity_score !== 'number') return false
  if (typeof d.phone_score !== 'number') return false
  if (typeof d.tone_score !== 'number') return false
  if (!Array.isArray(d.words)) return false

  return true
}

/**
 * PATCH 请求处理
 * 更新录音记录的成绩
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordId = params.id

    if (!recordId) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        '缺少必要参数: record_id',
        400
      )
    }

    // 解析请求体
    const body: UpdateRecordRequest = await request.json()
    const { total_score, evaluation_details } = body
    const userId = await resolveUserId(request, body.student_id)

    if (!userId) {
      throw new AppError(
        ErrorCodes.AUTH_UNAUTHORIZED,
        '缺少用户鉴权信息',
        401
      )
    }

    // 参数校验
    if (total_score === undefined || total_score === null) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        '缺少必要参数: total_score',
        400
      )
    }

    if (typeof total_score !== 'number' || total_score < 0 || total_score > 100) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'total_score 必须是 0-100 之间的数字',
        400
      )
    }

    if (!evaluation_details) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        '缺少必要参数: evaluation_details',
        400
      )
    }

    if (!validateEvaluationDetails(evaluation_details)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'evaluation_details 格式不正确',
        400
      )
    }

    // 计算错误字数
    const error_word_count = calculateErrorWordCount(evaluation_details)

    // 使用 Service Role 客户端（绕过 RLS）
    const supabase = createClientServer()

    // 检查记录是否存在
    const { data: existingRecord, error: queryError } = await supabase
      .from('student_records')
      .select('id, is_completed, student_id')
      .eq('id', recordId)
      .eq('student_id', userId)
      .eq('is_deleted', false)
      .single()

    if (queryError || !existingRecord) {
      throw new AppError(
        ErrorCodes.RECORD_NOT_FOUND,
        '录音记录不存在',
        404
      )
    }

    // 如果记录已完成，拒绝更新（可选：根据业务需求决定是否允许重复提交）
    if (existingRecord.is_completed) {
      console.warn(`[Records Update] 尝试更新已完成的记录: ${recordId}`)
    }

    // 更新记录
    const updateData: UpdateTables<'student_records'> = {
      total_score,
      evaluation_details: evaluation_details as unknown as Json,
      error_word_count,
      is_completed: true,
      updated_at: new Date().toISOString(),
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from('student_records')
      .update(updateData)
      .eq('id', recordId)
      .select('id, total_score, error_word_count, is_completed')
      .single()

    if (updateError) {
      console.error('[Records Update] 更新记录失败:', updateError)
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        '更新录音记录失败',
        500
      )
    }

    // 返回成功响应
    return ok({
        record_id: updatedRecord.id,
        total_score: updatedRecord.total_score,
        error_word_count: updatedRecord.error_word_count,
        is_completed: updatedRecord.is_completed,
    })

  } catch (error) {
    console.error('[Records Update] 更新录音记录失败:', error)

    if (error instanceof AppError) {
      return fail(error.message, error.statusCode)
    }

    // 内部错误不暴露详细信息
    return fail(ErrorCodes.INTERNAL_ERROR.message, 500)
  }
}
