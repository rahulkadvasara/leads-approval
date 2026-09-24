import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || 'leads_approval_auth_secret_seed_2026_x89';

export function generateSessionToken(username: string, email: string): string {
  const envPassword = (process.env.AUTH_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
  const payload = `${username.trim()}|${email.trim().toLowerCase()}|${envPassword}`;
  return crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
}

export function validateSession(username: string, email: string, token: string): boolean {
  if (!username || !email || !token) return false;

  const envUsername = (process.env.AUTH_USERNAME || '').trim();
  const envEmail = (process.env.AUTH_EMAIL || '').trim().toLowerCase();

  if (username.trim() !== envUsername) return false;
  if (email.trim().toLowerCase() !== envEmail) return false;

  const expectedToken = generateSessionToken(username, email);
  try {
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expectedToken);
    if (tokenBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}
