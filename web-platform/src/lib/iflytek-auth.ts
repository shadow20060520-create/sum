/**
 * 科大讯飞 WebSocket 鉴权签名工具
 * 严格遵循讯飞官方鉴权文档实现
 * https://www.xfyun.cn/doc/spark/general_url_authentication.html
 */

import { createHmac } from 'crypto'

export type iFlytekService = 'cpa' | 'tts'

interface iFlytekConfig {
  appId: string
  apiKey: string
  apiSecret: string
  host: string
  path: string
}

// 服务配置映射
const SERVICE_CONFIG: Record<iFlytekService, { host: string; path: string }> = {
  // 语音评测 (Continuous Speech Assessment)
  cpa: {
    host: 'ise-api.xfyun.cn',
    path: '/v2/ise',
  },
  // 在线语音合成 (Text to Speech)
  tts: {
    host: 'tts-api.xfyun.cn',
    path: '/v2/tts',
  },
}

/**
 * 获取服务配置
 */
function getServiceConfig(service: iFlytekService): iFlytekConfig {
  const { host, path } = SERVICE_CONFIG[service]

  if (service === 'cpa') {
    return {
      appId: process.env.IFLYTEK_CPA_APP_ID!,
      apiKey: process.env.IFLYTEK_CPA_API_KEY!,
      apiSecret: process.env.IFLYTEK_CPA_API_SECRET!,
      host,
      path,
    }
  }

  return {
    appId: process.env.IFLYTEK_TTS_APP_ID!,
    apiKey: process.env.IFLYTEK_TTS_API_KEY!,
    apiSecret: process.env.IFLYTEK_TTS_API_SECRET!,
    host,
    path,
  }
}

/**
 * 生成 RFC1123 格式的日期字符串
 */
function getRFC1123Date(): string {
  return new Date().toUTCString()
}

/**
 * 生成 HMAC-SHA256 签名
 * 签名原串格式: host: {host}\ndate: {date}\nGET {path} HTTP/1.1
 */
function generateSignature(
  host: string,
  date: string,
  path: string,
  apiSecret: string
): string {
  // 构建签名原串
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`

  // 使用 HMAC-SHA256 加密
  const signatureSha = createHmac('sha256', apiSecret)
    .update(signatureOrigin)
    .digest()

  // Base64 编码
  return Buffer.from(signatureSha).toString('base64')
}

/**
 * 生成带鉴权的 WebSocket URL
 * @param service - 服务类型: 'cpa' 或 'tts'
 * @returns 完整的 WSS URL
 */
export function generateAuthUrl(service: iFlytekService): string {
  const config = getServiceConfig(service)
  const date = getRFC1123Date()

  // 生成签名
  const signature = generateSignature(
    config.host,
    date,
    config.path,
    config.apiSecret
  )

  // 构建 authorization 参数
  const authorizationOrigin = `api_key="${config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
  const authorization = Buffer.from(authorizationOrigin).toString('base64')

  // 构建完整 URL
  const params = new URLSearchParams({
    authorization,
    date,
    host: config.host,
  })

  return `wss://${config.host}${config.path}?${params.toString()}`
}

/**
 * 获取前端业务帧需要的 App ID。
 * App ID 不是密钥；API Key / Secret 仍只留在服务端参与签名。
 */
export function getServiceAppId(service: iFlytekService): string {
  return getServiceConfig(service).appId
}

/**
 * 验证服务类型是否有效
 */
export function isValidService(service: string): service is iFlytekService {
  return service === 'cpa' || service === 'tts'
}
