const { get } = require('../../utils/request.js');

Page({
  data: {
    tasks: [],
    isLoading: false
  },

  onLoad() {
    this.loadTasks()
  },

  onPullDownRefresh() {
    this.loadTasks().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadTasks() {
    this.setData({ isLoading: true })

    try {
      const userId = wx.getStorageSync('user_info')?.id || 'mock-student-id'
      const result = await get('/tasks', { student_id: userId })
      
      if (result.error) {
        console.error('获取任务失败:', result.error)
        this.loadMockTasks()
        return
      }

      const tasks = result.data || []
      this.setData({ tasks })
    } catch (error) {
      console.error('获取任务失败:', error)
      this.loadMockTasks()
    } finally {
      this.setData({ isLoading: false })
    }
  },

  loadMockTasks() {
    const mockTasks = [
      {
        id: 'task-001',
        title: '课后口语练习',
        description: '练习今日布置的句子',
        due_date: '2024-04-25',
        progress: 60,
        total_sentences: 3,
        completed_sentences: 2,
        sentences: [
          { id: 'sent-001', content: '我们一起去长城', pinyin: 'wǒ men yì qǐ qù cháng chéng' },
          { id: 'sent-002', content: '今天天气真不错', pinyin: 'jīn tiān tiān qì zhēn bù cuò' },
          { id: 'sent-003', content: '中文很有意思', pinyin: 'zhōng wén hěn yǒu yì si' }
        ]
      },
      {
        id: 'task-002',
        title: '第二课：声调练习',
        description: '练习四声的发音技巧',
        due_date: '2024-04-30',
        progress: 30,
        total_sentences: 3,
        completed_sentences: 1,
        sentences: [
          { id: 'sent-004', content: '妈妈骑马', pinyin: 'mā ma qí mǎ' },
          { id: 'sent-005', content: '麻麻烦烦', pinyin: 'má má fán fán' },
          { id: 'sent-006', content: '马马虎虎', pinyin: 'mǎ mǎ hǔ hǔ' }
        ]
      },
      {
        id: 'task-003',
        title: '第三课：综合练习',
        description: '综合练习前几课的内容',
        due_date: '2024-05-05',
        progress: 0,
        total_sentences: 3,
        completed_sentences: 0,
        sentences: [
          { id: 'sent-007', content: '我喜欢学习汉语', pinyin: 'wǒ xǐ huān xué xí hàn yǔ' },
          { id: 'sent-008', content: '今天天气很好', pinyin: 'jīn tiān tiān qì hěn hǎo' },
          { id: 'sent-009', content: '我们一起去吃饭', pinyin: 'wǒ men yì qǐ qù chī fàn' }
        ]
      }
    ]
    this.setData({ tasks: mockTasks })
  },

  onTaskTap(e) {
    const { taskId, sentenceIndex } = e.currentTarget.dataset
    const task = this.data.tasks.find(t => t.id === taskId)

    if (!task || !task.sentences || task.sentences.length === 0) {
      wx.showToast({
        title: '任务数据不完整',
        icon: 'none'
      })
      return
    }

    const index = sentenceIndex || task.completed_sentences || 0
    const sentence = task.sentences[index] || task.sentences[0]

    const url = `/pages/practice/practice?` +
      `task_id=${encodeURIComponent(taskId)}` +
      `&sentence_id=${encodeURIComponent(sentence.id)}` +
      `&content=${encodeURIComponent(sentence.content)}` +
      `&pinyin=${encodeURIComponent(sentence.pinyin)}`

    wx.navigateTo({ url })
  }
})
