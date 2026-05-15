-- ==========================================
-- 汉语教学语音纠错辅助工具 数据库 DDL (V2.0)
-- 深度集成 Supabase Auth, RBAC, 软删除与性能索引
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 0. 全局函数与触发器定义 (防御性设计)
-- ==========================================

-- 自动更新 updated_at 的通用函数
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 模块 1: RBAC 角色与用户体系
-- ==========================================

-- 1. 角色字典表 (Roles)
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,      -- 例如: 'TEACHER', 'STUDENT', 'ADMIN'
    description VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.roles IS 'RBAC: 系统角色字典表';

-- 2. 业务用户档案表 (Profiles)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT, -- 强绑定 Supabase Auth
    username VARCHAR(50) UNIQUE,
    full_name VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,      -- 软删除标记
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS '业务用户档案，与 auth.users 保持 1:1 关系';

-- 挂载更新时间触发器
CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 3. 用户-角色关联表 (User_Roles)
CREATE TABLE public.user_roles (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);
COMMENT ON TABLE public.user_roles IS 'RBAC: 用户与角色的多对多关联表';

-- 4. Auth 注册同步触发器 (核心逻辑)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'username', 
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 模块 2: 班级与教学结构
-- ==========================================

-- 5. 班级表 (Classes)
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER set_timestamp_classes BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 6. 班级-学生关联表 (Class_Students)
CREATE TABLE public.class_students (
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    is_deleted BOOLEAN DEFAULT FALSE, -- 使用软删除避免误操作导致历史成绩不可追溯
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (class_id, student_id)
);

-- ==========================================
-- 模块 3: 任务与题目体系
-- ==========================================

-- 7. 练习任务表 (Tasks)
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    is_deleted BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER set_timestamp_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 8. 任务句子明细表 (Task_Sentences)
CREATE TABLE public.task_sentences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
    content_text TEXT NOT NULL,
    content_pinyin TEXT,
    standard_audio_url VARCHAR(500),
    order_num INTEGER NOT NULL DEFAULT 1,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER set_timestamp_sentences BEFORE UPDATE ON public.task_sentences FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();


-- ==========================================
-- 模块 4: 评测记录与辅助资源
-- ==========================================

-- 9. 舌位教学视频映射表 (Pronunciation_Videos)
CREATE TABLE public.pronunciation_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phoneme VARCHAR(20) NOT NULL,            -- 发音/音素 (如: "a", "zh")
    context_type VARCHAR(20) NOT NULL,       -- 语境类型 (如: 'INITIAL'声母, 'FINAL'韵母, 'TONE'声调)
    video_url VARCHAR(500) NOT NULL,
    description VARCHAR(200),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (phoneme, context_type)           -- 复合唯一约束，允许精细化教学资产
);
CREATE TRIGGER set_timestamp_videos BEFORE UPDATE ON public.pronunciation_videos FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- 10. 学生朗读记录与评测结果表 (Student_Records)
CREATE TABLE public.student_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    task_sentence_id UUID NOT NULL REFERENCES public.task_sentences(id) ON DELETE RESTRICT,
    
    total_score DECIMAL(5,2),
    is_completed BOOLEAN DEFAULT FALSE,
    error_word_count INTEGER DEFAULT 0,
    audio_url VARCHAR(500),
    
    evaluation_details JSONB,                -- 包含微观评测数据的 JSONB 字段
    attempt_num INTEGER DEFAULT 1,           -- 记录跟读次数，支持保留历史记录
    
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_score CHECK (total_score >= 0 AND total_score <= 100)
);
CREATE TRIGGER set_timestamp_records BEFORE UPDATE ON public.student_records FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();


-- ==========================================
-- 模块 5: 性能优化 (索引策略)
-- ==========================================

-- B-Tree 索引: 加速常规的外键 JOIN 与 WHERE 查询
CREATE INDEX idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX idx_tasks_class_id ON public.tasks(class_id);
CREATE INDEX idx_task_sentences_task_id ON public.task_sentences(task_id);
CREATE INDEX idx_student_records_student_id ON public.student_records(student_id);
CREATE INDEX idx_student_records_task_sentence_id ON public.student_records(task_sentence_id);

-- 复合索引: 针对教师查询某次任务某个学生的所有尝试记录
CREATE INDEX idx_student_records_lookup ON public.student_records(task_sentence_id, student_id, attempt_num);

-- GIN 索引: 榨干 JSONB 的查询性能
CREATE INDEX idx_student_records_eval_details ON public.student_records USING GIN (evaluation_details);
