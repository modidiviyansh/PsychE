// =============================================================================
//  PsychE V9 — Mini Notes data access
//  Owns: every read and write against PsychE_Student_Notes.
//
//  Why this is a lib module and not inline page queries: notes are edited from
//  two surfaces (StudentProfile and AddLog) with identical semantics. Two
//  copies of the ordering rule would drift, and the ordering *is* the feature —
//  a note that sorts to the bottom is a note nobody reads.
//
//  Every function returns { data, error } rather than throwing or logging.
//  GUIDE_developer.md §11 forbids swallowing Supabase errors, and a note that
//  silently fails to save is worse than one that was never written: the
//  counsellor believes the reminder exists.
// =============================================================================

import { supabase } from './supabase';
import type { NoteKind, StudentNote } from '../types';
import { NOTE_MAX_LENGTH } from '../types';

const TABLE = 'PsychE_Student_Notes';

/** Columns pulled everywhere. Explicit so a schema addition can't bloat a read. */
const NOTE_COLUMNS =
  'id, student_uuid, body, note_kind, is_pinned, is_done, done_at, author, created_at, updated_at';

export interface NotesResult {
  data: StudentNote[];
  error: string | null;
}

export interface NoteResult {
  data: StudentNote | null;
  error: string | null;
}

/**
 * The ordering rule, in TypeScript.
 *
 * Kept here beside the `.order()` calls it mirrors, because the two must agree:
 * a page that re-sorts a locally-edited list differently from the way the
 * database returned it makes notes jump around after every pin or edit, which
 * reads as data loss even though nothing was lost.
 */
export function sortNotes(notes: StudentNote[]): StudentNote[] {
  return [...notes].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  });
}

/**
 * All notes for one student, open and archived alike.
 *
 * Ordering is pinned-first, then newest-first, and is applied in SQL so both
 * calling surfaces agree without either having to remember. Callers split open
 * from archived themselves via `is_done` — a second round trip to fetch the
 * archive separately buys nothing at these volumes.
 */
export async function fetchStudentNotes(studentUuid: string): Promise<NotesResult> {
  if (!studentUuid) return { data: [], error: null };

  const { data, error } = await supabase
    .from(TABLE)
    .select(NOTE_COLUMNS)
    .eq('student_uuid', studentUuid)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as StudentNote[], error: null };
}

/**
 * Open notes only — what AddLog shows when a student is selected.
 *
 * Capped, because this renders directly above the intake field: an unbounded
 * list would push the actual session form off screen, and a prompt you have to
 * scroll past is one you stop reading.
 */
export async function fetchOpenNotes(
  studentUuid: string,
  limit = 6
): Promise<NotesResult> {
  if (!studentUuid) return { data: [], error: null };

  const { data, error } = await supabase
    .from(TABLE)
    .select(NOTE_COLUMNS)
    .eq('student_uuid', studentUuid)
    .eq('is_done', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as StudentNote[], error: null };
}

/** How many open notes a student has. Cheap enough to call per row in a list. */
export async function countOpenNotes(studentUuid: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('student_uuid', studentUuid)
    .eq('is_done', false);

  if (error) {
    console.warn('[notes] countOpenNotes failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function createNote(input: {
  studentUuid: string;
  body: string;
  kind: NoteKind;
  author?: string | null;
}): Promise<NoteResult> {
  const body = input.body.trim();

  // Guard here rather than only in the form: both surfaces write, and an empty
  // note is a row that can never be interpreted later.
  if (!body) return { data: null, error: 'A note needs something written in it.' };
  if (!input.studentUuid) return { data: null, error: 'No student selected for this note.' };
  if (body.length > NOTE_MAX_LENGTH) {
    return { data: null, error: `Keep it under ${NOTE_MAX_LENGTH} characters — long notes belong in the session record.` };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert([{
      student_uuid: input.studentUuid,
      body,
      note_kind: input.kind,
      author: input.author?.trim() || null,
    }])
    .select(NOTE_COLUMNS)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as StudentNote, error: null };
}

export async function updateNoteBody(
  id: string,
  body: string,
  kind: NoteKind
): Promise<NoteResult> {
  const trimmed = body.trim();
  if (!trimmed) return { data: null, error: 'A note needs something written in it.' };
  if (trimmed.length > NOTE_MAX_LENGTH) {
    return { data: null, error: `Keep it under ${NOTE_MAX_LENGTH} characters — long notes belong in the session record.` };
  }
  return patch(id, { body: trimmed, note_kind: kind });
}

export async function setNotePinned(id: string, pinned: boolean): Promise<NoteResult> {
  return patch(id, { is_pinned: pinned });
}

/**
 * Resolve or reopen. `done_at` is stamped and cleared alongside `is_done` so the
 * archive can say *when* an idea was tried, not just that it was — which is the
 * only thing that makes re-reading it next term useful.
 *
 * Resolving also clears the pin. A pinned-and-done note would sort above live
 * notes in the archive view for no reason.
 */
export async function setNoteDone(id: string, done: boolean): Promise<NoteResult> {
  return patch(id, {
    is_done: done,
    done_at: done ? new Date().toISOString() : null,
    ...(done ? { is_pinned: false } : {}),
  });
}

/** Hard delete. Reserved for notes written in error — resolving is the normal path. */
export async function deleteNote(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  return { error: error ? error.message : null };
}

/**
 * Shared write path. `updated_at` is stamped client-side rather than by a
 * trigger — one fewer database object to keep in sync across installs, and the
 * field is only ever used for display.
 */
async function patch(id: string, fields: Record<string, unknown>): Promise<NoteResult> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(NOTE_COLUMNS)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as StudentNote, error: null };
}
