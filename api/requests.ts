import { isAuthenticated, json } from './_auth.js';

const ALLOWED_STATUSES = new Set(['pending', 'paid', 'cancelled']);

export default async function handler(req: any, res: any) {
  if (!isAuthenticated(req)) return json(res, 401, { error: 'Session expirée.' });

  const endpoint = process.env.GOOGLE_APPS_SCRIPT_URL;
  const apiKey = process.env.SHEET_API_KEY;
  if (!endpoint || !apiKey) {
    return json(res, 500, { error: 'GOOGLE_APPS_SCRIPT_URL ou SHEET_API_KEY manquant.' });
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(endpoint);
      url.searchParams.set('action', 'list');
      url.searchParams.set('key', apiKey);
      const response = await fetch(url.toString(), { cache: 'no-store', redirect: 'follow' });
      const data = await response.json();
      if (!response.ok || data?.ok === false) throw new Error(data?.error || 'Lecture Google Sheet impossible.');
      return json(res, 200, data);
    }

    if (req.method === 'POST') {
      const rowNumber = Number(req.body?.rowNumber);
      const status = String(req.body?.status || '').toLowerCase();
      if (!Number.isInteger(rowNumber) || rowNumber < 2) return json(res, 400, { error: 'Ligne invalide.' });
      if (!ALLOWED_STATUSES.has(status)) return json(res, 400, { error: 'Statut invalide.' });

      const response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateStatus', key: apiKey, rowNumber, status }),
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) throw new Error(data?.error || 'Mise à jour Google Sheet impossible.');
      return json(res, 200, data);
    }

    return json(res, 405, { error: 'Méthode non autorisée' });
  } catch (error) {
    return json(res, 502, { error: error instanceof Error ? error.message : 'Erreur Google Sheet.' });
  }
}
