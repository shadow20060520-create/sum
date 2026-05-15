import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="glass rounded-3xl p-12 max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          汉语教学语音纠错辅助工具
        </h1>
        <p className="text-slate-500 mb-8">
          高校留学生对外汉语课堂辅助工具 - 教师端
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-400 transition-smooth clickable"
          >
            进入教师看板
          </Link>
          <Link
            href="/(auth)/login"
            className="px-6 py-3 bg-white/80 text-slate-700 rounded-xl hover:bg-white transition-smooth clickable border border-slate-200"
          >
            登录
          </Link>
        </div>
      </div>
    </main>
  )
}
