import React, { useEffect, useMemo, useState } from 'react';
import { X, Package, CheckCircle, Search } from 'lucide-react';

export default function SelectItemsModal({ isOpen, onClose, transactionData, onConfirm }) {
  const items = useMemo(() => {
    if (Array.isArray(transactionData?.items) && transactionData.items.length > 0) {
      return transactionData.items;
    }
    if (transactionData && typeof transactionData === 'object') {
      return [transactionData];
    }
    return [];
  }, [transactionData]);

  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      const all = new Set();
      items.forEach((_, idx) => all.add(idx));
      setSelected(all);
      setQuery('');
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const normalizeItem = (item) => {
    const data = { ...item };
    if (!data.equipment_name) data.equipment_name = data.name || 'N/A';
    if (!data.category_name) data.category_name = data.category || 'Uncategorized';
    if (!data.specifications) {
      const spec = data.specs || [data.brand, data.model].filter(Boolean).join(' ');
      data.specifications = spec || data.category_name || '';
    }
    if (!data.serial_number) data.serial_number = data.equipment_serial_number || data.asset_tag || 'N/A';
    if (!data.serial_numbers) {
      data.serial_numbers = data.serial_number && data.serial_number !== 'N/A' ? [data.serial_number] : [];
    }
    return data;
  };

  const toggleOne = (idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      const all = new Set();
      items.forEach((_, i) => all.add(i));
      setSelected(all);
    }
  };

  const filtered = items.filter((it) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [
      it.equipment_name,
      it.name,
      it.brand,
      it.model,
      it.category_name,
      it.category,
      it.serial_number,
      it.specifications,
      it.specs,
    ]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const visibleIndices = filtered.map((it) => items.indexOf(it));

  const handleConfirm = () => {
    const selectedItems = Array.from(selected)
      .sort((a, b) => a - b)
      .map((idx) => normalizeItem(items[idx]));
    if (selectedItems.length === 0) {
      if (window.showToast) {
        window.showToast({ type: 'warning', title: 'No items selected', message: 'Please select at least one item.', duration: 4000 });
      }
      return;
    }
    onConfirm(selectedItems);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border border-gray-200" style={{ boxShadow: '0 25px 50px -12px rgba(0, 100, 255, 0.4), 0 0 0 1px rgba(0, 100, 255, 0.1)' }}>
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-blue-100 shadow-lg">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Select Items</h3>
                <p className="text-sm text-gray-600 mt-1">Choose which item(s) to include for printing</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search item, brand, model, serial..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="text"
              />
            </div>
            <button onClick={toggleAll} className="px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              {selected.size === items.length ? 'Unselect All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No items found</div>
            ) : (
              filtered.map((item, idxVisible) => {
                const idx = visibleIndices[idxVisible];
                const checked = selected.has(idx);
                return (
                  <label key={idx} className="flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={checked}
                      onChange={() => toggleOne(idx)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.equipment_name || item.name || 'N/A'}</div>
                      <div className="text-sm text-gray-600">
                        {(item.category_name || item.category || 'Uncategorized')} · {(item.brand || '')} {(item.model || '')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Serial: {item.serial_number || item.equipment_serial_number || item.asset_tag || 'N/A'}</div>
                    </div>
                    {checked && <CheckCircle className="h-5 w-5 text-green-600 mt-1" />}
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500">Cancel</button>
            <button onClick={handleConfirm} disabled={selected.size === 0} className={`px-6 py-3 text-sm font-semibold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 ${selected.size === 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}>
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

