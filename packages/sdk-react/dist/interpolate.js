"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpolate = interpolate;
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
function interpolate(template, vars) {
    if (!vars || template.indexOf('{') === -1)
        return template;
    const withPlurals = resolvePlurals(template, vars);
    // Simple placeholders: {name}
    return withPlurals.replace(/\{(\w+)\}/g, (match, name) => {
        const value = vars[name];
        return value === undefined || value === null ? match : String(value);
    });
}
/** Scans for `{name, plural, ...}` blocks with balanced braces and resolves each. */
function resolvePlurals(template, vars) {
    let result = '';
    let i = 0;
    while (i < template.length) {
        const open = template.indexOf('{', i);
        if (open === -1) {
            result += template.slice(i);
            break;
        }
        result += template.slice(i, open);
        const block = readBlock(template, open);
        if (!block) {
            // Unbalanced — emit the brace literally and move on.
            result += template[open];
            i = open + 1;
            continue;
        }
        const inner = block.inner; // contents between the outer braces
        const pluralMatch = /^\s*(\w+)\s*,\s*plural\s*,\s*([\s\S]*)$/.exec(inner);
        if (pluralMatch) {
            const name = pluralMatch[1];
            const value = vars[name];
            const n = typeof value === 'number' ? value : Number(value);
            if (Number.isFinite(n)) {
                const forms = parsePluralForms(pluralMatch[2]);
                const chosen = forms[pluralCategory(n)] ?? forms.other ?? '';
                result += chosen.replace(/\{#\}|#/g, String(n));
            }
            else {
                result += template.slice(open, block.end); // leave intact
            }
        }
        else {
            // Not a plural block — leave it for the simple-placeholder pass.
            result += template.slice(open, block.end);
        }
        i = block.end;
    }
    return result;
}
/** Reads a brace-balanced block starting at `template[open] === '{'`. */
function readBlock(template, open) {
    let depth = 0;
    for (let i = open; i < template.length; i++) {
        const ch = template[i];
        if (ch === '{')
            depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0)
                return { inner: template.slice(open + 1, i), end: i + 1 };
        }
    }
    return null;
}
function pluralCategory(n) {
    const abs = Math.abs(n);
    if (abs === 0)
        return 'zero';
    if (abs === 1)
        return 'one';
    if (abs === 2)
        return 'two';
    return 'other';
}
/** Parses "one {x} other {y z}" -> { one: "x", other: "y z" } (brace-balanced). */
function parsePluralForms(body) {
    const forms = {};
    const re = /(\w+)\s*\{/g;
    let m;
    while ((m = re.exec(body)) !== null) {
        const category = m[1];
        const start = re.lastIndex;
        let depth = 1;
        let i = start;
        for (; i < body.length && depth > 0; i++) {
            if (body[i] === '{')
                depth++;
            else if (body[i] === '}')
                depth--;
        }
        forms[category] = body.slice(start, i - 1);
        re.lastIndex = i;
    }
    return forms;
}
