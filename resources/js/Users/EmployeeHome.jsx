import React, { useState, useEffect, useMemo, useRef } from 'react';
import Echo from '../echo';
import { Laptop, X, RefreshCcw, ClipboardList, Mouse, FilePlus2 } from 'lucide-react';
import OnProcessTransactions from './OnProcessTransactions';
import ApprovedTransactions from './ApprovedTransactions';
import StatsCards from './StatsCards';
import RecentActivities from './RecentActivities';
import HistoryView from './HistoryView';

const EmployeeHome = () => {
  const [showExchangeConfirmModal, setShowExchangeConfirmModal] = useState(false);
  const [showBrowseLaptopsModal, setShowBrowseLaptopsModal] = useState(false);
  const [selectedLaptop, setSelectedLaptop] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Laptops');
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionStats, setTransactionStats] = useState({
    borrowed: 0,
    available: 0,
    overdue: 0
  });
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showPendings, setShowPendings] = useState(false);
  const [isDeniedModalOpen, setIsDeniedModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRow, setSelectedRow] = useState(1);
  const [currentView, setCurrentView] = useState('transactions');
  const [showHistory, setShowHistory] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Laptops');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [exchangeReason, setExchangeReason] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [sortOption, setSortOption] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [actionLoading, setActionLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  // Denied requests will be fetched from API
  const [deniedRequests, setDeniedRequests] = useState([]);
  // Toasts for upper-right popup notifications
  const [toasts, setToasts] = useState([]);
  const [isBorrowedOpen, setIsBorrowedOpen] = useState(false);
  const [isOverdueOpen, setIsOverdueOpen] = useState(false);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [overdueItems, setOverdueItems] = useState([]);
  // Track locally-cancelled requests to immediately hide them from On Process
  const [cancelledReqIds, setCancelledReqIds] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ireply_cancelled_req_ids') || '[]'); } catch (_) { return []; }
  });
  const [cancelledEquipIds, setCancelledEquipIds] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ireply_cancelled_equip_ids') || '[]'); } catch (_) { return []; }
  });

  const showToast = (message, variant = 'info', ttl = 4500) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, variant };
    setToasts((prev) => [toast, ...prev].slice(0, 6));
    // auto remove
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ttl);
  };

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
        if (within24h(when)) {
          derived.push({
            id: `deny:${r.id || when}`,
            item: r.item || 'Request',
            message: r.reason || 'Request denied',
            variant: 'denied',
            date: when,
            time: when,
          });
        }
      });
      if (derived.length === 0) return;
      setActivities((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        const map = new Map(base.map((x) => [String(x.id || x.message + String(x.time || x.date || '')), x]));
        derived.forEach((d) => {
          const k = String(d.id || d.message + String(d.time || d.date || ''));
          if (!map.has(k)) map.set(k, d);
        });
        const merged = Array.from(map.values())
          .sort((a, b) => new Date(b.time || b.date || 0) - new Date(a.time || a.date || 0))
          .slice(0, 50);
        try { localStorage.setItem('employee_activities', JSON.stringify(merged)); } catch (_) { }
        return merged;
      });
    } catch (_) { }
  }, [pendingTransactions, transactions, deniedRequests]);

  // Also compute a derived recent list on the fly for immediate rendering
  const recentCombined = useMemo(() => {
    try {
      const now = Date.now();
      const within24h = (iso) => {
        const ts = new Date(iso || Date.now()).getTime();
        return Number.isFinite(ts) ? (now - ts <= 24 * 60 * 60 * 1000) : false;
      };
      const list = [];
      (Array.isArray(pendingTransactions) ? pendingTransactions : []).forEach((t) => {
        const when = t.created_at || t.expected_start_date || t.date || t.time || new Date().toISOString();
        if (within24h(when)) list.push({ id: `req:${t.id || t.equipment_id || when}`, item: t.equipment_name || t.item || 'Request', message: 'Item requested', variant: 'request', date: when, time: when });
      });
      (Array.isArray(transactions) ? transactions : []).forEach((t) => {
        const s = String(t.status || '').toLowerCase();
        const when = t.created_at || t.expected_start_date || t.start_date || t.date || t.time || new Date().toISOString();
        if (/(approved|released|borrowed|active)/.test(s) && within24h(when)) list.push({ id: `appr:${t.id || t.equipment_id || when}`, item: t.equipment_name || t.item || 'Approved', message: 'Item approved', variant: 'approved', date: when, time: when });
        if (/(return|returned)/.test(s) && within24h(when)) list.push({ id: `ret:${t.id || t.equipment_id || when}`, item: t.equipment_name || t.item || 'Return', message: 'Item returned', variant: 'return', date: when, time: when });
        if (/(exchange|exchanged)/.test(s) && within24h(when)) list.push({ id: `ex:${t.id || t.equipment_id || when}`, item: t.equipment_name || t.item || 'Exchange', message: 'Item exchanged', variant: 'exchange', date: when, time: when });
      });
      (Array.isArray(deniedRequests) ? deniedRequests : []).forEach((r) => {
        const when = r.date || r.time || new Date().toISOString();
        if (within24h(when)) list.push({ id: `deny:${r.id || when}`, item: r.item || 'Request', message: r.reason || 'Request denied', variant: 'denied', date: when, time: when });
      });
      const base = Array.isArray(activities) ? activities : [];
      const map = new Map([...base, ...list].map((x) => [String(x.id || x.message + String(x.time || x.date || '')), x]));
      return Array.from(map.values()).sort((a, b) => new Date(b.time || b.date || 0) - new Date(a.time || a.date || 0));
    } catch (_) {
      return activities || [];
    }
  }, [activities, pendingTransactions, transactions, deniedRequests]);
  const [notificationCount, setNotificationCount] = useState(() => {
    try {
      const v = Number(localStorage.getItem('employee_history_unseen') || '0');
      return Number.isNaN(v) ? 0 : v;
    } catch (_e) {
      return 0;
    }
  });
  const prevHistoryLenRef = useRef(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('employee_activities') || '[]');
      if (Array.isArray(saved)) setActivities(saved);
    } catch (_) { }
  }, []);

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
      if (reqId) {
        setCancelledReqIds((prev) => {
          const next = Array.from(new Set([...(Array.isArray(prev) ? prev : []), String(reqId)]));
          try { sessionStorage.setItem('ireply_cancelled_req_ids', JSON.stringify(next)); } catch (_) {}
          return next;
        });
      }
      if (equipId) {
        setCancelledEquipIds((prev) => {
          const next = Array.from(new Set([...(Array.isArray(prev) ? prev : []), String(equipId)]));
          try { sessionStorage.setItem('ireply_cancelled_equip_ids', JSON.stringify(next)); } catch (_) {}
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
      try { showToast('Request cancelled', 'warning'); } catch (_) {}
      // Add a cancel activity for Recent panel
      try {
        const when = new Date().toISOString();
        const entry = {
          id: `cancel:${reqId || equipId || when}`,
          item: e?.detail?.equipment_name || e?.detail?.item || 'Request',
          message: 'Request cancelled',
          variant: 'cancel',
          date: when,
          time: when,
        };
        setActivities((prev) => {
          const base = Array.isArray(prev) ? prev : [];
          const map = new Map(base.map((x) => [String(x.id || x.message + String(x.time || x.date || '')), x]));
          const k = String(entry.id || entry.message + String(entry.time || entry.date || ''));
          if (!map.has(k)) map.set(k, entry);
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.time || b.date || 0) - new Date(a.time || a.date || 0)).slice(0, 50);
          try { localStorage.setItem('employee_activities', JSON.stringify(merged)); } catch (_) {}
          return merged;
        });
      } catch (_) {}
      // Fallback: refresh pending from server shortly after
      setTimeout(() => { try { fetchPendingTransactions(); } catch (_) {} }, 300);
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
      // Add a request activity for Recent panel
      try {
        const when = d.created_at || new Date().toISOString();
        const entry = {
          id: `req:${d.id || d.equipment_id || when}`,
          item: d.equipment_name || d.item || 'Request',
          message: 'Item requested',
          variant: 'request',
          date: when,
          time: when,
        };
        setActivities((prev) => {
          const base = Array.isArray(prev) ? prev : [];
          const map = new Map(base.map((x) => [String(x.id || x.message + String(x.time || x.date || '')), x]));
          const k = String(entry.id || entry.message + String(entry.time || entry.date || ''));
          if (!map.has(k)) map.set(k, entry);
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.time || b.date || 0) - new Date(a.time || a.date || 0)).slice(0, 50);
          try { localStorage.setItem('employee_activities', JSON.stringify(merged)); } catch (_) {}
          return merged;
        });
      } catch (_) {}
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
          showToast('Request approved!', 'success'); 
        } catch (_) {}
        
        // Add approved activity
        try {
          const when = new Date().toISOString();
          const entry = {
            id: `appr:${reqId || equipId || when}`,
            item: e?.detail?.equipment_name || e?.detail?.item || 'Request',
            message: 'Request approved',
            variant: 'approved',
            date: when,
            time: when,
          };
          setActivities((prev) => {
            const base = Array.isArray(prev) ? prev : [];
            const map = new Map(base.map((x) => [String(x.id || x.message + String(x.time || x.date || '')), x]));
            const k = String(entry.id || entry.message + String(entry.time || entry.date || ''));
            if (!map.has(k)) map.set(k, entry);
            const merged = Array.from(map.values()).sort((a, b) => new Date(b.time || b.date || 0) - new Date(a.time || a.date || 0)).slice(0, 50);
            try { localStorage.setItem('employee_activities', JSON.stringify(merged)); } catch (_) {}
            return merged;
          });
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
        
        // Add rejected activity
        try {
          const when = new Date().toISOString();
          const entry = {
            id: `rej:${reqId || equipId || when}`,
            item: e?.detail?.equipment_name || e?.detail?.item || 'Request',
            message: 'Request rejected',
            variant: 'denied',
            date: when,
            time: when,
          };
          setActivities((prev) => {
            const base = Array.isArray(prev) ? prev : [];
            const map = new Map(base.map((x) => [String(x.id || x.message + String(x.time || x.date || '')), x]));
            const k = String(entry.id || entry.message + String(entry.time || entry.date || ''));
            if (!map.has(k)) map.set(k, entry);
            const merged = Array.from(map.values()).sort((a, b) => new Date(b.time || b.date || 0) - new Date(a.time || a.date || 0)).slice(0, 50);
            try { localStorage.setItem('employee_activities', JSON.stringify(merged)); } catch (_) {}
            return merged;
          });
        } catch (_) {}
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

  const logActivity = (message, variant = 'info') => {
    const entry = { id: Date.now(), message, variant, time: new Date().toISOString() };
    setActivities((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      try { localStorage.setItem('employee_activities', JSON.stringify(next)); } catch (_) { }
      return next;
    });
  };

  // Increment the unseen history/notification counter and optionally append a local history/activity entry
  const incrementNotification = (count = 1, entry = null) => {
    setNotificationCount((prev) => {
      const next = prev + count;
      try { localStorage.setItem('employee_history_unseen', String(next)); } catch (_) { }
      return next;
    });

    if (entry) {
      // Prepend to activities and historyData locally so UI reflects it immediately
      setActivities((prev) => {
        const next = [entry, ...prev].slice(0, 50);
        try { localStorage.setItem('employee_activities', JSON.stringify(next)); } catch (_) { }
        return next;
      });
      setHistoryData((prev) => [entry, ...prev]);
    }
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

  const fetchOverdueItems = async () => {
    // Overdue concept disabled for Users: no expected/return dates used for calculations
    setOverdueItems([]);
    return [];
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
      // keep a log in activities
      setActivities((prev) => {
        const next = [entry, ...prev].slice(0, 50);
        try { localStorage.setItem('employee_activities', JSON.stringify(next)); } catch (_) { }
        return next;
      });
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

    const historyHandler = (e) => {
      const detail = e?.detail || {};
      if (!detail) return;
      const entry = {
        id: detail.id || Date.now(),
        item: detail.item || detail.message || detail.msg || 'History item',
        message: detail.message || detail.msg || detail.item || 'History item',
        variant: detail.variant || 'info',
        date: detail.date || new Date().toISOString(),
        time: detail.time || detail.date || new Date().toISOString(),
        local: true
      };
      // Append to local history and increment unseen
      incrementNotification(1, entry);
      showToast(entry.message || entry.item, entry.variant || 'info');
    };

    window.addEventListener('ireply:notify', notifyHandler);
    window.addEventListener('ireply:history', historyHandler);

    return () => {
      try { delete window.IReplyNotify; } catch (_) { }
      window.removeEventListener('ireply:notify', notifyHandler);
      window.removeEventListener('ireply:history', historyHandler);
    };
  }, []);

  const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); return `${d}d ago`;
  };

  // Helper to fetch recent activity entries
  const getRecentActivities = (limit = 10, filterVariant = null) => {
    const list = filterVariant ? activities.filter((a) => a.variant === filterVariant) : activities;
    return list.slice(0, Math.max(0, limit));
  };

  // History data will be fetched from API
  const [historyData, setHistoryData] = useState([]);

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
          item: r.equipment_name || r.item || r.items || r.title || 'Request',
          brand: r.brand || '',
          model: r.model || '',
          status: 'Denied',
          reason: r.denial_reason || r.reason || 'No reason provided'
        }));
        setDeniedRequests(mapped);
        return mapped;
      } else {
        // Set to empty array if no data
        setDeniedRequests([]);
        return [];
      }
    } catch (e) {
      console.error('Failed to fetch denied requests', e);
      setDeniedRequests([]);
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

  // 🔍 Filter by search term
  const filteredData = useMemo(() => {
    return historyData.filter((item) =>
      (item?.item || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [historyData, searchTerm]);

  // 🔃 Sort the data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (sortOption === "date-asc") return new Date(a.date) - new Date(b.date);
      if (sortOption === "date-desc") return new Date(b.date) - new Date(a.date);
      if (sortOption === "item-asc") return (a?.item || '').localeCompare(b?.item || '');
      if (sortOption === "item-desc") return (b?.item || '').localeCompare(a?.item || '');
      return 0;
    });
  }, [filteredData, sortOption]);

  // 📄 Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

  const handleChangePage = (page) => setCurrentPage(page);



  const handleReasonChange = (e) => {
    if (selectedRequest) {
      setDeniedRequests(deniedRequests.map(request =>
        request.id === selectedRequest.id
          ? { ...request, reason: e.target.value }
          : request
      ));
      setSelectedRequest({ ...selectedRequest, reason: e.target.value });
    }
  };

  // Approved transactions will be fetched from API
  const [approvedTransactions, setApprovedTransactions] = useState([]);

  // Equipment data will be fetched from API
  const [laptopBrands, setLaptopBrands] = useState([]);
  const [exchangeItems, setExchangeItems] = useState([]);

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
      console.log('[EmployeeHome] Fetching pending transactions...');
      
      // Get current user/employee info to filter requests
      const currentEmployeeId = await (async () => {
        try {
          const userRes = await fetch('/check-auth', { credentials: 'same-origin' });
          const userData = await userRes.json();
          console.log('[EmployeeHome] User data:', userData);
          
          if (userData?.authenticated && userData?.user?.employee_id) {
            const raw = userData.user.employee_id;
            const numId = Number(raw);
            if (Number.isFinite(numId) && String(numId) !== '0') {
              console.log('[EmployeeHome] Using numeric employee_id from user:', numId);
              return numId;
            }
            console.log('[EmployeeHome] Non-numeric employee_id in user profile, will resolve via employees API:', raw);
          }
          
          // Fallback: try to get employee by user_id
          if (userData?.authenticated && userData?.user?.id) {
            console.log('[EmployeeHome] Looking up employee by user_id:', userData.user.id);
            const empRes = await fetch(`/api/employees?user_id=${userData.user.id}`);
            const empData = await empRes.json();
            const employees = Array.isArray(empData) ? empData : (Array.isArray(empData?.data) ? empData.data : []);
            console.log('[EmployeeHome] Found employees:', employees);
            if (employees.length > 0) {
              console.log('[EmployeeHome] Using employee ID:', employees[0].id);
              return employees[0].id;
            }
          }
        } catch (e) {
          console.error('[EmployeeHome] Error getting employee ID:', e);
        }
        return null;
      })();

      console.log('[EmployeeHome] Current employee ID:', currentEmployeeId);

      // Fetch pending requests for current employee when possible
      let list = [];
      try {
        const url = currentEmployeeId
          ? `/api/requests?status=pending&employee_id=${encodeURIComponent(currentEmployeeId)}`
          : '/api/requests?status=pending';
        const response = await fetch(url, { credentials: 'same-origin' });
        const data = await response.json();
        console.log('[EmployeeHome] API response:', data);
        
        if (data && Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.data)) list = data.data;
        
        console.log('[EmployeeHome] Raw pending list:', list.length, 'items');
      } catch (e) {
        console.error('[EmployeeHome] Error fetching pending requests:', e);
      }

      // Fallback: fetch all requests and filter to pending-like statuses
      if (!Array.isArray(list) || list.length === 0) {
        try {
          const res2 = await fetch('/api/requests', { credentials: 'same-origin' });
          const j2 = await res2.json();
          const all = Array.isArray(j2) ? j2 : (Array.isArray(j2?.data) ? j2.data : []);
          const pendingLike = (all || []).filter((r) => {
            const s = String(r?.status || '').toLowerCase();
            return /(pending|processing|in\s*process|in_process|awaiting|waiting|review|on\s*process|requested|submitted|open)/.test(s);
          });
          list = pendingLike;
          console.log('[EmployeeHome] Fallback found:', list.length, 'pending items');
        } catch (e) {
          console.error('[EmployeeHome] Error in fallback fetch:', e);
        }
      }
      
      // Filter by current employee if we have the ID
      if (currentEmployeeId && list.length > 0) {
        const beforeFilter = list.length;
        list = list.filter(r => String(r?.employee_id) === String(currentEmployeeId));
        console.log('[EmployeeHome] Filtered from', beforeFilter, 'to', list.length, 'for employee', currentEmployeeId);
      } else if (!currentEmployeeId && list.length > 0) {
        console.warn('[EmployeeHome] No employee ID - showing all pending requests');
      }

      // Map minimal fields expected by UI
      const mapped = (Array.isArray(list) ? list : []).map((t, index) => ({
        id: t?.id || index + 1,
        created_at: t?.created_at || t?.date || null,
        expected_start_date: t?.expected_start_date || t?.start_date || t?.requested_start || t?.start || null,
        expected_end_date: t?.expected_end_date || t?.return_date || t?.due_date || t?.expected_return_date || t?.end || null,
        item: t?.equipment_name || t?.item || t?.name || '-',
        equipment_name: t?.equipment_name || t?.item || t?.name || '-',
        status: t?.status || 'Pending',
        equipment_id: t?.equipment_id || t?.equipment?.id || t?.item_id || null,
        equipment: t?.equipment || t?.equipment_details || t?.equipment_info || null,
        type: t?.type || t?.category || t?.category_name || t?.equipment_type || t?.item_type || (t?.equipment && (t?.equipment.type || t?.equipment.category || t?.equipment.category_name)) || null,
      }));

      console.log('[EmployeeHome] Final pending transactions (server):', mapped.length, 'items', mapped);
      // Merge with any locally-added entries (e.g., from ireply:request:created) to avoid flicker/disappear
      setPendingTransactions((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        const merged = [...mapped, ...base];
        const seen = new Set();
        const deduped = [];
        for (const r of merged) {
          const key = `${String(r?.id ?? '')}::${String(r?.equipment_id ?? '')}`;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(r);
        }
        return deduped;
      });
      
      // Clean up stale cancelled IDs - if a request ID is in cancelled list but not in pending list, remove it
      const currentPendingIds = new Set(mapped.map(t => String(t.id)));
      const currentEquipIds = new Set(mapped.map(t => String(t.equipment_id)).filter(Boolean));
      
      setCancelledReqIds(prev => {
        const cleaned = prev.filter(id => currentPendingIds.has(String(id)));
        if (cleaned.length !== prev.length) {
          console.log('[EmployeeHome] Cleaned stale cancelled request IDs from', prev.length, 'to', cleaned.length);
          try { sessionStorage.setItem('ireply_cancelled_req_ids', JSON.stringify(cleaned)); } catch (_) {}
        }
        return cleaned;
      });
      
      setCancelledEquipIds(prev => {
        const cleaned = prev.filter(id => currentEquipIds.has(String(id)));
        if (cleaned.length !== prev.length) {
          console.log('[EmployeeHome] Cleaned stale cancelled equipment IDs from', prev.length, 'to', cleaned.length);
          try { sessionStorage.setItem('ireply_cancelled_equip_ids', JSON.stringify(cleaned)); } catch (_) {}
        }
        return cleaned;
      });
    } catch (error) {
      console.error('[EmployeeHome] Failed to fetch pending requests:', error);
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

  const fetchTransactionHistory = async () => {
    try {
      const response = await fetch('/api/transactions/history');
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        // Merge server history with any local-only entries we have in historyData
        setHistoryData((prevLocal) => {
          const server = data.data || [];
          // Keep local entries that are marked as local or have ids not found in server
          const localOnly = (prevLocal || []).filter((h) => {
            if (!h) return false;
            // if item has a flag local === true keep it
            if (h.local) return true;
            // if id is missing or not present in server, keep it
            if (!h.id) return true;
            return !server.some((s) => String(s.id) === String(h.id));
          });

          const merged = [...localOnly, ...server];
          try { prevHistoryLenRef.current = Array.isArray(merged) ? merged.length : 0; } catch (_) { }
          return merged;
        });
        return data.data;
      } else {
        // keep local entries if server returns no data
        setHistoryData((prev) => prev || []);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      // keep local entries on error
      setHistoryData((prev) => prev || []);
      return [];
    }
  };

  // Poll history endpoint periodically to detect new history entries
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const data = await fetchTransactionHistory();
        if (stopped) return;
        const prevLen = prevHistoryLenRef.current || 0;
        const newLen = Array.isArray(data) ? data.length : 0;
        // If more items than previous length, increment notification by difference
        if (newLen > prevLen) {
          const diff = newLen - prevLen;
          incrementNotification(diff, null);
        }
        prevHistoryLenRef.current = newLen;
      } catch (e) {
        // ignore polling errors
      }
    };

    // initial check
    check();
    const iv = setInterval(check, 30000); // every 30s

    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    const loadTransactionData = async () => {
      await fetchTransactionStats();
      await fetchPendingTransactions();
      await fetchApprovedTransactions();
      const initialHistory = await fetchTransactionHistory();
      // Set the previous history length so the polling doesn't treat existing items as new
      prevHistoryLenRef.current = Array.isArray(initialHistory) ? initialHistory.length : 0;
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

  const handleRowClick = (request) => {
    setSelectedRequest(request);
  };

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


  // ===== HISTORY VIEW =====
  if (showHistory) {
    return (
      <HistoryView
        onBack={() => setShowHistory(false)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        sortedData={currentItems}
        logActivity={logActivity}
      />
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
        status: t?.status || 'Pending',
        details: [
          {
            name: t?.equipment_name || t?.item || '-',
            description: t?.description || '',
            icon: 'https://cdn-icons-png.flaticon.com/512/1086/1086933.png',
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
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="col-span-12 md:col-span-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-[#2262C6] transition-all duration-300">Home</h1>
        </div>

        <StatsCards 
          transactionStats={transactionStats} 
          onBorrowedClick={async () => { await fetchBorrowedItems(); setIsBorrowedOpen(true); }} 
          onOverdueClick={async () => { await fetchOverdueItems(); setIsOverdueOpen(true); }} 
        />


        <div className="bg-gray-100 rounded-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#2262C6]">On Process</h2>
              <button
                onClick={async () => {
                  await fetchDeniedRequests(); // Refresh denied requests immediately
                  await fetchPendingTransactions(); // Ensure fresh pending data for the full view
                  logActivity('Opened On Process view', 'info');
                  setShowPendings(true);
                }}
                className="text-right text-blue-600 text-sm font-medium hover:text-blue-700">
                View all
              </button>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-6 text-sm font-medium text-gray-700">
              <div className="col-span-4">Item</div>
              <div className="col-span-4">Start Date</div>
              <div className="col-span-4">Status</div>
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
              .slice(0, 3)
              .map((transaction, index) => (
              <div
                key={transaction.id || index}
                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => logActivity(`Clicked pending row: ${transaction.equipment_name || transaction.item || 'Item'} (${transaction.id || index})`, 'info')}
              >
                <div className="grid grid-cols-12 gap-6 items-center">
                  <div className="col-span-4">
                    <span className="text-sm text-gray-900">
                      {transaction.type || transaction.category || transaction.category_name || transaction.equipment_type || transaction.item_type || transaction?.equipment?.type || transaction?.equipment?.category || transaction?.equipment?.category_name || transaction.item || transaction.equipment_name || transaction?.equipment?.name || '-'}
                    </span>
                  </div>
                  <div className="col-span-4">
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
                  <div className="col-span-4">
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

        <div className="bg-gray-100 rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#2262C6]">Approved</h2>
              <button
                onClick={async () => {
                  setSelectedRow(null);
                  await fetchApprovedTransactions();
                  setCurrentView('approved');
                  logActivity('Opened Approved view', 'info');
                }}
                className="text-right text-blue-600 text-sm font-medium hover:text-blue-700">
                View all
              </button>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-6 text-sm font-medium text-gray-700">
              <div className="col-span-4">Item</div>
              <div className="col-span-4">Start Date</div>
              <div className="col-span-4">Status</div>
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
              const useList = (filtered.length > 0 ? filtered : sorted).slice(0, 3);
              return useList.map((transaction, index) => (
                <div
                  key={transaction.id || index}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => logActivity(`Clicked approved row: ${transaction.equipment_name || transaction.item || 'Item'} (${transaction.id || index})`, 'info')}
                >
                  <div className="grid grid-cols-12 gap-6 items-center">
                    <div className="col-span-4">
                      <span className="text-sm text-gray-900">
                        {transaction.type || transaction.category || transaction.category_name || transaction.equipment_type || transaction.item_type || transaction?.equipment?.type || transaction?.equipment?.category || transaction?.equipment?.category_name || transaction.item || transaction.equipment_name || transaction?.equipment?.name || '-'}
                      </span>
                    </div>
                    <div className="col-span-4">
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
                    <div className="col-span-4">
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
              <></>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-12 md:col-span-4 space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => {
              logActivity('Opened History', 'info');
              // Reset unseen counter when user opens history
              try { localStorage.setItem('employee_history_unseen', '0'); } catch (_) { }
              setNotificationCount(0);
              // Force refetch history to show latest
              fetchTransactionHistory();
              setShowHistory(true);
            }}
            className="relative flex items-center justify-center bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 shadow-md shadow-gray-400/60 hover:shadow-lg hover:shadow-gray-500/70 hover:-translate-y-1 transition-all duration-300 active:translate-y-0 active:shadow-sm w-full sm:w-auto"
          >
            History

            {/* Notification Badge */}
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md shadow-red-700/70">
              <span className="text-white text-xs font-bold">{notificationCount > 99 ? '99+' : notificationCount}</span>
            </div>
          </button>
        </div>

        <RecentActivities activities={recentCombined} iconFor={iconFor} timeAgo={timeAgo} />
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
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Overdue Items</h2>
              <button
                onClick={() => setIsOverdueOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(overdueItems || []).map((it, i) => (
                  <div key={it.id || i} className="border border-gray-200 rounded-lg p-3">
                    <div className="font-semibold text-gray-900">{it.equipment_name || it.item || '-'}</div>
                  </div>
                ))}
                {(!overdueItems || overdueItems.length === 0) && (
                  <div className="text-sm text-gray-500">No overdue items</div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 text-right">
              <button
                onClick={() => setIsOverdueOpen(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default EmployeeHome;
