// authIdentity.js - Qu?n lý công th?c chu?n hóa và t?o Identity cho Supabase

/**
 * Chu?n hóa username: Xóa kho?ng tr?ng th?a, dua v? ch? thu?ng
 * @param {string} username 
 * @returns {string}
 */
export function normalizeUsername(username) {
    if (!username) return '';
    return username.trim().toLowerCase();
}

/**
 * T?o email n?i b? cho Supabase Auth d?a trên username
 * @param {string} username 
 * @returns {string}
 */
export function createInternalIdentity(username) {
    const normalized = normalizeUsername(username);
    return normalized + '@namcumz.com';
}

/**
 * Validate username client-side tru?c khi g?i
 * @param {string} username 
 * @returns {boolean}
 */
export function validateUsername(username) {
    const normalized = normalizeUsername(username);
    return normalized.length >= 3 && /^[a-z0-9_]+$/.test(normalized);
}
