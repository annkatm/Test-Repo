import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const ReturnItems = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortOption, setSortOption] = useState("date-desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sample data
  const historyData = data;

  // Helper to normalize records
  const normalize = (r, idx = 0) => {
    const dateRaw = r?.return_date || r?.updated_at || r?.created_at || r?.date || null;
    let dateStr = "";
    try {
      dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "";
    } catch (_) {
      dateStr = String(dateRaw || "");
    }
    return {
      id: r?.id ?? r?.transaction_id ?? r?.request_id ?? r?.trx_id ?? r?.uuid ?? (idx + 1),
      date: dateStr,
      item: r?.equipment_name || r?.item || r?.title || r?.name || "Item",
      status: r?.status || (r?.return_date ? "Returned" : "Returned"),
    };
  };

  // Fetch all pages from a Laravel-style paginated endpoint
  const fetchAllPages = async (url) => {
    const out = [];
    let nextUrl = url;
    for (let i = 0; i < 20 && nextUrl; i++) { // hard limit to avoid infinite loops
      const res = await fetch(nextUrl, { credentials: 'same-origin' });
      const json = await res.json().catch(() => ({}));
      const list = Array.isArray(json)
        ? json
        : (Array.isArray(json?.data?.data) ? json.data.data : (Array.isArray(json?.data) ? json.data : []));
      out.push(...(list || []));
      nextUrl = json?.links?.next || json?.next_page_url || null;
    }
    return out;
  };

  const loadAllReturns = async () => {
    setLoading(true);
    setError("");
    try {
      // Primary: history filtered to returned
      let items = await fetchAllPages('/api/transactions/history?status=returned');
      if (!Array.isArray(items) || items.length === 0) {
        // Fallback: full history
        items = await fetchAllPages('/api/transactions/history');
      }
      if (!Array.isArray(items) || items.length === 0) {
        // Fallback: transactions then filter returned
        const all = await fetchAllPages('/api/transactions');
        items = (all || []).filter(r => String(r?.status || '').toLowerCase() === 'returned' || !!r?.return_date);
      }
      const mapped = (items || []).map((r, idx) => normalize(r, idx));
      setData(mapped);
    } catch (e) {
      setError("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Flush any queued returned items persisted by other views
    try {
      const raw = localStorage.getItem('employee_return_items_queue');
      const queued = raw ? JSON.parse(raw) : [];
      if (Array.isArray(queued) && queued.length > 0) {
        const normalized = queued.map((d, idx) => ({
          id: d.id || Date.now() + idx,
          date: d.date || new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
          item: d.item || d.equipment_name || "Item",
          status: d.status || "Returned",
        }));
        setData((prev) => {
          const existing = new Set((prev || []).map(x => String(x.id)));
          const merged = [
            ...normalized.filter(x => !existing.has(String(x.id))),
            ...(prev || [])
          ];
          return merged;
        });
        // Clear the queue after consuming
        localStorage.removeItem('employee_return_items_queue');
      }
    } catch (_) { }

    let cancelled = false;
    loadAllReturns();
    return () => { cancelled = true; };
  }, []);

  // React to in-app navigation-triggered returns: add returned item instantly
  useEffect(() => {
    const onReturnedAdd = (e) => {
      const d = e?.detail || {};
      console.log('[EmployeeReturnItems] Received ireply:returned:add event:', d);
      const entry = {
        id: d.id || Date.now(),
        date: d.date || new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
        item: d.item || d.equipment_name || "Item",
        status: d.status || "Returned",
      };
      console.log('[EmployeeReturnItems] Adding entry:', entry);
      setData((prev) => {
        const exists = (prev || []).some(item => String(item.id) === String(entry.id));
        if (exists) {
          console.log('[EmployeeReturnItems] Item already exists, skipping');
          return prev;
        }
        const updated = [entry, ...(prev || [])];
        console.log('[EmployeeReturnItems] Updated data:', updated);
        return updated;
      });
    };
    window.addEventListener('ireply:returned:add', onReturnedAdd);
    // Also refresh when other parts of the app indicate changes
    const onApprovedChanged = () => loadAllReturns();
    const onEquipmentRestore = () => loadAllReturns();
    window.addEventListener('ireply:approved:changed', onApprovedChanged);
    window.addEventListener('ireply:equipment:restore', onEquipmentRestore);
    console.log('[EmployeeReturnItems] Event listener registered for ireply:returned:add');
    return () => {
      window.removeEventListener('ireply:returned:add', onReturnedAdd);
      window.removeEventListener('ireply:approved:changed', onApprovedChanged);
      window.removeEventListener('ireply:equipment:restore', onEquipmentRestore);
      console.log('[EmployeeReturnItems] Event listener removed');
    };
  }, []);

  // 🔍 Filter by search term
  const filteredData = useMemo(() => {
    return (historyData || []).filter((item) =>
      String(item?.item || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [historyData, searchTerm]);

  // 🔃 Sort the data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (sortOption === "date-asc") return new Date(a.date) - new Date(b.date);
      if (sortOption === "date-desc") return new Date(b.date) - new Date(a.date);
      if (sortOption === "item-asc") return a.item.localeCompare(b.item);
      if (sortOption === "item-desc") return b.item.localeCompare(a.item);
      return 0;
    });
  }, [filteredData, sortOption]);

  // 📄 Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

  const handleChangePage = (page) => setCurrentPage(page);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-600">Return Items</h1>
        <button
          onClick={loadAllReturns}
          className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 border border-blue-600"
        >
          Refresh
        </button>
      </div>

      {/* 🔍 Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative w-full sm:w-1/2 md:w-1/3">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="item-asc">Item (A–Z)</option>
            <option value="item-desc">Item (Z–A)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 overflow-x-auto">
        {/* Table Header */}
        <div className="grid grid-cols-9 gap-6 pb-4 border-b border-gray-200 font-semibold text-gray-700 min-w-[640px]">
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Item</div>
          <div className="col-span-3">Status</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-100 min-w-[640px]">
          {loading ? (
            <p className="text-center py-6 text-gray-500">Loading...</p>
          ) : error ? (
            <p className="text-center py-6 text-red-500">{error}</p>
          ) : currentItems.length > 0 ? (
            currentItems.map((item, index) => (
              <div key={index} className="grid grid-cols-9 gap-6 py-3 items-center">
                <div className="col-span-3 text-sm text-gray-900">{item.date}</div>
                <div className="col-span-3 text-sm text-gray-900">{item.item}</div>
                <div className="col-span-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-6 text-gray-500">No items found.</p>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          {/* Previous Button */}
          <button
            onClick={() => handleChangePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page Numbers with Ellipsis */}
          {(() => {
            const pages = [];
            const maxVisible = 3;

            if (totalPages <= maxVisible + 2) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              if (currentPage <= maxVisible) {
                for (let i = 1; i <= maxVisible; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
              } else if (currentPage >= totalPages - maxVisible + 1) {
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - maxVisible + 1; i <= totalPages; i++)
                  pages.push(i);
              } else {
                pages.push(1);
                pages.push("...");
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push("...");
                pages.push(totalPages);
              }
            }

            return pages.map((p, index) =>
              p === "..." ? (
                <span key={index} className="px-2 text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={index}
                  onClick={() => handleChangePage(p)}
                  className={`px-3 py-1 border rounded-md text-sm font-medium transition-colors ${
                    currentPage === p
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-blue-100"
                  }`}
                >
                  {p}
                </button>
              )
            );
          })()}

          {/* Next Button */}
          <button
            onClick={() => handleChangePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Items per page */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700">Items per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              const v = e.target.value === 'all' ? (sortedData.length || 1) : Number(e.target.value);
              setItemsPerPage(v);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="all">All</option>
            {[5, 10, 15, 20, 30, 40, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default ReturnItems;
