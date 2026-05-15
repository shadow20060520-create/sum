/**
 * 科大讯飞 WebSocket 鉴权接口
 * GET /api/iflytek/auth?service=cpa|tts
 * 
 * 架构红线遵守:
 * 1. 此接口仅生成带签名的临时 WSS URL
 * 2. 小程序拿到 URL 后直接与讯飞建立 WebSocket 连接
 * 3. 绝不暴露 API Secret 给前端
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateAuthUrl, getServiceAppId, isValidService } from '@/lib/iflytek-auth'
import { AppError, ErrorCodes } from '@/lib/error'

/**
 * GET 请求处理
 * 生成带鉴权的 WebSocket URL
 */
export async function GET(request: NextRequest) {
  try {
    // 获取 query 参数
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')

    // 参数校验
    if (!service) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        '缺少必要参数: service (cpa 或 tts)',
        400
      )
    }

    if (!isValidService(service)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `无效的服务类型: ${service}，必须是 cpa 或 tts`,
        400
      )
    }

    // 生成带鉴权的 WSS URL
    const wssUrl = generateAuthUrl(service)

    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        url: wssUrl,
        app_id: getServiceAppId(service),
        service,
        expiresIn: 300, // URL 有效期 5 分钟
      },
    })

  } catch (error) {
    console.error('[iFlytek Auth] 生成鉴权 URL 失败:', error)

    if (error instanceof AppError) {
      return NextResponse.json(
        error.toJSON(),
        { status: error.statusCode }
      )
    }

    // 内部错误不暴露详细信息
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR.code,
          message: '服务器内部错误',
        },
      },
      { status: 500 }
    )
  }
}
