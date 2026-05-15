import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '汉语教学语音纠错辅助工具 - 教师端',
  description: '高校留学生对外汉语课堂辅助工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}
