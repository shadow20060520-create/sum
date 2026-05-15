/**
 * Canonical database types for this repository live in:
 * web-platform/src/types/database.types.ts
 *
 * Keep this file as a compatibility shim so Supabase-side imports do not drift
 * into a second, stale schema definition.
 */

export type {
  Class,
  ClassStudent,
  Database,
  InsertTables,
  Json,
  PronunciationVideo,
  Profile,
  Role,
  StudentRecord,
  Tables,
  Task,
  TaskSentence,
  UpdateTables,
} from '../../web-platform/src/types/database.types'
