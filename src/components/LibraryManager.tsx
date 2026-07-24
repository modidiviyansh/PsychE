import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  BookOpen, Plus, X, Lock, Edit2, CheckCircle2, XCircle,
  Loader2, Hash, ChevronRight, Tag, RotateCcw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Module {
  id: string;
  name: string;
  type: string;
  description?: string;
  smart_keywords: string[];
  is_locked?: boolean;
  created_at: string;
}

interface Question {
  id: string;
  module_id: string;
  prompt_text: string;
  is_active: boolean;
  has_been_edited: boolean;
  is_reverse_scored?: boolean;
  custom_labels?: Record<string, string> | null;
  created_at: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const LibraryManager: React.FC = () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [modules, setModules]                 = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [questions, setQuestions]             = useState<Question[]>([]);
  const [newKeyword, setNewKeyword]           = useState('');
  const [loading, setLoading]                 = useState(true);
  const [newModuleName, setNewModuleName]     = useState('');
  const [addingModule, setAddingModule]       = useState(false);
  const [showAddModuleInput, setShowAddModuleInput] = useState(false);

  // Edit state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editPromptText, setEditPromptText]       = useState('');
  const [savingEdit, setSavingEdit]               = useState(false);

  // Add question state
  const [newQuestionText, setNewQuestionText] = useState('');
  const [addingQuestion, setAddingQuestion]   = useState(false);

  const keywordInputRef = useRef<HTMLInputElement>(null);
  const moduleInputRef  = useRef<HTMLInputElement>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedModule = modules.find(m => m.id === selectedModuleId) ?? null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => { fetchModules(); }, []);

  useEffect(() => {
    if (showAddModuleInput) moduleInputRef.current?.focus();
  }, [showAddModuleInput]);

  // ── Data Operations ────────────────────────────────────────────────────────
  const fetchModules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('PsychE_Modules')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) console.error('Error fetching modules:', error);
    if (data) {
      setModules(data as Module[]);
      if (data.length > 0 && !selectedModuleId) {
        setSelectedModuleId(data[0].id);
        fetchQuestions(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchQuestions = async (moduleId: string) => {
    const { data, error } = await supabase
      .from('PsychE_Questions')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: true });
    if (error) console.error('Error fetching questions:', error);
    if (data) setQuestions(data as Question[]);
  };

  const handleModuleSelect = (id: string) => {
    if (id === selectedModuleId) return;
    setEditingQuestionId(null);
    setSelectedModuleId(id);
    fetchQuestions(id);
  };

  const handleAddKeyword = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !newKeyword.trim() || !selectedModule) return;
    e.preventDefault();
    const kw = newKeyword.trim().toLowerCase();
    const current = selectedModule.smart_keywords || [];
    if (current.includes(kw)) { setNewKeyword(''); return; }
    const updated = [...current, kw];
    const { error } = await supabase
      .from('PsychE_Modules')
      .update({ smart_keywords: updated })
      .eq('id', selectedModule.id);
    if (!error) {
      setModules(prev => prev.map(m => m.id === selectedModule.id ? { ...m, smart_keywords: updated } : m));
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = async (kwToRemove: string) => {
    if (!selectedModule) return;
    const updated = (selectedModule.smart_keywords || []).filter((k: string) => k !== kwToRemove);
    const { error } = await supabase
      .from('PsychE_Modules')
      .update({ smart_keywords: updated })
      .eq('id', selectedModule.id);
    if (!error) {
      setModules(prev => prev.map(m => m.id === selectedModule.id ? { ...m, smart_keywords: updated } : m));
    }
  };

  const handleToggleActive = async (q: Question) => {
    const { error } = await supabase
      .from('PsychE_Questions')
      .update({ is_active: !q.is_active })
      .eq('id', q.id);
    if (!error) {
      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, is_active: !q.is_active } : item));
    }
  };

  const handleSaveEdit = async (q: Question) => {
    if (!selectedModule || !editPromptText.trim() || savingEdit) return;
    setSavingEdit(true);
    const updates: Partial<Question> = { prompt_text: editPromptText.trim() };
    if (selectedModule.is_locked) updates.has_been_edited = true;
    const { error } = await supabase.from('PsychE_Questions').update(updates).eq('id', q.id);
    if (!error) {
      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, ...updates } : item));
      setEditingQuestionId(null);
      setEditPromptText('');
    }
    setSavingEdit(false);
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditPromptText('');
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule || !newQuestionText.trim() || addingQuestion) return;
    setAddingQuestion(true);
    const { data, error } = await supabase
      .from('PsychE_Questions')
      .insert([{ module_id: selectedModule.id, prompt_text: newQuestionText.trim() }])
      .select()
      .single();
    if (!error && data) {
      setQuestions(prev => [...prev, data as Question]);
      setNewQuestionText('');
    }
    setAddingQuestion(false);
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim() || addingModule) return;
    setAddingModule(true);
    const { data, error } = await supabase
      .from('PsychE_Modules')
      .insert([{ name: newModuleName.trim(), type: 'Custom', description: '', smart_keywords: [] }])
      .select()
      .single();
    if (error) { console.error('Error adding module:', error); setAddingModule(false); return; }
    if (data) {
      setModules(prev => [...prev, data as Module]);
      setNewModuleName('');
      setShowAddModuleInput(false);
      setSelectedModuleId(data.id);
      setQuestions([]);
    }
    setAddingModule(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={css.root}>

      {/* ═══ Layout Shell ═══════════════════════════════════════════════════ */}
      <div style={css.shell}>

        {/* ─── Left Sidebar: Modules ─────────────────────────────────────── */}
        <aside style={css.sidebar}>

          {/* Sidebar Header */}
          <div style={css.sidebarHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={15} color="#5e6ad2" />
              <span style={css.sidebarTitle}>Modules</span>
            </div>
            <span style={css.moduleBadge}>{modules.length}</span>
          </div>

          {/* Module List */}
          <div style={css.moduleList}>
            {loading ? (
              <div style={css.sidebarLoader}>
                <Loader2 size={18} color="#5e6ad2" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : modules.length === 0 ? (
              <p style={{ padding: '1rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                No modules yet.
              </p>
            ) : (
              modules.map((m) => (
                <ModuleItem
                  key={m.id}
                  module={m}
                  isActive={selectedModuleId === m.id}
                  questionCount={selectedModuleId === m.id ? questions.length : undefined}
                  onClick={() => handleModuleSelect(m.id)}
                />
              ))
            )}
          </div>

          {/* Pinned Add Module */}
          <div style={css.sidebarFooter}>
            {showAddModuleInput ? (
              <form onSubmit={handleAddModule} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  ref={moduleInputRef}
                  type="text"
                  placeholder="Module name…"
                  value={newModuleName}
                  onChange={e => setNewModuleName(e.target.value)}
                  style={css.moduleNameInput}
                  onKeyDown={e => e.key === 'Escape' && setShowAddModuleInput(false)}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="submit"
                    disabled={!newModuleName.trim() || addingModule}
                    style={{ ...css.addModuleConfirm, opacity: !newModuleName.trim() ? 0.5 : 1 }}
                  >
                    {addingModule ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddModuleInput(false); setNewModuleName(''); }}
                    style={css.addModuleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddModuleInput(true)}
                style={css.addModuleBtn}
              >
                <Plus size={14} />
                <span>Add New Module</span>
              </button>
            )}
          </div>
        </aside>

        {/* ─── Right Pane: Detail ────────────────────────────────────────── */}
        <main style={css.detail}>
          {!selectedModule ? (
            <EmptyDetailState />
          ) : (
            <>
              {/* Detail Header */}
              <div style={css.detailHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <h2 style={css.detailTitle}>{selectedModule.name}</h2>
                  {selectedModule.is_locked && (
                    <div style={css.lockBadge} title="This module is locked. Questions can only be edited once.">
                      <Lock size={11} />
                      <span>Locked</span>
                    </div>
                  )}
                </div>
                <span style={css.questionCount}>
                  <Hash size={12} />
                  {questions.length} question{questions.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* ── Keywords Section ─────────────────────────────────────── */}
              <div style={css.keywordsSection}>
                <div style={css.keywordsSectionLabel}>
                  <Tag size={12} />
                  <span>SMART KEYWORDS</span>
                  <span style={css.keywordsHint}>Press Enter to add · Click × to remove</span>
                </div>
                <div style={css.keywordsPillBox}>
                  {(selectedModule.smart_keywords || []).map((kw: string) => (
                    <KeywordPill key={kw} label={kw} onRemove={() => handleRemoveKeyword(kw)} />
                  ))}
                  <input
                    ref={keywordInputRef}
                    type="text"
                    placeholder="Add keyword…"
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    onKeyDown={handleAddKeyword}
                    style={css.keywordInput}
                  />
                </div>
              </div>

              {/* ── Question Table ───────────────────────────────────────── */}
              <div style={css.tableWrapper}>
                <table style={css.table}>
                  <thead>
                    <tr>
                      <th style={{ ...css.th, width: '52%' }}>PROMPT TEXT</th>
                      <th style={{ ...css.th, width: '14%' }}>SCORING</th>
                      <th style={{ ...css.th, width: '13%' }}>STATUS</th>
                      <th style={{ ...css.th, width: '21%', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.length === 0 && !editingQuestionId ? (
                      <tr>
                        <td colSpan={4} style={{ ...css.td, textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                          No questions in this module. Add one below.
                        </td>
                      </tr>
                    ) : (
                      questions.map((q, i) => (
                        editingQuestionId === q.id ? (
                          <EditRow
                            key={q.id}
                            value={editPromptText}
                            saving={savingEdit}
                            onChange={setEditPromptText}
                            onSave={() => handleSaveEdit(q)}
                            onCancel={handleCancelEdit}
                          />
                        ) : (
                          <QuestionRow
                            key={q.id}
                            question={q}
                            index={i}
                            isLocked={!!selectedModule.is_locked}
                            onToggleActive={() => handleToggleActive(q)}
                            onEdit={() => { setEditingQuestionId(q.id); setEditPromptText(q.prompt_text); }}
                          />
                        )
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Add Question Footer ──────────────────────────────────── */}
              <form onSubmit={handleAddQuestion} style={css.addQuestionForm}>
                <input
                  type="text"
                  placeholder="Type a new question prompt and press Add…"
                  value={newQuestionText}
                  onChange={e => setNewQuestionText(e.target.value)}
                  style={css.addQuestionInput}
                  onFocus={e => Object.assign(e.target.style, { borderColor: 'rgba(94,106,210,0.5)', background: 'rgba(255,255,255,0.05)' })}
                  onBlur={e => Object.assign(e.target.style, { borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' })}
                />
                <button
                  type="submit"
                  disabled={!newQuestionText.trim() || addingQuestion}
                  style={{ ...css.addQuestionBtn, opacity: !newQuestionText.trim() ? 0.5 : 1 }}
                >
                  {addingQuestion
                    ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Plus size={14} />
                  }
                  Add Question
                </button>
              </form>
            </>
          )}
        </main>
      </div>

      {/* Global keyframe injection */}
      <style>{`
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes rowSlideIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        @keyframes kwPop      { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
};

// ─── Module Sidebar Item ──────────────────────────────────────────────────────
interface ModuleItemProps {
  module: Module;
  isActive: boolean;
  questionCount?: number;
  onClick: () => void;
}
const ModuleItem: React.FC<ModuleItemProps> = ({ module, isActive, questionCount, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '9px 14px',
        textAlign: 'left',
        border: 'none',
        borderLeft: isActive ? '2px solid #5e6ad2' : '2px solid transparent',
        background: isActive
          ? 'linear-gradient(90deg, rgba(94,106,210,0.15) 0%, rgba(94,106,210,0.04) 100%)'
          : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
        <ChevronRight
          size={13}
          color={isActive ? '#818cf8' : 'rgba(255,255,255,0.2)'}
          style={{ flexShrink: 0, transition: 'color 0.15s ease' }}
        />
        <span style={{
          fontSize: '0.8125rem',
          fontWeight: isActive ? 600 : 400,
          color: isActive ? '#e0e2f0' : 'var(--color-text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'color 0.15s ease',
          letterSpacing: '-0.01em',
        }}>
          {module.name}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        {module.is_locked && (
          <Lock size={10} color={isActive ? '#818cf8' : 'rgba(255,255,255,0.2)'} />
        )}
        {isActive && questionCount !== undefined && (
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            color: '#818cf8',
            background: 'rgba(94,106,210,0.15)',
            border: '1px solid rgba(94,106,210,0.25)',
            borderRadius: '10px',
            padding: '1px 6px',
          }}>
            {questionCount}
          </span>
        )}
      </div>
    </button>
  );
};

// ─── Keyword Pill ─────────────────────────────────────────────────────────────
const KeywordPill: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px 3px 10px',
        borderRadius: '20px',
        background: hovered ? 'rgba(94,106,210,0.2)' : 'rgba(94,106,210,0.1)',
        border: '1px solid rgba(94,106,210,0.3)',
        color: '#818cf8',
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        animation: 'kwPop 0.2s ease',
        transition: 'background 0.15s ease',
        cursor: 'default',
        userSelect: 'none' as const,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'none',
          color: hovered ? '#f87171' : 'rgba(129,140,248,0.6)',
          cursor: 'pointer',
          padding: '0',
          lineHeight: 1,
          transition: 'color 0.15s ease',
        }}
      >
        <X size={11} />
      </button>
    </span>
  );
};

// ─── Question Row ─────────────────────────────────────────────────────────────
interface QuestionRowProps {
  question: Question;
  index: number;
  isLocked: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
}
const QuestionRow: React.FC<QuestionRowProps> = ({ question: q, index, isLocked, onToggleActive, onEdit }) => {
  const [hovered, setHovered] = useState(false);
  const canEdit = !(isLocked && q.has_been_edited);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        animation: `rowSlideIn 0.2s ease ${index * 0.03}s both`,
        transition: 'background-color 0.12s ease',
        opacity: q.is_active ? 1 : 0.5,
      }}
    >
      {/* Prompt Text */}
      <td style={{ ...css.td, maxWidth: 0 }}>
        <p style={{
          fontSize: '0.8125rem',
          color: q.is_active ? 'var(--color-text)' : 'var(--color-text-muted)',
          lineHeight: 1.5,
          margin: 0,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
        }}>
          {q.prompt_text}
        </p>
      </td>

      {/* Scoring Logic */}
      <td style={css.td}>
        {q.is_reverse_scored ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase' as const,
            background: 'rgba(245,158,11,0.1)', color: '#fbbf24',
            border: '1px solid rgba(245,158,11,0.25)',
          }}>
            <RotateCcw size={10} /> Reverse
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase' as const,
            background: 'rgba(74,222,128,0.08)', color: '#4ade80',
            border: '1px solid rgba(74,222,128,0.2)',
          }}>
            Normal
          </span>
        )}
      </td>

      {/* Status Toggle */}
      <td style={css.td}>
        <ToggleSwitch isActive={q.is_active} onToggle={onToggleActive} />
      </td>

      {/* Actions */}
      <td style={{ ...css.td, textAlign: 'right' }}>
        {canEdit ? (
          <button
            onClick={onEdit}
            title="Edit prompt text"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 11px', borderRadius: '6px',
              fontSize: '0.73rem', fontWeight: 500,
              color: hovered ? '#93c5fd' : 'var(--color-text-muted)',
              background: hovered ? 'rgba(59,130,246,0.08)' : 'transparent',
              border: `1px solid ${hovered ? 'rgba(59,130,246,0.2)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Edit2 size={12} /> Edit
          </button>
        ) : (
          <div
            title="Locked — this question has already been edited once"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 11px', borderRadius: '6px',
              fontSize: '0.73rem', fontWeight: 500,
              color: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'not-allowed',
            }}
          >
            <Lock size={12} /> Locked
          </div>
        )}
      </td>
    </tr>
  );
};

// ─── Inline Edit Row ──────────────────────────────────────────────────────────
interface EditRowProps {
  value: string;
  saving: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}
const EditRow: React.FC<EditRowProps> = ({ value, saving, onChange, onSave, onCancel }) => (
  <tr style={{ backgroundColor: 'rgba(94,106,210,0.06)', borderBottom: '1px solid rgba(94,106,210,0.15)' }}>
    <td style={{ ...css.td, paddingTop: '10px', paddingBottom: '10px' }}>
      <input
        autoFocus
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
        style={{
          width: '100%', padding: '6px 10px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(94,106,210,0.4)',
          borderRadius: '7px',
          color: 'var(--color-text)',
          fontSize: '0.8125rem',
          outline: 'none',
          boxShadow: '0 0 0 3px rgba(94,106,210,0.12)',
        }}
      />
    </td>
    <td style={css.td} />
    <td style={css.td} />
    <td style={{ ...css.td, textAlign: 'right' }}>
      <div style={{ display: 'inline-flex', gap: '6px' }}>
        <button
          onClick={onSave}
          disabled={!value.trim() || saving}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '4px 11px', borderRadius: '6px',
            fontSize: '0.73rem', fontWeight: 600,
            color: 'white',
            background: 'rgba(74,222,128,0.2)',
            border: '1px solid rgba(74,222,128,0.35)',
            cursor: saving || !value.trim() ? 'not-allowed' : 'pointer',
            opacity: !value.trim() ? 0.5 : 1,
          }}
        >
          {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={12} />}
          Save
        </button>
        <button
          onClick={onCancel}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '4px 11px', borderRadius: '6px',
            fontSize: '0.73rem', fontWeight: 500,
            color: 'var(--color-text-muted)',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
          }}
        >
          <XCircle size={12} /> Cancel
        </button>
      </div>
    </td>
  </tr>
);

// ─── Toggle Switch ────────────────────────────────────────────────────────────
const ToggleSwitch: React.FC<{ isActive: boolean; onToggle: () => void }> = ({ isActive, onToggle }) => (
  <button
    onClick={onToggle}
    title={isActive ? 'Deactivate question' : 'Activate question'}
    style={{
      position: 'relative',
      width: '34px', height: '18px',
      borderRadius: '9px',
      background: isActive ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.1)',
      border: `1px solid ${isActive ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.15)'}`,
      cursor: 'pointer',
      transition: 'background 0.2s ease, border-color 0.2s ease',
      flexShrink: 0,
    }}
  >
    <span style={{
      position: 'absolute',
      top: '2px',
      left: isActive ? '16px' : '2px',
      width: '12px', height: '12px',
      borderRadius: '50%',
      background: isActive ? '#4ade80' : 'rgba(255,255,255,0.3)',
      transition: 'left 0.2s ease, background 0.2s ease',
      boxShadow: isActive ? '0 0 6px rgba(74,222,128,0.6)' : 'none',
    }} />
  </button>
);

// ─── Empty Detail State ───────────────────────────────────────────────────────
const EmptyDetailState: React.FC = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', gap: '12px',
  }}>
    <BookOpen size={36} color="rgba(255,255,255,0.08)" />
    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
      Select a module from the left to begin editing.
    </p>
  </div>
);

// ─── Style Constants ──────────────────────────────────────────────────────────
const css: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  // ── Shell ──
  shell: {
    display: 'flex',
    height: '76vh',
    minHeight: '520px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(15,17,21,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    overflow: 'hidden',
    boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
  },
  // ── Sidebar ──
  sidebar: {
    width: '240px',
    minWidth: '220px',
    maxWidth: '240px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.015)',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 14px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sidebarTitle: {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-muted)',
  },
  moduleBadge: {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: '#818cf8',
    background: 'rgba(94,106,210,0.12)',
    border: '1px solid rgba(94,106,210,0.2)',
    borderRadius: '10px',
    padding: '1px 6px',
  },
  moduleList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '6px 0',
  },
  sidebarLoader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
  },
  sidebarFooter: {
    padding: '10px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  addModuleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px',
    borderRadius: '8px',
    background: 'transparent',
    border: '1px dashed rgba(94,106,210,0.3)',
    color: '#818cf8',
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  moduleNameInput: {
    width: '100%',
    padding: '7px 10px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(94,106,210,0.35)',
    borderRadius: '7px',
    color: 'var(--color-text)',
    fontSize: '0.8125rem',
    outline: 'none',
    boxShadow: '0 0 0 2px rgba(94,106,210,0.1)',
  },
  addModuleConfirm: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '6px 10px',
    borderRadius: '7px',
    background: 'linear-gradient(135deg, #5e6ad2, #8b5cf6)',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(94,106,210,0.3)',
  },
  addModuleCancel: {
    padding: '6px 10px',
    borderRadius: '7px',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--color-text-muted)',
    fontSize: '0.75rem',
    fontWeight: 500,
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
  },
  // ── Detail Pane ──
  detail: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.015)',
    flexShrink: 0,
    minWidth: 0,
  },
  detailTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    letterSpacing: '-0.02em',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  lockBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.25)',
    color: '#fbbf24',
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    flexShrink: 0,
  },
  questionCount: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 9px',
    borderRadius: '20px',
    background: 'rgba(94,106,210,0.08)',
    border: '1px solid rgba(94,106,210,0.15)',
    color: '#818cf8',
    fontSize: '0.72rem',
    fontWeight: 600,
    flexShrink: 0,
  },
  // ── Keywords ──
  keywordsSection: {
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0,
  },
  keywordsSectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-muted)',
    marginBottom: '8px',
  },
  keywordsHint: {
    fontWeight: 400,
    letterSpacing: '0',
    textTransform: 'none' as const,
    color: 'rgba(255,255,255,0.2)',
    fontSize: '0.68rem',
    marginLeft: '4px',
  },
  keywordsPillBox: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    alignItems: 'center',
    minHeight: '30px',
  },
  keywordInput: {
    padding: '3px 10px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px dashed rgba(94,106,210,0.3)',
    color: 'var(--color-text)',
    fontSize: '0.72rem',
    outline: 'none',
    width: '130px',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  },
  // ── Table ──
  tableWrapper: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    tableLayout: 'fixed' as const,
  },
  th: {
    padding: '9px 16px',
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-muted)',
    textAlign: 'left' as const,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '10px 16px',
    verticalAlign: 'middle' as const,
  },
  // ── Add Question Form ──
  addQuestionForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.01)',
    flexShrink: 0,
  },
  addQuestionInput: {
    flex: 1,
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px',
    color: 'var(--color-text)',
    fontSize: '0.8125rem',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  },
  addQuestionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #5e6ad2, #8b5cf6)',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.8125rem',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(94,106,210,0.3)',
    flexShrink: 0,
    transition: 'opacity 0.2s ease',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  },
};
