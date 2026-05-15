-- ==========================================
-- 汉语教学语音纠错辅助工具
-- V3: 高级 RLS 策略与防越权加固补丁
-- ==========================================

-- 开启全部 RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pronunciation_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 性能优化：反范式设计 (Denormalization)
-- 解决 student_records 的 N+1 查询风暴问题
-- ==========================================
ALTER TABLE public.student_records ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_student_records_class_id ON public.student_records(class_id);

-- 触发器：插入录音记录时，强行从关联结构中拉取并覆盖 class_id，防止前端越权伪造
CREATE OR REPLACE FUNCTION public.trigger_assign_class_to_record()
RETURNS TRIGGER AS $$
BEGIN
    SELECT t.class_id INTO NEW.class_id
    FROM public.task_sentences ts
    JOIN public.tasks t ON ts.task_id = t.id
    WHERE ts.id = NEW.task_sentence_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_record_insert_assign_class
BEFORE INSERT ON public.student_records
FOR EACH ROW EXECUTE PROCEDURE public.trigger_assign_class_to_record();


-- ==========================================
-- 数据隐私隔离：SECURITY DEFINER 函数
-- ==========================================
-- 修复：杜绝全局暴露，仅允许同班级关系网络内可见，同时避免 RLS 死循环
CREATE OR REPLACE FUNCTION public.is_profile_visible(target_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    curr_uid UUID := auth.uid();
BEGIN
    IF target_profile_id = curr_uid THEN RETURN TRUE; END IF;
    -- 1. 我是老师，查询我的学生
    IF EXISTS (SELECT 1 FROM public.classes c JOIN public.class_students cs ON c.id = cs.class_id WHERE c.teacher_id = curr_uid AND cs.student_id = target_profile_id AND cs.is_deleted = false) THEN RETURN TRUE; END IF;
    -- 2. 我是学生，查询我的老师
    IF EXISTS (SELECT 1 FROM public.classes c JOIN public.class_students cs ON c.id = cs.class_id WHERE c.teacher_id = target_profile_id AND cs.student_id = curr_uid AND cs.is_deleted = false) THEN RETURN TRUE; END IF;
    -- 3. 我们是同班同学
    IF EXISTS (SELECT 1 FROM public.class_students cs1 JOIN public.class_students cs2 ON cs1.class_id = cs2.class_id WHERE cs1.student_id = curr_uid AND cs2.student_id = target_profile_id AND cs1.is_deleted = false AND cs2.is_deleted = false) THEN RETURN TRUE; END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 1. RBAC (角色体系) 与 Profiles 策略
-- 修复：严禁用户通过 API 修改自己的权限
-- ==========================================
CREATE POLICY "所有认证用户可读基础角色" ON public.roles FOR SELECT USING (auth.role() = 'authenticated');

-- user_roles: 只能读自己的角色，严禁前端 INSERT/UPDATE/DELETE (由后端分配)
CREATE POLICY "用户可读自身角色" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- profiles: 读权限收口到安全函数
CREATE POLICY "受限的 Profiles 读取权限" ON public.profiles FOR SELECT USING (public.is_profile_visible(id));

-- profiles: 用户只能修改自己的非敏感信息 (INSERT 由注册 Trigger 内部完成)
CREATE POLICY "用户可更新自身档案" ON public.profiles FOR UPDATE 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());


-- ==========================================
-- 2. 班级 (Classes & Class_Students) 策略
-- 修复：严格分离读、写、校验逻辑
-- ==========================================
CREATE POLICY "师生可读相关班级" ON public.classes FOR SELECT 
USING (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.class_students WHERE class_id = classes.id AND student_id = auth.uid() AND is_deleted = false));

CREATE POLICY "教师可创建班级" ON public.classes FOR INSERT 
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "教师可更新自己的班级" ON public.classes FOR UPDATE 
USING (teacher_id = auth.uid()) 
WITH CHECK (teacher_id = auth.uid());

-- Class_Students (名单)
CREATE POLICY "师生可读本班名单" ON public.class_students FOR SELECT 
USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.classes WHERE id = class_students.class_id AND teacher_id = auth.uid()));

CREATE POLICY "教师可添加学生" ON public.class_students FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.classes WHERE id = class_students.class_id AND teacher_id = auth.uid()));

CREATE POLICY "教师可软删学生" ON public.class_students FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.classes WHERE id = class_students.class_id AND teacher_id = auth.uid())) 
WITH CHECK (EXISTS (SELECT 1 FROM public.classes WHERE id = class_students.class_id AND teacher_id = auth.uid()));


-- ==========================================
-- 3. 任务与题目体系 (Tasks & Sentences)
-- ==========================================
CREATE POLICY "师生可读本班任务" ON public.tasks FOR SELECT 
USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.class_students WHERE class_id = tasks.class_id AND student_id = auth.uid() AND is_deleted = false));

CREATE POLICY "教师创建任务" ON public.tasks FOR INSERT 
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "教师更新任务" ON public.tasks FOR UPDATE 
USING (creator_id = auth.uid()) 
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "师生可读本班题目" ON public.task_sentences FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.tasks WHERE id = task_sentences.task_id AND (
        creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.class_students WHERE class_id = tasks.class_id AND student_id = auth.uid() AND is_deleted = false)
    )
));

CREATE POLICY "教师管理题目" ON public.task_sentences FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_sentences.task_id AND creator_id = auth.uid()));

CREATE POLICY "教师更新题目" ON public.task_sentences FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_sentences.task_id AND creator_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_sentences.task_id AND creator_id = auth.uid()));


-- ==========================================
-- 4. 辅助资源与评测记录策略 (核心越权修复点)
-- ==========================================
CREATE POLICY "公开只读的视频资源" ON public.pronunciation_videos FOR SELECT USING (auth.role() = 'authenticated');

-- 读成绩：基于反范式 class_id 提速，教师查班级，学生查自己
CREATE POLICY "学生查自己，教师查本班成绩" ON public.student_records FOR SELECT 
USING (
    student_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.classes WHERE id = student_records.class_id AND teacher_id = auth.uid())
);

-- 写成绩(仅限初始化)：学生只能向自己所在的班级，提交属于自己的录音占位记录。
-- 跨班级防御：校验 student_records.class_id (此字段由 Trigger 强制获取，这里的判断是双保险) 是否在自己选课内。
CREATE POLICY "学生初始化自己的录音记录" ON public.student_records FOR INSERT 
WITH CHECK (
    student_id = auth.uid() 
    AND EXISTS (SELECT 1 FROM public.class_students cs WHERE cs.class_id = class_id AND cs.student_id = auth.uid() AND cs.is_deleted = false)
);

-- 严禁前端 UPDATE 成绩记录：
-- 注意这里【没有】定义 public.student_records FOR UPDATE 策略！
-- 理由：业务规定 total_score 和 eval_details 只有在后端 Next.js 调用讯飞 API 结束后，
-- 使用具有 supabase_admin_key (Service Role, 无视 RLS) 的服务角色写回数据库。前端无权篡改！
