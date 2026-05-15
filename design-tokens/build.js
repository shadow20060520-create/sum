/**
 * 设计令牌构建脚本
 * 将 tokens.json 转换为各平台可用的样式文件
 */

const fs = require('fs');
const path = require('path');

const tokens = JSON.parse(fs.readFileSync('./tokens.json', 'utf8'));

// 生成 CSS 变量文件（Web 平台）
function generateCSS() {
  const { tokens: t, platformMapping } = tokens;
  const web = platformMapping.web;
  
  let css = `/* 自动生成的设计令牌 - Web 平台 */
/* 生成时间: ${new Date().toISOString()} */

:root {
  /* Colors */
`;
  
  // 颜色
  Object.entries(t.color).forEach(([category, values]) => {
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === 'object' && value.value) {
        css += `  --color-${category}-${key}: ${value.value};\n`;
      }
    });
  });
  
  // Spacing
  css += `\n  /* Spacing */\n`;
  Object.entries(web.spacing).forEach(([key, value]) => {
    css += `  --spacing-${key}: ${value};\n`;
  });
  
  // Border Radius
  css += `\n  /* Border Radius */\n`;
  Object.entries(web.borderRadius).forEach(([key, value]) => {
    css += `  --radius-${key}: ${value};\n`;
  });
  
  // Shadows
  css += `\n  /* Shadows */\n`;
  Object.entries(t.shadow).forEach(([key, value]) => {
    css += `  --shadow-${key}: ${value.value};\n`;
  });
  
  // Typography
  css += `\n  /* Typography */\n`;
  Object.entries(t.typography.fontSize).forEach(([key, value]) => {
    css += `  --font-size-${key}: ${value.value};\n`;
  });
  
  // Blur
  css += `\n  /* Blur */\n`;
  css += `  --blur-glass: ${t.blur.glass.value};\n`;
  
  css += `}\n`;
  
  return css;
}

// 生成微信小程序 WXSS 文件
function generateWXSS() {
  const { tokens: t, platformMapping } = tokens;
  const mp = platformMapping.miniprogram;
  
  let wxss = `/* 自动生成的设计令牌 - 微信小程序 */
/* 生成时间: ${new Date().toISOString()} */

page {
  /* Colors */
`;
  
  // 颜色
  Object.entries(t.color).forEach(([category, values]) => {
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === 'object' && value.value) {
        wxss += `  --color-${category}-${key}: ${value.value};\n`;
      }
    });
  });
  
  // Spacing
  wxss += `\n  /* Spacing */\n`;
  Object.entries(mp.spacing).forEach(([key, value]) => {
    wxss += `  --spacing-${key}: ${value};\n`;
  });
  
  // Border Radius
  wxss += `\n  /* Border Radius */\n`;
  Object.entries(mp.borderRadius).forEach(([key, value]) => {
    wxss += `  --radius-${key}: ${value};\n`;
  });
  
  // Shadows
  wxss += `\n  /* Shadows */\n`;
  Object.entries(t.shadow).forEach(([key, value]) => {
    // 转换 px 为 rpx
    const shadowValue = value.value.replace(/(\d+)px/g, (match, num) => {
      return `${parseInt(num) * 2}rpx`;
    });
    wxss += `  --shadow-${key}: ${shadowValue};\n`;
  });
  
  // Typography
  wxss += `\n  /* Typography */\n`;
  Object.entries(t.typography.fontSize).forEach(([key, value]) => {
    const fontSize = value.value.replace('px', 'rpx');
    wxss += `  --font-size-${key}: ${fontSize};\n`;
  });
  
  // Blur
  wxss += `\n  /* Blur */\n`;
  const blurValue = t.blur.glass.value.replace('px', 'rpx');
  wxss += `  --blur-glass: ${blurValue};\n`;
  
  wxss += `}\n`;
  
  return wxss;
}

// 生成 TypeScript 类型定义
function generateTypes() {
  const { tokens: t } = tokens;
  
  let types = `/**
 * 自动生成的设计令牌类型定义
 * 生成时间: ${new Date().toISOString()}
 */

export interface DesignTokens {
  color: {
`;
  
  Object.entries(t.color).forEach(([category, values]) => {
    types += `    ${category}: {\n`;
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === 'object' && value.value) {
        types += `      ${key}: string;\n`;
      }
    });
    types += `    };\n`;
  });
  
  types += `  };\n  spacing: {\n`;
  Object.keys(t.spacing).forEach(key => {
    types += `    ${key}: string;\n`;
  });
  
  types += `  };\n  borderRadius: {\n`;
  Object.keys(t.borderRadius).forEach(key => {
    types += `    ${key}: string;\n`;
  });
  
  types += `  };\n  shadow: {\n`;
  Object.keys(t.shadow).forEach(key => {
    types += `    ${key}: string;\n`;
  });
  
  types += `  };\n}\n`;
  
  return types;
}

// 主函数
function build() {
  const outputDir = './dist';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 生成各平台文件
  fs.writeFileSync(path.join(outputDir, 'tokens.css'), generateCSS());
  fs.writeFileSync(path.join(outputDir, 'tokens.wxss'), generateWXSS());
  fs.writeFileSync(path.join(outputDir, 'tokens.d.ts'), generateTypes());
  
  console.log('✅ 设计令牌构建完成！');
  console.log('📁 输出文件:');
  console.log('   - dist/tokens.css (Web 平台)');
  console.log('   - dist/tokens.wxss (微信小程序)');
  console.log('   - dist/tokens.d.ts (TypeScript 类型)');
}

build();
