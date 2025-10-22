import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

const TypeFilter = ({ 
  selectedType = 'all', 
  onTypeChange, 
  options = [
    { value: 'all', label: 'All Types' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'requests', label: 'Requests' },
    { value: 'transactions', label: 'Transactions' },
    { value: 'employees', label: 'Employees' },
    { value: 'users', label: 'Users' }
  ],
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTypeSelect = (type) => {
    onTypeChange(type);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === selectedType) || options[0];

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
        <span className="text-sm font-medium text-gray-900">{selectedOption.label}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTypeSelect(option.value)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors duration-150 ${
                selectedType === option.value 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-900'
              } first:rounded-t-lg last:rounded-b-lg`}
            >
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TypeFilter;
