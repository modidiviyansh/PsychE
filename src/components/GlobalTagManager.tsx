import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, Edit2, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { SystemTag, TagCategory } from '../types';

// =============================================================================
//  Constants
// =============================================================================

const TAG_CATEGORIES: TagCategory[] = ['Behavioral', 'Academic', 'Career', 'Custom', 'General'];

function categoryPillClass(cat: string): string {
  switch (cat) {
    case 'Behavioral': return 'pill pill--red';
    case 'Academic':   return 'pill pill--blue';
    case 'Career':     return 'pill pill--purple';
    case 'Custom':     return 'pill pill--amber';
    default:           return 'pill pill--green';
  }
}

// =============================================================================
//  Types
// =============================================================================

interface EditState {
  tagId: string | null;
  tag_name: string;
  tag_category: TagCategory;
  color_hex: string;
}

const EDIT_EMPTY: EditState = { tagId: null, tag_name: '', tag_category: 'General', color_hex: '#4ade80' };

interface NewTagState {
  tag_name: string;
  tag_category: TagCategory;
  color_hex: string;
}

const NEW_EMPTY: NewTagState = { tag_name: '', tag_category: 'General', color_hex: '#4ade80' };

// =============================================================================
//  GlobalTagManager Component
// =============================================================================

export const GlobalTagManager: React.FC = () => {
  const [tags, setTags] = useState<SystemTag[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTag, setNewTag] = useState<NewTagState>({ ...NEW_EMPTY });
  const [creating, setCreating] = useState(false);

  const [editState, setEditState] = useState<EditState>({ ...EDIT_EMPTY });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SystemTag | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ==========================================================================
  //  Data fetching
  // ==========================================================================

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('PsychE_System_Tags')
      .select('*')
      .order('tag_category', { ascending: true })
      .order('tag_name', { ascending: true });

    if (error) { showToast('Failed to load tags', 'error'); }
    else { setTags(data ?? []); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  // ==========================================================================
  //  Create
  // ==========================================================================

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTag.tag_name.trim();
    if (!name) { showToast('Tag name is required', 'error'); return; }

    // Duplicate check (client-side)
    if (tags.some(t => t.tag_name.toLowerCase() === name.toLowerCase())) {
      showToast(`Tag "${name}" already exists`, 'error');
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from('PsychE_System_Tags')
      .insert({
        tag_name: name,
        tag_category: newTag.tag_category,
        color_hex: newTag.color_hex,
      })
      .select()
      .single();

    if (error || !data) {
      showToast('Failed to create tag: ' + (error?.message ?? 'unknown error'), 'error');
    } else {
      setTags(prev => [data, ...prev]);
      setNewTag({ ...NEW_EMPTY });
      showToast(`Tag "${data.tag_name}" created`);
    }
    setCreating(false);
  };

  // ==========================================================================
  //  Edit (inline)
  // ==========================================================================

  const startEdit = (tag: SystemTag) => {
    setEditState({
      tagId: tag.id,
      tag_name: tag.tag_name,
      tag_category: tag.tag_category as TagCategory,
      color_hex: tag.color_hex,
    });
  };

  const cancelEdit = () => setEditState({ ...EDIT_EMPTY });

  const handleSaveEdit = async () => {
    if (!editState.tagId) return;
    const name = editState.tag_name.trim();
    if (!name) { showToast('Tag name cannot be empty', 'error'); return; }

    // Duplicate check (excluding the tag being edited)
    if (tags.some(t => t.id !== editState.tagId && t.tag_name.toLowerCase() === name.toLowerCase())) {
      showToast(`Tag "${name}" already exists`, 'error');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('PsychE_System_Tags')
      .update({
        tag_name: name,
        tag_category: editState.tag_category,
        color_hex: editState.color_hex,
      })
      .eq('id', editState.tagId);

    if (error) {
      showToast('Save failed: ' + error.message, 'error');
    } else {
      setTags(prev => prev.map(t =>
        t.id === editState.tagId
          ? { ...t, tag_name: name, tag_category: editState.tag_category, color_hex: editState.color_hex }
          : t
      ));
      showToast('Tag updated');
      setEditState({ ...EDIT_EMPTY });
    }
    setSaving(false);
  };

  // ==========================================================================
  //  Delete
  // ==========================================================================

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('PsychE_System_Tags')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      showToast('Delete failed: ' + error.message, 'error');
    } else {
      setTags(prev => prev.filter(t => t.id !== deleteTarget.id));
      showToast(`Tag "${deleteTarget.tag_name}" deleted`);
    }
    setDeleteTarget(null);
  };

  // ==========================================================================
  //  Render
  // ==========================================================================

  return (
    <div className="page-animate" style={{ padding: '1.5rem', maxWidth: '960px', margin: '0 auto' }}>

      {/* Page Title */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Tag size={18} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Problem System Tags
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Create and manage global categorized tags for student profiles
          </p>
        </div>
      </div>

      {/* ── Create Tag Form ── */}
      <div className="create-form-card">
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          New Tag
        </div>
        <form onSubmit={handleCreate}>
          <div className="create-form-row">
            {/* Tag Name */}
            <div className="form-field" style={{ flex: 2 }}>
              <label className="form-label">Tag Name</label>
              <input
                className="form-input"
                placeholder="e.g. Anxiety, Truancy, Peer Conflict..."
                value={newTag.tag_name}
                onChange={e => setNewTag(p => ({ ...p, tag_name: e.target.value }))}
                maxLength={255}
              />
            </div>

            {/* Category */}
            <div className="form-field">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={newTag.tag_category}
                onChange={e => setNewTag(p => ({ ...p, tag_category: e.target.value as TagCategory }))}
              >
                {TAG_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div className="form-field" style={{ flex: '0 0 auto', minWidth: 'auto' }}>
              <label className="form-label">Color</label>
              <div className="color-picker-wrapper">
                <input
                  type="color"
                  className="color-input"
                  value={newTag.color_hex}
                  onChange={e => setNewTag(p => ({ ...p, color_hex: e.target.value }))}
                  title="Pick tag color"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {newTag.color_hex}
                </span>
              </div>
            </div>

            {/* Submit */}
            <div className="form-field" style={{ flex: '0 0 auto', minWidth: 'auto', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !newTag.tag_name.trim()}
                style={{ padding: '0.625rem 1.25rem', marginTop: '1.375rem', whiteSpace: 'nowrap' }}
              >
                {creating ? '…' : <><Plus size={14} /> Create Tag</>}
              </button>
            </div>
          </div>

          {/* Color preview */}
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Preview:</span>
            {newTag.tag_name && (
              <span
                className="tag-pill"
                style={{ background: newTag.color_hex }}
              >
                {newTag.tag_name || 'Tag Name'}
              </span>
            )}
            {newTag.tag_name && (
              <span className={categoryPillClass(newTag.tag_category)}>
                {newTag.tag_category}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* ── Tag Table ── */}
      <div className="data-grid-container">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading tags…
          </div>
        ) : tags.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Tag size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
              No tags yet
            </p>
            <p style={{ fontSize: '0.8rem' }}>Create your first Problem System tag above.</p>
          </div>
        ) : (
          <table className="data-grid-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Tag Name</th>
                <th>Category</th>
                <th style={{ width: 120 }}>Color</th>
                <th className="actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {tags.map(tag => {
                  const isEditing = editState.tagId === tag.id;
                  return (
                    <motion.tr
                      key={tag.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                    >
                      {/* Color swatch */}
                      <td>
                        <div
                          className="color-swatch"
                          style={{ background: isEditing ? editState.color_hex : tag.color_hex }}
                        />
                      </td>

                      {/* Tag Name */}
                      <td>
                        {isEditing ? (
                          <input
                            className="grid-cell-input"
                            value={editState.tag_name}
                            onChange={e => setEditState(p => ({ ...p, tag_name: e.target.value }))}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                          />
                        ) : (
                          <span style={{ fontWeight: 500 }}>{tag.tag_name}</span>
                        )}
                      </td>

                      {/* Category */}
                      <td>
                        {isEditing ? (
                          <select
                            className="grid-cell-select"
                            value={editState.tag_category}
                            onChange={e => setEditState(p => ({ ...p, tag_category: e.target.value as TagCategory }))}
                          >
                            {TAG_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={categoryPillClass(tag.tag_category)}>{tag.tag_category}</span>
                        )}
                      </td>

                      {/* Color picker (edit mode) */}
                      <td>
                        {isEditing ? (
                          <div className="color-picker-wrapper">
                            <input
                              type="color"
                              className="color-input"
                              value={editState.color_hex}
                              onChange={e => setEditState(p => ({ ...p, color_hex: e.target.value }))}
                            />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {editState.color_hex}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {tag.color_hex}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="actions-cell">
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          {isEditing ? (
                            <>
                              <button
                                className="icon-btn success"
                                onClick={handleSaveEdit}
                                disabled={saving}
                                title="Save"
                              >
                                {saving ? <span style={{ fontSize: '0.65rem' }}>…</span> : <Check size={14} />}
                              </button>
                              <button className="icon-btn" onClick={cancelEdit} title="Cancel">
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="icon-btn"
                                onClick={() => startEdit(tag)}
                                title="Edit tag"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="icon-btn danger"
                                onClick={() => setDeleteTarget(tag)}
                                title="Delete tag"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Tag count footer */}
      {!loading && tags.length > 0 && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          {tags.length} tag{tags.length !== 1 ? 's' : ''} total
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245, 91, 91, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={18} style={{ color: 'var(--accent-red)' }} />
                </div>
                <h3 style={{ margin: 0 }}>Delete Tag?</h3>
              </div>
              <p>
                Delete the tag <strong>"{deleteTarget.tag_name}"</strong>?
                <br /><br />
                It will be automatically <strong>unassigned from all students</strong> who currently have it. This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  className="btn"
                  style={{ padding: '0.5rem 1.25rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  style={{ padding: '0.5rem 1.25rem', background: 'var(--accent-red)', color: '#fff', fontWeight: 600 }}
                  onClick={handleConfirmDelete}
                >
                  <Trash2 size={14} /> Delete Tag
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 16, x: '-50%' }}
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: toast.type === 'success' ? 'rgba(63, 201, 143, 0.15)' : 'rgba(245, 91, 91, 0.15)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(63,201,143,0.4)' : 'rgba(245,91,91,0.4)'}`,
              color: toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 600,
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              zIndex: 300,
              whiteSpace: 'nowrap',
            }}
          >
            {toast.type === 'success' ? <Check size={15} /> : <AlertTriangle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
