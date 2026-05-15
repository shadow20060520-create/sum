// HTTP 请求封装
const BASE_URL = 'http://localhost:3000/api'

// 请求拦截器
const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('access_token')
    const userId = wx.getStorageSync('user_info')?.id
    
    wx.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'x-mock-user-id': userId || ''
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          // Token 过期，清除登录状态并跳转登录页
          wx.removeStorageSync('access_token')
          wx.removeStorageSync('user_info')
          wx.redirectTo({
            url: '/pages/login/login'
          })
          reject(new Error('登录已过期'))
        } else {
          const message = res.data?.error?.message || res.data?.error || res.data?.message || '请求失败'
          reject(new Error(message))
        }
      },
      fail: (err) => {
        reject(new Error('网络请求失败'))
      }
    })
  })
}

// GET 请求
const get = (url, params = {}) => {
  return request({ url, method: 'GET', data: params })
}

// POST 请求
const post = (url, data = {}) => {
  return request({ url, method: 'POST', data })
}

// PUT 请求
const put = (url, data = {}) => {
  return request({ url, method: 'PUT', data })
}

// PATCH 请求
const patch = (url, data = {}) => {
  return request({ url, method: 'PATCH', data })
}

// DELETE 请求
const del = (url, params = {}) => {
  return request({ url, method: 'DELETE', data: params })
}

module.exports = {
  request,
  get,
  post,
  patch,
  put,
  del
}
