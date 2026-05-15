/**
 * 统一错误码体系
 * 用于前后端共享的错误码定义
 * 
 * 错误码格式: XXXYYYZZZ
 * - XXX: 模块代码 (100-999)
 * - YYY: 功能代码 (000-999)
 * - ZZZ: 错误代码 (000-999)
 */

// 模块代码定义
export const ModuleCodes = {
  AUTH: 100,      // 认证授权模块
  USER: 200,      // 用户管理模块
  CLASS: 300,     // 班级管理模块
  TASK: 400,      // 任务管理模块
  RECORD: 500,    // 录音记录模块
  EVALUATION: 600, // 语音评测模块
  SYSTEM: 900,    // 系统模块
} as const

// 错误级别
export const ErrorLevels = {
  INFO: 'info',       // 提示信息
  WARNING: 'warning', // 警告
  ERROR: 'error',     // 错误
  FATAL: 'fatal',     // 致命错误
} as const

// 基础错误码
export const BaseErrorCodes = {
  // 通用错误 (000000xxx)
  UNKNOWN_ERROR: { code: 0, message: '未知错误', level: ErrorLevels.ERROR },
  INVALID_PARAMS: { code: 1, message: '参数错误', level: ErrorLevels.WARNING },
  UNAUTHORIZED: { code: 2, message: '未授权', level: ErrorLevels.ERROR },
  FORBIDDEN: { code: 3, message: '禁止访问', level: ErrorLevels.ERROR },
  NOT_FOUND: { code: 4, message: '资源不存在', level: ErrorLevels.WARNING },
  INTERNAL_ERROR: { code: 5, message: '服务器内部错误', level: ErrorLevels.FATAL },
  TIMEOUT: { code: 6, message: '请求超时', level: ErrorLevels.ERROR },
  RATE_LIMIT: { code: 7, message: '请求过于频繁', level: ErrorLevels.WARNING },
  
  // 认证授权错误 (100xxx)
  AUTH_INVALID_CREDENTIALS: { code: 100001, message: '用户名或密码错误', level: ErrorLevels.WARNING },
  AUTH_TOKEN_EXPIRED: { code: 100002, message: '登录已过期，请重新登录', level: ErrorLevels.INFO },
  AUTH_TOKEN_INVALID: { code: 100003, message: '无效的令牌', level: ErrorLevels.ERROR },
  AUTH_PERMISSION_DENIED: { code: 100004, message: '权限不足', level: ErrorLevels.ERROR },
  AUTH_WECHAT_FAILED: { code: 100005, message: '微信登录失败', level: ErrorLevels.ERROR },
  AUTH_ROLE_REQUIRED: { code: 100006, message: '需要特定角色权限', level: ErrorLevels.ERROR },
  
  // 用户管理错误 (200xxx)
  USER_NOT_FOUND: { code: 200001, message: '用户不存在', level: ErrorLevels.WARNING },
  USER_ALREADY_EXISTS: { code: 200002, message: '用户已存在', level: ErrorLevels.WARNING },
  USER_PROFILE_INCOMPLETE: { code: 200003, message: '用户信息不完整', level: ErrorLevels.WARNING },
  
  // 班级管理错误 (300xxx)
  CLASS_NOT_FOUND: { code: 300001, message: '班级不存在', level: ErrorLevels.WARNING },
  CLASS_NAME_EXISTS: { code: 300002, message: '班级名称已存在', level: ErrorLevels.WARNING },
  CLASS_STUDENT_EXISTS: { code: 300003, message: '学生已在班级中', level: ErrorLevels.WARNING },
  CLASS_STUDENT_NOT_FOUND: { code: 300004, message: '学生不在班级中', level: ErrorLevels.WARNING },
  CLASS_DELETE_WITH_STUDENTS: { code: 300005, message: '班级中还有学生，无法删除', level: ErrorLevels.WARNING },
  
  // 任务管理错误 (400xxx)
  TASK_NOT_FOUND: { code: 400001, message: '任务不存在', level: ErrorLevels.WARNING },
  TASK_NAME_EXISTS: { code: 400002, message: '任务名称已存在', level: ErrorLevels.WARNING },
  TASK_INVALID_SENTENCES: { code: 400003, message: '无效的句子列表', level: ErrorLevels.WARNING },
  TASK_ALREADY_STARTED: { code: 400004, message: '任务已开始，无法编辑', level: ErrorLevels.WARNING },
  
  // 录音记录错误 (500xxx)
  RECORD_NOT_FOUND: { code: 500001, message: '录音记录不存在', level: ErrorLevels.WARNING },
  RECORD_AUDIO_INVALID: { code: 500002, message: '音频文件无效', level: ErrorLevels.WARNING },
  RECORD_UPLOAD_FAILED: { code: 500003, message: '音频上传失败', level: ErrorLevels.ERROR },
  RECORD_TOO_LARGE: { code: 500004, message: '音频文件过大', level: ErrorLevels.WARNING },
  RECORD_FORMAT_INVALID: { code: 500005, message: '不支持的音频格式', level: ErrorLevels.WARNING },
  
  // 语音评测错误 (600xxx)
  EVALUATION_FAILED: { code: 600001, message: '评测失败', level: ErrorLevels.ERROR },
  EVALUATION_SERVICE_ERROR: { code: 600002, message: '评测服务异常', level: ErrorLevels.ERROR },
  EVALUATION_TIMEOUT: { code: 600003, message: '评测超时', level: ErrorLevels.ERROR },
  EVALUATION_AUDIO_QUALITY: { code: 600004, message: '音频质量不佳，请重新录制', level: ErrorLevels.WARNING },
  EVALUATION_TEXT_MISMATCH: { code: 600005, message: '朗读内容与原文不匹配', level: ErrorLevels.WARNING },
  
  // 系统错误 (900xxx)
  SYSTEM_MAINTENANCE: { code: 900001, message: '系统维护中', level: ErrorLevels.INFO },
  SYSTEM_DB_ERROR: { code: 900002, message: '数据库错误', level: ErrorLevels.FATAL },
  SYSTEM_CACHE_ERROR: { code: 900003, message: '缓存服务异常', level: ErrorLevels.ERROR },
  SYSTEM_NETWORK_ERROR: { code: 900004, message: '网络连接异常', level: ErrorLevels.ERROR },
} as const

// 错误码类型
export type ErrorCodeKey = keyof typeof BaseErrorCodes
export type ErrorCode = typeof BaseErrorCodes[ErrorCodeKey]

/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  public readonly code: number
  public readonly level: string
  public readonly statusCode: number
  public readonly data?: Record<string, any>

  constructor(
    errorCode: ErrorCode,
    message?: string,
    data?: Record<string, any>,
    statusCode: number = 500
  ) {
    super(message || errorCode.message)
    this.name = 'AppError'
    this.code = errorCode.code
    this.level = errorCode.level
    this.statusCode = statusCode
    this.data = data
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        level: this.level,
        data: this.data,
      },
    }
  }
}

/**
 * HTTP 状态码映射
 */
export const HttpStatusCodes: Record<number, number> = {
  0: 500,    // 未知错误
  1: 400,    // 参数错误
  2: 401,    // 未授权
  3: 403,    // 禁止访问
  4: 404,    // 资源不存在
  5: 500,    // 服务器内部错误
  6: 504,    // 超时
  7: 429,    // 请求过于频繁
}

/**
 * 根据错误码获取 HTTP 状态码
 */
export function getHttpStatusCode(errorCode: number): number {
  // 提取基础错误码 (后3位)
  const baseCode = errorCode % 1000
  return HttpStatusCodes[baseCode] || 500
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  errorCode: ErrorCode,
  customMessage?: string,
  data?: Record<string, any>
) {
  const statusCode = getHttpStatusCode(errorCode.code)
  const error = new AppError(errorCode, customMessage, data, statusCode)
  return error.toJSON()
}
