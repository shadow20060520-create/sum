/**
 * 统一错误处理模块
 * 与 shared/errors/error-codes.ts 保持一致
 */

export const ErrorLevels = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const

export const ErrorCodes = {
  // 系统级错误 (0-999)
  UNKNOWN_ERROR: { code: 0, message: '未知错误', level: ErrorLevels.ERROR },
  INTERNAL_ERROR: { code: 500, message: '服务器内部错误', level: ErrorLevels.ERROR },
  VALIDATION_ERROR: { code: 400, message: '请求参数错误', level: ErrorLevels.WARNING },
  NOT_FOUND: { code: 404, message: '资源不存在', level: ErrorLevels.WARNING },
  
  // 认证授权错误 (100000-100999)
  AUTH_INVALID_CREDENTIALS: { code: 100001, message: '用户名或密码错误', level: ErrorLevels.WARNING },
  AUTH_TOKEN_EXPIRED: { code: 100002, message: '登录已过期', level: ErrorLevels.WARNING },
  AUTH_UNAUTHORIZED: { code: 100003, message: '未授权访问', level: ErrorLevels.WARNING },
  AUTH_FORBIDDEN: { code: 100004, message: '权限不足', level: ErrorLevels.WARNING },
  
  // 用户相关错误 (200000-200999)
  USER_NOT_FOUND: { code: 200001, message: '用户不存在', level: ErrorLevels.WARNING },
  USER_ALREADY_EXISTS: { code: 200002, message: '用户已存在', level: ErrorLevels.WARNING },
  
  // 班级相关错误 (300000-300999)
  CLASS_NOT_FOUND: { code: 300001, message: '班级不存在', level: ErrorLevels.WARNING },
  CLASS_ALREADY_EXISTS: { code: 300002, message: '班级已存在', level: ErrorLevels.WARNING },
  CLASS_STUDENT_ALREADY_EXISTS: { code: 300003, message: '学生已在班级中', level: ErrorLevels.WARNING },
  
  // 任务相关错误 (400000-400999)
  TASK_NOT_FOUND: { code: 400001, message: '任务不存在', level: ErrorLevels.WARNING },
  TASK_ALREADY_EXISTS: { code: 400002, message: '任务已存在', level: ErrorLevels.WARNING },
  
  // 录音相关错误 (500000-500999)
  RECORD_NOT_FOUND: { code: 500001, message: '录音记录不存在', level: ErrorLevels.WARNING },
  RECORD_ALREADY_EXISTS: { code: 500002, message: '录音记录已存在', level: ErrorLevels.WARNING },
  RECORD_INVALID_STATUS: { code: 500003, message: '录音状态无效', level: ErrorLevels.WARNING },
  
  // 评测相关错误 (600000-600999)
  EVALUATION_FAILED: { code: 600001, message: '评测失败', level: ErrorLevels.ERROR },
  EVALUATION_TIMEOUT: { code: 600002, message: '评测超时', level: ErrorLevels.WARNING },
  EVALUATION_SERVICE_ERROR: { code: 600003, message: '评测服务错误', level: ErrorLevels.ERROR },
  
  // 外部服务错误 (700000-700999)
  IFLYTEK_AUTH_FAILED: { code: 700001, message: '讯飞鉴权失败', level: ErrorLevels.ERROR },
  IFLYTEK_SERVICE_ERROR: { code: 700002, message: '讯飞服务错误', level: ErrorLevels.ERROR },
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

export class AppError extends Error {
  public readonly code: number
  public readonly level: string
  public readonly statusCode: number

  constructor(
    errorCode: ErrorCode,
    message?: string,
    statusCode: number = 500
  ) {
    super(message || errorCode.message)
    this.code = errorCode.code
    this.level = errorCode.level
    this.statusCode = statusCode
    this.name = 'AppError'
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    }
  }
}
