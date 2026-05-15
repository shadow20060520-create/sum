import { NextRequest } from 'next/server';
import { fail, getErrorMessage, ok, resolveUserId } from '@/lib/api';
import { createClientServer } from '@/lib/supabase';

interface TaskSentenceItem {
  id: string;
  content: string;
  pinyin: string;
}

interface TaskListItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  total_sentences: number;
  completed_sentences: number;
  progress: number;
  sentences: TaskSentenceItem[];
}

export async function GET(req: NextRequest) {
  try {
    const studentId = await resolveUserId(req, req.nextUrl.searchParams.get('student_id'));

    if (!studentId) {
      return fail('Unauthorized: 缺少学生鉴权信息', 401);
    }

    const supabase = createClientServer();

    const { data: memberships, error: membershipError } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('is_deleted', false);

    if (membershipError) {
      throw membershipError;
    }

    const classIds = (memberships || []).map((membership) => membership.class_id);
    if (classIds.length === 0) {
      return ok<TaskListItem[]>([]);
    }

    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        created_at,
        task_sentences (
          id,
          content_text,
          content_pinyin,
          order_num
        )
      `)
      .in('class_id', classIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (taskError) {
      throw taskError;
    }

    const taskList: TaskListItem[] = (tasks || []).map((task) => {
      const sentences = [...(task.task_sentences || [])].sort(
        (a, b) => a.order_num - b.order_num
      );

      return {
        id: task.id,
        title: task.title,
        description: `${sentences.length}句练习`,
        due_date: task.due_date,
        total_sentences: sentences.length,
        completed_sentences: 0,
        progress: 0,
        sentences: sentences.map((sentence) => ({
          id: sentence.id,
          content: sentence.content_text,
          pinyin: sentence.content_pinyin || '',
        })),
      };
    });

    return ok<TaskListItem[]>(taskList);
  } catch (error: any) {
    console.error('API /api/tasks GET Error:', error);
    return fail(getErrorMessage(error, '获取任务失败'), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const teacherId = await resolveUserId(req);
    if (!teacherId) {
      return fail('Unauthorized: 缺少教师鉴权信息', 401);
    }

    const body = await req.json();
    const { class_id, text_content, due_date } = body;

    if (!class_id || !text_content) {
      return fail('班级和练习内容不能为空', 400);
    }

    const supabase = createClientServer();

    const { data: targetClass, error: classError } = await supabase
      .from('classes')
      .select('id')
      .eq('id', class_id)
      .eq('teacher_id', teacherId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (classError) {
      throw classError;
    }

    if (!targetClass) {
      return fail('班级不存在或无权访问', 403);
    }

    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: '课后口语练习',
        class_id,
        creator_id: teacherId,
        due_date: due_date ? new Date(due_date).toISOString() : null,
        is_deleted: false,
      })
      .select()
      .single();

    if (taskError) {
      throw taskError;
    }

    const sentencesArray = text_content
      .split(/\\n|\n/)
      .map((sentence: string) => sentence.trim())
      .filter((sentence: string) => sentence.length > 0);

    const sentencesToInsert = sentencesArray.map((sentence: string, index: number) => ({
      task_id: taskData.id,
      content_text: sentence,
      order_num: index + 1,
      is_deleted: false,
    }));

    const { data: sentencesData, error: sentencesError } = await supabase
      .from('task_sentences')
      .insert(sentencesToInsert)
      .select('id');

    if (sentencesError) {
      throw sentencesError;
    }

    return ok(
      {
        task: taskData,
        sentence_count: sentencesData.length,
      },
      201
    );
  } catch (error: any) {
    console.error('API /api/tasks POST Error:', error);
    return fail(getErrorMessage(error, '发布任务失败'), 500);
  }
}
