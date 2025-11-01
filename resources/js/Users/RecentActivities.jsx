import React, { useEffect } from 'react';

const RecentActivities = ({ activities = [], iconFor, timeAgo }) => {
  const allowed = new Set(['approved', 'cancel', 'denied', 'request', 'return', 'exchange']);

  const pickType = (a) => {
    const raw = (a?.type || a?.status || a?.variant || a?.action || '').toString().toLowerCase();
    const msg = (a?.message || a?.item || '').toString().toLowerCase();
    const hay = raw + ' ' + msg;
    if (/(approved|approve|success|released|borrowed|active)/.test(hay)) return 'approved';
    if (/(cancel|cancelled|canceled)/.test(hay)) return 'cancel';
    if (/(denied|deny|declined|rejected)/.test(hay)) return 'denied';
    // Treat true workflow states as request; avoid mapping generic UI actions like open/view
    if (/(request|requested|pending|processing|in\s*process|on\s*process|awaiting|waiting)/.test(hay)) return 'request';
    if (/(return|returned)/.test(hay)) return 'return';
    if (/(exchange|exchanged)/.test(hay)) return 'exchange';
    return '';
  };

  const isNoise = (a) => {
    const text = ((a?.message || a?.item || a?.action || a?.status || '') + '').toLowerCase();
    // Exclude generic UI/navigation events
    if (/(^|\b)(open|opened|opening|view|viewed|page|navigat|clicked|click|closed|search|filter|sorted)(\b|$)/.test(text)) {
      return true;
    }
    return false;
  };

  const within24h = (a) => {
    const raw = a?.time ?? a?.date ?? null;
    if (!raw) return false;
    const ts = new Date(raw).getTime();
    if (Number.isNaN(ts)) return false;
    const now = Date.now();
    return now - ts <= 24 * 60 * 60 * 1000;
  };

  const items = activities
    .map((a) => ({ ...a, __type: pickType(a) }))
    .filter((a) => !isNoise(a))
    .filter((a) => allowed.has(a.__type))
    .filter(within24h);

  // Persist qualifying activities into a durable History store
  useEffect(() => {
    try {
      const key = 'ireply_history';
      const raw = localStorage.getItem(key);
      const existing = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const byKey = new Map(
        existing.map((x) => [String(x.id || (x.message || x.item || '') + String(x.time || x.date || '')), x])
      );
      for (const a of items) {
        const k = String(a.id || (a.message || a.item || '') + String(a.time || a.date || ''));
        if (!byKey.has(k)) byKey.set(k, a);
      }
      const merged = Array.from(byKey.values());
      localStorage.setItem(key, JSON.stringify(merged));
      localStorage.setItem('ireply_history_count', String(merged.length));
    } catch (_) {
      // ignore storage errors
    }
  }, [items]);

  const safeIconFor = (variant) => {
    try {
      if (typeof iconFor === 'function') return iconFor(variant);
    } catch (_) {}
    return { Icon: (props) => <span {...props}>•</span>, bg: 'bg-gray-100', text: 'text-gray-600' };
  };

  const formatTime = (t) => {
    const val = t || null;
    if (!val) return '';
    try { return timeAgo ? timeAgo(val) : new Date(val).toLocaleString(); } catch (_) { return String(val); }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {items.length}
          </span>
        </div>
        <div className="p-4">
          {items.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              No recent activity to display.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto pr-1">
              <ul className="divide-y divide-gray-100" role="list" aria-label="Recent activity">
                {items.map((a) => {
                  const detected = a.__type || pickType(a);
                  const normalized = detected === 'success' ? 'approved' : detected === 'borrowed' ? 'approved' : detected === 'pending' ? 'request' : detected === 'processing' ? 'request' : detected === 'declined' ? 'denied' : detected === 'rejected' ? 'denied' : detected;
                  const { Icon, bg, text } = safeIconFor(normalized || a?.variant);
                  const message = a?.message || a?.item || 'Activity';
                  const when = formatTime(a?.time || a?.date);
                  return (
                    <li key={a.id || message + String(a?.time || a?.date)} className="py-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`${bg} rounded-lg p-2 mt-0.5 flex-shrink-0`}>
                          <Icon className={`h-5 w-5 ${text}`} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-medium text-gray-900 truncate" title={message}>{message}</p>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{when}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentActivities;
