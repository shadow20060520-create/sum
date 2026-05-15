export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: number
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          user_id: string
          role_id: number
          created_at: string
        }
        Insert: {
          user_id: string
          role_id: number
          created_at?: string
        }
        Update: {
          user_id?: string
          role_id?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      classes: {
        Row: {
          id: string
          name: string
          teacher_id: string
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          teacher_id: string
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          teacher_id?: string
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      class_students: {
        Row: {
          class_id: string
          student_id: string
          is_deleted: boolean
          joined_at: string
        }
        Insert: {
          class_id: string
          student_id: string
          is_deleted?: boolean
          joined_at?: string
        }
        Update: {
          class_id?: string
          student_id?: string
          is_deleted?: boolean
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          class_id: string
          creator_id: string
          is_deleted: boolean
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          class_id: string
          creator_id: string
          is_deleted?: boolean
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          class_id?: string
          creator_id?: string
          is_deleted?: boolean
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      task_sentences: {
        Row: {
          id: string
          task_id: string
          content_text: string
          content_pinyin: string | null
          standard_audio_url: string | null
          order_num: number
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          content_text: string
          content_pinyin?: string | null
          standard_audio_url?: string | null
          order_num?: number
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          content_text?: string
          content_pinyin?: string | null
          standard_audio_url?: string | null
          order_num?: number
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_sentences_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      pronunciation_videos: {
        Row: {
          id: string
          phoneme: string
          context_type: string
          video_url: string
          description: string | null
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phoneme: string
          context_type: string
          video_url: string
          description?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phoneme?: string
          context_type?: string
          video_url?: string
          description?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_records: {
        Row: {
          id: string
          student_id: string
          task_sentence_id: string
          class_id: string | null
          total_score: number | null
          is_completed: boolean
          error_word_count: number
          audio_url: string | null
          evaluation_details: Json | null
          attempt_num: number
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          task_sentence_id: string
          class_id?: string | null
          total_score?: number | null
          is_completed?: boolean
          error_word_count?: number
          audio_url?: string | null
          evaluation_details?: Json | null
          attempt_num?: number
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          task_sentence_id?: string
          class_id?: string | null
          total_score?: number | null
          is_completed?: boolean
          error_word_count?: number
          audio_url?: string | null
          evaluation_details?: Json | null
          attempt_num?: number
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_records_task_sentence_id_fkey"
            columns: ["task_sentence_id"]
            isOneToOne: false
            referencedRelation: "task_sentences"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      is_profile_visible: {
        Args: {
          target_profile_id: string
        }
        Returns: boolean
      }
      trigger_assign_class_to_record: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      trigger_set_timestamp: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for common use cases
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Common table types
export type Profile = Tables<'profiles'>
export type Role = Tables<'roles'>
export type Class = Tables<'classes'>
export type ClassStudent = Tables<'class_students'>
export type Task = Tables<'tasks'>
export type TaskSentence = Tables<'task_sentences'>
export type PronunciationVideo = Tables<'pronunciation_videos'>
export type StudentRecord = Tables<'student_records'>
