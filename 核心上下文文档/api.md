# **汉语教学语音纠错辅助工具 \- 全局 API 接口文档**

**文档版本**: V1.0 (MVP 冻结版)

**核心技术**: Next.js BFF \+ Supabase \+ 科大讯飞 CPA & TTS

## **核心工程决策 (Design Decisions)**

1. **混合调用策略**：对于不涉及复杂业务逻辑的基础 CRUD（如获取班级列表），前端可通过 Supabase JS Client 直接走 PostgREST 接口，利用 RLS 实现底层数据隔离。本 API 文档定义的端点主要用于 BFF 层封装。  
2. **防越权与零信任写入**：严禁前端直接修改核心业务数据（如角色、评测成绩）。评测成绩的写入由后端服务环境（使用无视 RLS 的 service\_role 密钥）在回调完成后闭环执行。  
3. **软删除先行**：所有的删除操作均采用 is\_deleted \= true 的逻辑处理，以保证学生历史成绩和错题回溯的完整性。

## **板块一：教学结构管理 (Classes & Profiles)**

*负责处理班级、名单与用户信息的管理与查询。*

| HTTP 方法 | URL 路径 | 功能描述 | Request Body (JSON 示例) | Response Body (JSON 示例) |
| :---- | :---- | :---- | :---- | :---- |
| **GET** | /api/classes | 获取当前用户相关的班级列表。*(RLS自动过滤：教师查自己创建的，学生查自己加入的)* | 无 | {"data": \[{"id": "uuid", "name": "基础汉语一班", "teacher\_id": "uuid", "created\_at": "..."}\], "error": null} |
| **POST** | /api/classes | **\[仅教师\]** 创建新班级。*(RLS校验 teacher\_id 必须为当前用户)* | {"name": "进阶口语二班"} | {"data": {"id": "new-uuid", "name": "进阶口语二班"}, "error": null} |
| **GET** | /api/classes/{class\_id}/students | 获取指定班级的学生名单。*(关联 profiles 表获取全名和用户名)* | 无 | {"data": \[{"student\_id": "uuid", "username": "john\_doe", "full\_name": "John Doe", "joined\_at": "..."}\], "error": null} |
| **POST** | /api/classes/{class\_id}/students | **\[仅教师\]** 将学生添加至班级。*(RLS校验操作者必须是该班级的教师)* | {"student\_ids": \["uuid-1", "uuid-2"\]} | {"data": {"success\_count": 2}, "error": null} |
| **DELETE** | /api/classes/{class\_id}/students/{student\_id} | **\[仅教师\]** 将学生移出班级。*(采用 is\_deleted \= true 软删除，避免误删历史成绩)* | 无 | {"data": {"status": "soft\_deleted"}, "error": null} |
| **PATCH** | /api/profiles/me | 更新当前用户自身的非敏感档案信息（如姓名）。*(注：Profile 插入由 Auth Trigger 自动完成)* | {"full\_name": "John Smith"} | {"data": {"id": "uuid", "full\_name": "John Smith"}, "error": null} |

## **板块二：教学任务下发 (Tasks & Task\_Sentences)**

*负责练习任务的创建、题目的批量录入与展示。*

| HTTP 方法 | URL 路径 | 功能描述 | Request Body (JSON 示例) | Response Body (JSON 示例) |
| :---- | :---- | :---- | :---- | :---- |
| **GET** | /api/tasks?class\_id={id} | 获取指定班级的任务列表。*(RLS: 教师查自己创建的，学生查自己所在班级的)* | 无 | {"data": \[{"id": "uuid", "title": "第一课发音练习", "due\_date": "..."}\], "error": null} |
| **POST** | /api/tasks | **\[仅教师\]** 创建新任务。 | {"title": "第一课发音练习", "class\_id": "uuid", "due\_date": "2023-12-31T23:59:59Z"} | {"data": {"id": "new-task-uuid"}, "error": null} |
| **GET** | /api/tasks/{task\_id}/sentences | 获取特定任务下的所有练习句子（按 order\_num 排序）。 | 无 | {"data": \[{"id": "uuid", "content\_text": "你好", "content\_pinyin": "nǐ hǎo", "order\_num": 1}\], "error": null} |
| **POST** | /api/tasks/{task\_id}/sentences | **\[仅教师\]** 批量为任务添加/更新句子。 | {"sentences": \[{"content\_text": "你好", "content\_pinyin": "nǐ hǎo", "order\_num": 1}\]} | {"data": {"inserted\_count": 1}, "error": null} |

## **板块三：核心评测业务与资源 (Student\_Records & Videos)**

*此板块负责极度敏感的成绩系统与教学视频映射。*

*注意：流式语音评测需通过 WebSocket (wss://\[host\]/api/ws/evaluate) 传输音频帧，REST API 仅负责记录的初始化与成绩读取。*

| HTTP 方法 | URL 路径 | 功能描述 | Request Body (JSON 示例) | Response Body (JSON 示例) |
| :---- | :---- | :---- | :---- | :---- |
| **POST** | /api/records/init | **\[学生端触发\]** 初始化评测占位记录。*设计精髓：数据库会触发 trigger\_assign\_class\_to\_record 自动拉取 class\_id 防止跨班伪造。* | {"task\_sentence\_id": "sentence-uuid"} | {"data": {"record\_id": "new-record-uuid", "attempt\_num": 1}, "error": null} |
| **GET** | /api/records | 获取评测记录（支持按 task\_id 或 student\_id 筛选）。*(RLS: 学生只能看自己，教师可看本班所有学生。依赖 DB 复合索引提速)* | 无 | {"data": \[{"id": "uuid", "student\_id": "...", "total\_score": 85.5, "error\_word\_count": 1, "is\_completed": true}\], "error": null} |
| **GET** | /api/records/{record\_id} | 获取单次评测的微观诊断详情。用于绘制声调双曲线及红绿字渲染。 | 无 | {"data": {"id": "uuid", "total\_score": 85.5, "evaluation\_details": {"words": \[{"word": "你", "score": 90, "tone\_status": "correct"}, ...\]}, "audio\_url": "..."}, "error": null} |
| **GET** | /api/videos?phoneme={p}\&context={c} | 获取舌位演示短视频的映射 URL。用于错音纠错推荐。 | 无 | {"data": \[{"id": "uuid", "phoneme": "zh", "context\_type": "INITIAL", "video\_url": "https://..."}\], "error": null} |

**关于成绩安全闭环的补充说明：**

前端调用 /api/records/init 获取 record\_id 后，建立 WebSocket 连接并传入此 record\_id。音频流式传输给科大讯飞完毕后，由 Next.js 后端解析 JSON 评测结果，利用 Supabase\_Service\_Role\_Key 直接执行 UPDATE student\_records SET total\_score \= ?, evaluation\_details \= ? WHERE id \= ?。全程对前端屏蔽 UPDATE 权限。