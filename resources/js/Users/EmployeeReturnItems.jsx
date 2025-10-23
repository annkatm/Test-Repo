import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getCurrentUserEmployeeId } from '../utils/userUtils';

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

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const employeeId = await getCurrentUserEmployeeId();
        if (!employeeId) {
          setData([]);
          return;
        }

        let url = `/api/transactions/history?status=returned&employee_id=${employeeId}`;
        let res = await fetch(url);
        let json = await res.json().catch(() => ({}));
        let list = Array.isArray(json) ? json : (json && json.data && Array.isArray(json.data) ? json.data : []);

        if (!Array.isArray(list) || list.length === 0) {
          url = `/api/transactions/history?employee_id=${employeeId}`;
          res = await fetch(url);
          json = await res.json().catch(() => ({}));
          list = Array.isArray(json) ? json : (json && json.data && Array.isArray(json.data) ? json.data : []);
        }

        const mapped = (list || []).map((r, idx) => {
          const dateRaw = r?.return_date || r?.updated_at || r?.created_at || r?.date || null;
          let dateStr = "";
          try {
            dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "";
          } catch (_) {
            dateStr = String(dateRaw || "");
          }
          return {
            id: r?.id ?? idx + 1,
            date: dateStr,
            item: r?.equipment_name || r?.item || r?.title || "Item",
            status: r?.status || (r?.return_date ? "Returned" : "Returned"),
          };
        });

        if (!cancelled) setData(mapped);
      } catch (e) {
        if (!cancelled) setError("Failed to load items");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // React to in-app navigation-triggered returns: add returned item instantly
  useEffect(() => {
    const onReturnedAdd = (e) => {
      const d = e?.detail || {};
      const entry = {
        id: d.id || Date.now(),
        date: d.date || new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
        item: d.item || "Item",
        status: "Returned",
      };
      setData((prev) => [entry, ...(prev || [])]);
    };
    window.addEventListener('ireply:returned:add', onReturnedAdd);
    return () => window.removeEventListener('ireply:returned:add', onReturnedAdd);
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
      </div>

      {/* 🔍 Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-1/3">
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
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
        {/* Table Header */}
        <div className="grid grid-cols-9 gap-6 pb-4 border-b border-gray-200 font-semibold text-gray-700">
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Item</div>
          <div className="col-span-3">Status</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-100">
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
      <div className="flex items-center justify-between mt-6">
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
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            {[5, 10, 15, 20, 30, 40, 50].map((n) => (
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