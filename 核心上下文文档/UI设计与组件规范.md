# **汉语教学语音纠错辅助工具 \- UI/UX 设计系统规范 (Design System)**

## **1\. 设计愿景与核心原则 (Design Vision & Principles)**

* **视觉基调**：柔和通透风 (Glassmorphism) \+ 科技知性风。  
* **情感传递**：高效、清晰、值得信赖、有温度的“AI 私教”。  
* **核心原则**：  
  * **降低认知负荷**：通过大面积留白和极简排版，让留学生聚焦于“拼音”和“汉字”。  
  * **上下文连贯 (Context Continuity)**：坚决避免频繁的页面跳转。使用“底部抽屉”和“侧滑抽屉”展示详情，保持用户的心智模型不被打断。  
  * **掩盖延迟**：利用流畅的微动效（如液态按钮的水波纹、Framer Motion 弹性切换）提升体感流畅度，掩盖网络或 API 的物理延迟。

## **2\. 色彩系统 (Color System)**

采用 **“方案A：科技知性风”**。在代码中，默认映射为 Tailwind CSS 的预设色板。

### **2.1 品牌主色 (Primary)**

* **柔和晴空蓝 (Soft Sky Blue)**  
  * 用途：核心按钮、活跃状态、导航高亮、品牌标识。  
  * Tailwind 类名：bg-blue-500, text-blue-500 (Hex: \#3b82f6)  
  * 悬停态 (Hover)：bg-blue-400  
  * 按压态 (Active)：bg-blue-600

### **2.2 语义反馈色 (Semantic Colors)**

* **正确反馈色 \- 薄荷绿 (Mint Green)**  
  * 用途：发音达标的汉字标色、正确状态图标。  
  * Tailwind 类名：text-emerald-500 (Hex: \#10b981)  
* **错误纠正色 \- 珊瑚红 (Coral Red)**  
  * 用途：发音不达标的汉字标色、需要注意的错字提醒（降低了正红色的攻击性）。  
  * Tailwind 类名：text-rose-500 (Hex: \#f43f5e)  
  * 错字底部下划线：border-rose-300/50

### **2.3 背景与中性色 (Background & Neutrals)**

* **全局背景**：冷灰白 bg-slate-50 或 bg-gray-200（模拟移动端外壳背景）。  
* **卡片背景**：纯白 bg-white 或 配合毛玻璃使用的半透明白 bg-white/60。  
* **主要文本**：深灰 text-slate-800 (Hex: \#1e293b)。  
* **次要/辅助文本**：浅灰 text-slate-400 到 text-slate-500。

## **3\. 视觉材质与层级 (Materials & Elevation)**

### **3.1 柔和通透质感 (Glassmorphism)**

广泛应用于悬浮层、抽屉和导航栏。

* **基础配方**：半透明白色背景 \+ 高斯模糊背景滤镜 \+ 极浅的白色边框。  
* **Tailwind 实现示例**：  
  bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm  
* **应用场景**：学生端顶部 Tubelight 导航栏、成绩提示浮层、师生两端的侧滑/底部抽屉。

### **3.2 阴影规范 (Shadows)**

摒弃生硬的黑色重阴影，采用大弥散度、低透明度的现代柔和阴影。

* **小卡片/按钮**：shadow-sm  
* **PC端大内容卡片**：shadow-\[0\_8px\_30px\_rgb(0,0,0,0.04)\] (极浅的高级阴影)

## **4\. 核心定制 UI 组件库 (Core Custom Components)**

以下是根据我们讨论定稿的学生端高定组件，附带核心实现逻辑，便于直接转化为代码。

### **4.1 液态玻璃录音大按钮 (Liquid Glass Button)**

* **视觉特征**：静止时呈现剔透的立体玻璃质感，长按录音时透出蓝光并带有噪点折射感。  
* **交互反馈**：按下时缩小 (scale-95)，松开时恢复。  
* **核心技术实现**：  
  1. **复杂内阴影 (核心样式)**：  
     shadow-\[0\_0\_6px\_rgba(0,0,0,0.03), 0\_2px\_6px\_rgba(0,0,0,0.08), inset\_3px\_3px\_0.5px\_-3px\_rgba(0,0,0,0.9), inset\_-3px\_-3px\_0.5px\_-3px\_rgba(0,0,0,0.85), inset\_1px\_1px\_1px\_-0.5px\_rgba(0,0,0,0.6), inset\_-1px\_-1px\_1px\_-0.5px\_rgba(0,0,0,0.6), inset\_0\_0\_6px\_6px\_rgba(0,0,0,0.12), inset\_0\_0\_2px\_2px\_rgba(0,0,0,0.06), 0\_0\_12px\_rgba(255,255,255,0.15)\]

  2. **SVG 噪点滤镜层**：利用 \<feTurbulence\> 生成分形噪点，叠加 \<feDisplacementMap\> 实现液态折射，并通过 style={{ backdropFilter: 'url("\#container-glass")' }} 应用于按钮内层。

### **4.2 霓虹灯管导航栏 (Tubelight Navbar)**

* **视觉特征**：悬浮于页面上方的胶囊状导航。当前选中项上方有一个类似物理灯管的光晕指示器。  
* **动画引擎**：依赖 framer-motion。  
* **核心技术实现**：  
  * 容器：absolute top-12 left-1/2 \-translate-x-1/2 z-50 bg-white/60 backdrop-blur-xl rounded-full (注意为了防止遮挡下方内容，后续内容区需预留 pt-40 左右的顶部内边距)。  
  * 指示器：使用 \<motion.div layoutId="lamp"\> 实现无缝切换动画。灯管发光效果由多个不同大小和 blur 值的 bg-blue-500/20 绝对定位元素叠加而成。

### **4.3 物理惯性滑动面板 (Transition Panel)**

* **视觉特征**：在切换练习题目时，题目以带有物理弹性（Spring）的动画从左侧或右侧滑入/滑出。  
* **动画引擎**：framer-motion 的 \<AnimatePresence\>。  
* **核心参数**：  
  * 模式：mode='popLayout' (保证进出元素不引发高度塌陷抖动)。  
  * 弹性配置：transition={{ type: "spring", stiffness: 300, damping: 30 }}。

### **4.4 抽屉系统 (Sheet & Drawer)**

绝不跳转新页面，所有详情均通过抽屉承载。

* **学生端底部抽屉 (Bottom Sheet)**：  
  * 出现方式：从屏幕底部 translate-y-full 到 translate-y-0。  
  * 材质：bg-white/85 backdrop-blur-2xl rounded-t-\[32px\]。  
  * 遮罩层：bg-slate-900/20 backdrop-blur-sm (黑色极浅遮罩，保护底层上下文依稀可见)。  
* **教师端侧滑抽屉 (Side Drawer)**：  
  * 出现方式：从屏幕右侧 translate-x-full 到 translate-x-0。  
  * 宽度：固定 w-\[480px\]。  
  * 材质与遮罩层同上。

## **5\. 交互行为与状态规范 (Interaction & States)**

* **点击反馈 (Active State)**：所有的可交互元素（按钮、标红的错字），在按下 (active:) 时，必须加入 active:scale-95 配合 transition-transform，提供极其明确的物理按压回弹感。  
* **错字提示 (Error Hint)**：  
  * 学生端：红色的错字不仅变色，底部还需要自带极浅的边框 border-b-4 border-rose-300/50，并在 Hover 时微微泛红 hover:bg-rose-50，暗示其可点击。  
  * 教师端：不需要夸张的下划线，采用鼠标悬停弹出气泡 (Tooltip) 的方式展示错误详情，保持数据看版的整洁。  
* **过渡时间 (Durations)**：  
  * 颜色变化、透明度渐变：duration-300 (300ms)。  
  * 抽屉滑出滑入：duration-500 ease-out (500ms 缓出，显得更柔和)。

## **6\. 排版规范 (Typography)**

* **字体族**：优先使用系统默认无衬线字体 (font-sans)，在中文环境下自动回退到 苹方 (PingFang SC) 或 微软雅黑 (Microsoft YaHei)。  
* **字号运用**：  
  * 核心跟读汉字（学生端）：text-5xl (超大字号)，配合 tracking-widest (极宽字间距)，方便阅读与单字点击。  
  * 拼音展示（详情页）：text-2xl font-medium。  
  * 常规数据/段落：text-sm 或 text-base。