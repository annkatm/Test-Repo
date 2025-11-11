import React, { useEffect, useState } from 'react';

const ExchangePanel = ({
  transaction,
  onClose = () => {},
  onReturnNow = () => {},
  onOpenBrowse = () => {},
  className = '',
}) => {
  const items = Array.isArray(transaction?.exchangeItems) ? transaction.exchangeItems : [];
  const [fetchedEquipment, setFetchedEquipment] = useState(null);

  // Build details from provided fields while excluding any serial-like fields
  const equipmentBase = transaction?.equipment || {};
  const equipment = { ...equipmentBase, ...(fetchedEquipment || {}) };

  // Always fetch equipment details (image, description, price) when we have an id
  useEffect(() => {
    const id = transaction?.equipment_id || transaction?.equipment?.id;
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/equipment/${id}`, { credentials: 'same-origin' });
        const json = await res.json().catch(() => ({}));
        const payload = json && (json.data || json);
        if (!cancelled && payload && typeof payload === 'object') setFetchedEquipment(payload);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction?.equipment_id, transaction?.equipment?.id]);
  // Resolve item category/type robustly
  const itemType = (
    transaction?.type ||
    transaction?.category ||
    transaction?.category_name ||
    transaction?.item_type ||
    transaction?.equipment_type ||
    transaction?.equipment_category ||
    transaction?.equipment_category_name ||
    transaction?.type_of_item ||
    transaction?.kind ||
    transaction?.category?.name ||
    transaction?.type?.name ||
    transaction?.category?.title ||
    equipment?.category_name ||
    (typeof equipment?.category === 'string' ? equipment?.category : equipment?.category?.name || equipment?.category?.title) ||
    equipment?.type ||
    equipment?.type_name ||
    equipment?.equipment_type ||
    equipment?.equipment_category ||
    equipment?.equipment_category_name ||
    equipment?.type_of_item ||
    equipment?.kind ||
    null
  );
  // Prefer explicit category/type; otherwise fall back to item name
  const categoryLabel = itemType || transaction?.item || transaction?.equipment_name || equipment?.name || null;
  const itemBrandOrName = transaction?.brand || equipment?.brand || transaction?.item || equipment?.name || '-';
  const description = transaction?.description || equipment?.description || equipment?.details || '';
  const priceRaw = transaction?.price || equipment?.price || equipment?.cost || null;
  const price = typeof priceRaw === 'number' || (typeof priceRaw === 'string' && priceRaw.trim() !== '')
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(priceRaw))
    : null;
  const imageUrl = equipment?.image_url || equipment?.image || equipment?.photo_url || transaction?.image || transaction?.image_url || null;
  const displayTitle = itemBrandOrName || 'Item';
  const displaySub = null;
  const baseDetails = {
    Brand: transaction?.brand || equipment?.brand,
    Model: transaction?.model || equipment?.model,
    Category: equipment?.category_name || 
             (equipment?.category ? (typeof equipment.category === 'object' ? equipment.category.name : equipment.category) : null) || 
             equipment?.type,
    Specs: equipment?.specs || equipment?.specifications || equipment?.specification,
    Condition: equipment?.condition,
    Status: equipment?.status,
    Location: equipment?.location,
    Notes: description,
    Price: price || undefined,
  };

  const excludeKeys = new Set([
    'id','equipment_id','transaction_id','request_id','user_id','employee_id','status','date','created_at','updated_at','deleted_at','exchangeitems','serial','serial_no','serial_number','sn','equipment_name','item','name','image','avatar','avatar_url','photo','photo_url',
    'item_image','receipt_image','item_image_url','receipt_image_url'  // Added image-related fields to exclude
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

  // Format price with thousand separators
  const formatPrice = (value) => {
    if (value == null) return null;
    const num = Number(value);
    return isNaN(num) ? value : num.toLocaleString('en-US');
  };

  const detailPairs = Object.entries({ ...baseDetails, ...extraFromTransaction, ...extraFromEquipment })
    .filter(([_, v]) => v && String(v).trim() !== '')
    .map(([k, v]) => {
      // Format price-related fields
      if (k.toLowerCase().includes('price') || k.toLowerCase().includes('cost')) {
        return [k, formatPrice(v) || v];
      }
      return [k, v];
    });

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

      {/* Removed Item summary per request */}

      {/* Item card with image */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={displayTitle} className="w-full h-full object-cover" />
          ) : (
            <span role="img" aria-label="item" className="text-2xl">💻</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800">{displayTitle}</div>
          {/* Subtitle removed per request */}
        </div>
      </div>

      {/* Key details under the card */}
      <div className="space-y-3 mb-6">
        {description ? (
          <div>
            <div className="text-xs text-gray-500">Description</div>
            <div className="text-sm text-gray-800">{description}</div>
          </div>
        ) : null}
        {price ? (
          <div>
            <div className="text-xs text-gray-500">Price</div>
            <div className="text-sm text-gray-800 font-semibold">{price}</div>
          </div>
        ) : null}
        {imageUrl ? (
          <div>
            <div className="text-xs text-gray-500 mb-1">Image</div>
            <img src={imageUrl} alt={itemBrandOrName} className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
          </div>
        ) : null}
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
        ) : null}
      </div>

      {/* Removed duplicate items list to avoid repeating Item/Lenovo */}

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