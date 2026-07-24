/**
 * Converts a string to Title Case.
 * e.g., "NeeraJ bANSAL" -> "Neeraj Bansal"
 */
export const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Capitalizes the first letter of a string and trims excess whitespace.
 * e.g., "  student felt stressed  " -> "Student felt stressed"
 */
export const toSentenceCase = (str: string | null | undefined): string => {
  if (!str) return '';
  const trimmed = str.trim();
  if (trimmed.length === 0) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};
