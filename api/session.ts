import { isAuthenticated, json } from './_auth.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Méthode non autorisée' });
  return json(res, 200, { authenticated: isAuthenticated(req) });
}
