'use client'

import Link from 'next/link'
import { BookOpen, Users, BarChart3, Settings } from 'lucide-react'

export default function DashboardPage() {
  const menuItems = [
    {
      title: '班级管理',
      description: '创建和管理班级，添加学生名单',
      icon: Users,
      href: '/dashboard/classes',
      color: 'bg-blue-500',
    },
    {
      title: '任务管理',
      description: '发布练习任务，录入句子内容',
      icon: BookOpen,
      href: '/dashboard/tasks',
      color: 'bg-emerald-500',
    },
    {
      title: '成绩看板',
      description: '查看全班练习数据和错误统计',
      icon: BarChart3,
      href: '/dashboard/records',
      color: 'bg-violet-500',
    },
    {
      title: '系统设置',
      description: '管理账号和系统配置',
      icon: Settings,
      href: '/dashboard/settings',
      color: 'bg-slate-500',
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* 顶部导航 */}
      <nav className="glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">教师工作台</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">欢迎，老师</span>
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-primary-500 transition-smooth"
            >
              退出
            </Link>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">功能菜单</h2>
          <p className="text-slate-500">选择下方功能模块开始管理</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group glass rounded-2xl p-6 hover:shadow-card transition-smooth clickable"
            >
              <div
                className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-slate-500">{item.description}</p>
            </Link>
          ))}
        </div>

        {/* 快速统计 */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-800 mb-4">快速概览</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-6">
              <p className="text-sm text-slate-500 mb-1">我的班级</p>
              <p className="text-3xl font-bold text-slate-800">3</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <p className="text-sm text-slate-500 mb-1">进行中任务</p>
              <p className="text-3xl font-bold text-slate-800">5</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <p className="text-sm text-slate-500 mb-1">学生总数</p>
              <p className="text-3xl font-bold text-slate-800">42</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
