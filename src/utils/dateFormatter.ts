import { parseISO, format, isBefore, startOfToday, parse, isValid } from 'date-fns';

/**
 * Returns a uniform formatted date string for the application.
 * Default format: DD/MM/YYYY
 */
export const formatDisplayDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    let dateObj;
    if (typeof dateString === 'string') {
      // If it contains slashes, force MM/dd/yyyy parsing to prevent locale flip (Sept 5 = 09/05/2026)
      if (dateString.includes('/')) {
        dateObj = parse(dateString, 'MM/dd/yyyy', new Date());
        if (!isValid(dateObj)) dateObj = parseISO(dateString); // fallback
      } else {
        dateObj = parseISO(dateString);
      }
    } else {
      dateObj = dateString;
    }
    
    if (!isValid(dateObj)) return 'Invalid Date';
    return format(dateObj, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Date parsing error for display:', error);
    return 'Invalid Date';
  }
};

/**
 * Checks if a given date string is strictly overdue (before today).
 * Uses explicit parsing to handle database strings accurately and avoid locale issues.
 */
export const isOverdue = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  
  try {
    let dateObj;
    if (dateString.includes('/')) {
      dateObj = parse(dateString, 'MM/dd/yyyy', new Date());
      if (!isValid(dateObj)) dateObj = parseISO(dateString);
    } else {
      dateObj = parseISO(dateString);
    }
    
    if (!isValid(dateObj)) return false;
    return isBefore(dateObj, startOfToday());
  } catch (error) {
    console.error('Date parsing error for overdue check:', error);
    return false;
  }
};
