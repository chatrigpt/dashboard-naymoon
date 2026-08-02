import crypto from 'node:crypto';

const COOKIE_NAME = 'naymoon_admin_session';
const TTL_SECONDS = 60 * 60 * 12;

function secret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'change-me-in-vercel';
}

function signature(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionCookie(): string {
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = String(expires);
  const token = `${payload}.${signature(payload)}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isAuthenticated(req: any): boolean {
  const cookie = String(req.headers?.cookie || '');
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const [expiresRaw, receivedSignature] = decodeURIComponent(match[1]).split('.');
  const expires = Number(expiresRaw);
  if (!expires || expires < Math.floor(Date.now() / 1000) || !receivedSignature) return false;
  const expected = signature(expiresRaw);
  const a = Buffer.from(receivedSignature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function json(res: any, status: number, body: unknown): void {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
