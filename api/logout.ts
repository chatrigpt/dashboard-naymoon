import { clearSessionCookie, json } from './_auth.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
  res.setHeader('Set-Cookie', clearSessionCookie());
  return json(res, 200, { ok: true });
}
