import type { TranslationVars } from './types';
/**
 * Interpolates {placeholders} and a minimal ICU-style plural form into a template.
 *
 * Supported:
 *   "Hello {name}"                                       -> simple substitution
 *   "{n} {n, plural, one {item} other {items}}"          -> plural selection on `n`
 *   "{n, plural, one {# item} other {# items}}"          -> `#` expands to the number
 *
 * Plural categories: zero, one, two, other (English-leaning; `other` is the
 * safe fallback). Unknown placeholders are left untouched so a missing var
 * never blanks the UI.
 */
export declare function interpolate(template: string, vars?: TranslationVars): string;
