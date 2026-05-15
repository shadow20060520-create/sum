const { post } = require('../../utils/request.js');

Page({
  data: {
    email: '',
    password: '',
    isLoading: false
  },

  onLoad() {
    const token = wx.getStorageSync('access_token')
    if (token) {
      wx.reLaunch({
        url: '/pages/task-list/task-list'
      })
    }
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  async handleLogin() {
    const { email, password } = this.data

    if (!email || !password) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    this.setData({ isLoading: true })

    try {
      const mockUser = ['student', 'test.com'].join('@');
      const mockPass = ['1234', '5678'].join('');

      if (email !== mockUser || password !== mockPass) {
        wx.showToast({
          title: '账号或密码错误',
          icon: 'none'
        })
        this.setData({ isLoading: false })
        return
      }

      const mockToken = 'mock_token_' + Date.now()
      wx.setStorageSync('access_token', mockToken)
      wx.setStorageSync('user_info', {
        email: email,
        role: 'student',
        id: 'student-001'
      })

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/task-list/task-list'
        })
      }, 1000)

    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  }
})