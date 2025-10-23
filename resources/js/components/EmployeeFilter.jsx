import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';

const EmployeeFilter = ({ 
  selectedFilters = {},
  onFilterChange,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const dropdownRef = useRef(null);

  // Filter options - reduced and more focused
  const filterOptions = {
    employeeType: {
      label: 'Type',
      options: [
        { value: 'all', label: 'All' },
        { value: 'Regular', label: 'Regular' },
        { value: 'Contract', label: 'Contract' },
        { value: 'Provisionary', label: 'Provisionary' }
      ]
    },
    department: {
      label: 'Department',
      options: [
        { value: 'all', label: 'All' },
        { value: 'IT', label: 'IT' },
        { value: 'Voip', label: 'Voip' },
        { value: 'HR', label: 'HR' },
        { value: 'Finance', label: 'Finance' }
      ]
    },
    client: {
      label: 'Client',
      options: [
        { value: 'all', label: 'All' },
        { value: 'telepath', label: 'Telepath' },
        { value: 'other', label: 'Other' }
      ]
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFilterSelect = (filterType, value) => {
    const newFilters = { ...selectedFilters, [filterType]: value };
    onFilterChange(newFilters);
    setActiveFilter(null);
  };

  const clearFilter = (filterType) => {
    const newFilters = { ...selectedFilters };
    delete newFilters[filterType];
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const getActiveFiltersCount = () => {
    return Object.keys(selectedFilters).filter(key => selectedFilters[key] !== 'all' && selectedFilters[key] !== '').length;
  };

  const getFilterLabel = (filterType) => {
    const filter = filterOptions[filterType];
    const selectedValue = selectedFilters[filterType];
    if (!selectedValue || selectedValue === 'all') return filter.label;
    
    const option = filter.options.find(opt => opt.value === selectedValue);
    return option ? option.label : filter.label;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Filter Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <Filter className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">
          Filter
          {getActiveFiltersCount() > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
              {getActiveFiltersCount()}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-64 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Filter</h3>
              {getActiveFiltersCount() > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="p-3 space-y-3">
            {Object.entries(filterOptions).map(([filterType, config]) => (
              <div key={filterType}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">{config.label}</label>
                  {selectedFilters[filterType] && selectedFilters[filterType] !== 'all' && (
                    <button
                      onClick={() => clearFilter(filterType)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {config.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterSelect(filterType, option.value)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        selectedFilters[filterType] === option.value
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {getActiveFiltersCount()} active
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeFilter;
