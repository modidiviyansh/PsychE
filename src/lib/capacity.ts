import { supabase } from './supabase';

export async function getDailyCapacity(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('PsychE_Settings')
      .select('daily_session_capacity')
      .eq('id', 1)
      .single();
      
    if (error) {
      console.warn('Error fetching capacity, falling back to 7:', error);
      return 7;
    }
    return data?.daily_session_capacity || 7;
  } catch (error) {
    return 7;
  }
}

export async function getSessionCountsForDateRange(startDate: Date, days: number): Promise<Record<string, number>> {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days - 1);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('PsychE_Counseling_Logs')
      .select('scheduled_date')
      .gte('scheduled_date', startStr)
      .lte('scheduled_date', endStr)
      .eq('session_status', 'Scheduled');
      
    if (error) throw error;
    
    const counts: Record<string, number> = {};
    if (data) {
      data.forEach(log => {
        const dateStr = log.scheduled_date;
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      });
    }
    return counts;
  } catch (error) {
    console.error('Error fetching session counts:', error);
    return {};
  }
}

export async function getAvailableCapacityForDateRange(startDate: Date, days: number): Promise<Record<string, { total: number, booked: number, available: number }>> {
  const capacity = await getDailyCapacity();
  const bookedCounts = await getSessionCountsForDateRange(startDate, days);
  
  const result: Record<string, { total: number, booked: number, available: number }> = {};
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const booked = bookedCounts[dateStr] || 0;
    result[dateStr] = {
      total: capacity,
      booked: booked,
      available: Math.max(0, capacity - booked)
    };
  }
  
  return result;
}
