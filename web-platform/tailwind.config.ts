import type { Config } from 'tailwindcss'
import tokens from '../design-tokens/dist/tokens.d.ts'

/**
 * Tailwind 配置 - 使用设计令牌
 * 颜色、间距等值从 design-tokens/tokens.json 生成
 */

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 品牌主色 - 柔和晴空蓝
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
        },
        // 正确反馈色 - 薄荷绿
        success: {
          500: 'var(--color-success-500)',
        },
        // 错误纠正色 - 珊瑚红
        error: {
          500: 'var(--color-error-500)',
        },
        // 中性色
        neutral: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
          white: 'var(--color-neutral-white)',
        },
        // 玻璃态颜色
        glass: {
          background: 'var(--color-glass-background)',
          border: 'var(--color-glass-border)',
          shadow: 'var(--color-glass-shadow)',
        },
      },
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        'full': 'var(--radius-full)',
      },
      boxShadow: {
        'glass': 'var(--shadow-glass), inset 0 0 6px 6px rgba(0,0,0,0.02)',
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
      },
      fontSize: {
        'xs': 'var(--font-size-xs)',
        'sm': 'var(--font-size-sm)',
        'base': 'var(--font-size-base)',
        'lg': 'var(--font-size-lg)',
        'xl': 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
      },
      backdropBlur: {
        'glass': 'var(--blur-glass)',
      },
    },
  },
  plugins: [
    // 添加设计令牌 CSS 变量插件
    function({ addBase }: { addBase: Function }) {
      addBase({
        ':root': {
          // Colors
          '--color-primary-50': '#eff6ff',
          '--color-primary-100': '#dbeafe',
          '--color-primary-200': '#bfdbfe',
          '--color-primary-300': '#93c5fd',
          '--color-primary-400': '#60a5fa',
          '--color-primary-500': '#3b82f6',
          '--color-primary-600': '#2563eb',
          '--color-primary-700': '#1d4ed8',
          '--color-success-500': '#10b981',
          '--color-error-500': '#f43f5e',
          '--color-neutral-50': '#f8fafc',
          '--color-neutral-100': '#f1f5f9',
          '--color-neutral-200': '#e2e8f0',
          '--color-neutral-300': '#cbd5e1',
          '--color-neutral-400': '#94a3b8',
          '--color-neutral-500': '#64748b',
          '--color-neutral-600': '#475569',
          '--color-neutral-700': '#334155',
          '--color-neutral-800': '#1e293b',
          '--color-neutral-900': '#0f172a',
          '--color-neutral-white': '#ffffff',
          '--color-glass-background': 'rgba(255, 255, 255, 0.85)',
          '--color-glass-border': 'rgba(255, 255, 255, 0.4)',
          '--color-glass-shadow': 'rgba(0, 0, 0, 0.03)',
          // Spacing
          '--spacing-xs': '4px',
          '--spacing-sm': '8px',
          '--spacing-md': '16px',
          '--spacing-lg': '24px',
          '--spacing-xl': '32px',
          '--spacing-2xl': '48px',
          // Border Radius
          '--radius-sm': '8px',
          '--radius-md': '12px',
          '--radius-lg': '16px',
          '--radius-xl': '24px',
          '--radius-full': '9999px',
          // Shadows
          '--shadow-card': '0 8px 30px rgba(0, 0, 0, 0.04)',
          '--shadow-glass': '0 0 6px rgba(0, 0, 0, 0.03), 0 2px 6px rgba(0, 0, 0, 0.08)',
          '--shadow-elevated': '0 10px 40px rgba(0, 0, 0, 0.08)',
          // Typography
          '--font-size-xs': '12px',
          '--font-size-sm': '14px',
          '--font-size-base': '16px',
          '--font-size-lg': '18px',
          '--font-size-xl': '20px',
          '--font-size-2xl': '24px',
          '--font-size-3xl': '30px',
          // Blur
          '--blur-glass': '20px',
        },
      })
    },
  ],
}
export default config
