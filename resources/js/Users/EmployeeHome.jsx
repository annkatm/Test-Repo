import React, { useState, useEffect, useMemo, useRef } from 'react';
import Echo from '../echo';
import { X, RefreshCcw, ClipboardList, Mouse, FilePlus2 } from 'lucide-react';
import OnProcessTransactions from './OnProcessTransactions';
import ApprovedTransactions from './ApprovedTransactions';
import StatsCards from './StatsCards';
const EmployeeHome = () => {
  const [, setShowExchangeConfirmModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionStats, setTransactionStats] = useState({
    borrowed: 0,
    available: 0,
    overdue: 0
  });
  
  const [showPendings, setShowPendings] = useState(false);
  const [, setSelectedRow] = useState(1);
  const [currentView, setCurrentView] = useState('transactions');
  const [, setShowReasonModal] = useState(false);
  const [exchangeReason, setExchangeReason] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [sortOption, setSortOption] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [actionLoading, setActionLoading] = useState(false);
  // Denied requests will be fetched from API
  const [deniedRequests, setDeniedRequests] = useState([]);
  // Toasts for upper-right popup notifications
  const [toasts, setToasts] = useState([]);
  const [isBorrowedOpen, setIsBorrowedOpen] = useState(false);
  const [isOverdueOpen, setIsOverdueOpen] = useState(false);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [selectedDeniedId, setSelectedDeniedId] = useState(null);
  // Track locally-cancelled requests to immediately hide them from On Process
  const [cancelledReqIds, setCancelledReqIds] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ireply_cancelled_req_ids') || '[]'); } catch (_) { return []; }
  });
  const [cancelledEquipIds, setCancelledEquipIds] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ireply_cancelled_equip_ids') || '[]'); } catch (_) { return []; }
  });
  // Equipment details cache for type detection
  const [equipmentDetails, setEquipmentDetails] = useState({});

  // Fetch equipment details by ID
  const fetchEquipmentDetails = async (equipmentId) => {
    if (!equipmentId || equipmentDetails[equipmentId]) {
      return equipmentDetails[equipmentId];
    }
    
    try {
      const response = await fetch(`/api/equipment/${equipmentId}`);
      if (response.ok) {
        const data = await response.json();
        setEquipmentDetails(prev => ({ ...prev, [equipmentId]: data }));
        return data;
      }
    } catch (error) {
      console.log('[EmployeeHome] Failed to fetch equipment details:', error);
    }
    return null;
  };

  const showToast = (message, variant = 'info', ttl = 4500) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, variant };
    setToasts((prev) => [toast, ...prev].slice(0, 6));
    // auto remove
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ttl);
  };

  // Function to clear cancelled IDs (for debugging)
  const clearCancelledIds = () => {
    setCancelledReqIds([]);
    setCancelledEquipIds([]);
    try {
      sessionStorage.setItem('ireply_cancelled_req_ids', JSON.stringify([]));
      sessionStorage.setItem('ireply_cancelled_equip_ids', JSON.stringify([]));
    } catch (_) {}
    console.log('[EmployeeHome] Cleared cancelled IDs');
    // Also refresh pending transactions
    fetchPendingTransactions();
  };

  // Per-user localStorage helpers
  const getUserTag = () => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) { const u = JSON.parse(raw); return u?.id || u?.email || 'guest'; }
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
    } catch (_) {}
  };

  const logActivity = (message, variant = 'info') => {
    try {
      migrateKeyIfNeeded('employee_activities');
      const prev = JSON.parse(localStorage.getItem(userKey('employee_activities')) || '[]');
      const entry = { id: Date.now(), message, variant, time: new Date().toISOString() };
      const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, 50);
      localStorage.setItem(userKey('employee_activities'), JSON.stringify(next));
      console.log('[EmployeeHome] Activity logged:', { message, variant });
    } catch (error) {
      console.error('[EmployeeHome] Failed to log activity:', error);
    }
  };

  // Debug function to test API directly
  const debugPendingRequests = async () => {
    try {
      const response = await fetch('/api/debug/pending-requests', { credentials: 'same-origin' });
      const data = await response.json();
      console.log('[DEBUG] Pending requests debug data:', data);
      
      // Also test the regular API
      const response2 = await fetch('/api/requests?status=pending', { credentials: 'same-origin' });
      const data2 = await response2.json();
      console.log('[DEBUG] Regular API response:', data2);
      
      showToast('Check console for debug info', 'info');
    } catch (error) {
      console.error('[DEBUG] Error:', error);
      showToast('Debug failed - check console', 'error');
    }
  };

  // Ensure denied requests are loaded so Recent Activities shows them
  useEffect(() => {
    (async () => {
      try { await fetchDeniedRequests(); } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    try {
      const now = Date.now();
      const within24h = (iso) => {
        const ts = new Date(iso || Date.now()).getTime();
        return Number.isFinite(ts) ? (now - ts <= 24 * 60 * 60 * 1000) : false;
      };
      const derived = [];
      (Array.isArray(pendingTransactions) ? pendingTransactions : []).forEach((t) => {
        const when = t.created_at || t.expected_start_date || t.date || t.time || new Date().toISOString();
        if (within24h(when)) {
          derived.push({
            id: `req:${t.id || t.equipment_id || when}`,
            item: t.equipment_name || t.item || 'Request',
            message: t.message || 'Item requested',
            variant: 'request',
            date: when,
            time: when,
          });
        }
      });
      (Array.isArray(transactions) ? transactions : []).forEach((t) => {
        const s = String(t.status || '').toLowerCase();
        if (/(approved|released|borrowed|active)/.test(s)) {
          const when = t.created_at || t.expected_start_date || t.start_date || t.date || t.time || new Date().toISOString();
          if (within24h(when)) {
            derived.push({
              id: `appr:${t.id || t.equipment_id || when}`,
              item: t.equipment_name || t.item || 'Approved',
              message: t.message || 'Item approved',
              variant: 'approved',
              date: when,
              time: when,
            });
          }
        }
      });
      (Array.isArray(deniedRequests) ? deniedRequests : []).forEach((r) => {
        const when = r.date || r.time || new Date().toISOString();
        derived.push({
          id: `deny:${r.id || when}`,
          item: r.item || 'Request',
          message: r.reason || 'Request denied',
          variant: 'denied',
          date: when,
          time: when,
        });
      });
      if (derived.length === 0) return;
    } catch (_) { }
  }, [pendingTransactions, transactions, deniedRequests]);

  const [notificationCount, setNotificationCount] = useState(() => {
    try {
      const v = Number(localStorage.getItem('employee_history_unseen') || '0');
      return Number.isNaN(v) ? 0 : v;
    } catch (_e) {
      return 0;
    }
  });


  // On mount, process any created-requests queued by EmployeeHome (in case this view wasn't mounted during submission)
  useEffect(() => {
    try {
      const key = 'ireply_created_queue';
      const raw = localStorage.getItem(key);
      const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      if (!arr || arr.length === 0) return;
      // Clear queue first to avoid duplicates
      try { localStorage.setItem(key, JSON.stringify([])); } catch (_) {}
      setPendingTransactions((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const next = [...arr, ...list].filter((item, idx, self) => {
          // de-dupe by id or equipment_id
          const id = String(item?.id || '');
          const eq = String(item?.equipment_id || '');
          const firstIdx = self.findIndex(x => String(x?.id || '') === id || String(x?.equipment_id || '') === eq);
          return firstIdx === idx;
        });
        return next;
      });
    } catch (_) { /* ignore */ }
  }, []);

  // Listen for request-cancelled events to update pending list immediately
  useEffect(() => {
    const onCancelled = (e) => {
      const reqId = e?.detail?.request_id;
      const equipId = e?.detail?.equipment_id;
      if (!reqId && !equipId) return;
      
      // Permanently store cancelled IDs in both session and local storage
      if (reqId) {
        setCancelledReqIds((prev) => {
          const next = Array.from(new Set([...(Array.isArray(prev) ? prev : []), String(reqId)]));
          try { 
            sessionStorage.setItem('ireply_cancelled_req_ids', JSON.stringify(next)); 
            localStorage.setItem('ireply_cancelled_req_ids_permanent', JSON.stringify(next));
          } catch (_) {}
          return next;
        });
      }
      if (equipId) {
        setCancelledEquipIds((prev) => {
          const next = Array.from(new Set([...(Array.isArray(prev) ? prev : []), String(equipId)]));
          try { 
            sessionStorage.setItem('ireply_cancelled_equip_ids', JSON.stringify(next)); 
            localStorage.setItem('ireply_cancelled_equip_ids_permanent', JSON.stringify(next));
          } catch (_) {}
          return next;
        });
      }
      
      setPendingTransactions((prev) => (
        Array.isArray(prev)
          ? prev.filter((r) => {
              const byReq = reqId ? String(r.id) !== String(reqId) : true;
              const byEquip = equipId ? String(r.equipment_id || '') !== String(equipId) : true;
              return byReq && byEquip;
            })
          : prev
      ));
      
      try { showToast('Request cancelled successfully', 'success'); } catch (_) {}
      
      // Refresh pending from server to ensure consistency
      setTimeout(() => { try { fetchPendingTransactions(); } catch (_) {} }, 500);
    };
    window.addEventListener('ireply:request:cancelled', onCancelled);
    const onCreated = (e) => {
      const d = e?.detail || {};
      if (!d || (!d.id && !d.equipment_id)) return;
      // Un-ignore this request/equipment if it was previously cancelled
      if (d.id) {
        setCancelledReqIds((prev) => {
          const next = (Array.isArray(prev) ? prev : []).filter((x) => String(x) !== String(d.id));
          try { sessionStorage.setItem('ireply_cancelled_req_ids', JSON.stringify(next)); } catch (_) {}
          return next;
        });
      }
      if (d.equipment_id) {
        setCancelledEquipIds((prev) => {
          const next = (Array.isArray(prev) ? prev : []).filter((x) => String(x) !== String(d.equipment_id));
          try { sessionStorage.setItem('ireply_cancelled_equip_ids', JSON.stringify(next)); } catch (_) {}
          return next;
        });
      }
      setPendingTransactions((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const exists = list.some((r) => (d.id && String(r.id) === String(d.id)) || (d.equipment_id && String(r.equipment_id || '') === String(d.equipment_id)));
        if (exists) return list;
        return [{
          id: d.id || Date.now(),
          created_at: d.created_at || new Date().toISOString(),
          expected_start_date: d.expected_start_date || null,
          expected_end_date: d.expected_end_date || null,
          equipment_id: d.equipment_id || null,
          equipment_name: d.equipment_name || d.item || 'Item',
          item: d.equipment_name || d.item || 'Item',
          status: d.status || 'Pending',
        }, ...list];
      });
      try { showToast('Request created', 'success'); } catch (_) {}
    };
    
    const onApproved = (e) => {
      const reqId = e?.detail?.request_id;
      const equipId = e?.detail?.equipment_id;
      
      if (reqId || equipId) {
        // Remove approved request from pending list
        setPendingTransactions((prev) => (
          Array.isArray(prev)
            ? prev.filter((r) => {
                const byReq = reqId ? String(r.id) !== String(reqId) : true;
                const byEquip = equipId ? String(r.equipment_id || '') !== String(equipId) : true;
                return byReq && byEquip;
              })
            : prev
        ));
        
        // Move to approved transactions
        try { 
          fetchApprovedTransactions(); 
          try { showToast('Request approved', 'success'); } catch (_) {}
        } catch (_) {}
      }
    };
    
    const onRejected = (e) => {
      const reqId = e?.detail?.request_id;
      const equipId = e?.detail?.equipment_id;
      
      if (reqId || equipId) {
        // Remove rejected request from pending list
        setPendingTransactions((prev) => (
          Array.isArray(prev)
            ? prev.filter((r) => {
                const byReq = reqId ? String(r.id) !== String(reqId) : true;
                const byEquip = equipId ? String(r.equipment_id || '') !== String(equipId) : true;
                return byReq && byEquip;
              })
            : prev
        ));
        
        try { showToast('Request was rejected by admin', 'error'); } catch (_) {}
      }
    };
    
    window.addEventListener('ireply:request:created', onCreated);
    window.addEventListener('ireply:request:approved', onApproved);
    window.addEventListener('ireply:request:rejected', onRejected);
    
    return () => {
      window.removeEventListener('ireply:request:cancelled', onCancelled);
      window.removeEventListener('ireply:request:created', onCreated);
      window.removeEventListener('ireply:request:approved', onApproved);
      window.removeEventListener('ireply:request:rejected', onRejected);
    };
  }, []);


  // Increment the unseen history/notification counter and optionally append a local history/activity entry
  const incrementNotification = (count = 1, entry = null) => {
    setNotificationCount((prev) => {
      const next = prev + count;
      try { localStorage.setItem('employee_history_unseen', String(next)); } catch (_) { }
      return next;
    });
  };

  const fetchBorrowedItems = async () => {
    try {
      let list = [];
      try {
        const res = await fetch('/api/transactions/borrowed');
        if (res.ok) {
          const data = await res.json();
          list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        }
      } catch (_) {}

      if (!Array.isArray(list) || list.length === 0) {
        try {
          const res2 = await fetch('/api/employees/current-holders');
          const data2 = await res2.json();
          list = Array.isArray(data2?.data) ? data2.data : (Array.isArray(data2) ? data2 : []);
        } catch (_) {}
      }

      // Do not derive using return_date; keep API-driven list only

      setBorrowedItems(list);
      return list;
    } catch (_) {
      setBorrowedItems([]);
      return [];
    }
  };

  

  // Global function for other parts of the app to notify this component about new events
  // Usage: window.IReplyNotify('Your request was approved', 'success')
  useEffect(() => {
    window.IReplyNotify = (message, variant = 'info', addToHistory = true, historyEntry = null) => {
      const entry = historyEntry || { id: Date.now(), item: message, message, variant, date: new Date().toISOString(), time: new Date().toISOString(), local: Boolean(historyEntry) };
      if (addToHistory) {
        incrementNotification(1, entry);
        // dispatch a specific history event for other listeners
        try {
          window.dispatchEvent(new CustomEvent('ireply:history', { detail: entry }));
        } catch (_) { }
      } else {
        incrementNotification(1, null);
      }
      // show toast popup for the notification
      try { showToast(typeof message === 'string' ? message : (entry.message || 'Notification'), variant); } catch (_) { }
    };

    const notifyHandler = (e) => {
      const detail = e?.detail || {};
      const message = detail.message || detail.msg || 'New activity';
      const variant = detail.variant || 'info';
      const entry = { id: Date.now(), item: message, message, variant, date: new Date().toISOString(), time: new Date().toISOString() };
      incrementNotification(1, entry);
      showToast(message, variant);
    };


    window.addEventListener('ireply:notify', notifyHandler);

    return () => {
      try { delete window.IReplyNotify; } catch (_) { }
      window.removeEventListener('ireply:notify', notifyHandler);
    };
  }, []);

  const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); return `${d}d ago`;
  };





  // Fetch denied requests
  const fetchDeniedRequests = async () => {
    try {
      const res = await fetch('/api/requests?status=denied', { credentials: 'same-origin' });
      const data = await res.json();


      if (data.success && Array.isArray(data.data)) {
        const mapped = data.data.map((r, idx) => ({
          id: r.id ?? idx + 1,
          date: r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
          }) : '',
          // Show the item CATEGORY (e.g., Monitor), not the brand
          item: r.category_name || r.category || r.equipment_type || r?.equipment?.category_name || r?.equipment?.category || r.equipment_name || r.item || r.items || r.title || 'Request',
          // Brand field should contain the brand like LG
          brand: r.brand || r.equipment_brand || r?.equipment?.brand || '',
          model: r.model || r.equipment_model || r?.equipment?.model || '',
          status: 'Denied',
          // Capture the admin's actual denial reason from common fields
          reason: r.denial_reason || r.denied_reason || r.reject_reason || r.rejection_reason || r.reason || r.remarks || r.remark || r.comment || r.comments || r.note || r.notes || 'No reason provided',
          equipment_id: r.equipment_id || r?.equipment?.id || null,
        }));
        // Normalize: if item looks like brand or missing, try to fetch equipment category
        const needEnrich = mapped.filter(m => (!m.item || m.item.toLowerCase() === (m.brand || '').toLowerCase()) && m.equipment_id);
        if (needEnrich.length > 0) {
          try {
            const enriched = await Promise.all(mapped.map(async (m) => {
              if (!m.equipment_id) return m;
              if (m.item && m.item.toLowerCase() !== (m.brand || '').toLowerCase()) return m;
              try {
                const resp = await fetch(`/api/equipment/${m.equipment_id}`, { credentials: 'same-origin' });
                const j = await resp.json();
                const eq = j?.data || j || {};
                const category = eq.category_name || eq.category?.name || eq.category || m.item;
                return { ...m, item: category || m.item, brand: m.brand || eq.brand || '' };
              } catch (_) { return m; }
            }));
            setDeniedRequests(enriched);
            setTransactionStats((prev) => ({ ...prev, overdue: enriched.length }));
            return enriched;
          } catch (_) {
            setDeniedRequests(mapped);
            setTransactionStats((prev) => ({ ...prev, overdue: mapped.length }));
            return mapped;
          }
        }
        setDeniedRequests(mapped);
        // reflect denied count in stats (re-using 'overdue' slot per UI spec)
        setTransactionStats((prev) => ({ ...prev, overdue: mapped.length }));
        return mapped;
      } else {
        // Set to empty array if no data
        setDeniedRequests([]);
        setTransactionStats((prev) => ({ ...prev, overdue: 0 }));
        return [];
      }
    } catch (e) {
      console.error('Failed to fetch denied requests', e);
      setDeniedRequests([]);
      setTransactionStats((prev) => ({ ...prev, overdue: 0 }));
      return [];
    }
  };

  const iconFor = (variant) => {
    if (variant === 'return') return { Icon: RefreshCcw, bg: 'bg-blue-50', text: 'text-blue-700' };
    if (variant === 'exchange') return { Icon: RefreshCcw, bg: 'bg-purple-50', text: 'text-purple-700' };
    if (variant === 'success') return { Icon: FilePlus2, bg: 'bg-green-50', text: 'text-green-700' };
    if (variant === 'warning') return { Icon: Mouse, bg: 'bg-yellow-50', text: 'text-yellow-700' };
    return { Icon: ClipboardList, bg: 'bg-gray-50', text: 'text-gray-700' };
  };




  

  // Approved transactions will be fetched from API
  const [approvedTransactions, setApprovedTransactions] = useState([]);

  // Equipment data will be fetched from API
  

  // Database connection functions for transactions
  const fetchTransactionStats = async () => {
    try {
      const response = await fetch('/api/transactions/stats');
      const data = await response.json();

      if (data.success) {
        setTransactionStats({
          borrowed: data.data.borrowed || 0,
          available: data.data.available || 0,
          overdue: data.data.overdue || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch transaction stats:', error);
    }
  };

  const fetchPendingTransactions = async () => {
    try {
      // Merge any locally created entries immediately to prevent view-all delay
      try {
        const rawQ = localStorage.getItem('ireply_created_queue');
        const q = Array.isArray(JSON.parse(rawQ)) ? JSON.parse(rawQ) : [];
        if (q.length) {
          setPendingTransactions((prev) => {
            const base = Array.isArray(prev) ? prev : [];
            const merged = [...q, ...base];
            const seen = new Set();
            const deduped = [];
            for (const r of merged) {
              const key = `${String(r?.id ?? '')}::${String(r?.equipment_id ?? '')}`;
              if (!seen.has(key)) { seen.add(key); deduped.push(r); }
            }
            return deduped;
          });
        }
      } catch (_) {}

      // Resolve employee id robustly
      const currentEmployeeId = await (async () => {
        try {
          const userRes = await fetch('/check-auth', { credentials: 'same-origin' });
          const userData = await userRes.json();
          const user = userData?.user || {};
          if (userData?.authenticated && user?.employee_id) {
            const n = Number(user.employee_id); if (Number.isFinite(n) && String(n) !== '0') return n;
          }
          if (userData?.authenticated && user?.linked_employee_id) {
            try {
              const er = await fetch(`/api/employees/${user.linked_employee_id}`, { credentials: 'same-origin' });
              const ej = await er.json();
              const emp = ej?.data || ej; if (emp?.id) return emp.id;
            } catch (_) {}
          }
          if (userData?.authenticated && user?.id) {
            const empRes = await fetch(`/api/employees?user_id=${user.id}`);
            const empData = await empRes.json();
            const employees = Array.isArray(empData) ? empData : (Array.isArray(empData?.data) ? empData.data : []);
            if (employees.length > 0) return employees[0].id;
          }
          try {
            const allRes = await fetch('/api/employees', { credentials: 'same-origin' });
            const all = await allRes.json();
            const list = Array.isArray(all) ? all : (Array.isArray(all?.data) ? all.data : []);
            if (user?.email) {
              const byEmail = list.find(e => (e.email || '').toLowerCase() === String(user.email).toLowerCase());
              if (byEmail) return byEmail.id;
            }
            if (user?.name) {
              const parts = String(user.name).trim().split(/\s+/);
              const first = parts[0] || '';
              const last = parts.length > 1 ? parts[parts.length - 1] : '';
              const byName = list.find(e => String(e.first_name || '').toLowerCase() === first.toLowerCase() && String(e.last_name || '').toLowerCase() === last.toLowerCase());
              if (byName) return byName.id;
            }
          } catch (_) {}
        } catch (_) {}
        return null;
      })();

      // Fetch pending (scoped), with fallback to unscoped + client filter
      let list = [];
      try {
        const url = currentEmployeeId
          ? `/api/requests?status=pending&employee_id=${encodeURIComponent(currentEmployeeId)}`
          : '/api/requests?status=pending';
        const response = await fetch(url, { credentials: 'same-origin' });
        const data = await response.json();
        if (Array.isArray(data)) list = data; else if (Array.isArray(data?.data)) list = data.data; else if (Array.isArray(data?.data?.data)) list = data.data.data;
      } catch (_) { list = []; }

      if (!Array.isArray(list) || list.length === 0) {
        try {
          const res2 = await fetch('/api/requests?status=pending', { credentials: 'same-origin' });
          const j2 = await res2.json();
          let all = Array.isArray(j2) ? j2 : (Array.isArray(j2?.data) ? j2.data : (Array.isArray(j2?.data?.data) ? j2.data.data : []));
          if (currentEmployeeId) all = (all || []).filter(r => String(r?.employee_id || r?.employee?.id || '') === String(currentEmployeeId));
          list = all || [];
        } catch (_) { list = []; }
      }

      const mapped = (Array.isArray(list) ? list : []).map((t, index) => ({
        id: t?.id || index + 1,
        created_at: t?.created_at || t?.date || null,
        expected_start_date: t?.expected_start_date || null,
        equipment_id: t?.equipment_id || t?.equipment?.id || null,
        equipment_name: t?.equipment_name || t?.equipment?.name || t?.item || 'Item',
        brand: t?.brand || t?.equipment?.brand || '',
        model: t?.model || t?.equipment?.model || '',
        request_number: t?.request_number || t?.number || '',
        reason: t?.reason || t?.description || t?.notes || '',
        status: t?.status || 'Pending',
      }));

      console.log('[fetchPendingTransactions] Final mapped transactions:', mapped);

      setPendingTransactions((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        const merged = [...mapped, ...base];
        const seen = new Set();
        const deduped = [];
        for (const r of merged) {
          const key = `${String(r?.id ?? '')}::${String(r?.equipment_id ?? '')}`;
          if (!seen.has(key)) { seen.add(key); deduped.push(r); }
        }
        console.log('[fetchPendingTransactions] Final deduped transactions:', deduped);
        return deduped;
      });
    } catch (e) {
      console.error('[EmployeeHome] Failed to fetch pending transactions', e);
      setPendingTransactions([]);
    }
  };

  const fetchApprovedTransactions = async () => {
    try {
      // 1) Fetch from approved endpoint
      const respApproved = await fetch('/api/transactions/approved', { credentials: 'same-origin' });
      const jsonApproved = await respApproved.json().catch(() => ({}));
      const listApproved = Array.isArray(jsonApproved)
        ? jsonApproved
        : (Array.isArray(jsonApproved?.data)
          ? jsonApproved.data
          : (Array.isArray(jsonApproved?.data?.data) ? jsonApproved.data.data : []));

      // 2) Fetch from generic transactions and filter approved-like
      let listGeneric = [];
      try {
        const res2 = await fetch('/api/transactions', { credentials: 'same-origin' });
        const j2 = await res2.json().catch(() => ({}));
        const raw2 = Array.isArray(j2) ? j2 : (Array.isArray(j2?.data) ? j2.data : (Array.isArray(j2?.data?.data) ? j2.data.data : []));
        const allowed = ['approved', 'released', 'borrowed', 'active'];
        listGeneric = (raw2 || []).filter(t => allowed.includes(String(t?.status || '').toLowerCase()));
      } catch (_) {}

      // Merge approved + generic and de-duplicate
      let merged = [...(Array.isArray(listApproved) ? listApproved : []), ...(Array.isArray(listGeneric) ? listGeneric : [])];
      if (merged.length > 0) {
        const seen = new Set();
        merged = merged.filter((t) => {
          const id = t?.id ?? t?.transaction_id ?? t?.request_id ?? null;
          const eq = t?.equipment_id ?? t?.equipment?.id ?? null;
          // Only de-duplicate when BOTH id and equipment_id exist and are non-empty
          if (id != null && id !== '' && eq != null && eq !== '') {
            const key = `${String(id)}::${String(eq)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }
          // Otherwise, keep the entry to avoid accidental collapsing
          return true;
        });
      }

      // 3) Fallback to current holders if still empty
      if (!Array.isArray(merged) || merged.length === 0) {
        try {
          const res3 = await fetch('/api/employees/current-holders', { credentials: 'same-origin' });
          const j3 = await res3.json().catch(() => ({}));
          merged = Array.isArray(j3) ? j3 : (Array.isArray(j3?.data) ? j3.data : []);
        } catch (_) {}
      }

      // 4) Additional fallback to approved requests
      if (!Array.isArray(merged) || merged.length === 0) {
        try {
          const res4 = await fetch('/api/requests?status=approved', { credentials: 'same-origin' });
          const j4 = await res4.json().catch(() => ({}));
          const reqs = Array.isArray(j4) ? j4 : (Array.isArray(j4?.data) ? j4.data : []);
          merged = (reqs || []).map(r => ({
            id: r.id,
            equipment_id: r.equipment_id || r.equipment?.id,
            equipment_name: r.equipment_name || r.item || '-',
            expected_start_date: r.expected_start_date || r.start_date,
            expected_end_date: r.expected_end_date || r.return_date,
            status: r.status || 'approved',
          }));
        } catch (_) {}
      }

      const finalList = Array.isArray(merged) ? merged : [];
      try {
        console.log('[EmployeeTransaction] Approved fetch result count:', finalList.length, finalList.slice(0, 3));
      } catch (_) {}
      setTransactions(finalList);
      // Ensure the dashboard 'Item Currently Borrowed' reflects approved items count
      try { setTransactionStats((prev) => ({ ...prev, borrowed: Array.isArray(finalList) ? finalList.length : 0 })); } catch (_) {}
    } catch (error) {
      console.error('Failed to fetch approved transactions:', error);
      setTransactions([]);
    }
  };



  useEffect(() => {
    const loadTransactionData = async () => {
      await fetchTransactionStats();
      await fetchPendingTransactions();
      await fetchApprovedTransactions();
      await fetchDeniedRequests(); // Fetch denied requests on load

      try {
        const res = await fetch('/api/employees/current-holders');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          if (transactions.length === 0) {
            setTransactions(data.data);
            // Sync borrowed count to approved/current-holder items length when using fallback
            try { setTransactionStats((prev) => ({ ...prev, borrowed: Array.isArray(data.data) ? data.data.length : 0 })); } catch (_) {}
          }
        }
      } catch (error) {
        console.error('Failed to fetch legacy transaction data:', error);
      }
    };

    loadTransactionData();

    // Setup Echo subscription for real-time events when available
    let subscribedChannel = null;
    (async () => {
      try {
        // determine the employee id for current user
        const res = await fetch('/check-auth', { credentials: 'same-origin' });
        const userData = await res.json();
        let employeeId = null;
        if (userData && userData.user) {
          // try to get linked_employee_id or fall back to lookup
          employeeId = userData.user.linked_employee_id || null;
        }

        if (!employeeId) {
          try {
            const eRes = await fetch('/api/employees');
            const eData = await eRes.json();
            const list = eData.success ? eData.data : eData;
            if (Array.isArray(list) && userData && userData.user && userData.user.email) {
              const found = list.find(emp => emp.email && emp.email.toLowerCase() === userData.user.email.toLowerCase());
              if (found) employeeId = found.id;
            }
          } catch (_) { }
        }

        if (employeeId && Echo) {
          try {
            subscribedChannel = Echo.private(`user.history.${employeeId}`);
            subscribedChannel.listen('RequestCreated', (e) => {
              const payload = e || {};
              const entry = {
                id: payload.id || payload.data?.id || Date.now(),
                item: payload.equipment_name || payload.item || payload.data?.equipment_name || payload.message || 'Request',
                message: payload.message || `Request ${payload.request_number || ''}`,
                variant: 'info',
                date: payload.created_at || payload.date || new Date().toISOString(),
                time: payload.created_at || payload.date || new Date().toISOString()
              };
              // Append to history and increment badge
              incrementNotification(1, entry);
            }).listen('RequestUpdated', (e) => {
              const payload = e || {};
              const entry = {
                id: payload.id || payload.data?.id || Date.now(),
                item: payload.equipment_name || payload.item || payload.data?.equipment_name || payload.message || 'Request',
                message: payload.message || `Request updated ${payload.request_number || ''}`,
                variant: 'info',
                date: payload.updated_at || payload.date || new Date().toISOString(),
                time: payload.updated_at || payload.date || new Date().toISOString()
              };
              incrementNotification(1, entry);
            });
          } catch (e) {
            // ignore Echo errors
          }
        }
      } catch (e) {
        // ignore
      }
    })();

    // Set up polling to refresh denied requests every 30 seconds
    const deniedRequestsInterval = setInterval(() => {
      fetchDeniedRequests();
    }, 30000); // 30 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(deniedRequestsInterval);
      try {
        if (subscribedChannel && Echo) subscribedChannel.stopListening();
      } catch (_) { }
    };
  }, []);

  

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleConfirmExchange = () => {
    // Handle the exchange confirmation logic here
    console.log('Exchange reason:', exchangeReason);
    console.log('Uploaded file:', uploadedFile);
    setShowReasonModal(false);
    setShowExchangeConfirmModal(true);
    setExchangeReason('');
    setUploadedFile(null);
  };

  const handleSendExchangeRequest = () => {
    setShowExchangeConfirmModal(false);
    // Reset to transactions view after confirmation
    setTimeout(() => setCurrentView('transactions'), 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }



  // Main transaction view
  // Show full Approved list when requested
  if (currentView === 'approved') {
    const approvedData = [...(transactions || [])]
      .sort((a, b) => {
        const aDate = new Date(a?.created_at || a?.expected_start_date || a?.start_date || 0).getTime();
        const bDate = new Date(b?.created_at || b?.expected_start_date || b?.start_date || 0).getTime();
        return bDate - aDate;
      })
      .map((t) => {
        const dsrc = t?.created_at || t?.expected_start_date || t?.start_date || t?.date || null;
        const date = dsrc
          ? new Date(dsrc).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
          : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        return {
          // Use any available identifier to ensure Return works
          id: t?.id ?? t?.transaction_id ?? t?.request_id ?? t?.transactionID ?? t?.trans_id ?? t?.trx_id ?? t?.uuid ?? t?.pivot?.transaction_id ?? null,
          tx_id: t?.id ?? t?.transaction_id ?? t?.request_id ?? t?.transactionID ?? t?.trans_id ?? t?.trx_id ?? t?.uuid ?? t?.pivot?.transaction_id ?? null,
          date,
          item: t?.equipment_name || t?.item || '-',
          match_name: t?.equipment_name || t?.item || '-',
          status: t?.status || '-',
          equipment_id: t?.equipment_id || t?.equipment?.id || null,
          brand: t?.brand || t?.equipment?.brand || null,
          model: t?.model || t?.equipment?.model || null,
          equipment: t?.equipment || t?.equipment_details || null,
          exchangeItems: [
            {
              name: t?.equipment_name || t?.item || '-',
              brand: 'Equipment',
              details: t?.description || '',
              icon: '💻',
            },
          ],
        };
      });

    return (
      <ApprovedTransactions
        onBack={() => setCurrentView('transactions')}
        transactionStats={transactionStats}
        approvedTransactions={approvedData}
      />
    );
  }

  // Show full On Process list when requested
  if (showPendings) {
    const visiblePending = (pendingTransactions || []).filter((t) => {
      const idOk = cancelledReqIds.includes(String(t?.id)) ? false : true;
      const eqOk = cancelledEquipIds.includes(String(t?.equipment_id || '')) ? false : true;
      return idOk && eqOk;
    });
    const requestsData = visiblePending.map((t, index) => {
      const dsrc = t?.created_at || t?.expected_start_date || null;
      const date = dsrc ? new Date(dsrc).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';
      return {
        id: t?.id || index + 1,
        equipment_id: t?.equipment_id || t?.equipment?.id || null,
        date: date || '-',
        item: t?.equipment_name || t?.item || '-',
        brand: t?.brand || t?.equipment?.brand || '-',
        model: t?.model || t?.equipment?.model || '-',
        number: t?.request_number || t?.number || '-',
        request_number: t?.request_number || t?.number || '-',
        reason: t?.reason || t?.description || t?.notes || '-',
        status: t?.status || 'Pending',
        details: [
          {
            name: t?.equipment_name || t?.item || '-',
            description: t?.reason || t?.description || t?.notes || 'Equipment request',
            icon: '/images/placeholder-equipment.png',
          },
        ],
      };
    });

    return (
      <OnProcessTransactions
        onBack={() => setShowPendings(false)}
        requests={requestsData}
        deniedRequests={deniedRequests}
        setDeniedRequests={setDeniedRequests}
        fetchDeniedRequests={fetchDeniedRequests}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <style>
        {`
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}
      </style>
      <div className="col-span-12 md:col-span-11 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-[#2262C6] transition-all duration-300">Home</h1>
        </div>

        <StatsCards 
          transactionStats={transactionStats} 
          onBorrowedClick={async () => { await fetchBorrowedItems(); setIsBorrowedOpen(true); }} 
          onOverdueClick={async () => { await fetchDeniedRequests(); setSelectedDeniedId(null); setIsOverdueOpen(true); }} 
        />


        <div className="bg-gray-100 rounded-lg border border-gray-200 mb-8 w-full">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#2262C6]">On Process</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('[DEBUG] Manual refresh clicked');
                    clearCancelledIds();
                  }}
                  className="text-right text-red-600 text-xs font-medium hover:text-red-700">
                  Refresh
                </button>
                <button
                  onClick={() => {
                    // Show the view immediately to avoid UX delay; fetch in background
                    setShowPendings(true);
                    try { fetchDeniedRequests(); } catch (_) {}
                    try { fetchPendingTransactions(); } catch (_) {}
                    logActivity('Opened On Process view', 'info');
                  }}
                  className="text-right text-blue-600 text-sm font-medium hover:text-blue-700">
                  View all
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-6 text-sm font-medium text-gray-700">
              <div className="col-span-7">Type</div>
              <div className="col-span-2">Start Date</div>
              <div className="col-span-2">Brand</div>
              <div className="col-span-1">Status</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {(() => {
              console.log('[EmployeeHome] Rendering On Process - pendingTransactions:', pendingTransactions);
              console.log('[EmployeeHome] Cancelled IDs:', cancelledReqIds, cancelledEquipIds);
              const filtered = pendingTransactions.filter((t) => !cancelledReqIds.includes(String(t?.id)) && !cancelledEquipIds.includes(String(t?.equipment_id || '')));
              console.log('[EmployeeHome] After filtering:', filtered);
              return filtered.length;
            })() > 0 ? [...pendingTransactions]
              .filter((t) => !cancelledReqIds.includes(String(t?.id)) && !cancelledEquipIds.includes(String(t?.equipment_id || '')))
              .sort((a, b) => {
                const aDate = new Date(a.created_at || a.expected_start_date || 0).getTime();
                const bDate = new Date(b.created_at || b.expected_start_date || 0).getTime();
                return bDate - aDate; // newest first
              })
              .slice(0, 6)
              .map((transaction, index) => (
              <div
                key={transaction.id || index}
                className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => logActivity(`Clicked pending row: ${transaction.equipment_name || transaction.item || 'Item'} (${transaction.id || index})`, 'info')}
              >
                <div className="grid grid-cols-12 gap-6 items-center">
                  <div className="col-span-7">
                    <span className="text-sm text-gray-900">
                      {(() => {
                        const equipName = (transaction.equipment_name || transaction.item || '').toLowerCase();
                        const reason = (transaction.reason || '').toLowerCase();
                        const brand = (transaction.brand || transaction.equipment_brand || transaction?.equipment?.brand || '').toLowerCase();
                        
                        if (equipName.includes('laptop') || equipName.includes('notebook') || reason.includes('laptop') || reason.includes('notebook')) {
                          return 'Laptop';
                        }
                        if (equipName.includes('monitor') || equipName.includes('display') || equipName.includes('screen') || 
                            reason.includes('monitor') || reason.includes('display') || reason.includes('screen') ||
                            brand.includes('asus')) {
                          return 'Monitor';
                        }
                        if (equipName.includes('mouse') || reason.includes('mouse')) {
                          return 'Mouse';
                        }
                        if (equipName.includes('keyboard') || reason.includes('keyboard')) {
                          return 'Keyboard';
                        }
                        
                        if (brand.includes('keyboard') || brand.includes('tuf gaming')) {
                          return 'Keyboard';
                        }
                        
                        if (brand.includes('rog') || brand.includes('msi') || brand.includes('dell') || brand.includes('hp') || brand.includes('lenovo')) {
                          return 'Laptop';
                        }
                        
                        return transaction.equipment_name || transaction.item || 'Unknown';
                      })()}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-900">
                      {transaction.expected_start_date
                        ? new Date(transaction.expected_start_date).toLocaleDateString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                        })
                        : '-'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-900">
                      {transaction.equipment?.brand || transaction.brand || transaction.equipment_brand || '-'}
                    </span>
                  </div>
                  <div className="col-span-1">
                    {(() => {
                      const s = String(transaction.status || 'pending').toLowerCase();
                      const isApproved = /approved|released|borrowed|active/.test(s);
                      const cls = isApproved
                        ? 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200'
                        : 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200';
                      const label = isApproved ? 'Approved' : (transaction.status || 'Pending');
                      return (
                        <span className={cls}>{label}</span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )) : (
              <div className="px-6 py-6 text-sm text-gray-500">
                No requests are currently in process.
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg border border-gray-200 w-full">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#2262C6]">Approved</h2>
              <button
                onClick={() => {
                  // Switch immediately; fetch in background
                  setSelectedRow(null);
                  setCurrentView('approved');
                  try { fetchApprovedTransactions(); } catch (_) {}
                  logActivity('Opened Approved view', 'info');
                }}
                className="text-right text-blue-600 text-sm font-medium hover:text-blue-700">
                View all
              </button>
            </div>
          </div>

          <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-6 text-sm font-medium text-gray-700">
              <div className="col-span-7">Type</div>
              <div className="col-span-2">Start Date</div>
              <div className="col-span-2">Brand</div>
              <div className="col-span-1">Status</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {transactions.length > 0 ? (() => {
              const sorted = [...transactions].sort((a, b) => {
                const aDate = new Date(a.created_at || a.expected_start_date || a.start_date || 0).getTime();
                const bDate = new Date(b.created_at || b.expected_start_date || b.start_date || 0).getTime();
                return bDate - aDate; // newest first
              });
              const filtered = sorted.filter(t => {
                const s = String(t.status || '').toLowerCase();
                return ['approved', 'released', 'borrowed', 'active'].includes(s);
              });
              const useList = (filtered.length > 0 ? filtered : sorted).slice(0, 8);
              return useList.map((transaction, index) => (
                <div
                  key={transaction.id || index}
                  className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => logActivity(`Clicked approved row: ${transaction.equipment_name || transaction.item || 'Item'} (${transaction.id || index})`, 'info')}
                >
                  <div className="grid grid-cols-12 gap-6 items-center">
                    <div className="col-span-7">
                      <span className="text-sm text-gray-900">
                        {(() => {
                          const equipName = (transaction.equipment_name || transaction.item || '').toLowerCase();
                          const reason = (transaction.reason || '').toLowerCase();
                          const brand = (transaction.brand || transaction.equipment_brand || transaction?.equipment?.brand || '').toLowerCase();
                          
                          if (equipName.includes('laptop') || equipName.includes('notebook') || reason.includes('laptop') || reason.includes('notebook')) {
                            return 'Laptop';
                          }
                          if (equipName.includes('monitor') || equipName.includes('display') || equipName.includes('screen') || 
                              reason.includes('monitor') || reason.includes('display') || reason.includes('screen') ||
                              brand.includes('asus')) {
                            return 'Monitor';
                          }
                          if (equipName.includes('mouse') || reason.includes('mouse')) {
                            return 'Mouse';
                          }
                          if (equipName.includes('keyboard') || reason.includes('keyboard')) {
                            return 'Keyboard';
                          }
                          
                          if (brand.includes('keyboard') || brand.includes('tuf gaming')) {
                            return 'Keyboard';
                          }
                          
                          if (brand.includes('rog') || brand.includes('msi') || brand.includes('dell') || brand.includes('hp') || brand.includes('lenovo')) {
                            return 'Laptop';
                          }
                          
                          return transaction.equipment_name || transaction.item || 'Unknown';
                        })()}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-900">
                        {(transaction.expected_start_date || transaction.start_date || transaction.created_at || transaction.borrow_date || transaction.borrowed_at || transaction.release_date || transaction.start || transaction.expected_start || transaction.startDate)
                          ? new Date(
                              transaction.expected_start_date || transaction.start_date || transaction.created_at ||
                              transaction.borrow_date || transaction.borrowed_at || transaction.release_date ||
                              transaction.start || transaction.expected_start || transaction.startDate
                            ).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                          : '-'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-600">
                        {transaction.brand || transaction.equipment_brand || transaction?.equipment?.brand || '-'}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {(() => {
                        const s = String(transaction.status || 'approved').toLowerCase();
                        const isApproved = /approved|released|borrowed|active/.test(s);
                        const cls = isApproved
                          ? 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200'
                          : 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200';
                        const label = isApproved ? 'Approved' : (transaction.status || 'Approved');
                        return (
                          <span className={cls}>{label}</span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ));
            })() : (
              <div className="px-6 py-6 text-sm text-gray-500">
                Currently no item has been approved
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-12 md:col-span-2 space-y-6">
        <div className="space-y-3 max-h-96 overflow-y-auto">
                {(borrowedItems || []).map((it, i) => (
                  <div key={it.id || i} className="border border-gray-200 rounded-lg p-3">
                    <div className="font-semibold text-gray-900">{it.equipment_name || it.item || '-'}</div>
                  </div>
                ))}
        </div>
      </div>
      {isBorrowedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Borrowed Item Details</h2>
              <button
                onClick={() => setIsBorrowedOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">📦</div>
                <div>
                  <div className="font-semibold text-gray-900">Currently Borrowed</div>
                  <div className="text-sm text-gray-600">Total items: {transactionStats?.borrowed || 0}</div>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(borrowedItems || []).map((it, i) => (
                  <div key={it.id || i} className="border border-gray-200 rounded-lg p-3">
                    <div className="font-semibold text-gray-900">{it.equipment_name || it.item || '-'}</div>
                  </div>
                ))}
                {(!borrowedItems || borrowedItems.length === 0) && (
                  <div className="text-sm text-gray-500">No borrowed items</div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 text-right">
              <button
                onClick={() => setIsBorrowedOpen(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isOverdueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Denied Items</h2>
              <button
                onClick={() => setIsOverdueOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-3 text-sm font-semibold text-gray-800">Date</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-800">Item</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-800">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(deniedRequests || []).map((it) => (
                      <tr
                        key={it.id}
                        onClick={() => setSelectedDeniedId(it.id)}
                        className={`cursor-pointer border-b border-gray-100 hover:bg-blue-50 ${selectedDeniedId === it.id ? 'bg-blue-100' : ''}`}
                      >
                        <td className="p-3 text-sm text-gray-800 font-semibold">{it.date || ''}</td>
                        <td className="p-3 text-sm text-gray-800 font-semibold">
                          <div className="text-gray-900">{it.item || '-'}</div>
                          {!!(it.brand) && (
                            <div className="text-xs text-gray-500 mt-0.5">Brand: {it.brand}</div>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">Denied</span>
                        </td>
                      </tr>
                    ))}
                    {(!deniedRequests || deniedRequests.length === 0) && (
                      <tr>
                        <td colSpan="3" className="p-6 text-center text-sm text-gray-500">No denied items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="w-full md:w-80 lg:w-96 bg-gray-50 p-6 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col gap-4">
                <h3 className="font-semibold text-gray-800 text-lg">Inspect</h3>
                {selectedDeniedId ? (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="font-semibold text-gray-800">{(deniedRequests.find(r => r.id === selectedDeniedId) || {}).item || '-'}</p>
                    <p className="text-xs text-gray-500 mt-1">{(deniedRequests.find(r => r.id === selectedDeniedId) || {}).date || ''}</p>
                    {!!((deniedRequests.find(r => r.id === selectedDeniedId) || {}).brand) && (
                      <p className="text-xs text-gray-500">Brand: {(deniedRequests.find(r => r.id === selectedDeniedId) || {}).brand}</p>
                    )}
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm">Denied Reason</h4>
                      <textarea
                        value={(deniedRequests.find(r => r.id === selectedDeniedId) || {}).reason || ''}
                        readOnly
                        className="w-full bg-gray-50 rounded-lg border border-gray-300 p-3 min-h-[110px] text-sm text-gray-800 resize-none focus:outline-none cursor-default"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                    <p className="text-gray-500 text-sm">Select a denied item to inspect</p>
                  </div>
                )}
                <button
                  disabled={!selectedDeniedId || actionLoading}
                  onClick={() => {
                    if (!selectedDeniedId || actionLoading) return;
                    setActionLoading(true);
                    setTimeout(() => {
                      setActionLoading(false);
                      showToast('Appeal submitted. An admin will review your request.', 'info');
                      setIsOverdueOpen(false);
                    }, 800);
                  }}
                  className={`w-full py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all ${selectedDeniedId ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {actionLoading ? 'Submitting...' : 'Appeal'}
                </button>
              </div>
            </div>
            {/* Footer Close button removed as requested */}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg border-l-4 max-w-sm transform transition-all duration-300 ease-in-out ${
              toast.variant === 'success' 
                ? 'bg-green-50 border-green-400 text-green-800' 
                : toast.variant === 'error' 
                ? 'bg-red-50 border-red-400 text-red-800'
                : toast.variant === 'warning'
                ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                : 'bg-blue-50 border-blue-400 text-blue-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


export default EmployeeHome;