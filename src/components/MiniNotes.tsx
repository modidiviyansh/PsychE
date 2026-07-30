// =============================================================================
//  PsychE V9 — Mini Notes (presentational)
//
//  Pure props-in components, same contract as TelemetryPanel.tsx: no Supabase
//  calls live here. Fetching and mutation stay in the pages, per
//  GUIDE_developer.md §2.1.
//
//  Two surfaces, one vocabulary:
//    · MiniNotesPanel — the Student Profile card. Write, pin, resolve, browse
//      the archive.
//    · NotePrompt     — the strip inside the AddLog composer. Read-and-resolve
//      only, because it appears while there is a session to write up.
//
//  The whole feature turns on the second one. A note that only lives on the
//  profile is a note the counsellor has to remember to go and look for, which
//  is precisely the problem it was meant to solve.
// =============================================================================

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, HelpCircle, Lightbulb, Pin, PinOff, Pencil, Plus,
  RotateCcw, StickyNote, Trash2
} from 'lucide-react';
import type { NoteKind, StudentNote } from '../types';
import { NOTE_KINDS, NOTE_MAX_LENGTH } from '../types';

// ---------------------------------------------------------------------------
//  Kind presentation
// ---------------------------------------------------------------------------

const KIND_META: Record<NoteKind, { verb: string; className: string; Icon: typeof HelpCircle }> = {
  Question: { verb: 'Ask',      className: 'mini-note--question', Icon: HelpCircle },
  Approach: { verb: 'Try',      className: 'mini-note--approach', Icon: Lightbulb },
  Reminder: { verb: 'Remember', className: 'mini-note--reminder', Icon: StickyNote },
};

/**
 * Relative age, deliberately coarse.
 *
 * An exact timestamp on a memory aid is false precision — what matters is
 * whether the idea is from last week or from a term ago, because a stale note
 * is one worth re-reading sceptically.
 */
export function age(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ---------------------------------------------------------------------------
//  Note card
// ---------------------------------------------------------------------------

export interface NoteCardProps {
  note: StudentNote;
  /** Pin, edit and delete are hidden in the AddLog strip — see NotePrompt. */
  compact?: boolean;
  /**
   * Drops the action row entirely. Used for a note the counsellor wrote seconds
   * ago in the AddLog composer: offering "mark as done" on it would be a control
   * with nothing to do, and a button that does nothing teaches the user to stop
   * trusting the buttons.
   */
  readOnly?: boolean;
  busy?: boolean;
  onToggleDone?: (note: StudentNote) => void;
  onTogglePin?: (note: StudentNote) => void;
  onEdit?: (note: StudentNote) => void;
  onDelete?: (note: StudentNote) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note, compact = false, readOnly = false, busy = false,
  onToggleDone, onTogglePin, onEdit, onDelete
}) => {
  const meta = KIND_META[note.note_kind] ?? KIND_META.Reminder;
  const { Icon } = meta;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18 }}
      className={`mini-note ${meta.className} ${note.is_done ? 'mini-note--done' : ''}`}
    >
      <div className="mini-note-head">
        <span className="mini-note-kind">
          <Icon size={12} /> {meta.verb}
          {note.is_pinned && !note.is_done && <Pin size={10} style={{ marginLeft: '0.2rem' }} />}
        </span>

        {!readOnly && (
        <div className="mini-note-actions">
          {onToggleDone && (
            <button
              type="button"
              className="mini-note-btn"
              disabled={busy}
              onClick={() => onToggleDone(note)}
              title={note.is_done ? 'Reopen this note' : 'Mark as done — keeps it in the archive'}
              aria-label={note.is_done ? 'Reopen note' : 'Mark note as done'}
            >
              {note.is_done ? <RotateCcw size={13} /> : <Check size={13} />}
            </button>
          )}

          {!compact && !note.is_done && onTogglePin && (
            <button
              type="button"
              className={`mini-note-btn ${note.is_pinned ? 'mini-note-btn--active' : ''}`}
              disabled={busy}
              onClick={() => onTogglePin(note)}
              title={note.is_pinned ? 'Unpin' : 'Pin to the top'}
              aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
            >
              {note.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
            </button>
          )}

          {!compact && !note.is_done && onEdit && (
            <button
              type="button"
              className="mini-note-btn"
              disabled={busy}
              onClick={() => onEdit(note)}
              title="Edit"
              aria-label="Edit note"
            >
              <Pencil size={13} />
            </button>
          )}

          {!compact && onDelete && (
            <button
              type="button"
              className="mini-note-btn mini-note-btn--danger"
              disabled={busy}
              onClick={() => onDelete(note)}
              title="Delete permanently"
              aria-label="Delete note"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        )}
      </div>

      <p className="mini-note-body">{note.body}</p>

      <div className="mini-note-foot">
        <span>{note.author ? `${note.author} · ` : ''}{age(note.created_at)}</span>
        {note.is_done && note.done_at && <span>done {age(note.done_at)}</span>}
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
//  Composer
// ---------------------------------------------------------------------------

export interface NoteComposerProps {
  /** Set when editing an existing note; the composer switches to Save/Cancel. */
  editing?: StudentNote | null;
  saving?: boolean;
  error?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit: (body: string, kind: NoteKind) => void;
  onCancel?: () => void;
}

export const NoteComposer: React.FC<NoteComposerProps> = ({
  editing = null, saving = false, error = null, placeholder, autoFocus = false, onSubmit, onCancel
}) => {
  const [body, setBody] = useState(editing?.body ?? '');
  const [kind, setKind] = useState<NoteKind>(editing?.note_kind ?? 'Approach');

  // Remount on a different note rather than syncing via effect — the parent
  // passes `key={editing?.id}`, so state is rebuilt from props for free.

  const trimmed = body.trim();
  const over = body.length > NOTE_MAX_LENGTH;
  const canSave = trimmed.length > 0 && !over && !saving;

  const submit = () => { if (canSave) onSubmit(trimmed, kind); };

  return (
    <div className="mini-note-composer">
      <div className="mini-note-kind-picker">
        {NOTE_KINDS.map(k => {
          const meta = KIND_META[k.value];
          const { Icon } = meta;
          return (
            <button
              key={k.value}
              type="button"
              title={k.hint}
              onClick={() => setKind(k.value)}
              className={`mini-note-kind-option ${meta.className} ${kind === k.value ? 'mini-note-kind-option--on' : ''}`}
            >
              <Icon size={12} /> {k.verb}
            </button>
          );
        })}
      </div>

      <textarea
        value={body}
        autoFocus={autoFocus}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder ?? NOTE_KINDS.find(k => k.value === kind)?.hint ?? 'Write a note…'}
        // Cmd/Ctrl+Enter saves. A bare Enter must stay a newline — these notes
        // are prose, and submitting one mid-sentence loses the thought.
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
          if (e.key === 'Escape' && onCancel) { e.preventDefault(); onCancel(); }
        }}
      />

      {error && <p className="mini-note-error">{error}</p>}

      <div className="mini-note-composer-foot">
        <span className={`mini-note-count ${body.length > NOTE_MAX_LENGTH * 0.85 ? 'mini-note-count--near' : ''}`}>
          {body.length}/{NOTE_MAX_LENGTH}
        </span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {onCancel && (
            <button type="button" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }} onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem', opacity: canSave ? 1 : 0.5 }}
            disabled={!canSave}
            onClick={submit}
          >
            {saving ? 'Saving…' : editing ? 'Save' : <><Plus size={13} /> Add note</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
//  Student Profile card
// ---------------------------------------------------------------------------

export interface MiniNotesPanelProps {
  notes: StudentNote[];
  loading?: boolean;
  error?: string | null;
  saving?: boolean;
  composerError?: string | null;
  editing?: StudentNote | null;
  onCreate: (body: string, kind: NoteKind) => void;
  onUpdate: (note: StudentNote, body: string, kind: NoteKind) => void;
  onToggleDone: (note: StudentNote) => void;
  onTogglePin: (note: StudentNote) => void;
  onDelete: (note: StudentNote) => void;
  onStartEdit: (note: StudentNote | null) => void;
}

export const MiniNotesPanel: React.FC<MiniNotesPanelProps> = ({
  notes, loading = false, error = null, saving = false, composerError = null, editing = null,
  onCreate, onUpdate, onToggleDone, onTogglePin, onDelete, onStartEdit
}) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const open = useMemo(() => notes.filter(n => !n.is_done), [notes]);
  const done = useMemo(() => notes.filter(n => n.is_done), [notes]);

  const closeComposer = () => { setComposerOpen(false); onStartEdit(null); };

  return (
    <div className="no-print">
      <div className="flex justify-between items-center mb-4" style={{ gap: '0.5rem' }}>
        <h3 className="text-h3 flex items-center gap-2" style={{ fontSize: '1rem' }}>
          <StickyNote size={16} className="text-muted" /> Mini Notes
          {open.length > 0 && <span className="pill pill--muted">{open.length}</span>}
        </h3>
        {!composerOpen && !editing && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
            onClick={() => setComposerOpen(true)}
          >
            <Plus size={14} /> New note
          </button>
        )}
      </div>

      <p className="text-muted mb-4" style={{ fontSize: '0.78rem' }}>
        Reminders to yourself for next time — these show up again when you log this student's next session.
        They are never shared, printed, or read by the analytics engine.
      </p>

      {error && <p className="mini-note-error mb-4">Could not load notes: {error}</p>}

      <AnimatePresence initial={false}>
        {(composerOpen || editing) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '0.75rem' }}
          >
            <NoteComposer
              key={editing?.id ?? 'new'}
              editing={editing}
              saving={saving}
              error={composerError}
              autoFocus
              onSubmit={(b, k) => {
                if (editing) onUpdate(editing, b, k);
                else onCreate(b, k);
                closeComposer();
              }}
              onCancel={closeComposer}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <p className="mini-note-empty">Loading notes…</p>
      ) : open.length === 0 && !composerOpen && !editing ? (
        <p className="mini-note-empty">
          {done.length > 0
            ? 'Nothing open. Everything written for this student has been resolved.'
            : 'No notes yet. Add one after a session while the thought is fresh.'}
        </p>
      ) : (
        <div className="mini-notes">
          <AnimatePresence initial={false}>
            {open.map(n => (
              <NoteCard
                key={n.id}
                note={n}
                busy={saving}
                onToggleDone={onToggleDone}
                onTogglePin={onTogglePin}
                onEdit={(note) => { setComposerOpen(false); onStartEdit(note); }}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {done.length > 0 && (
        <div style={{ marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            className="text-muted"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}
            onClick={() => setShowArchive(v => !v)}
          >
            {showArchive ? 'Hide' : 'Show'} archive ({done.length})
          </button>

          <AnimatePresence initial={false}>
            {showArchive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="mini-notes" style={{ marginTop: '0.75rem' }}>
                  {done.map(n => (
                    <NoteCard
                      key={n.id}
                      note={n}
                      busy={saving}
                      onToggleDone={onToggleDone}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
//  AddLog prompt strip
// ---------------------------------------------------------------------------

export interface NotePromptProps {
  notes: StudentNote[];
  studentName?: string;
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
  onToggleDone: (note: StudentNote) => void;
}

/**
 * Open notes, shown the instant a student is selected in AddLog.
 *
 * Renders nothing at all when there are none — an empty "no notes" panel above
 * the intake field would be pure noise on every session for every student who
 * has never had a note written about them.
 *
 * Pin, edit and delete are deliberately absent. This strip exists to be read
 * before writing up a session and ticked off after; full management belongs on
 * the profile, where there is room to think about it.
 */
export const NotePrompt: React.FC<NotePromptProps> = ({
  notes, studentName, loading = false, error = null, busy = false, onToggleDone
}) => {
  if (loading || (notes.length === 0 && !error)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="note-prompt no-print"
    >
      <div className="note-prompt-head">
        <span className="note-prompt-title">
          <StickyNote size={14} /> Before you start
        </span>
        <span className="note-prompt-sub">
          {notes.length} note{notes.length === 1 ? '' : 's'} you left
          {studentName ? ` about ${studentName}` : ''}
        </span>
      </div>

      {error ? (
        <p className="mini-note-error">Could not load notes: {error}</p>
      ) : (
        <div className="note-prompt-list">
          <AnimatePresence initial={false}>
            {notes.map(n => (
              <NoteCard key={n.id} note={n} compact busy={busy} onToggleDone={onToggleDone} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
//  AddLog "note for next time"
// ---------------------------------------------------------------------------

export interface NextTimeNoteProps {
  disabled?: boolean;
  saving?: boolean;
  error?: string | null;
  /** Notes written from this composer during the current session write-up. */
  justAdded: StudentNote[];
  onCreate: (body: string, kind: NoteKind) => void;
}

/**
 * Sits beside the follow-up scheduler at the bottom of AddLog — the point in
 * the form where the counsellor is already thinking about the next contact.
 *
 * Saves immediately rather than on form submit. A note is an independent
 * object, and tying it to the session save would mean abandoning a half-written
 * log also silently throws away the one line worth keeping.
 */
export const NextTimeNote: React.FC<NextTimeNoteProps> = ({
  disabled = false, saving = false, error = null, justAdded, onCreate
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="no-print">
      <div className="flex justify-between items-center mb-3 mobile-stack mobile-stack-start" style={{ gap: '0.5rem' }}>
        <label className="text-h3" style={{ fontSize: '1rem', margin: 0 }}>Note for next time (Optional)</label>
        {!open && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(true)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--color-primary)',
              fontSize: '0.875rem', cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: disabled ? 0.5 : 1
            }}
          >
            <Plus size={14} /> Add a note
          </button>
        )}
      </div>

      <p className="text-muted mb-3" style={{ fontSize: '0.78rem' }}>
        {disabled
          ? 'Select a student first.'
          : 'A question to ask, or an approach to try, when you next see them. Saved on its own — it does not wait for the session record.'}
      </p>

      {justAdded.length > 0 && (
        <div className="mini-notes mb-4">
          {justAdded.map(n => (
            <NoteCard key={n.id} note={n} compact readOnly />
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <NoteComposer
              saving={saving}
              error={error}
              autoFocus
              placeholder="e.g. Ask how the sibling situation is going — she shut down when it came up today."
              onSubmit={(b, k) => { onCreate(b, k); setOpen(false); }}
              onCancel={() => setOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
