import React, { useEffect, useMemo, useState } from 'react';
import ExchangePanel from './ExchangePanel.jsx';

// Props now accept dynamic data instead of hardcoded examples
// - approvedTransactions: [{ date, item, status, exchangeItems?: [...] }]
// - transactionStats: { borrowed: number }
// - borrowedDetails: { items: [{name, specs}], borrowDate, returnDate }
const ApprovedTransactions = ({ onBack, transactionStats, approvedTransactions = [], borrowedDetails = null }) => {
  // Per-user storage helpers so every user sees a fresh page state
  const getUserTag = () => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        return u?.id || u?.email || 'guest';
      }
    } catch (_) {}
    return 'guest';
  };
  const userKey = (base) => `${base}:${getUserTag()}`;
  const migrateKeyIfNeeded = (base) => {
    try {
      const scoped = userKey(base);
      const cur = localStorage.getItem(scoped);
      if (cur) return; // already scoped
      const legacy = localStorage.getItem(base);
      if (legacy != null) localStorage.setItem(scoped, legacy);
      // do not remove legacy automatically to avoid affecting other pages
    } catch (_) {}
  };
  const logActivity = (message, variant = 'info') => {
    try {
      migrateKeyIfNeeded('employee_activities');
      const prev = JSON.parse(localStorage.getItem(userKey('employee_activities')) || '[]');
      const entry = { id: Date.now(), message, variant, time: new Date().toISOString() };
      const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 50);
      localStorage.setItem(userKey('employee_activities'), JSON.stringify(next));
    } catch (_) { }
  };
  const [selectedRow, setSelectedRow] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showBrowseLaptopsModal, setShowBrowseLaptopsModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showExchangeConfirmModal, setShowExchangeConfirmModal] = useState(false);
  const [selectedLaptop, setSelectedLaptop] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Laptops');
  const [exchangeReason, setExchangeReason] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [isBorrowedOpen, setIsBorrowedOpen] = useState(false);
  const [isLaptopListOpen, setIsLaptopListOpen] = useState(false);
  const [isProjectorListOpen, setIsProjectorListOpen] = useState(false);
  const [isAccessoryListOpen, setIsAccessoryListOpen] = useState(false);
  const [laptopUnits, setLaptopUnits] = useState([]);
  const [projectorUnits, setProjectorUnits] = useState([]);
  const [accessoryUnits, setAccessoryUnits] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // number-only sorting/display count
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showUnitConfirmModal, setShowUnitConfirmModal] = useState(false);
  const [displayList, setDisplayList] = useState(() => Array.isArray(approvedTransactions) ? approvedTransactions : []);
  const [chosenUnit, setChosenUnit] = useState(() => {
    try {
      migrateKeyIfNeeded('approved_selected_unit');
      const saved = localStorage.getItem(userKey('approved_selected_unit'));
      return saved ? JSON.parse(saved) : null;
    } catch (_) { return null; }
  });
  const [returnTxId, setReturnTxId] = useState(null);

  // Helper: de-duplicate by a stable key
  const dedupeByKey = (arr = []) => {
    const seen = new Set();
    return (arr || []).filter((x) => {
      const key = String(x?.tx_id ?? x?.id ?? x?.equipment_id ?? `${x?.item || ''}|${x?.date || ''}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Keep chosenUnit in sync if changed by another tab/processs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'approved_selected_unit') {
        try {
          const val = e.newValue ? JSON.parse(e.newValue) : null;
          setChosenUnit(val);
        } catch (_) {
          setChosenUnit(null);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // When an item is returned elsewhere, refresh approved and notify other lists to update
  useEffect(() => {
    const handler = () => {
      try { window.dispatchEvent(new CustomEvent('ireply:approved:changed')); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('ireply:catalog:refresh')); } catch (_) {}
    };
    window.addEventListener('ireply:equipment:restore', handler);
    return () => window.removeEventListener('ireply:equipment:restore', handler);
  }, []);

  // Refresh selection whenever Browse Laptops reopens
  useEffect(() => {
    if (showBrowseLaptopsModal) {
      try {
        migrateKeyIfNeeded('approved_selected_unit');
        const saved = localStorage.getItem(userKey('approved_selected_unit'));
        setChosenUnit(saved ? JSON.parse(saved) : null);
      } catch (_) {
        setChosenUnit(null);
      }
    }
  }, [showBrowseLaptopsModal]);

  useEffect(() => {
    try {
      const src = Array.isArray(approvedTransactions) ? approvedTransactions : [];
      console.log('ApprovedTransactions props changed, approvedTransactions:', src);
      if (src.length > 0) {
        console.log('First prop transaction:', src[0]);
      }
      const mapped = src.map((t, i) => {
        const dateSrc = t?.created_at || t?.expected_start_date || t?.start_date || t?.date || null;
        const date = dateSrc
          ? new Date(dateSrc).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
          : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        const rawStatus = String(t?.status ?? '').trim().toLowerCase();
        const status = (!rawStatus || rawStatus === '-' || /approved|released|borrowed|active/.test(rawStatus))
          ? 'Approved'
          : (t?.status || 'Approved');
        return {
          // Preserve both a display id and a stable tx_id (no fallback index)
          id: t?.id ?? t?.transaction_id ?? t?.request_id ?? t?.transactionID ?? t?.trans_id ?? t?.trx_id ?? t?.uuid ?? t?.pivot?.transaction_id ?? null,
          tx_id: t?.id ?? t?.transaction_id ?? t?.request_id ?? t?.transactionID ?? t?.trans_id ?? t?.trx_id ?? t?.uuid ?? t?.pivot?.transaction_id ?? null,
          date,
          item: (
            t?.category_name || t?.category || t?.equipment_category || t?.equipment_type || t?.type || t?.item_type ||
            (t?.equipment && (t?.equipment?.category_name || t?.equipment?.category?.name || t?.equipment?.type)) ||
            t?.equipment_name || t?.item || '-'
          ),
          match_name: t?.equipment_name || t?.item || t?.name || null,
          status,
          equipment_id: t?.equipment_id || t?.equipment?.id || null,
          brand: t?.brand || t?.equipment?.brand || t?.equipment_brand || null,
          model: t?.model || t?.equipment?.model || t?.equipment_model || null,
          equipment: t?.equipment || t?.equipment_details || null,
          exchangeItems: Array.isArray(t?.exchangeItems) ? t.exchangeItems : [],
        };
      });
      console.log('Mapped transactions:', mapped);
      const filtered = (mapped || []).filter((x) => String((x?.status || '')).toLowerCase() !== 'returned');
      const unique = dedupeByKey(filtered);
      setDisplayList(unique);
    } catch (_) {}
  }, [approvedTransactions]);

  // Fetch approved list from API only if no props provided
  useEffect(() => {
    // Skip API fetch if we already have data from props
    if (Array.isArray(approvedTransactions) && approvedTransactions.length > 0) {
      console.log('Skipping API fetch - using prop data');
      return;
    }
    
    let cancelled = false;
    const fetchApproved = async () => {
      try {
        const res = await fetch('/api/transactions/approved', { credentials: 'same-origin' });
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json) ? json : (json && json.data && Array.isArray(json.data) ? json.data : []);
        console.log('API /api/transactions/approved raw response:', json);
        console.log('Extracted list:', list);
        if (list.length > 0) {
          console.log('First transaction object:', list[0]);
          console.log('First transaction id field:', list[0]?.id);
        }
        const mapped = (list || []).map((t, i) => {
          const dateSrc = t?.created_at || t?.expected_start_date || t?.start_date || t?.date || null;
          const date = dateSrc
            ? new Date(dateSrc).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
            : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
          const rawStatus = String(t?.status ?? '').trim().toLowerCase();
          const status = (!rawStatus || rawStatus === '-' || /approved|released|borrowed|active/.test(rawStatus))
            ? 'Approved'
            : (t?.status || 'Approved');
          return {
            id: t?.id ?? t?.transaction_id ?? t?.request_id ?? t?.transactionID ?? t?.trans_id ?? t?.trx_id ?? t?.uuid ?? t?.pivot?.transaction_id ?? (i + 1),
            tx_id: t?.id ?? t?.transaction_id ?? t?.request_id ?? t?.transactionID ?? t?.trans_id ?? t?.trx_id ?? t?.uuid ?? t?.pivot?.transaction_id ?? null,
            date,
            item: (
              t?.category_name || t?.category || t?.equipment_category || t?.equipment_type || t?.type || t?.item_type ||
              (t?.equipment && (t?.equipment?.category_name || t?.equipment?.category?.name || t?.equipment?.type)) ||
              t?.equipment_name || t?.item || '-'
            ),
            match_name: t?.equipment_name || t?.item || t?.name || null,
            status,
            equipment_id: t?.equipment_id || t?.equipment?.id || null,
            brand: t?.brand || t?.equipment?.brand || t?.equipment_brand || null,
            model: t?.model || t?.equipment?.model || t?.equipment_model || null,
            equipment: t?.equipment || t?.equipment_details || null,
            exchangeItems: Array.isArray(t?.exchangeItems) ? t.exchangeItems : [],
          };
        });
        if (!cancelled) {
          const filtered = (mapped || []).filter((x) => String((x?.status || '')).toLowerCase() !== 'returned');
          const unique = dedupeByKey(filtered);
          setDisplayList(unique);
        }
      } catch (_) { }
    };
    // Only fetch if no data provided via props
    if (!approvedTransactions || approvedTransactions.length === 0) {
      fetchApproved();
    }
    return () => { cancelled = true; };
  }, [approvedTransactions]);

  // Listen for external changes to approved list and refresh from backend
  useEffect(() => {
    const refresh = async () => {
      // Skip refresh if using prop data
      if (Array.isArray(approvedTransactions) && approvedTransactions.length > 0) {
        console.log('Skipping refresh - using prop data');
        return;
      }
      
      try {
        const res = await fetch('/api/transactions/approved', { credentials: 'same-origin' });
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json) ? json : (json && json.data && Array.isArray(json.data) ? json.data : []);
        const mapped = (list || []).map((t, i) => {
          const dateSrc = t?.created_at || t?.expected_start_date || t?.start_date || t?.date || null;
          const date = dateSrc
            ? new Date(dateSrc).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
            : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
          const rawStatus = String(t?.status ?? '').trim().toLowerCase();
          const status = (!rawStatus || rawStatus === '-' || /approved|released|borrowed|active/.test(rawStatus))
            ? 'Approved'
            : (t?.status || 'Approved');
          return {
            id: t?.id ?? t?.transaction_id ?? t?.request_id ?? i + 1,
            tx_id: t?.id ?? t?.transaction_id ?? t?.request_id ?? null,
            date,
            item: (
              t?.category_name || t?.category || t?.equipment_category || t?.equipment_type || t?.type || t?.item_type ||
              (t?.equipment && (t?.equipment?.category_name || t?.equipment?.category?.name || t?.equipment?.type)) ||
              t?.equipment_name || t?.item || '-'
            ),
            match_name: t?.equipment_name || t?.item || t?.name || null,
            status,
            equipment_id: t?.equipment_id || t?.equipment?.id || null,
            brand: t?.brand || t?.equipment?.brand || t?.equipment_brand || null,
            model: t?.model || t?.equipment?.model || t?.equipment_model || null,
            equipment: t?.equipment || t?.equipment_details || null,
            exchangeItems: Array.isArray(t?.exchangeItems) ? t.exchangeItems : [],
          };
        }).filter(r => r.date);
        const filtered = (mapped || []).filter((x) => String((x?.status || '')).toLowerCase() !== 'returned');
        const unique = dedupeByKey(filtered);
        setDisplayList(unique);
      } catch (_) { }
    };
    const handler = () => refresh();
    window.addEventListener('ireply:approved:changed', handler);
    return () => window.removeEventListener('ireply:approved:changed', handler);
  }, [approvedTransactions]);

  const totalPages = Math.max(1, Math.ceil((displayList?.length || 0) / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return (displayList || []).slice(start, end);
  }, [displayList, page, pageSize]);

  const selectedTransactionData = selectedRow !== null ? displayList[selectedRow] : null;

  const resolveItemType = (t) => {
    // Direct category/type fields first
    const direct = (
      t?.type ||
      t?.category ||
      t?.category_name ||
      t?.equipment_type ||
      t?.item_type ||
      t?.equipment_category ||
      (t?.equipment && (t?.equipment.type || t?.equipment.category || t?.equipment.category_name))
    );
    if (direct && String(direct).trim()) return String(direct);

    // Infer from names/descriptions
    const parts = [
      t?.item,
      t?.equipment_name,
      t?.model,
      t?.description,
      t?.brand,
      t?.equipment?.name,
      t?.equipment?.model,
      t?.equipment?.specs,
      t?.equipment?.description,
    ].filter(Boolean).join(' ').toLowerCase();

    const matchKeyword = (s) => {
      if (!s) return null;
      if (/\blaptop|notebook\b/.test(s)) return 'Laptop';
      if (/\bmouse|mice\b/.test(s)) return 'Mouse';
      if (/\bkeyboard\b/.test(s)) return 'Keyboard';
      if (/\bmonitor|display\b/.test(s)) return 'Monitor';
      if (/\bprojector\b/.test(s)) return 'Projector';
      if (/\bprinter\b/.test(s)) return 'Printer';
      if (/\bscanner\b/.test(s)) return 'Scanner';
      if (/\bwebcam|camera\b/.test(s)) return 'Webcam';
      if (/\bheadset|headphone\b/.test(s)) return 'Headset';
      if (/\bspeaker\b/.test(s)) return 'Speaker';
      if (/\brouter\b/.test(s)) return 'Router';
      if (/\bswitch\b/.test(s)) return 'Network Switch';
      if (/\bcable\b/.test(s)) return 'Cable';
      if (/\badapter|dongle\b/.test(s)) return 'Adapter';
      if (/\bdocking station|dock\b/.test(s)) return 'Docking Station';
      return null;
    };
    const kw = matchKeyword(parts);
    if (kw) return kw;

    // Brand-based default guesses when nothing else exists
    const brand = (t?.brand || t?.equipment?.brand || '').toLowerCase();
    const brandMap = {
      lenovo: 'Laptop', dell: 'Laptop', hp: 'Laptop', acer: 'Laptop', asus: 'Laptop', apple: 'Laptop',
      msi: 'Laptop', huawei: 'Laptop', gigabyte: 'Laptop',
      lg: 'Monitor', samsung: 'Monitor', aoc: 'Monitor', viewsonic: 'Monitor', benq: 'Monitor', philips: 'Monitor',
      logitech: 'Mouse', rapoo: 'Mouse', razer: 'Mouse', a4tech: 'Mouse', redragon: 'Mouse', steelseries: 'Mouse'
    };
    if (brand && brandMap[brand]) return brandMap[brand];

    // Also map when the ITEM text itself is a brand
    const nameOnly = (t?.item || t?.equipment_name || '').toLowerCase().trim();
    if (nameOnly && brandMap[nameOnly]) return brandMap[nameOnly];
    if (/\blg\b/.test(nameOnly)) return 'Monitor';
    if (/\blogitech\b/.test(nameOnly)) return 'Mouse';
    if (/\blogistic\b/.test(nameOnly)) return 'Keyboard';

    // Fallback to visible names
    return t?.equipment_name || t?.item || '-';
  };

  // Resolve a transaction ID robustly from a transaction-like object
  const resolveTxId = async (tx) => {
    if (!tx) return null;
    const direct = tx?.id || tx?.transaction_id || tx?.request_id || tx?.transactionID || tx?.trans_id || tx?.trx_id || tx?.uuid || tx?.pivot?.transaction_id;
    
    // For employee-issued items, the ID might be the equipment ID, not transaction ID
    // We'll return it anyway and let the calling function handle the 404
    if (direct) return direct;
    // Fallback: query approved list and match
    try {
      const res = await fetch('/api/transactions/approved', { credentials: 'same-origin' });
      const json = await res.json().catch(() => ({}));
      const list = Array.isArray(json) ? json : (json && json.data && Array.isArray(json.data) ? json.data : []);
      const eqId = tx?.equipment_id || tx?.equipment?.id || null;
      const name = (tx?.match_name || tx?.equipment_name || tx?.item || '').toLowerCase();
      const found = (list || []).find((t) => {
        const candId = t?.id || t?.transaction_id || t?.request_id || t?.transactionID || t?.trans_id || t?.trx_id || t?.uuid || t?.pivot?.transaction_id;
        if (!candId) return false;
        const cEq = t?.equipment_id || t?.equipment?.id || null;
        const cName = (t?.equipment_name || t?.item || t?.name || '').toLowerCase();
        const s = String(t?.status || '').toLowerCase();
        const statusOk = /approved|released|borrowed|active/.test(s) || !s;
        return statusOk && ((eqId && cEq && String(eqId) === String(cEq)) || (name && cName && name === cName));
      });
      if (found) return (found.id || found.transaction_id || found.request_id || found.transactionID || found.trans_id || found.trx_id || found.uuid || found?.pivot?.transaction_id);
    } catch (_) {
      // continue
    }

    // Fallback 2: generic transactions endpoint
    try {
      const res2 = await fetch('/api/transactions', { credentials: 'same-origin' });
      const j2 = await res2.json().catch(() => ({}));
      const raw2 = Array.isArray(j2) ? j2 : (Array.isArray(j2?.data) ? j2.data : (Array.isArray(j2?.data?.data) ? j2.data.data : []));
      const eqId = tx?.equipment_id || tx?.equipment?.id || null;
      const name = (tx?.match_name || tx?.equipment_name || tx?.item || '').toLowerCase();
      const allowed = ['approved', 'released', 'borrowed', 'active'];
      const found2 = (raw2 || []).find((t) => {
        const s = String(t?.status || '').toLowerCase();
        if (!(allowed.includes(s) || !s)) return false;
        const cEq = t?.equipment_id || t?.equipment?.id || null;
        const cName = (t?.equipment_name || t?.item || t?.name || '').toLowerCase();
        return (eqId && cEq && String(eqId) === String(cEq)) || (name && cName && name === cName);
      });
      if (found2) return (found2.id || found2.transaction_id || found2.request_id || found2.transactionID || found2.trans_id || found2.trx_id || found2.uuid || found2?.pivot?.transaction_id);
    } catch (_) { /* continue */ }

    // Fallback 3: current holders endpoint
    try {
      const res3 = await fetch('/api/employees/current-holders', { credentials: 'same-origin' });
      const j3 = await res3.json().catch(() => ({}));
      const list3 = Array.isArray(j3) ? j3 : (Array.isArray(j3?.data) ? j3.data : []);
      const eqId = tx?.equipment_id || tx?.equipment?.id || null;
      const name = (tx?.match_name || tx?.equipment_name || tx?.item || '').toLowerCase();
      const found3 = (list3 || []).find((t) => {
        const cEq = t?.equipment_id || t?.equipment?.id || null;
        const cName = (t?.equipment_name || t?.item || t?.name || '').toLowerCase();
        return (eqId && cEq && String(eqId) === String(cEq)) || (name && cName && name === cName);
      });
      if (found3) return (found3.id || found3.transaction_id || found3.request_id || found3.transactionID || found3.trans_id || found3.trx_id || found3.uuid || found3?.pivot?.transaction_id);
    } catch (_) { /* continue */ }

    // Fallback 4: approved requests (map to transaction-like id if available)
    try {
      const res4 = await fetch('/api/requests?status=approved', { credentials: 'same-origin' });
      const j4 = await res4.json().catch(() => ({}));
      const reqs = Array.isArray(j4) ? j4 : (Array.isArray(j4?.data) ? j4.data : []);
      const eqId = tx?.equipment_id || tx?.equipment?.id || null;
      const name = (tx?.match_name || tx?.equipment_name || tx?.item || '').toLowerCase();
      const found4 = (reqs || []).find((t) => {
        const cEq = t?.equipment_id || t?.equipment?.id || null;
        const cName = (t?.equipment_name || t?.item || t?.name || '').toLowerCase();
        return (eqId && cEq && String(eqId) === String(cEq)) || (name && cName && name === cName);
      });
      if (found4) return (found4.transaction_id || found4.id || found4.request_id);
    } catch (_) { /* continue */ }

    return null;
  };

  // Perform the return request using employee-specific endpoint
  const performReturn = async (tx) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const candidate = tx || selectedTransactionData;
      
      console.log('performReturn called with candidate:', candidate);
      
      // For directly issued items, use employee return endpoint directly
      const equipmentId = candidate?.equipment_id || candidate?.id;
      const equipmentName = candidate?.equipment_name || candidate?.item || candidate?.match_name || 'Item';
      
      console.log('Equipment ID for return:', equipmentId);
      console.log('Equipment Name:', equipmentName);
      
      if (!equipmentId) {
        alert('Missing equipment information. Please try again.');
        setActionLoading(false);
        return;
      }

      // Try to get current employee ID and use employee return endpoint
      try {
        const userRes = await fetch('/check-auth', { credentials: 'same-origin' });
        const userData = await userRes.json();
        
        console.log('User authentication data:', userData);
        
        if (userData?.authenticated && userData?.user) {
          // Try to find employee ID
          let employeeId = userData.user.employee_id || userData.user.linked_employee_id;
          
          if (!employeeId && userData.user.email) {
            console.log('Looking up employee by email:', userData.user.email);
            const empRes = await fetch('/api/employees', { credentials: 'same-origin' });
            const empData = await empRes.json();
            const employees = Array.isArray(empData?.data) ? empData.data : [];
            const emp = employees.find(e => e.email?.toLowerCase() === userData.user.email.toLowerCase());
            if (emp) {
              employeeId = emp.id;
              console.log('Found employee ID:', employeeId);
            }
          }
          
          if (employeeId) {
            console.log(`Attempting return via /api/employees/${employeeId}/return-item`);
            
            const returnRes = await fetch(`/api/employees/${employeeId}/return-item`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
              },
              credentials: 'same-origin',
              body: JSON.stringify({
                equipment_id: equipmentId,
                return_condition: 'good',
                notes: 'Returned via approved transactions'
              })
            });
            
            const returnData = await returnRes.json();
            console.log('Employee return response:', returnData);
            
            if (returnData.success) {
              // Success - remove from display and close modal
              const itemId = candidate?.id || candidate?.tx_id;
              if (itemId) {
                setDisplayList((prev) => (prev || []).filter((t) => 
                  String(t?.id ?? t?.tx_id) !== String(itemId)
                ));
              }
              
              setShowReturnModal(false);
              setSelectedRow(null);
              setActionLoading(false);
              
              logActivity('Approved: Item Returned Successfully', 'success');
              
              try {
                window.dispatchEvent(new CustomEvent('ireply:approved:changed'));
                window.dispatchEvent(new CustomEvent('ireply:equipment:restore', { 
                  detail: { equipment_id: equipmentId } 
                }));
              } catch (_) {}
              
              alert('Item returned successfully!');
              return;
            } else {
              console.error('Employee return failed:', returnData);
              alert(returnData.message || 'Failed to return item');
              setActionLoading(false);
              return;
            }
          } else {
            console.error('Could not determine employee ID');
            alert('Unable to identify current employee. Please contact support.');
            setActionLoading(false);
            return;
          }
        } else {
          console.error('User not authenticated or missing user data');
          alert('Authentication required. Please log in again.');
          setActionLoading(false);
          return;
        }
      } catch (e) {
        console.error('Employee return failed:', e);
        alert('Failed to return item. Please try again or contact support.');
        setActionLoading(false);
        return;
      }

    } catch (err) {
      console.error('[performReturn] error', err);
      alert('An error occurred while returning the item. Please try again.');
      setActionLoading(false);
    }
  };

  const handleMarkReleased = async (tx) => {
    const txId = await resolveTxId(tx || selectedTransactionData);
    if (!txId) return;
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transactions/${txId}/release`, { method: 'POST', headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      setDisplayList((prev) => (prev || []).map((t) => (String(t.id) === String(txId) ? { ...t, status: 'Released' } : t)));
      try { window.dispatchEvent(new CustomEvent('ireply:approved:changed')); } catch (_) {}
      logActivity('Approved: Marked as Released', 'success');
    } catch (_) {
      setDisplayList((prev) => (prev || []).map((t) => (String(t.id) === String(txId) ? { ...t, status: 'Released' } : t)));
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleConfirmExchange = () => {
    setShowReasonModal(false);
    setShowExchangeConfirmModal(true);
  };

  const handleSendExchange = async () => {
    const txId = selectedTransactionData?.id;
    if (!txId) {
      alert('Cannot send exchange: missing transaction id.');
      return;
    }
    if (!chosenUnit) {
      alert('Please select a unit first.');
      return;
    }

    if (actionLoading) return;
    setActionLoading(true);
    try {
      const payload = {
        new_equipment_id: chosenUnit.id,
        reason: exchangeReason || 'N/A',
        evidence_file: uploadedFile ? uploadedFile.name : null,
      };

      const res = await fetch(`/api/transactions/${txId}/exchange`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      // Notify other pages that the previous equipment became available again
      try {
        const prevEquipId = selectedTransactionData?.equipment_id;
        if (prevEquipId) {
          window.dispatchEvent(new CustomEvent('ireply:equipment:restore', { detail: { equipment_id: prevEquipId } }));
        }
      } catch (_) { }

      // Refresh the approved list UI
      try { window.dispatchEvent(new CustomEvent('ireply:approved:changed')); } catch (_) {}

      setShowExchangeConfirmModal(false);
      setSelectedRow(null);
      onBack();
    } catch (err) {
      console.error(err);
      alert('Failed to send exchange request. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="h-full min-h-0 bg-White p-4 sm:p-6 lg:p-8">
      {actionLoading && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/30">
          <div className="h-12 w-12 border-4 border-white/60 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}

      {isLaptopListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden motion-safe:animate-pop3D">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-xl font-bold text-blue-600">{selectedLaptop} Units</h2>
              <button
                onClick={() => { setIsLaptopListOpen(false); setShowBrowseLaptopsModal(true); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {laptopUnits.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {laptopUnits.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => { setSelectedUnit({ ...u, brand: selectedLaptop }); setShowUnitConfirmModal(true); }}
                      className="border border-gray-200 rounded-lg p-4 flex items-start gap-3 bg-white cursor-pointer hover:shadow-md hover:border-blue-300 transition"
                    >
                      <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center">💻</div>
                      <div>
                        <div className="font-semibold text-gray-800">{u.name}</div>
                        <div className="text-sm text-gray-600">{u.specs}</div>
                        <div className="text-xs mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Available</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500">No units available</div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 text-right">
              <button onClick={() => { setIsLaptopListOpen(false); setShowBrowseLaptopsModal(true); }} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {isProjectorListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden motion-safe:animate-pop3D">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-xl font-bold text-blue-600">{selectedLaptop} Projectors</h2>
              <button
                onClick={() => { setIsProjectorListOpen(false); setShowBrowseLaptopsModal(true); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {projectorUnits.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projectorUnits.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => { setSelectedUnit({ ...u, brand: selectedLaptop }); setShowUnitConfirmModal(true); }}
                      className="border border-gray-200 rounded-lg p-4 flex items-start gap-3 bg-white cursor-pointer hover:shadow-md hover:border-blue-300 transition"
                    >
                      <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center">📽️</div>
                      <div>
                        <div className="font-semibold text-gray-800">{u.name}</div>
                        <div className="text-sm text-gray-600">{u.specs}</div>
                        <div className="text-xs mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Available</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500">No units available</div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 text-right">
              <button onClick={() => { setIsProjectorListOpen(false); setShowBrowseLaptopsModal(true); }} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {isAccessoryListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden motion-safe:animate-pop3D">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-xl font-bold text-blue-600">{selectedLaptop} Accessories</h2>
              <button
                onClick={() => { setIsAccessoryListOpen(false); setShowBrowseLaptopsModal(true); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {accessoryUnits.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {accessoryUnits.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => { setSelectedUnit({ ...u, brand: selectedLaptop }); setShowUnitConfirmModal(true); }}
                      className="border border-gray-200 rounded-lg p-4 flex items-start gap-3 bg-white cursor-pointer hover:shadow-md hover:border-blue-300 transition"
                    >
                      <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center">🎧</div>
                      <div>
                        <div className="font-semibold text-gray-800">{u.name}</div>
                        <div className="text-sm text-gray-600">{u.specs}</div>
                        <div className="text-xs mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Available</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500">No items available</div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 text-right">
              <button onClick={() => { setIsAccessoryListOpen(false); setShowBrowseLaptopsModal(true); }} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Selection Confirm Modal */}
      {showUnitConfirmModal && selectedUnit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Selection</h3>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center">💻</div>
              <div>
                <div className="font-semibold text-gray-900">{selectedUnit.name}</div>
                <div className="text-sm text-gray-600">Brand: {selectedUnit.brand}</div>
                <div className="text-sm text-gray-600">{selectedUnit.specs}</div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUnitConfirmModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  try { migrateKeyIfNeeded('approved_selected_unit'); localStorage.setItem(userKey('approved_selected_unit'), JSON.stringify(selectedUnit)); } catch (_) { }
                  setChosenUnit(selectedUnit);
                  logActivity(`Approved: Selected unit ${selectedUnit.name}`, 'success');
                  setShowUnitConfirmModal(false);
                  setIsLaptopListOpen(false);
                  setShowBrowseLaptopsModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-2 sm:px-4">
        {/* Header Row - Title and Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 -mt-2">
          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-[#2262C6]">Approved</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { logActivity('Approved: Back to transactions', 'info'); onBack(); }}
              className="bg-white text-blue-600 font-medium px-6 py-3 rounded-lg shadow hover:shadow-md hover:bg-blue-50 transition-all border border-gray-200 w-full sm:w-auto"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-stretch">
          {/* Left Column - Table */}
          <div className={`${selectedRow !== null ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            <div className="bg-white rounded-xl shadow-lg border border-gray-300 overflow-hidden">
              {/* Table Header - Hidden on mobile, visible on tablet+ */}
              <div className="hidden sm:grid grid-cols-12 bg-gray-50 text-gray-700 font-semibold text-base lg:text-lg py-4 xl:py-5 px-4 sm:px-6 border-b border-gray-200">
                <div className="col-span-3 text-center">Date</div>
                <div className="col-span-6 text-center">Item</div>
                <div className="col-span-3 text-center">Status</div>
              </div>

              {/* Scrollable Table Rows Container */
              }
              <div className="overflow-y-auto h-[50vh] sm:h-[55vh] lg:h-[360px] xl:h-[420px] bg-white [&::-webkit-scrollbar]:hidden">
                <div className="divide-y divide-gray-100">
                  {(displayList || []).map((transaction, index) => {
                    const globalIndex = index;
                    return (
                      <div
                        key={globalIndex}
                        onClick={() => { setSelectedRow(globalIndex); logActivity(`Approved: Selected row ${globalIndex + 1} (${transaction.item})`, 'info'); }}
                        className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-0 items-start sm:items-center py-4 sm:py-6 xl:py-7 px-4 sm:px-6 transition-colors cursor-pointer ${selectedRow === globalIndex ? 'border-l-4 border-blue-600' : ''
                          }`}
                      >
                        {/* Mobile layout */}
                        <div className="sm:hidden space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Date</p>
                              <p className="text-gray-800 text-base font-semibold">{transaction.date}</p>
                            </div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                              {transaction.status}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Item</p>
                            <p className="text-gray-800 text-base font-semibold">{resolveItemType(transaction)}</p>
                          </div>
                        </div>
                        <div className="hidden sm:contents">
                          <div className="col-span-3 text-gray-800 text-base lg:text-lg font-semibold text-center">
                            {transaction.date}
                          </div>
                          <div className="col-span-6 text-gray-800 text-base lg:text-lg font-semibold text-center">
                            {resolveItemType(transaction)}
                          </div>
                          <div className="col-span-3 flex justify-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                              {transaction.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sliding Panel */}
          <div
            className={`
              fixed lg:relative inset-0 lg:inset-auto z-40 lg:z-auto
              lg:col-span-4 
              ${selectedRow !== null ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}
            `}
          >
            {/* Mobile backdrop */}
            <div
              className="lg:hidden absolute inset-0"
              onClick={() => setSelectedRow(null)}
            />

            {/* Panel content */}
            <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 lg:w-[360px] xl:w-[420px] lg:relative bg-gray-50 lg:bg-transparent overflow-y-auto p-4 sm:p-6 lg:p-0 h-full min-h-0">
              <div className="h-full min-h-0 flex flex-col">
                {/* Exchange Card */}
                <ExchangePanel
                  transaction={selectedTransactionData}
                  onClose={() => setSelectedRow(null)}
                  onReturnNow={() => { 
                    // Called after successful return from ExchangePanel
                    try {
                      const rid = selectedTransactionData?.tx_id || selectedTransactionData?.id;
                      if (rid != null) {
                        setDisplayList((prev) => (prev || []).filter((t) => String(t?.tx_id ?? t?.id) !== String(rid)));
                      }
                    } catch (_) {}
                    try { window.dispatchEvent(new CustomEvent('ireply:approved:changed')); } catch (_) {}
                    setSelectedRow(null);
                    logActivity('Approved: Item Returned Successfully', 'success');
                  }}
                  onOpenBrowse={() => { setShowBrowseLaptopsModal(true); logActivity('Approved: Clicked Exchange', 'exchange'); }}
                  className="flex-1"
                />
                
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RETURN NOW MODAL */}
      {showReturnModal && selectedTransactionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6 relative transform transition-all duration-500 scale-100 hover:scale-[1.01] hover:rotate-[0.5deg] shadow-blue-900/30 hover:shadow-blue-800/50 perspective-[1200px] motion-safe:animate-pop3D">
            <h2 className="text-lg font-bold text-gray-900 mb-6 text-center drop-shadow-md">
              Return Confirmation
            </h2>

            {/* Dynamic Item List */}
            <div className="space-y-4 mb-6">
              {Array.isArray(selectedTransactionData.exchangeItems) && selectedTransactionData.exchangeItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.brand} - {item.details}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowReturnModal(false); logActivity('Approved: Return modal closed', 'info'); }}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 shadow-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (actionLoading) return;
                  setActionLoading(true);
                  try {
                    console.log('Confirm Return clicked');
                    console.log('returnTxId:', returnTxId);
                    console.log('selectedTransactionData:', selectedTransactionData);
                    const txId = returnTxId || selectedTransactionData?.tx_id || selectedTransactionData?.id || await resolveTxId(selectedTransactionData);
                    console.log('Final resolved txId:', txId);
                    if (!txId) {
                      console.error('No transaction ID found. Available fields:', Object.keys(selectedTransactionData || {}));
                      alert('Missing transaction information. Please select a transaction and try again.\n\nDebug: ' + JSON.stringify(selectedTransactionData, null, 2));
                      setShowReturnModal(false);
                      return;
                    }
                    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                    const res = await fetch(`/api/transactions/${txId}/return`, {
                      method: 'POST',
                      headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrf,
                      },
                      credentials: 'same-origin',
                      body: JSON.stringify({
                        return_condition: 'good_condition',
                        return_notes: ''
                      }),
                    });
                    if (!res.ok) {
                      const text = await res.text();
                      throw new Error(text || `HTTP ${res.status}`);
                    }
                    setShowReturnModal(false);
                    setSelectedRow(null);
                    logActivity('Approved: Confirmed Return', 'success');
                    try {
                      const equipId = selectedTransactionData?.equipment_id;
                      if (equipId) {
                        window.dispatchEvent(new CustomEvent('ireply:equipment:restore', { detail: { equipment_id: equipId } }));
                      }
                    } catch (_) { }
                    try {
                      const payload = {
                        id: selectedTransactionData?.id,
                        item: selectedTransactionData?.item,
                        date: new Date().toISOString(),
                      };
                      window.dispatchEvent(new CustomEvent('ireply:returned:add', { detail: payload }));
                    } catch (_) { }
                    try {
                      window.dispatchEvent(new CustomEvent('ireply:navigate', { detail: { menu: 'Returned Items' } }));
                    } catch (_) { }
                    onBack();
                  } catch (err) {
                    console.error(err);
                    alert('Failed to mark item as returned. Please try again.');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BROWSE LAPTOPS MODAL */}
      {showBrowseLaptopsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-500 scale-100 hover:scale-[1.01] shadow-blue-900/30 hover:shadow-blue-800/50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600/5 to-blue-300/10">
              <h2 className="text-2xl font-bold text-gray-900">Browse Laptops</h2>
              <button
                onClick={() => {
                  setShowBrowseLaptopsModal(false);
                  setSelectedLaptop(null);
                  setActiveCategory('Laptops');
                  logActivity('Approved: Closed Browse Laptops', 'info');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="p-6 border-b bg-gray-50">
              <div className="flex items-center gap-2 mb-4 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  className="flex-1 outline-none text-gray-700"
                />
              </div>

              <div className="flex gap-3">
                {['All', 'Laptops', 'Projectors', 'Accesories'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeCategory === category
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {chosenUnit && (
                <div className="mt-4 flex items-center justify-between bg-white border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold text-blue-700">Selected:</span> {chosenUnit.brand} — {chosenUnit.name}
                  </div>
                  <button
                    onClick={() => { setChosenUnit(null); try { localStorage.removeItem(userKey('approved_selected_unit')); } catch (_) { }; }}
                    className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Body - Category Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {activeCategory === 'All' && (
                  <>
                    {[{ brand: 'Asus', available: 9 }, { brand: 'Lenovo', available: 7 }, { brand: 'Acer', available: 4 }, { brand: 'Razor', available: 9 }].map((item, index) => (
                      <div key={`all-l-${index}`}
                        onClick={() => setSelectedLaptop(item.brand)}
                        className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${selectedLaptop === item.brand ? 'border-blue-600 shadow-lg ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden"><span className="text-6xl">💻</span></div>
                          <h3 className="font-bold text-gray-900 mb-2">{item.brand}</h3>
                          <p className="text-sm text-gray-600 mb-1">Available Unit:</p>
                          <p className="text-2xl font-bold text-blue-600">{item.available}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLaptop(item.brand);
                              const count = Number(item.available) || 0;
                              const units = Array.from({ length: count }, (_, i) => ({ id: `${item.brand}-${i + 1}`, name: `${item.brand} Unit #${i + 1}`, specs: 'Core i5, 16GB RAM, 512GB SSD' }));
                              setLaptopUnits(units);
                              setShowBrowseLaptopsModal(false);
                              setIsLaptopListOpen(true);
                            }}
                            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >View All</button>
                        </div>
                      </div>
                    ))}

                    {[{ brand: 'Epson', available: 5 }, { brand: 'BenQ', available: 3 }, { brand: 'Sony', available: 4 }, { brand: 'ViewSonic', available: 2 }].map((item, index) => (
                      <div key={`all-p-${index}`}
                        onClick={() => setSelectedLaptop(item.brand)}
                        className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${selectedLaptop === item.brand ? 'border-blue-600 shadow-lg ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden"><span className="text-6xl">📽️</span></div>
                          <h3 className="font-bold text-gray-900 mb-2">{item.brand}</h3>
                          <p className="text-sm text-gray-600 mb-1">Available Unit:</p>
                          <p className="text-2xl font-bold text-blue-600">{item.available}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLaptop(item.brand);
                              const count = Number(item.available) || 0;
                              const units = Array.from({ length: count }, (_, i) => ({ id: `${item.brand}-${i + 1}`, name: `${item.brand} Projector #${i + 1}`, specs: '1080p, 3500 lumens' }));
                              setProjectorUnits(units);
                              setShowBrowseLaptopsModal(false);
                              setIsProjectorListOpen(true);
                            }}
                            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >View All</button>
                        </div>
                      </div>
                    ))}

                    {[{ brand: 'Headsets', available: 12 }, { brand: 'Mice', available: 20 }, { brand: 'Keyboards', available: 15 }, { brand: 'HDMI Cables', available: 30 }].map((item, index) => (
                      <div key={`all-a-${index}`}
                        onClick={() => setSelectedLaptop(item.brand)}
                        className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${selectedLaptop === item.brand ? 'border-blue-600 shadow-lg ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden"><span className="text-6xl">🎧</span></div>
                          <h3 className="font-bold text-gray-900 mb-2">{item.brand}</h3>
                          <p className="text-sm text-gray-600 mb-1">Available Items:</p>
                          <p className="text-2xl font-bold text-blue-600">{item.available}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLaptop(item.brand);
                              const count = Number(item.available) || 0;
                              const units = Array.from({ length: count }, (_, i) => ({ id: `${item.brand}-${i + 1}`, name: `${item.brand} #${i + 1}`, specs: 'Standard accessory' }));
                              setAccessoryUnits(units);
                              setShowBrowseLaptopsModal(false);
                              setIsAccessoryListOpen(true);
                            }}
                            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >View All</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {activeCategory === 'Laptops' && [
                  { brand: 'Asus', available: 9 },
                  { brand: 'Lenovo', available: 7 },
                  { brand: 'Acer', available: 4 },
                  { brand: 'Razor', available: 9 }
                ].map((item, index) => (
                  <div key={`l-${index}`}
                    onClick={() => setSelectedLaptop(item.brand)}
                    className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${selectedLaptop === item.brand ? 'border-blue-600 shadow-lg ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden"><span className="text-6xl">💻</span></div>
                      <h3 className="font-bold text-gray-900 mb-2">{item.brand}</h3>
                      <p className="text-sm text-gray-600 mb-1">Available Unit:</p>
                      <p className="text-2xl font-bold text-blue-600">{item.available}</p>
                      <button
                        onClick={() => {
                          setSelectedLaptop(item.brand);
                          const count = Number(item.available) || 0;
                          const units = Array.from({ length: count }, (_, i) => ({ id: `${item.brand}-${i + 1}`, name: `${item.brand} Unit #${i + 1}`, specs: 'Core i5, 16GB RAM, 512GB SSD' }));
                          setLaptopUnits(units);
                          setShowBrowseLaptopsModal(false);
                          setIsLaptopListOpen(true);
                        }}
                        className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >View All</button>
                    </div>
                  </div>
                ))}

                {activeCategory === 'Projectors' && [
                  { brand: 'Epson', available: 5 },
                  { brand: 'BenQ', available: 3 },
                  { brand: 'Sony', available: 4 },
                  { brand: 'ViewSonic', available: 2 }
                ].map((item, index) => (
                  <div key={`p-${index}`}
                    onClick={() => setSelectedLaptop(item.brand)}
                    className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${selectedLaptop === item.brand ? 'border-blue-600 shadow-lg ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden"><span className="text-6xl">📽️</span></div>
                      <h3 className="font-bold text-gray-900 mb-2">{item.brand}</h3>
                      <p className="text-sm text-gray-600 mb-1">Available Unit:</p>
                      <p className="text-2xl font-bold text-blue-600">{item.available}</p>
                      <button
                        onClick={() => {
                          setSelectedLaptop(item.brand);
                          const count = Number(item.available) || 0;
                          const units = Array.from({ length: count }, (_, i) => ({ id: `${item.brand}-${i + 1}`, name: `${item.brand} Projector #${i + 1}`, specs: '1080p, 3500 lumens' }));
                          setProjectorUnits(units);
                          setShowBrowseLaptopsModal(false);
                          setIsProjectorListOpen(true);
                        }}
                        className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >View All</button>
                    </div>
                  </div>
                ))}

                {activeCategory === 'Accesories' && [
                  { brand: 'Headsets', available: 12 },
                  { brand: 'Mice', available: 20 },
                  { brand: 'Keyboards', available: 15 },
                  { brand: 'HDMI Cables', available: 30 }
                ].map((item, index) => (
                  <div key={`a-${index}`}
                    onClick={() => setSelectedLaptop(item.brand)}
                    className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${selectedLaptop === item.brand ? 'border-blue-600 shadow-lg ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden"><span className="text-6xl">🎧</span></div>
                      <h3 className="font-bold text-gray-900 mb-2">{item.brand}</h3>
                      <p className="text-sm text-gray-600 mb-1">Available Items:</p>
                      <p className="text-2xl font-bold text-blue-600">{item.available}</p>
                      <button
                        onClick={() => {
                          setSelectedLaptop(item.brand);
                          const count = Number(item.available) || 0;
                          const units = Array.from({ length: count }, (_, i) => ({ id: `${item.brand}-${i + 1}`, name: `${item.brand} #${i + 1}`, specs: 'Standard accessory' }));
                          setAccessoryUnits(units);
                          setShowBrowseLaptopsModal(false);
                          setIsAccessoryListOpen(true);
                        }}
                        className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >View All</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {chosenUnit ? (
                  <span>Proceed with <span className="font-semibold text-gray-800">{chosenUnit.brand} — {chosenUnit.name}</span></span>
                ) : (
                  <span>Select a unit to proceed</span>
                )}
              </div>
              <button
                onClick={() => {
                  setShowBrowseLaptopsModal(false);
                  setShowReasonModal(true);
                  logActivity('Approved: Proceed to Reason for Exchange', 'exchange');
                }}
                disabled={!chosenUnit}
                className={`px-8 py-3 rounded-lg font-semibold shadow-md transition-all transform hover:scale-105 ${chosenUnit ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCHANGE (REASON + EVIDENCE) MODAL */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-500 scale-100 rotate-[0.5deg] hover:rotate-0 hover:scale-[1.02] shadow-blue-900/30 hover:shadow-blue-800/50 perspective-[1000px] motion-safe:animate-pop3D">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600/5 to-blue-300/10">
              <h2 className="text-xl font-bold text-gray-900 drop-shadow-md">
                Reason and Evidence
              </h2>
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setExchangeReason('');
                  setUploadedFile(null);
                  logActivity('Approved: Closed Reason modal', 'info');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  Reason for Exchange:
                </label>
                <textarea
                  value={exchangeReason}
                  onChange={(e) => setExchangeReason(e.target.value)}
                  placeholder="Enter your reason for exchange..."
                  className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  Upload Photo/Video:
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 shadow-inner transition-colors"
                  >
                    {uploadedFile ? (
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm font-medium text-gray-700">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">Click to change file</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg className="w-16 h-16 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">Click to upload photo or video</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowReasonModal(false);
                    setExchangeReason('');
                    setUploadedFile(null);
                    logActivity('Approved: Cancel Reason modal', 'info');
                  }}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 shadow-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { logActivity('Approved: Confirm Reason for Exchange', 'exchange'); handleConfirmExchange(); }}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 hover:shadow-xl transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXCHANGE REQUEST CONFIRMATION MODAL */}
      {showExchangeConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Header */}
            <h2 className="text-lg font-bold text-gray-900 mb-4">Exchange Request</h2>

            {/* Item Info */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
              <img
                src="https://cdn-icons-png.flaticon.com/512/1086/1086933.png"
                alt="Laptop"
                className="w-16 h-16 object-contain"
              />
              <div>
                <p className="font-semibold text-gray-900">{chosenUnit?.name || 'Laptop'}</p>
                {chosenUnit?.brand && <p className="text-sm text-gray-500">{chosenUnit.brand}</p>}
                {chosenUnit?.specs && <p className="text-sm text-gray-500">{chosenUnit.specs}</p>}
              </div>
            </div>

            {/* Exchange Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Exchange Summary</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Laptop</p>
                  <p className="text-sm text-gray-900">{chosenUnit ? `${chosenUnit.brand || ''} ${chosenUnit.name || ''}`.trim() : '—'}</p>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Request Date</p>
                  <p className="text-sm text-gray-900">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Send Request Button */}
            <button
              onClick={() => {
                if (actionLoading) return;
                setActionLoading(true);
                setTimeout(() => {
                  setShowExchangeConfirmModal(false);
                  setSelectedRow(null);
                  onBack();
                  setActionLoading(false);
                }, 1000);
              }}
              disabled={actionLoading}
              className="w-full bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              {actionLoading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </div>
      )}

      {/* View All (Approved) Modal */}
      {isViewAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-xl font-bold text-blue-600">Approved</h2>
              <button
                onClick={() => { setIsViewAllOpen(false); logActivity('Approved: Closed View All', 'info'); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 text-base font-semibold text-gray-800">Date</th>
                    <th className="text-left p-3 text-base font-semibold text-gray-800">Item</th>
                    <th className="text-left p-3 text-base font-semibold text-gray-800">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="p-3 text-base text-gray-800 font-semibold">{row.date}</td>
                      <td className="p-3 text-base text-gray-800 font-semibold">{row.item}</td>
                      <td className="p-3">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">{row.status}</span>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-6 text-center text-gray-500">No records</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center gap-2">
                <button onClick={() => { const next = Math.max(1, page - 1); if (next !== page) logActivity(`Approved: View All page ${next}`, 'info'); setPage(next); }} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100" disabled={page === 1}>Prev</button>
                <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
                <button onClick={() => { const next = Math.min(totalPages, page + 1); if (next !== page) logActivity(`Approved: View All page ${next}`, 'info'); setPage(next); }} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100" disabled={page === totalPages}>Next</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Display</span>
                <select value={pageSize} onChange={(e) => { const n = Number(e.target.value); setPageSize(n); setPage(1); logActivity(`Approved: View All page size ${n}`, 'info'); }} className="border border-gray-300 rounded-md px-2 py-1 text-sm">
                  {[5, 10, 20, 50].map(n => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Borrowed Details Modal */}
      {isBorrowedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Borrowed Item Details</h2>
              <button onClick={() => setIsBorrowedOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Borrowed Date</div>
                  <div className="text-gray-900 font-semibold">{borrowedDetails?.borrowDate || '-'}</div>
                </div>
                {/* Return date removed per policy */}
              </div>
              <div className="border-t pt-4">
                <div className="text-sm text-gray-500 mb-2">Items</div>
                <ul className="space-y-2">
                  {(borrowedDetails?.items || []).map((it, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center">💼</div>
                      <div>
                        <div className="text-gray-900 font-semibold">{it.name}</div>
                        {it.specs && <div className="text-sm text-gray-600">{it.specs}</div>}
                      </div>
                    </li>
                  ))}
                  {(borrowedDetails?.items || []).length === 0 && (
                    <li className="text-gray-500 text-sm">No items</li>
                  )}
                </ul>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setIsBorrowedOpen(false)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedTransactions;
