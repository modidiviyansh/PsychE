import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tag, Plus, Trash2, Loader2, Hash } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SystemTag {
  id: string;
  tag_name: string;
  tag_category: string;
  color_hex: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['Behavioral', 'Academic', 'Career', 'Custom'];

const PALETTE: { hex: string; label: string }[] = [
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#84cc16', label: 'Lime' },
  { hex: '#4ade80', label: 'Green' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#d946ef', label: 'Fuchsia' },
  { hex: '#f43f5e', label: 'Rose' },
];

// ─── Category Badge ───────────────────────────────────────────────────────────
const categoryStyle: Record<string, { bg: string; text: string; border: string }> = {
  Behavioral: { bg: 'rgba(239,68,68,0.1)',  text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  Academic:   { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  Career:     { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  Custom:     { bg: 'rgba(139,92,246,0.1)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const GlobalTagManager: React.FC = () => {
  const [tags, setTags]               = useState<SystemTag[]>([]);
  const [newName, setNewName]         = useState('');
  const [newCategory, setNewCategory] = useState('Behavioral');
  const [newColor, setNewColor]       = useState('#4ade80');
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  useEffect(() => { fetchTags(); }, []);

  // ── Data Operations ──────────────────────────────────────────────────────
  const fetchTags = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('PsychE_System_Tags')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) console.error('Error fetching tags:', error);
    if (data) setTags(data as SystemTag[]);
    setLoading(false);
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('PsychE_System_Tags').insert([{
        tag_name:     newName.trim(),
        tag_category: newCategory,
        color_hex:    newColor,
      }]);
      if (error) throw error;
      setNewName('');
      await fetchTags();
    } catch (err) {
      console.error('Error adding tag:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!window.confirm('Delete this global tag? It will be removed from all assigned students.')) return;
    setDeletingId(id);
    const { error } = await supabase.from('PsychE_System_Tags').delete().eq('id', id);
    if (!error) setTags(prev => prev.filter(t => t.id !== id));
    setDeletingId(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>

      {/* ── Panel Header ── */}
      <div style={styles.panelHeader}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBadge}>
            <Tag size={16} color="#5e6ad2" />
          </div>
          <div>
            <h2 style={styles.panelTitle}>Global System Tags</h2>
            <p style={styles.panelSubtitle}>
              Manage problem-system tags assignable to any student profile.
            </p>
          </div>
        </div>
        <div style={styles.statsChip}>
          <Hash size={13} />
          <span>{tags.length} tag{tags.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Inline Creation Toolbar ── */}
      <form onSubmit={handleAddTag} style={styles.toolbar}>
        {/* Tag Name */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>TAG NAME</label>
          <input
            required
            type="text"
            placeholder="e.g., Academic Friction"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={styles.textInput}
            onFocus={e => Object.assign((e.target as HTMLInputElement).style, styles.textInputFocus)}
            onBlur={e => Object.assign((e.target as HTMLInputElement).style, { borderColor: 'rgba(255,255,255,0.08)', boxShadow: 'none' })}
          />
        </div>

        {/* Category */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>CATEGORY</label>
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            style={styles.selectInput}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Color Picker */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>COLOR</label>
          <div style={styles.colorRow}>
            {PALETTE.map(({ hex, label }) => (
              <button
                key={hex}
                type="button"
                title={label}
                onClick={() => setNewColor(hex)}
                style={{
                  ...styles.colorSwatch,
                  backgroundColor: hex,
                  boxShadow: newColor === hex
                    ? `0 0 0 2px #0f1115, 0 0 0 4px ${hex}`
                    : '0 0 0 2px transparent',
                  transform: newColor === hex ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
            {/* Live preview chip */}
            <div
              style={{
                ...styles.previewChip,
                backgroundColor: `${newColor}18`,
                border: `1px solid ${newColor}50`,
                color: newColor,
              }}
            >
              {newName || 'Preview'}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={styles.submitGroup}>
          <button
            type="submit"
            disabled={submitting || !newName.trim()}
            style={{
              ...styles.submitBtn,
              opacity: !newName.trim() ? 0.5 : 1,
              cursor: !newName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting
              ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              : <Plus size={15} />
            }
            <span>Create Tag</span>
          </button>
        </div>
      </form>

      {/* ── Data Grid ── */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.emptyState}>
            <Loader2 size={22} color="#5e6ad2" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading tags…</span>
          </div>
        ) : tags.length === 0 ? (
          <div style={styles.emptyState}>
            <Tag size={32} color="rgba(255,255,255,0.12)" />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
              No tags created yet.<br />
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>Use the toolbar above to add your first tag.</span>
            </p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '36px' }}></th>
                <th style={styles.th}>TAG NAME</th>
                <th style={styles.th}>CATEGORY</th>
                <th style={styles.th}>COLOR</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag, i) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  index={i}
                  deleting={deletingId === tag.id}
                  onDelete={() => handleDeleteTag(tag.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Spin keyframes injected once */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ─── Tag Row Sub-component ────────────────────────────────────────────────────
interface TagRowProps {
  tag: SystemTag;
  index: number;
  deleting: boolean;
  onDelete: () => void;
}

const TagRow: React.FC<TagRowProps> = ({ tag, index, deleting, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const catStyle = categoryStyle[tag.tag_category] ?? categoryStyle['Custom'];

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.tr,
        backgroundColor: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        animation: `rowFadeIn 0.25s ease ${index * 0.04}s both`,
        opacity: deleting ? 0.4 : 1,
        transition: 'background-color 0.15s ease, opacity 0.25s ease',
      }}
    >
      {/* Color Indicator */}
      <td style={styles.td}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: tag.color_hex,
          boxShadow: `0 0 8px ${tag.color_hex}80`,
          margin: '0 auto',
        }} />
      </td>

      {/* Tag Name */}
      <td style={styles.td}>
        <span style={styles.tagName}>{tag.tag_name}</span>
      </td>

      {/* Category */}
      <td style={styles.td}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          padding: '3px 9px',
          borderRadius: '4px',
          backgroundColor: catStyle.bg,
          color: catStyle.text,
          border: `1px solid ${catStyle.border}`,
        }}>
          {tag.tag_category}
        </span>
      </td>

      {/* Color Badge */}
      <td style={styles.td}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '20px',
          backgroundColor: `${tag.color_hex}18`,
          border: `1px solid ${tag.color_hex}40`,
          fontSize: '0.75rem',
          fontWeight: 500,
          color: tag.color_hex,
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.04em',
        }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: tag.color_hex, flexShrink: 0 }} />
          {tag.color_hex.toUpperCase()}
        </div>
      </td>

      {/* Actions */}
      <td style={{ ...styles.td, textAlign: 'right' }}>
        <button
          onClick={onDelete}
          disabled={deleting}
          title="Delete tag"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: hovered ? '#f87171' : 'var(--color-text-muted)',
            backgroundColor: hovered ? 'rgba(239,68,68,0.08)' : 'transparent',
            border: `1px solid ${hovered ? 'rgba(239,68,68,0.25)' : 'transparent'}`,
            transition: 'all 0.15s ease',
            cursor: deleting ? 'not-allowed' : 'pointer',
          }}
        >
          {deleting
            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <Trash2 size={13} />
          }
          Delete
        </button>
      </td>
    </tr>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    borderRadius: '16px',
    background: 'rgba(24, 27, 33, 0.7)',
    border: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(94,106,210,0.15)',
    border: '1px solid rgba(94,106,210,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  panelTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    letterSpacing: '-0.01em',
    margin: 0,
  },
  panelSubtitle: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    margin: 0,
    marginTop: '2px',
  },
  statsChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '20px',
    background: 'rgba(94,106,210,0.1)',
    border: '1px solid rgba(94,106,210,0.2)',
    color: '#818cf8',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  // ─── Toolbar ───
  toolbar: {
    display: 'flex',
    alignItems: 'flex-end',
    flexWrap: 'wrap' as const,
    gap: '1rem',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(15,17,21,0.4)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    flex: '1',
    minWidth: '140px',
  },
  fieldLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
  },
  textInput: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    width: '100%',
  },
  textInputFocus: {
    borderColor: 'var(--color-primary)',
    boxShadow: '0 0 0 3px rgba(94,106,210,0.2)',
    background: 'rgba(255,255,255,0.06)',
  },
  selectInput: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap' as const,
    paddingTop: '2px',
  },
  colorSwatch: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    flexShrink: 0,
  },
  previewChip: {
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '0.72rem',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    maxWidth: '130px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginLeft: '4px',
  },
  submitGroup: {
    display: 'flex',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #5e6ad2, #8b5cf6)',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.8125rem',
    border: 'none',
    boxShadow: '0 4px 12px rgba(94,106,210,0.35)',
    transition: 'opacity 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
    whiteSpace: 'nowrap' as const,
  },
  // ─── Table ───
  tableContainer: {
    overflowX: 'auto' as const,
    minHeight: '200px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
  },
  th: {
    padding: '0.65rem 1.25rem',
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-muted)',
    textAlign: 'left' as const,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    whiteSpace: 'nowrap' as const,
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  td: {
    padding: '0.875rem 1.25rem',
    verticalAlign: 'middle' as const,
  },
  tagName: {
    fontWeight: 500,
    color: 'var(--color-text)',
    letterSpacing: '-0.01em',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '3rem 1.5rem',
    minHeight: '200px',
  },
};
