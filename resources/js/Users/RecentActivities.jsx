import React from 'react';

const RecentActivities = ({ activities = [], iconFor }) => {
  const getRecentActivities = (limit = 10) => activities.slice(0, Math.max(0, limit));

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 bg-blue-500 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white text-center">Recent Activities</h3>
        </div>
        <div className="p-6 space-y-5">
          <div className="p-4 text-gray-700">
            <ul className="space-y-3">
              {getRecentActivities(10).map((a) => {
                const { Icon, bg, text } = iconFor(a.variant);
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`${bg} p-2 rounded-lg flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${text}`} />
                      </div>
                      <span className="text-sm text-gray-800 truncate">{a.message}</span>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(a.time || a.date).toLocaleString()}
                    </span>
                  </li>
                );
              })}
              {activities.length === 0 && (
                <li className="text-sm text-gray-500">No recent activities</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivities;
