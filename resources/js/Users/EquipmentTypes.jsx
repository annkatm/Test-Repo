import React from 'react';
import { Plus } from 'lucide-react';

const EquipmentTypes = ({ groups = [], onAdd, isAtLimit, selectedCategory, hasEquipment }) => {
  return (
    <div className="rounded-xl col-span-12 md:col-span-5 bg-white">
      <div className="rounded-xl shadow-md shadow-gray-300 p-6 overflow-y-auto h-138 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" data-employee-search-target>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          {selectedCategory ? `${selectedCategory} Types` : 'Equipment Types'}
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600 pb-2">
            <div className="col-span-3">Brand</div>
            <div className="col-span-7">Specs</div>
            <div className="col-span-2"></div>
          </div>

          {groups.map((group) => (
            <div key={group.key} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100">
              <div className="col-span-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={group.image ? (
                        group.image.startsWith('http') ? group.image :
                        group.image.startsWith('/storage') ? `${window.location.origin}${group.image}` :
                        `${window.location.origin}/storage/${group.image}`
                      ) : `${window.location.origin}/images/placeholder-equipment.png`}
                      alt={group.brand || group.name || 'Equipment'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `${window.location.origin}/images/placeholder-equipment.png`;
                      }}
                    />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{group.brand || group.name || 'Unknown'}</div>
                  </div>
                </div>
              </div>
              <div className="col-span-7">
                <p className="text-sm text-gray-600">{group.specifications || 'No specs available'}</p>
                <div className="text-xs text-gray-500 mt-1">Stocks available: {group.availableCount}</div>
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  onClick={() => {
                    const unit = group.items.find(i => !i.status || i.status === 'available');
                    if (unit) onAdd(unit);
                  }}
                  disabled={group.availableCount === 0 || isAtLimit(group.category_id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${group.availableCount === 0 || isAtLimit(group.category_id) ? 'bg-gray-200 cursor-not-allowed' : 'bg-blue-100 hover:bg-blue-200'}`}
                >
                  <Plus className="h-4 w-4 text-blue-600" />
                </button>
              </div>
            </div>
          ))}
          {!hasEquipment && (
            <div className="text-sm"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentTypes;
