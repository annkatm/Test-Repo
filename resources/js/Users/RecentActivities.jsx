import React from 'react';

const RecentActivities = ({ activities = [], iconFor, timeAgo }) => {
  const getRecentActivities = (limit = 10) => activities.slice(0, Math.max(0, limit));

  const items = getRecentActivities(10);

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
            {activities.length}
          </span>
        </div>
        <div className="p-4">
          {items.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              No recent activity to display.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100" role="list" aria-label="Recent activity">
              {items.map((a) => {
                const { Icon, bg, text } = safeIconFor(a?.variant);
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
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentActivities;