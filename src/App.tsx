import { FormEvent, useEffect, useMemo, useState } from 'react';

type Status = 'pending' | 'paid' | 'cancelled';

type RequestRow = {
  _row: number;
  business_name?: string;
  client_name?: string;
  uuid?: string;
  email?: string;
  location?: string;
  contact?: string;
  timestamp?: string;
  actual_subscription?: string;
  new_subscription?: string;
  cycle?: string;
  sql_command?: string;
  'amount to pay'?: string | number;
  status?: Status | string;
  [key: string]: unknown;
};

const statusLabels: Record<Status, string> = {
  pending: 'En attente',
  paid: 'Payé',
  cancelled: 'Annulé',
};

const statusIcons: Record<Status, string> = {
  pending: '◷',
  paid: '✓',
  cancelled: '×',
};

function normalizeStatus(value: unknown): Status {
  const status = String(value || '').toLowerCase();
  if (status === 'paid' || status === 'payé' || status === 'paye') return 'paid';
  if (status === 'cancelled' || status === 'annulé' || status === 'annule') return 'cancelled';
  return 'pending';
}

function parseAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').replace(/[^0-9,.-]/g, '').replace(/,/g, '.');
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: unknown): Date | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, day, month, year, hour = '0', minute = '0', second = '0'] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: unknown) {
  const date = parseDate(value);
  if (!date) return String(value || '—');
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Connexion impossible.');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <form className="login-card" onSubmit={submit}>
        <div className="brand-lockup">
          <img src="/naymoon-logo.png" alt="Naymoon" />
          <div>
            <span>Administration privée</span>
            <h1>Naymoon Cartel</h1>
          </div>
        </div>
        <p className="login-copy">Suivi centralisé des demandes d’abonnement et des encaissements.</p>
        <label htmlFor="password">Clé d’accès</label>
        <div className="password-wrap">
          <span>✦</span>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Saisissez la clé administrateur"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button className="primary-button" disabled={loading}>
          {loading ? 'Vérification…' : 'Accéder au dashboard'}
        </button>
        <small>Accès réservé à l’équipe Naymoon.</small>
      </form>
    </main>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [updatingRow, setUpdatingRow] = useState<number | null>(null);
  const [selectedSql, setSelectedSql] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    fetch('/api/session')
      .then((response) => response.json())
      .then((data) => setAuthenticated(Boolean(data.authenticated)))
      .catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    if (authenticated) void loadRows();
  }, [authenticated]);

  async function loadRows() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/requests', { cache: 'no-store' });
      const data = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Chargement impossible.');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setLastUpdated(data.updatedAt || new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(rowNumber: number, status: Status) {
    setUpdatingRow(rowNumber);
    setError('');
    const previous = rows;
    setRows((current) => current.map((row) => row._row === rowNumber ? { ...row, status } : row));
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowNumber, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Modification impossible.');
    } catch (err) {
      setRows(previous);
      setError(err instanceof Error ? err.message : 'Modification impossible.');
    } finally {
      setUpdatingRow(null);
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    setAuthenticated(false);
  }

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const from = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const to = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    return rows.filter((row) => {
      const status = normalizeStatus(row.status);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      const date = parseDate(row.timestamp);
      if (from && (!date || date < from)) return false;
      if (to && (!date || date > to)) return false;
      if (!needle) return true;
      return [row.business_name, row.client_name, row.email, row.contact, row.location, row.uuid, row.new_subscription]
        .some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [rows, search, statusFilter, startDate, endDate]);

  const totals = useMemo(() => {
    const result: Record<Status, { amount: number; count: number }> = {
      pending: { amount: 0, count: 0 },
      paid: { amount: 0, count: 0 },
      cancelled: { amount: 0, count: 0 },
    };
    filteredRows.forEach((row) => {
      const status = normalizeStatus(row.status);
      result[status].count += 1;
      result[status].amount += parseAmount(row['amount to pay']);
    });
    return result;
  }, [filteredRows]);

  if (authenticated === null) return <div className="splash"><div className="spinner" /></div>;
  if (!authenticated) return <Login onSuccess={() => setAuthenticated(true)} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup compact">
          <img src="/naymoon-logo.png" alt="Naymoon" />
          <div><span>Admin</span><h2>Naymoon Cartel</h2></div>
        </div>
        <nav>
          <button className="nav-active"><span>◈</span> Abonnements</button>
        </nav>
        <div className="sidebar-footer">
          <div className="sync-dot"><i /> Google Sheet connecté</div>
          <button className="logout" onClick={logout}>Déconnexion</button>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <span className="eyebrow">Pilotage commercial</span>
            <h1>Demandes d’abonnements</h1>
            <p>Suivez les prospects, validez les paiements et gardez une vision claire des montants.</p>
          </div>
          <button className="refresh-button" onClick={loadRows} disabled={loading}>
            <span className={loading ? 'spin' : ''}>↻</span> Actualiser
          </button>
        </header>

        {error && <div className="banner-error">{error}</div>}

        <section className="stats-grid">
          {(['pending', 'paid', 'cancelled'] as Status[]).map((status) => (
            <article className={`stat-card ${status}`} key={status}>
              <div className="stat-icon">{statusIcons[status]}</div>
              <div className="stat-meta">
                <span>{statusLabels[status]}</span>
                <strong>{formatMoney(totals[status].amount)}</strong>
                <small>{totals[status].count} demande{totals[status].count > 1 ? 's' : ''}</small>
              </div>
            </article>
          ))}
        </section>

        <section className="panel filters-panel">
          <div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client, établissement, e-mail…" /></div>
          <div className="date-control"><label>Du</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="date-control"><label>Au</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <button className="clear-filter" onClick={() => { setSearch(''); setStatusFilter('all'); setStartDate(''); setEndDate(''); }}>Réinitialiser</button>
          <div className="status-tabs">
            {(['all', 'pending', 'paid', 'cancelled'] as const).map((status) => (
              <button key={status} className={statusFilter === status ? 'active' : ''} onClick={() => setStatusFilter(status)}>
                {status === 'all' ? 'Toutes' : statusLabels[status]}
              </button>
            ))}
          </div>
        </section>

        <section className="panel table-panel">
          <div className="table-heading">
            <div><h2>Registre des demandes</h2><p>{filteredRows.length} résultat{filteredRows.length > 1 ? 's' : ''} • mise à jour {lastUpdated ? formatDate(lastUpdated) : '—'}</p></div>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Client / établissement</th><th>Offre</th><th>Contact</th><th>Date</th><th>Montant</th><th>Statut</th><th>SQL</th></tr></thead>
              <tbody>
                {filteredRows.map((row) => {
                  const status = normalizeStatus(row.status);
                  const busy = updatingRow === row._row;
                  return (
                    <tr key={row._row}>
                      <td><strong>{String(row.business_name || 'Établissement non renseigné')}</strong><span>{String(row.client_name || '—')}</span><small>{String(row.location || '')}</small></td>
                      <td><strong>{String(row.new_subscription || '—')}</strong><span>{String(row.cycle || '—')}</span><small>Actuel : {String(row.actual_subscription || '—')}</small></td>
                      <td><strong>{String(row.contact || '—')}</strong><span>{String(row.email || '—')}</span></td>
                      <td><strong>{formatDate(row.timestamp)}</strong><span className="uuid">{String(row.uuid || '').slice(0, 12)}{row.uuid ? '…' : ''}</span></td>
                      <td className="amount-cell">{formatMoney(parseAmount(row['amount to pay']))}</td>
                      <td>
                        <div className={`status-switch ${busy ? 'disabled' : ''}`}>
                          {(['pending', 'paid', 'cancelled'] as Status[]).map((choice) => (
                            <button title={statusLabels[choice]} aria-label={statusLabels[choice]} className={status === choice ? `selected ${choice}` : ''} disabled={busy} onClick={() => updateStatus(row._row, choice)} key={choice}>{statusIcons[choice]}</button>
                          ))}
                        </div>
                        <span className={`status-label ${status}`}>{busy ? 'Mise à jour…' : statusLabels[status]}</span>
                      </td>
                      <td><button className="sql-button" disabled={!row.sql_command} onClick={() => setSelectedSql(String(row.sql_command || ''))}>Voir</button></td>
                    </tr>
                  );
                })}
                {!loading && filteredRows.length === 0 && <tr><td colSpan={7}><div className="empty-state">Aucune demande pour ces filtres.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {selectedSql && (
        <div className="modal-backdrop" onClick={() => setSelectedSql('')}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><div><span>Commande d’activation</span><h3>SQL Supabase</h3></div><button onClick={() => setSelectedSql('')}>×</button></div>
            <pre>{selectedSql.replace(/\\n/g, '\n')}</pre>
            <button className="primary-button" onClick={async () => { await navigator.clipboard.writeText(selectedSql.replace(/\\n/g, '\n')); }}>Copier le SQL</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
