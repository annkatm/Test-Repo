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
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [selectedDeniedId, setSelectedDeniedId] = useState(null);
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
        list.push({ id: `deny:${r.id || when}`, item: r.item || 'Request', message: r.reason || 'Request denied', variant: 'denied', date: when, time: when });
      });
      const base = Array.isArray(activities) ? activities : [];
      const map = new Map([...base, ...list].map((x) => [String(x.id || x.message + String(x.time || x.date || '')), x]));
      return Array.from(map.values()).sort((a, b) => new Date(b.time || b.date || 0) - new Date(a.time || a.date || 0));
    } catch (_) {
      return activities || [];
    }
  }, [activities, pendingTransactions, transactions, deniedRequests]);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Load notification count when employeeId is available
  useEffect(() => {
    if (currentEmployeeId) {
      try {
        const key = `employee_history_unseen_emp_${currentEmployeeId}`;
        const v = Number(localStorage.getItem(key) || '0');
        setNotificationCount(Number.isNaN(v) ? 0 : v);
      } catch (_e) {
        setNotificationCount(0);
      }
    }
  }, [currentEmployeeId]);
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
      const key = currentEmployeeId ? `employee_history_unseen_emp_${currentEmployeeId}` : 'employee_history_unseen';
      try { localStorage.setItem(key, String(next)); } catch (_) { }
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
      
      // First, try to get data from our new dashboard stats endpoint
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            // Get detailed borrowed items from employees with issued items
            const employeesRes = await fetch('/api/employees');
            const employeesData = await employeesRes.json();
            
            if (employeesData.success && Array.isArray(employeesData.data)) {
              const employeesWithItems = employeesData.data.filter(emp => 
                emp.issued_item && emp.issued_item !== '' && emp.issued_item !== '[]'
              );
              
              // Extract all issued items from employees
              const allIssuedItems = [];
              employeesWithItems.forEach(emp => {
                try {
                  const issuedItems = JSON.parse(emp.issued_item);
                  if (Array.isArray(issuedItems)) {
                    issuedItems.forEach(item => {
                      allIssuedItems.push({
                        id: item.id || Date.now() + Math.random(),
                        equipment_name: item.name || item.brand || 'Unknown Item',
                        item: item.name || item.brand || 'Unknown Item',
                        brand: item.brand || '',
                        specifications: item.specs || item.specifications || '',
                        employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                        employee_id: emp.id,
                        category_name: item.category?.name || 'Uncategorized',
                        status: 'borrowed'
                      });
                    });
                  }
                } catch (e) {
                  console.error('Error parsing issued items for employee:', emp.id, e);
                }
              });
              
              list = allIssuedItems;
            }
          }
        }
      } catch (e) {
        console.error('Error fetching from dashboard stats:', e);
      }

      // Fallback to original methods if no items found
      if (!Array.isArray(list) || list.length === 0) {
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
      }

      setBorrowedItems(list);
      
      // Update transaction stats to reflect the actual count
      setTransactionStats(prev => ({
        ...prev,
        borrowed: list.length
      }));
      
      return list;
    } catch (error) {
      console.error('Error in fetchBorrowedItems:', error);
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
        status: t?.status || 'Pending',
      }));

      setPendingTransactions((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        const merged = [...mapped, ...base];
        const seen = new Set();
        const deduped = [];
        for (const r of merged) {
          const key = `${String(r?.id ?? '')}::${String(r?.equipment_id ?? '')}`;
          if (!seen.has(key)) { seen.add(key); deduped.push(r); }
        }
        return deduped;
      });
    } catch (e) {
      console.error('[EmployeeHome] Failed to fetch pending transactions', e);
      setPendingTransactions([]);
    }
  };

  const fetchApprovedTransactions = async () => {
    try {
      // Get current employee ID first
      const currentEmployeeId = await getCurrentEmployeeId();
      
      if (currentEmployeeId) {
        // Fetch employee-specific history
        try {
          const res = await fetch(`/api/employees/${currentEmployeeId}/history`, { credentials: 'same-origin' });
          const data = await res.json();
          
          if (data.success) {
            // Use current items from employee record as approved/borrowed items
            const currentItems = data.data.current_items || [];
            const transactionHistory = data.data.transaction_history || [];
            
            // Transform current items to match expected format
            const approvedItems = currentItems.map((item, index) => ({
              id: item.id || index,
              equipment_id: item.id,
              equipment_name: item.name || item.brand || 'Unknown Item',
              item: item.name || item.brand || 'Unknown Item',
              brand: item.brand || '',
              specifications: item.specs || item.specifications || '',
              category_name: item.category?.name || 'Uncategorized',
              status: 'borrowed',
              created_at: new Date().toISOString(),
              expected_start_date: new Date().toISOString(),
              can_return: true // Flag to show return button
            }));
            
            setTransactions(approvedItems);
            setTransactionStats(prev => ({ ...prev, borrowed: approvedItems.length }));
            
            console.log('[EmployeeHome] Employee-specific approved items:', approvedItems);
            return approvedItems;
          }
        } catch (e) {
          console.error('Error fetching employee history:', e);
        }
      }

      // Fallback to original logic if employee-specific fetch fails
      const respApproved = await fetch('/api/transactions/approved', { credentials: 'same-origin' });
      const jsonApproved = await respApproved.json().catch(() => ({}));
      const listApproved = Array.isArray(jsonApproved)
        ? jsonApproved
        : (Array.isArray(jsonApproved?.data)
          ? jsonApproved.data
          : (Array.isArray(jsonApproved?.data?.data) ? jsonApproved.data.data : []));

      // Filter for current employee if we have the ID
      let filtered = listApproved;
      if (currentEmployeeId) {
        filtered = listApproved.filter(t => 
          String(t.employee_id || '') === String(currentEmployeeId)
        );
      }

      const finalList = Array.isArray(filtered) ? filtered : [];
      setTransactions(finalList);
      setTransactionStats(prev => ({ ...prev, borrowed: finalList.length }));
      
      return finalList;
    } catch (error) {
      console.error('Failed to fetch approved transactions:', error);
      setTransactions([]);
      return [];
    }
  };

  // Helper function to get current employee ID
  const getCurrentEmployeeId = async () => {
    try {
      const userRes = await fetch('/check-auth', { credentials: 'same-origin' });
      const userData = await userRes.json();
      const user = userData?.user || {};
      
      if (userData?.authenticated && user?.employee_id) {
        const n = Number(user.employee_id);
        if (Number.isFinite(n) && String(n) !== '0') return n;
      }
      
      if (userData?.authenticated && user?.linked_employee_id) {
        return user.linked_employee_id;
      }
      
      if (userData?.authenticated && user?.id) {
        const empRes = await fetch(`/api/employees?user_id=${user.id}`);
        const empData = await empRes.json();
        const employees = Array.isArray(empData) ? empData : (Array.isArray(empData?.data) ? empData.data : []);
        if (employees.length > 0) return employees[0].id;
      }
      
      // Try to find by email
      if (userData?.authenticated && user?.email) {
        const allRes = await fetch('/api/employees', { credentials: 'same-origin' });
        const all = await allRes.json();
        const list = Array.isArray(all) ? all : (Array.isArray(all?.data) ? all.data : []);
        const byEmail = list.find(e => (e.email || '').toLowerCase() === String(user.email).toLowerCase());
        if (byEmail) return byEmail.id;
      }
      
      return null;
    } catch (e) {
      console.error('Error getting current employee ID:', e);
      return null;
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

        // Store employeeId in state for history separation
        if (employeeId) {
          setCurrentEmployeeId(employeeId);
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

  // Return item functionality
  const handleReturnItem = async (equipmentId, equipmentName) => {
    try {
      const currentEmployeeId = await getCurrentEmployeeId();
      if (!currentEmployeeId) {
        showToast('Unable to identify current employee', 'error');
        return;
      }

      const confirmed = window.confirm(`Are you sure you want to return "${equipmentName}"?`);
      if (!confirmed) return;

      setActionLoading(true);

      const response = await fetch(`/api/employees/${currentEmployeeId}/return-item`, {
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
          notes: 'Returned via employee portal'
        })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Item returned successfully!', 'success');
        
        // Refresh the approved transactions to reflect the return
        await fetchApprovedTransactions();
        
        // Refresh borrowed items count
        await fetchBorrowedItems();
        
        // Log the activity
        logActivity(`Returned item: ${equipmentName}`, 'return');
        
        // Dispatch events to update other components
        window.dispatchEvent(new Event('equipment:updated'));
        window.dispatchEvent(new Event('employee:updated'));
        
      } else {
        showToast(data.message || 'Failed to return item', 'error');
      }
    } catch (error) {
      console.error('Error returning item:', error);
      showToast('Failed to return item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Global return handler for ApprovedTransactions component
  window.handleEmployeeReturn = handleReturnItem;

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
        employeeId={currentEmployeeId}
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
        onReturnItem={handleReturnItem}
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
      <style>
        {`
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}
      </style>
      <div className="col-span-12 md:col-span-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-[#2262C6] transition-all duration-300">Home</h1>
        </div>

        <StatsCards 
          transactionStats={transactionStats} 
          onBorrowedClick={async () => { 
            console.log('Fetching borrowed items...');
            const items = await fetchBorrowedItems(); 
            console.log('Fetched items:', items);
            setIsBorrowedOpen(true); 
          }} 
          onOverdueClick={async () => { await fetchDeniedRequests(); setSelectedDeniedId(null); setIsOverdueOpen(true); }} 
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
              const key = currentEmployeeId ? `employee_history_unseen_emp_${currentEmployeeId}` : 'employee_history_unseen';
              try { localStorage.setItem(key, '0'); } catch (_) { }
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

        <RecentActivities activities={recentCombined} iconFor={iconFor} timeAgo={timeAgo} employeeId={currentEmployeeId} />
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
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">📦</div>
                <div>
                  <div className="font-semibold text-gray-900">Currently Borrowed</div>
                  <div className="text-sm text-gray-600">Total items: {borrowedItems?.length || 0}</div>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(borrowedItems || []).map((it, i) => (
                  <div key={it.id || i} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{it.equipment_name || it.item || 'Unknown Item'}</div>
                        {it.brand && (
                          <div className="text-xs text-gray-500 mt-1">Brand: {it.brand}</div>
                        )}
                        {it.specifications && (
                          <div className="text-xs text-gray-500 mt-1">Specs: {it.specifications}</div>
                        )}
                        {it.employee_name && (
                          <div className="text-xs text-blue-600 mt-1">Assigned to: {it.employee_name}</div>
                        )}
                        {it.category_name && (
                          <div className="text-xs text-gray-500 mt-1">Category: {it.category_name}</div>
                        )}
                      </div>
                      <div className="ml-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Borrowed
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!borrowedItems || borrowedItems.length === 0) && (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">📦</div>
                    <div className="text-sm text-gray-500 font-medium">No borrowed items found</div>
                    <div className="text-xs text-gray-400 mt-1">Items will appear here when they are issued to employees</div>
                  </div>
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
    </div>
  );
};


export default EmployeeHome;
