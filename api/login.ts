import { createSessionCookie, json } from './_auth.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return json(res, 500, { error: 'ADMIN_PASSWORD n’est pas configuré sur Vercel.' });

  const password = String(req.body?.password || '');
  if (password !== expected) return json(res, 401, { error: 'Mot de passe incorrect.' });

  res.setHeader('Set-Cookie', createSessionCookie());
  return json(res, 200, { ok: true });
}
