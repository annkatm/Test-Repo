import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const ReturnItems = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortOption, setSortOption] = useState("date-desc");
  const [searchTerm, setSearchTerm] = useState("");

  // Sample data
  const historyData = [
  { date: "2025-10-01", item: "Laptop", status: "Approved" },
  { date: "2025-10-02", item: "Projector", status: "Approved" },
  { date: "2025-10-03", item: "Mouse", status: "Approved" },
  { date: "2025-10-04", item: "Keyboard", status: "Approved" },
  { date: "2025-10-05", item: "Monitor", status: "Approved" },
  { date: "2025-10-06", item: "HDMI Cable", status: "Approved" },
  { date: "2025-10-07", item: "Speaker", status: "Approved" },
  { date: "2025-10-08", item: "Tablet", status: "Approved" },
  { date: "2025-10-09", item: "Charger", status: "Approved" },
  { date: "2025-10-10", item: "Camera", status: "Approved" },
  { date: "2025-10-11", item: "Router", status: "Approved" },
  { date: "2025-10-12", item: "Microphone", status: "Approved" },
  { date: "2025-10-13", item: "Webcam", status: "Approved" },
  { date: "2025-10-14", item: "Extension Cord", status: "Approved" },
  { date: "2025-10-15", item: "USB Hub", status: "Approved" },
  { date: "2025-10-16", item: "Flash Drive", status: "Approved" },
  { date: "2025-10-17", item: "Ethernet Cable", status: "Approved" },
  { date: "2025-10-18", item: "Smartwatch", status: "Approved" },
  { date: "2025-10-19", item: "Tripod", status: "Approved" },
  { date: "2025-10-20", item: "Headphones", status: "Approved" },
  { date: "2025-10-21", item: "Power Bank", status: "Approved" },
  { date: "2025-10-22", item: "Printer", status: "Approved" },
  { date: "2025-10-23", item: "Scanner", status: "Approved" },
  { date: "2025-10-24", item: "Drawing Tablet", status: "Approved" },
  { date: "2025-10-25", item: "VR Headset", status: "Approved" },
  { date: "2025-10-26", item: "Game Controller", status: "Approved" },
  { date: "2025-10-27", item: "Smart TV", status: "Approved" },
  { date: "2025-10-28", item: "LED Light", status: "Approved" },
  { date: "2025-10-29", item: "Bluetooth Adapter", status: "Approved" },
  { date: "2025-10-30", item: "External Hard Drive", status: "Approved" },
  { date: "2025-10-31", item: "Graphics Card", status: "Approved" },
  { date: "2025-11-01", item: "SSD", status: "Approved" },
  { date: "2025-11-02", item: "RAM Module", status: "Approved" },
  { date: "2025-11-03", item: "Motherboard", status: "Approved" },
  { date: "2025-11-04", item: "Processor", status: "Approved" },
  { date: "2025-11-05", item: "Cooling Fan", status: "Approved" },
  { date: "2025-11-06", item: "Power Supply", status: "Approved" },
  { date: "2025-11-07", item: "Desktop Case", status: "Approved" },
  { date: "2025-11-08", item: "Laptop Stand", status: "Approved" },
  { date: "2025-11-09", item: "Wireless Mouse", status: "Approved" },
  { date: "2025-11-10", item: "Wireless Keyboard", status: "Approved" },
  { date: "2025-11-11", item: "HDMI Splitter", status: "Approved" },
  { date: "2025-11-12", item: "Surge Protector", status: "Approved" },
  { date: "2025-11-13", item: "Laptop Bag", status: "Approved" },
  { date: "2025-11-14", item: "Monitor Arm", status: "Approved" },
  { date: "2025-11-15", item: "Cable Organizer", status: "Approved" },
  { date: "2025-11-16", item: "Projector Screen", status: "Approved" },
  { date: "2025-11-17", item: "Smart Plug", status: "Approved" },
  { date: "2025-11-18", item: "NAS Storage", status: "Approved" },
  { date: "2025-11-19", item: "Docking Station", status: "Approved" },
  { date: "2025-11-20", item: "UPS Battery", status: "Approved" },
  ];

  // 🔍 Filter by search term
  const filteredData = useMemo(() => {
    return historyData.filter((item) =>
      item.item.toLowerCase().includes(searchTerm.toLowerCase())
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
          {currentItems.length > 0 ? (
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
<div className="flex items-center justify-center mt-6 space-x-2">
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

  {/* Items per page */}
  <div className="flex items-center space-x-2 ml-4">
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