// =============================================================================
//  Student ID — the single owner of the identifier format.
//
//  This rule used to be written twice, and the two copies had drifted:
//  AddStudent.tsx accepted STU-YYYY-NNN while the Dashboard CSV importer
//  demanded STU-NNNN. The consequence was that every ID the school had ever
//  created through the UI was rejected on import, and the CSV template the app
//  itself hands out ("STU-101") matched neither. Import from here; never
//  re-type the pattern.
// =============================================================================

/**
 * Canonical format: STU-<4-digit year>-<serial of 3 OR 4 digits>.
 * Both widths are equally valid — STU-2026-178 and STU-2026-1780 — so the
 * serial is not padded and must not be validated as a fixed width.
 *
 * Exported as a string as well because <input pattern> needs the source form.
 */
export const STUDENT_ID_PATTERN = '^STU-\\d{4}-\\d{3,4}$';

export const STUDENT_ID_REGEX = new RegExp(STUDENT_ID_PATTERN);

/**
 * What the user is shown. Two real IDs, one of each serial width — no NNN/XXX
 * notation anywhere, because an example teaches the format without also having
 * to teach the shorthand used to describe it.
 */
export const STUDENT_ID_HINT = 'STU-2026-178 or STU-2026-1780';

/** Single placeholder example. */
export const STUDENT_ID_PLACEHOLDER = 'STU-2026-178';

export function isValidStudentId(value: string | null | undefined): boolean {
  return !!value && STUDENT_ID_REGEX.test(value.trim());
}
