// =============================================================================
//  PsychE V3 — Capacity Utility
//  Owns: daily session capacity queries and availability map computation.
//  Source of truth for scheduling enforcement in the frontend.
//  Per docs/ARCH_technical-specs.md §6
// =============================================================================

import { supabase } from './supabase';
import type { DateCapacityStatus } from '../types';

// ---------------------------------------------------------------------------
//  Timezone-safe date string helper
//  toISOString() converts to UTC which shifts the date in +05:30 timezones.
//  Use local year/month/day components instead.
// ---------------------------------------------------------------------------

export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
//  getDailyCapacity
//  Fetches PsychE_Settings.daily_session_capacity. Falls back to 7 on error.
// ---------------------------------------------------------------------------

export async function getDailyCapacity(): Promise<number> {
  const { data, error } = await supabase
    .from('PsychE_Settings')
    .select('daily_session_capacity')
    .eq('id', 1)
    .single();

  if (error || !data) {
    console.warn('[capacity] getDailyCapacity fallback to 7:', error?.message);
    return 7;
  }
  return data.daily_session_capacity ?? 7;
}

// ---------------------------------------------------------------------------
//  getDateLoad
//  Returns count of non-cancelled sessions scheduled on a given ISO date string.
//  Pattern from docs/ARCH_technical-specs.md §6
// ---------------------------------------------------------------------------

export async function getDateLoad(date: string): Promise<number> {
  const { count, error } = await supabase
    .from('PsychE_Counseling_Logs')
    .select('*', { count: 'exact', head: true })
    .eq('scheduled_date', date)
    .neq('session_status', 'Cancelled');

  if (error) {
    console.warn('[capacity] getDateLoad error for', date, error.message);
    return 0;
  }
  return count ?? 0;
}

// ---------------------------------------------------------------------------
//  getDateStatus
//  Returns { isFull, load, capacity } for a single date.
// ---------------------------------------------------------------------------

export async function getDateStatus(date: string): Promise<DateCapacityStatus> {
  const [capacity, load] = await Promise.all([
    getDailyCapacity(),
    getDateLoad(date),
  ]);
  return { isFull: load >= capacity, load, capacity };
}

// ---------------------------------------------------------------------------
//  getCapacityMap
//  Returns a Record<dateString, DateCapacityStatus> for a date range.
//  Used by: date pickers, Kanban header, BulkSchedule preview.
//
//  Fetches all scheduled_dates in range in a single query, then computes
//  counts client-side — avoids N queries for N days.
// ---------------------------------------------------------------------------

export async function getCapacityMap(
  start: string,
  end: string
): Promise<Record<string, DateCapacityStatus>> {
  const [capacity, { data, error }] = await Promise.all([
    getDailyCapacity(),
    supabase
      .from('PsychE_Counseling_Logs')
      .select('scheduled_date')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .neq('session_status', 'Cancelled'),
  ]);

  if (error) {
    console.warn('[capacity] getCapacityMap error:', error.message);
  }

  // Tally counts from data
  const counts: Record<string, number> = {};
  (data ?? []).forEach(row => {
    if (row.scheduled_date) {
      counts[row.scheduled_date] = (counts[row.scheduled_date] || 0) + 1;
    }
  });

  // Build result map for every day in range
  const result: Record<string, DateCapacityStatus> = {};
  const current = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');

  while (current <= endDate) {
    const dateStr = toLocalDateStr(current);
    const load = counts[dateStr] ?? 0;
    result[dateStr] = { isFull: load >= capacity, load, capacity };
    current.setDate(current.getDate() + 1);
  }

  return result;
}

// ---------------------------------------------------------------------------
//  Legacy alias — used by existing BulkSchedule and KanbanBoard
//  Wraps getCapacityMap for backward compat.
// ---------------------------------------------------------------------------

export async function getAvailableCapacityForDateRange(
  startDate: Date,
  days: number
): Promise<Record<string, { total: number; booked: number; available: number }>> {
  const start = toLocalDateStr(startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days - 1);
  const end = toLocalDateStr(endDate);

  const map = await getCapacityMap(start, end);
  const result: Record<string, { total: number; booked: number; available: number }> = {};

  Object.entries(map).forEach(([date, status]) => {
    result[date] = {
      total: status.capacity,
      booked: status.load,
      available: Math.max(0, status.capacity - status.load),
    };
  });

  return result;
}

// ---------------------------------------------------------------------------
//  Legacy alias — used by existing AddLog
// ---------------------------------------------------------------------------

export async function getSessionCountsForDateRange(
  startDate: Date,
  days: number
): Promise<Record<string, number>> {
  const start = toLocalDateStr(startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days - 1);
  const end = toLocalDateStr(endDate);

  const map = await getCapacityMap(start, end);
  const result: Record<string, number> = {};
  Object.entries(map).forEach(([date, status]) => {
    result[date] = status.load;
  });
  return result;
}
