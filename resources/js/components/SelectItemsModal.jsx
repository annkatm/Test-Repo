import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, CheckSquare, Square } from 'lucide-react';

const normalizeItem = (item = {}) => {
  const equipment = item.equipment || {};
  const category =
    item.category_name ||
    item.category ||
    equipment.category_name ||
    equipment.category?.name ||
    'Uncategorized';

  const serialNumber =
    item.serial_number ||
    item.equipment_serial_number ||
    item.serial ||
    item.asset_tag ||
    equipment.serial_number ||
    'N/A';

  return {
    ...item,
    equipment_name: item.equipment_name || item.name || equipment.name || 'Unknown Item',
    brand: item.brand || equipment.brand || 'N/A',
    model: item.model || equipment.model || '',
    category_name: category,
    serial_number: serialNumber,
    specifications:
      item.specifications ||
      item.specs ||
      equipment.specifications ||
      [item.brand || equipment.brand, item.model || equipment.model]
        .filter(Boolean)
        .join(' ') ||
      '',
    date_released: item.date_released || item.release_date || item.released_at || item.created_at || null,
    date_returned: item.date_returned || item.return_date || item.returned_at || null
  };
};

const getItemKey = (item = {}) => {
  const equipmentId = item.equipment_id || item.id || item.requestId || 'unknown';
  const serial = item.serial_number || item.equipment_serial_number || item.asset_tag || 'na';
  return `${equipmentId}-${serial}`;
};

const SelectItemsModal = ({ isOpen, onClose, transactionData, onConfirm }) => {
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const items = useMemo(() => {
    if (!transactionData) return [];

    const candidateLists = [
      transactionData.items,
      transactionData.requests,
      transactionData.holders,
      transactionData.returns,
      transactionData.transactions
    ].filter(Array.isArray);

    const source = candidateLists.length > 0 ? candidateLists[0] : [];
    const seen = new Set();
    const normalized = [];

    source.forEach((raw) => {
      const normalizedItem = normalizeItem(raw);
      const key = getItemKey(normalizedItem);
      if (seen.has(key)) return;
      seen.add(key);
      normalized.push(normalizedItem);
    });

    return normalized;
  }, [transactionData]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedKeys(new Set());
      return;
    }
    const initial = new Set(items.map((item) => getItemKey(item)));
    setSelectedKeys(initial);
  }, [isOpen, items]);

  if (!isOpen || !transactionData) {
    return null;
  }

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.equipment_name?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.model?.toLowerCase().includes(q) ||
      item.category_name?.toLowerCase().includes(q) ||
      item.serial_number?.toLowerCase().includes(q)
    );
  });

  const allVisibleSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedKeys.has(getItemKey(item)));

  const toggleItem = (item) => {
    const key = getItemKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredItems.forEach((item) => next.delete(getItemKey(item)));
      } else {
        filteredItems.forEach((item) => next.add(getItemKey(item)));
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedItems = items.filter((item) => selectedKeys.has(getItemKey(item)));
    if (selectedItems.length === 0) return;
    onConfirm?.(selectedItems);
  };

  const employeeName = transactionData.full_name || transactionData.name || 'Employee';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Select Items to Print</h3>
            <p className="text-sm text-gray-500">Ready for: {employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, brand, category, or serial"
                className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {allVisibleSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
              {allVisibleSelected ? 'Deselect Visible' : 'Select Visible'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Showing {filteredItems.length} of {items.length} item{items.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-6 py-4">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">No items match your search.</div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const key = getItemKey(item);
                const isSelected = selectedKeys.has(key);
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-50/60' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={isSelected}
                      onChange={() => toggleItem(item)}
                    />
                    <div className="flex flex-1 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{item.equipment_name}</span>
                        {item.category_name && (
                          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            {item.category_name}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {[item.brand, item.model].filter(Boolean).join(' • ') || 'No brand/model specified'}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Serial: {item.serial_number || 'N/A'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t bg-gray-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-600">
            {selectedKeys.size} item{selectedKeys.size === 1 ? '' : 's'} selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white md:w-auto"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedKeys.size === 0}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 md:w-auto"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectItemsModal;

