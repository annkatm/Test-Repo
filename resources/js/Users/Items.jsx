import React from 'react';
import { Laptop, Plus } from 'lucide-react';

const Items = ({
  cartItems = [],
  onQuantityChange,
  onCancel,
  onSubmit,
  loading,
  workLocation,
  setWorkLocation,
  startDate,
  setStartDate,
  isAtLimit
}) => {
  return (
    <div id="items-section" className="shadow-md shadow-gray-300 rounded-xl col-span-12 md:col-span-4 w-full md:w-auto mb-4 bg-white md:h-[552px] h-auto flex flex-col">
      <div className="rounded-xl shadow-sm shadow-gray-200 w-full h-full flex flex-col">
        <div className="p-6 pb-3">
          <h2 className="text-lg font-semibold text-gray-900">Items</h2>
        </div>

        <div className=" px-6 h-[200px] flex-shrink-0 border-b border-gray-200">
          <div className="h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.groupKey} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image.startsWith('http') ? item.image :
                               item.image.startsWith('/storage') ? `${window.location.origin}${item.image}` :
                               `${window.location.origin}/storage/${item.image}`}
                          alt={item.name || item.brand || 'Equipment'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${item.image ? 'hidden' : 'flex'}`}>
                        <Laptop className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{item.name || item.brand}</div>
                      <div className="text-xs text-gray-500">{item.specifications || item.brand}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onQuantityChange(item.groupKey, item.quantity - 1)}
                      className="w-6 h-6 bg-red-50 border border-red-200 hover:bg-red-100 rounded-full flex items-center justify-center"
                    >
                      <span className="text-red-600 text-sm font-bold">−</span>
                    </button>
                    <span className="text-xs text-gray-600 min-w-[20px] text-center font-medium">x{item.quantity}</span>
                    <button
                      onClick={() => onQuantityChange(item.groupKey, item.quantity + 1)}
                      disabled={item?.units?.[0]?.category_id ? isAtLimit(item.units[0].category_id) : false}
                      className="w-6 h-6 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-full flex items-center justify-center disabled:bg-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed">
                      <Plus className="h-3 w-3 text-blue-600" />
                    </button>
                  </div>
                </div>
              ))}
              {cartItems.length === 0 && (
                <div className="text-gray-400 text-sm text-center py-6">
                  <Laptop className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <div className="text-xs">Your cart is empty</div>
                  <div className="text-xs">Click + buttons to add items</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {cartItems.length > 0 && (
          <div className="px-6 pt-2 pb-2 border-t border-gray-200 flex-shrink-0">
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Settings</label>
                <div className="relative">
                  <select
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                  >
                    <option value="">Select</option>
                    <option value="Work From Home">Work From Home</option>
                    <option value="On Site">On Site</option>
                  </select>
                </div>
              </div>sd
            </div>
          </div>
        )}

        {cartItems.length > 0 && (
          <div className="px-6 pt-2 pb-4 border-t border-gray-200 bg-white rounded-b-xl flex-shrink-0">
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Request Summary</h2>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Total Items</span>
                  <span className="font-semibold text-gray-900 text-sm">x{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="pt-1 mt-1 border-t border-gray-200 space-y-0.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Work Location</span>
                    <span className="font-medium text-gray-900">
                      {workLocation || 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Request Date</span>
                    <span className="font-medium text-gray-900">
                      {startDate ? new Date(startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'Not selected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 bg-white border border-red-300 hover:bg-red-50 text-red-600 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={loading || cartItems.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                {loading ? 'Submitting...' : (
                  <>
                    Request
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Items;
