import React from 'react';

const ExchangePanel = ({
  transaction,
  onClose = () => {},
  onReturnNow = () => {},
  onOpenBrowse = () => {},
  className = '',
}) => {
  const items = Array.isArray(transaction?.exchangeItems) ? transaction.exchangeItems : [];

  // Build details from provided fields while excluding any serial-like fields
  const equipment = transaction?.equipment || {};
  const baseDetails = {
    Item: transaction?.item,
    Brand: transaction?.brand || equipment?.brand,
    Model: transaction?.model || equipment?.model,
    Category: equipment?.category_name || equipment?.category || equipment?.type,
    Specs: equipment?.specs || equipment?.specifications || equipment?.specification,
    Condition: equipment?.condition,
    Status: equipment?.status,
    Location: equipment?.location,
    Notes: equipment?.description || equipment?.details,
  };

  const excludeKeys = new Set([
    'id','equipment_id','transaction_id','request_id','user_id','employee_id','status','date','created_at','updated_at','deleted_at','exchangeitems','serial','serial_no','serial_number','sn','equipment_name','item','name','image','avatar','avatar_url','photo','photo_url'
  ]);
  const shouldInclude = (k, v) => {
    if (v == null) return false;
    const t = typeof v;
    if (t === 'object' || t === 'function') return false;
    const key = String(k).toLowerCase();
    if (key.includes('serial')) return false;
    if (excludeKeys.has(key)) return false;
    return String(v).trim() !== '';
  };
  const labelize = (k) => String(k)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const extraFromEquipment = Object.entries(equipment || {})
    .filter(([k, v]) => shouldInclude(k, v))
    .reduce((acc, [k, v]) => ({ ...acc, [labelize(k)]: v }), {});

  const extraFromTransaction = Object.entries(transaction || {})
    .filter(([k]) => !['equipment'].includes(k))
    .filter(([k, v]) => shouldInclude(k, v))
    .reduce((acc, [k, v]) => ({ ...acc, [labelize(k)]: v }), {});

  const detailPairs = Object.entries({ ...baseDetails, ...extraFromTransaction, ...extraFromEquipment })
    .filter(([_, v]) => v && String(v).trim() !== '');

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Exchange</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Details section (excludes serial numbers) */}
      <div className="mb-4 space-y-2">
        {detailPairs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {detailPairs.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium break-words">{String(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No additional details available.</div>
        )}
      </div>

      <div className="space-y-4 mb-6 overflow-auto">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800">{item.name}</div>
              <div className="text-xs text-gray-500">{item.brand}</div>
              <div className="text-xs text-gray-600 mt-1">{item.details}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500">No extra details for this item.</div>
        )}
      </div>

      <div className="mt-auto pt-2 flex gap-3">
        <button
          onClick={onReturnNow}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Return Now
        </button>
        <button
          onClick={onOpenBrowse}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Exchange
        </button>
      </div>
    </div>
  );
};

export default ExchangePanel;
