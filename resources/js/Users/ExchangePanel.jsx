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
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalEnter, setModalEnter] = useState(false);

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
  const returnDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const resolvedSerial = (
    equipment?.serial_number ||
    equipment?.serial ||
    transaction?.serial_number ||
    transaction?.serial ||
    transaction?.equipment?.serial_number ||
    transaction?.equipment?.serial ||
    null
  );
  const displayTitle = itemBrandOrName || 'Item';
  const displaySub = null;
  const baseDetails = {
    Brand: transaction?.brand || equipment?.brand,
    Model: transaction?.model || equipment?.model,
    Category: equipment?.category_name || equipment?.category || equipment?.type,
    Specs: equipment?.specs || equipment?.specifications || equipment?.specification,
    Condition: equipment?.condition,
    Status: equipment?.status,
    Location: equipment?.location,
    Notes: description,
    Price: price || undefined,
  };

  const excludeKeys = new Set([
    'id','equipment_id','transaction_id','request_id','user_id','employee_id','status','date','created_at','updated_at','deleted_at','exchangeitems','serial','serial_no','serial_number','sn','equipment_name','item','name','image','avatar','avatar_url','photo','photo_url',
    'purchase_date','item_image','receipt_image','item_image_url','receipt_image_url'
  ]);
  const shouldInclude = (k, v) => {
    if (v == null) return false;
    const t = typeof v;
    if (t === 'object' || t === 'function') return false;
    const key = String(k).toLowerCase();
    if (key.includes('serial')) return false;
    if (excludeKeys.has(key)) return false;
    if ((key.includes('purchase') && key.includes('date')))
      return false;
    if (key.includes('receipt') && key.includes('image'))
      return false;
    if (key.includes('item') && key.includes('image'))
      return false;
    if (key.includes('image') && key.includes('url'))
      return false;
    return String(v).trim() !== '';
  };
  const labelize = (k) => String(k)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  useEffect(() => {
    if (showReturnModal) {
      const t = setTimeout(() => setModalEnter(true), 0);
      return () => clearTimeout(t);
    } else {
      setModalEnter(false);
    }
  }, [showReturnModal]);

  const closeReturnModal = () => {
    setModalEnter(false);
    setTimeout(() => setShowReturnModal(false), 250);
  };

  // Resolve a transaction ID from provided transaction prop
  const resolveTxId = async () => {
    const t = transaction || {};
    const direct = t?.id || t?.transaction_id || t?.request_id || t?.transactionID || t?.trans_id || t?.trx_id || t?.uuid || t?.pivot?.transaction_id;
    if (direct) return direct;
    try {
      const res = await fetch('/api/transactions', { credentials: 'same-origin' });
      const j = await res.json().catch(() => ({}));
      const list = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : (Array.isArray(j?.data?.data) ? j.data.data : []));
      const eqId = t?.equipment_id || t?.equipment?.id || null;
      const name = (t?.match_name || t?.equipment_name || t?.item || '').toLowerCase();
      const allowed = ['approved','released','borrowed','active'];
      const found = (list || []).find((x) => {
        const s = String(x?.status || '').toLowerCase();
        if (!(allowed.includes(s) || !s)) return false;
        const cEq = x?.equipment_id || x?.equipment?.id || null;
        const cName = (x?.equipment_name || x?.item || x?.name || '').toLowerCase();
        return (eqId && cEq && String(eqId) === String(cEq)) || (name && cName && name === cName);
      });
      if (found) return (found.id || found.transaction_id || found.request_id || found.transactionID || found.trans_id || found.trx_id || found.uuid || found?.pivot?.transaction_id);
    } catch (_) {}
    return null;
  };

  const performReturn = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const txId = await resolveTxId();
      if (!txId) {
        alert('Missing transaction information. Please try again from the Approved list.');
        setShowReturnModal(false);
        setActionLoading(false);
        return;
      }

      // Verify status
      const statusCheckRes = await fetch(`/api/transactions/${txId}`, { method: 'GET', headers: { 'Accept':'application/json','Content-Type':'application/json' }, credentials: 'same-origin' });
      if (!statusCheckRes.ok) {
        let msg = 'Failed to verify transaction status';
        try { const d = await statusCheckRes.json(); msg = d.message || msg; } catch(_){}
        alert(`Error: ${msg}`);
        setActionLoading(false);
        return;
      }
      const txData = await statusCheckRes.json().catch(() => ({}));
      const extractedStatus = (
        txData?.status ??
        txData?.data?.status ??
        txData?.transaction?.status ??
        txData?.data?.transaction?.status ??
        ''
      );
      let isReleased = String(extractedStatus || '').toLowerCase() === 'released';

      // Optional server-side verify endpoint (POST per routes/api.php)
      try {
        const vr = await fetch(`/api/transactions/${txId}/verify-return`, {
          method: 'POST',
          headers: { 'Accept':'application/json', 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({})
        });
        if (vr.ok) {
          const vj = await vr.json().catch(() => ({}));
          const vStatus = (
            vj?.status ?? vj?.data?.status ?? vj?.result?.status ?? ''
          );
          const allowed = Boolean(
            vj?.allowed || vj?.data?.allowed ||
            vj?.can_return || vj?.data?.can_return ||
            (String(vStatus || '').toLowerCase() === 'released')
          );
          if (allowed) isReleased = true;
        }
      } catch (_) { /* ignore and fall back to status */ }

      if (!isReleased) {
        alert('This item cannot be returned because it is not currently marked as released.');
        setActionLoading(false);
        return;
      }

      const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(`/api/transactions/${txId}/return`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
        credentials: 'same-origin',
        body: JSON.stringify({ return_condition: 'good_condition', return_notes: '' })
      });
      if (!res.ok) {
        let msg = 'Failed to process return';
        try { const d = await res.json(); msg = d.message || msg; } catch(_){}
        alert(`Return failed: ${msg}`);
        setActionLoading(false);
        return;
      }

      // Dispatch UI updates before closing
      try {
        const equipId = transaction?.equipment_id || transaction?.equipment?.id || null;
        if (equipId) {
          window.dispatchEvent(new CustomEvent('ireply:equipment:restore', { detail: { equipment_id: equipId } }));
        } else {
          window.dispatchEvent(new CustomEvent('ireply:equipment:restore'));
        }
      } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('ireply:approved:changed')); } catch (_) {}
      try {
        const now = new Date();
        const returnedItem = {
          id: transaction?.id || transaction?.tx_id || txId,
          item: transaction?.item || transaction?.equipment_name || displayTitle || 'Item',
          equipment_name: transaction?.equipment_name || transaction?.item || displayTitle || 'Item',
          date: now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          status: 'Returned'
        };
        window.dispatchEvent(new CustomEvent('ireply:returned:add', { detail: returnedItem }));
      } catch (_) {}

      closeReturnModal();
      setActionLoading(false);
      alert('Item returned successfully! The unit is now available in Item Categories.');
      try { onReturnNow(); } catch(_) {}
    } catch (err) {
      setActionLoading(false);
      alert('An error occurred while returning the item. Please try again.');
    }
  };

  const extraFromEquipment = Object.entries(equipment || {})
    .filter(([k, v]) => shouldInclude(k, v))
    .reduce((acc, [k, v]) => {
      const lower = String(k).toLowerCase();
      const label = lower === 'category_id' ? 'Serial no.' : labelize(k);
      const value = lower === 'category_id' ? resolvedSerial : v;
      return { ...acc, [label]: value };
    }, {});

  const extraFromTransaction = Object.entries(transaction || {})
    .filter(([k]) => !['equipment'].includes(k))
    .filter(([k, v]) => shouldInclude(k, v))
    .reduce((acc, [k, v]) => {
      const lower = String(k).toLowerCase();
      const label = lower === 'category_id' ? 'Serial no.' : labelize(k);
      const value = lower === 'category_id' ? resolvedSerial : v;
      return { ...acc, [label]: value };
    }, {});

  const detailPairs = Object.entries({ ...baseDetails, ...extraFromTransaction, ...extraFromEquipment })
    .filter(([_, v]) => v && String(v).trim() !== '');

  return (
    <>
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 h-full flex flex-col ${className} ${showReturnModal ? 'invisible' : ''}`}>
        <div className={showReturnModal ? 'hidden' : 'flex items-center justify-between mb-6'}>
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
        <div className={showReturnModal ? 'hidden' : 'flex items-start gap-3 mb-4'}>
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
        <div className={showReturnModal ? 'hidden' : 'space-y-3 mb-6'}>
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
          {null}
        </div>

        {/* Details section (excludes serial numbers) */}
        <div className={showReturnModal ? 'hidden' : 'mb-4 space-y-2'}>
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

        <div className={showReturnModal ? 'hidden' : 'mt-auto pt-2 flex gap-3'}>
          <button
            onClick={() => setShowReturnModal(true)}
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
      {showReturnModal && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div
            className={
              `bg-white rounded-2xl shadow-2xl w-[360px] md:w-[380px] p-5 relative transform transition-transform transition-opacity duration-300 ` +
              (modalEnter ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full')
            }
          >
            <h2 className="text-base font-bold text-gray-900 mb-4 text-center">Return Confirmation</h2>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt={displayTitle} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">💻</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{displayTitle}</div>
                <div className="text-xs text-gray-500">{returnDate}</div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeReturnModal}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 shadow-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={performReturn}
                disabled={actionLoading}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExchangePanel;