App({
  globalData: {
    userInfo: null,
    supabaseUrl: '',
    supabaseKey: ''
  },

  onLaunch() {
    // 初始化云开发环境（如需要）
    console.log('小程序启动')
    
    // 检查登录状态
    const token = wx.getStorageSync('access_token')
    if (!token) {
      // 未登录，跳转到登录页
      wx.redirectTo({
        url: '/pages/login/login'
      })
    }
  },

  onShow() {
    console.log('小程序显示')
  },

  onHide() {
    console.log('小程序隐藏')
  }
})
