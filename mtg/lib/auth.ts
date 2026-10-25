// Supabase Auth needs an email, but this game uses plain usernames.
// Each username maps to a placeholder address. Supabase rejects domains that have no mail
// servers (example.com and friends), so this must be a domain with real MX records.
// Nothing is ever sent to these addresses as long as "Confirm email" stays OFF in Supabase
// and password-reset emails are never used. Override with NEXT_PUBLIC_AUTH_EMAIL_DOMAIN.
const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "mailinator.com";

// No character rules: just not empty and at most 50 characters.
export const MIN_USERNAME_LENGTH = 1;
export const MAX_USERNAME_LENGTH = 50;
export const MIN_PASSWORD_LENGTH = 1;
export const MAX_PASSWORD_LENGTH = 50;

/** Case-insensitive, ignores surrounding spaces. */
export const normalizeUsername = (username: string) => username.trim().toLowerCase();

/** 53-bit string hash (cyrb53). Works over plain http too, unlike crypto.subtle. */
function cyrb53(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

const hash = (s: string) => [1, 2].map((seed) => cyrb53(s, seed).toString(16).padStart(14, "0")).join("");

/**
 * Plain names (a-z, 0-9, _) stay readable in the Supabase dashboard. Anything else
 * (spaces, @, accents, emoji...) can't be an email local part, so it becomes `h.<hash>`.
 * Readable names never contain ".", so the two forms can never clash.
 */
export function usernameToEmail(username: string): string {
  const name = normalizeUsername(username);
  const local = /^[a-z0-9_]+$/.test(name) ? name : `h.${hash(name)}`;
  return `${local}@${EMAIL_DOMAIN}`;
}
