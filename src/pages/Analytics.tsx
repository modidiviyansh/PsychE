import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Users, AlertTriangle, FileText, TrendingUp, CalendarCheck, Percent, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, sub, accent = 'var(--color-primary)', loading }) => (
  <motion.div
    variants={item}
    className="bento-card"
    style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{label}</p>
      <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: `${accent}18`, display: 'flex' }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
    </div>
    <div>
      {loading ? (
        <div style={{ height: '2.5rem', width: '5rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <p style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--color-text)' }}>{value}</p>
      )}
      {sub && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>{sub}</p>}
    </div>
  </motion.div>
);

// Mini horizontal bar
const MiniBar: React.FC<{ label: string; count: number; total: number; color: string }> = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{count} <span style={{ fontSize: '0.6875rem' }}>({pct}%)</span></span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
          style={{ height: '100%', borderRadius: '3px', backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Metrics
  const [totalStudents, setTotalStudents] = useState(0);
  const [highRisk, setHighRisk] = useState(0);
  const [mediumRisk, setMediumRisk] = useState(0);
  const [lowRisk, setLowRisk] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logsThisWeek, setLogsThisWeek] = useState(0);
  const [scheduledSessions, setScheduledSessions] = useState(0);
  const [noShowCount, setNoShowCount] = useState(0);
  const [courseBreakdown, setCourseBreakdown] = useState<{ course: string; count: number }[]>([]);

  useEffect(() => {
    document.title = 'UPsych : GCM Edition | Analytics';
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      // Total students by risk level
      const { data: students } = await supabase
        .from('PsychE_Students')
        .select('id, risk_level, course');

      if (students) {
        setTotalStudents(students.length);
        setHighRisk(students.filter(s => s.risk_level === 'High').length);
        setMediumRisk(students.filter(s => s.risk_level === 'Medium').length);
        setLowRisk(students.filter(s => !s.risk_level || s.risk_level === 'Low').length);

        // Course breakdown
        const courseCounts: Record<string, number> = {};
        students.forEach(s => {
          const c = s.course || 'Unknown';
          courseCounts[c] = (courseCounts[c] || 0) + 1;
        });
        const sorted = Object.entries(courseCounts)
          .map(([course, count]) => ({ course, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
        setCourseBreakdown(sorted);
      }

      // Total logs
      const { count: logCount } = await supabase
        .from('PsychE_Counseling_Logs')
        .select('id', { count: 'exact', head: true });
      if (logCount !== null) setTotalLogs(logCount);

      // Logs this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: weekCount } = await supabase
        .from('PsychE_Counseling_Logs')
        .select('id', { count: 'exact', head: true })
        .gte('session_date', weekAgo.toISOString());
      if (weekCount !== null) setLogsThisWeek(weekCount);

      // Scheduled sessions
      const { count: sched } = await supabase
        .from('PsychE_Counseling_Logs')
        .select('id', { count: 'exact', head: true })
        .eq('session_status', 'Scheduled');
      if (sched !== null) setScheduledSessions(sched);

      // No-show count
      const { count: noShow } = await supabase
        .from('PsychE_Counseling_Logs')
        .select('id', { count: 'exact', head: true })
        .eq('session_status', 'No_Show');
      if (noShow !== null) setNoShowCount(noShow);

    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  const engagementRate = totalLogs > 0
    ? Math.round(((totalLogs - noShowCount) / totalLogs) * 100)
    : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: '1rem 0' }}>

      {/* Header */}
      <motion.div variants={item} style={{ marginBottom: '2rem' }}>
        <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart2 size={30} style={{ color: 'var(--color-primary)' }} /> Analytics
        </h1>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>
          Aggregate overview of student and session data across the programme.
        </p>
      </motion.div>

      {/* ── Row 1: Key Metrics ─────────────────────────────── */}
      <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>

        {/* span 3 each = 4 cards on desktop, stacked on mobile */}
        <div className="col-span-3">
          <MetricCard icon={<Users size={18} />} label="Total Students" value={totalStudents} sub="Registered in system" loading={loading} />
        </div>
        <div className="col-span-3">
          <MetricCard icon={<AlertTriangle size={18} />} label="High Risk" value={highRisk} sub={`${totalStudents ? Math.round((highRisk / totalStudents) * 100) : 0}% of total students`} accent="#ef4444" loading={loading} />
        </div>
        <div className="col-span-3">
          <MetricCard icon={<FileText size={18} />} label="Total Sessions" value={totalLogs} sub="All counseling logs" accent="#8b5cf6" loading={loading} />
        </div>
        <div className="col-span-3">
          <MetricCard icon={<TrendingUp size={18} />} label="Sessions This Week" value={logsThisWeek} sub="Last 7 days" accent="#4ade80" loading={loading} />
        </div>
      </div>

      {/* ── Row 2: Detailed Bento Cards ─────────────────────── */}
      <div className="bento-grid">

        {/* Risk Breakdown */}
        <motion.div variants={item} className="bento-card col-span-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
            <h3 className="text-h3" style={{ fontSize: '1rem', margin: 0 }}>Risk Distribution</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <MiniBar label="High Risk" count={highRisk} total={totalStudents} color="#ef4444" />
            <MiniBar label="Medium Risk" count={mediumRisk} total={totalStudents} color="#f59e0b" />
            <MiniBar label="Low / None" count={lowRisk} total={totalStudents} color="#4ade80" />
          </div>
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '1rem' }}>
            {[
              { label: 'High', count: highRisk, color: '#ef4444' },
              { label: 'Medium', count: mediumRisk, color: '#f59e0b' },
              { label: 'Low', count: lowRisk, color: '#4ade80' },
            ].map(r => (
              <div key={r.label} style={{ textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: r.color, letterSpacing: '-0.03em' }}>{r.count}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Session Health */}
        <motion.div variants={item} className="bento-card col-span-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CalendarCheck size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-h3" style={{ fontSize: '1rem', margin: 0 }}>Session Health</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Scheduled (Pending)', value: scheduledSessions, color: 'var(--color-primary)' },
              { label: 'No-Show', value: noShowCount, color: '#ef4444' },
              { label: 'Completed', value: Math.max(0, totalLogs - scheduledSessions - noShowCount), color: '#4ade80' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: row.color }}>{loading ? '–' : row.value}</span>
              </div>
            ))}
          </div>
          {/* Engagement Rate */}
          <div style={{ marginTop: '1.25rem', padding: '0.875rem', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(94,106,210,0.1), rgba(139,92,246,0.08))', border: '1px solid rgba(94,106,210,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Percent size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Engagement Rate</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>{loading ? '–' : `${engagementRate}%`}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Sessions completed vs total logged</p>
          </div>
        </motion.div>

        {/* Course Breakdown */}
        <motion.div variants={item} className="bento-card col-span-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <BookOpen size={18} style={{ color: '#8b5cf6' }} />
            <h3 className="text-h3" style={{ fontSize: '1rem', margin: 0 }}>Students by Course</h3>
          </div>
          {loading ? (
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Loading…</p>
          ) : courseBreakdown.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>No course data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {courseBreakdown.map(({ course, count }) => (
                <MiniBar key={course} label={course} count={count} total={totalStudents} color="#8b5cf6" />
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </motion.div>
  );
};
