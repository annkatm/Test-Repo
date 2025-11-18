import React, { useState, useEffect } from 'react';
import HomeSidebar from './HomeSidebar';
import GlobalHeader from './components/GlobalHeader';
import EmployeeFilter from './components/EmployeeFilter';
import PrintReceipt from './components/PrintReceipt';
import { Eye, Pencil, Trash2, Search, AlertCircle, Printer } from 'lucide-react';

// Add custom scrollbar styles
const scrollbarStyles = `
  .modal-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #3B82F6 #F3F4F6;
  }
  .modal-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .modal-scrollbar::-webkit-scrollbar-track {
    background: #F3F4F6;
    border-radius: 4px;
  }
  .modal-scrollbar::-webkit-scrollbar-thumb {
    background: #3B82F6;
    border-radius: 4px;
  }
  .modal-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #2563EB;
  }
`;

const style = document.createElement('style');
style.textContent = scrollbarStyles;
if (!document.head.querySelector('style[data-modal-scrollbar]')) {
  style.setAttribute('data-modal-scrollbar', 'true');
  document.head.appendChild(style);
}

const getBadgeColor = (name) => {
  const colors = {
    J: 'bg-blue-500',
    K: 'bg-pink-500',
    R: 'bg-yellow-500',
    C: 'bg-blue-500',
  };
  const first = name?.[0]?.toUpperCase() || 'B';
  return colors[first] || 'bg-gray-400';
};

// Input component with validation (top-level to avoid remount on parent re-render)
const ValidatedInput = ({ label, value, onChange, type = "text", placeholder, required = false, error, tabIndex }) => (
  <div>
    <label className="block text-sm text-gray-700 font-medium mb-2">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-3 rounded-lg bg-gray-100 border-0 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500 bg-red-50' : 'focus:ring-blue-500'
        }`}
      placeholder={placeholder}
      tabIndex={tabIndex}
    />
    {error && (
      <div className="flex items-center mt-1 text-red-500 text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        {error}
      </div>
    )}
  </div>
);

// Select component with validation (top-level to avoid remount on parent re-render)
const ValidatedSelect = ({ label, value, onChange, options, required = false, error, tabIndex }) => (
  <div>
    <label className="block text-sm text-gray-700 font-medium mb-2">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-3 rounded-lg bg-gray-100 border-0 text-gray-700 focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500 bg-red-50' : 'focus:ring-blue-500'
        }`}
      tabIndex={tabIndex}
    >
      {Array.isArray(options) ? options.map((option, index) => {
        if (!option || typeof option !== 'object') return null;

        // Extra safety: ensure value and label are primitives, not objects
        let optValue = '';
        let optLabel = 'Unknown';

        if (option.value !== undefined && option.value !== null) {
          optValue = typeof option.value === 'object' ? JSON.stringify(option.value) : String(option.value);
        }

        if (option.label !== undefined && option.label !== null) {
          optLabel = typeof option.label === 'object' ? JSON.stringify(option.label) : String(option.label);
        }

        return (
          <option key={index} value={optValue}>{optLabel}</option>
        );
      }).filter(Boolean) : (
        <option value="">No options available</option>
      )}
    </select>
    {error && (
      <div className="flex items-center mt-1 text-red-500 text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        {error}
      </div>
    )}
  </div>
);

const EmployeePage = () => {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  const [deleting, setDeleting] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filters, setFilters] = React.useState({});
  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    contact: '',
    employeeId: '',
    position: '',
    department: '',
    address: '',
    client: '',
    employeeType: 'Regular',
    issuedItem: '',
    status: 'active',
    createAccount: false,
    password: '',
    confirmPassword: '',
    role: 'employee'
  });
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({
    positions: [],
    departments: [],
    clients: [],
    employeeTypes: []
  });
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [issuedEquipment, setIssuedEquipment] = useState([]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [expandedEquipment, setExpandedEquipment] = useState(new Set()); // Track expanded equipment groups
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState(null);
  // Toast state for success notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{11}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateForm = (isEdit = false) => {
    const newErrors = {};

    // First Name validation
    if (!form.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (form.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(form.firstName.trim())) {
      newErrors.firstName = 'First name can only contain letters and spaces';
    }

    // Last Name validation
    if (!form.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (form.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(form.lastName.trim())) {
      newErrors.lastName = 'Last name can only contain letters and spaces';
    }

    // Email validation
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(form.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation (optional for edit only)
    if (form.password && !validatePassword(form.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    // Contact validation
    if (!form.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else if (!validatePhone(form.contact.trim())) {
      newErrors.contact = 'Please enter a valid phone number';
    }

    // Address validation
    if (!form.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (form.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters';
    }

    // Employee Type validation
    if (!form.employeeType) {
      newErrors.employeeType = 'Employee type is required';
    }

    // Optional field validations (only if filled)
    // Note: These are dropdown fields that store IDs, so we only check if they're selected
    // The actual validation happens when we map IDs to names before submission
    // No length validation needed for dropdown selections

    if (form.issuedItem && form.issuedItem.trim().length < 2) {
      newErrors.issuedItem = 'Issued item must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear issued equipment when employee type is changed to 'Regular' in Add or Edit Modal
    if (field === 'employeeType' && (isAddOpen || editing)) {
      // Check if the value is 'Regular' (string) or if it's an ID that maps to 'Regular'
      const employeeTypeName = value === 'Regular' ? 'Regular' : getLabelFromValue(value, dropdownOptions.employeeTypes);
      if (employeeTypeName === 'Regular') {
        setIssuedEquipment([]);
      }
    }
  };

  const loadAvailableEquipment = async () => {
    try {
      // Get paginated equipment list with category info - get all available equipment
      const res = await fetch('/api/equipment?per_page=1000&status=available', {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }

      if (data.success) {
        // Extract equipment from paginated response
        const equipmentList = data.data.data || [];

        // Transform equipment data to match our component's needs
        const transformedEquipment = equipmentList.map(item => ({
          id: item.id,
          name: item.name || item.brand,
          brand: item.brand,
          specifications: item.specifications || 'No specifications',
          serial_number: item.serial_number,
          asset_tag: item.asset_tag,
          status: item.status.toLowerCase(),
          condition: item.condition,
          purchase_price: item.purchase_price,
          purchase_date: item.purchase_date,
          warranty_expiry: item.warranty_expiry,
          notes: item.notes,
          location: item.location,
          category: {
            id: item.category?.id || null,
            name: item.category?.name || 'Uncategorized'
          },
          item_image: item.item_image,
          receipt_image: item.receipt_image,
          // Add these fields for compatibility with existing code
          specKey: `${item.brand || item.name}-${item.specifications || 'No specs'}`,
          available_count: 1, // Each equipment is individual in this system
          description: item.specifications
        }));

        setAvailableEquipment(transformedEquipment);
      }
    } catch (e) {
      console.error('Failed to load equipment:', e);
    }
  };

  const loadDropdownOptions = async () => {
    try {
      const endpoints = {
        positions: '/api/positions',
        departments: '/api/departments',
        clients: '/api/clients',
        employeeTypes: '/api/employee-types'
      };

      const promises = Object.entries(endpoints).map(async ([key, endpoint]) => {
        try {
          const res = await fetch(endpoint, {
            headers: {
              'Accept': 'application/json',
            },
            credentials: 'include',
          });

          const contentType = res.headers.get('content-type');
          let data;
          if (contentType && contentType.includes('application/json')) {
            data = await res.json();
          } else {
            throw new Error('Server returned non-JSON response');
          }
          return [key, data.success && Array.isArray(data.data) ? data.data.map(item => {
            // Handle case where item might be an object or have nested objects
            let itemName = 'Unknown';
            let itemValue = '';

            if (item) {
              if (typeof item === 'string') {
                itemName = item;
                itemValue = item;
              } else if (typeof item === 'object') {
                // Try to extract a string value from the object
                // Prefer name, then code, then id (but ensure they're primitives)
                const nameVal = item.name;
                const codeVal = item.code;
                const idVal = item.id;

                // Ensure we get a primitive value, not an object
                if (nameVal !== undefined && nameVal !== null && typeof nameVal !== 'object') {
                  itemName = String(nameVal);
                  itemValue = String(idVal !== undefined && idVal !== null && typeof idVal !== 'object' ? idVal : nameVal);
                } else if (codeVal !== undefined && codeVal !== null && typeof codeVal !== 'object') {
                  itemName = String(codeVal);
                  itemValue = String(idVal !== undefined && idVal !== null && typeof idVal !== 'object' ? idVal : codeVal);
                } else if (idVal !== undefined && idVal !== null && typeof idVal !== 'object') {
                  itemName = String(idVal);
                  itemValue = String(idVal);
                } else {
                  // Last resort: use value if it's a primitive
                  const valueVal = item.value;
                  if (valueVal !== undefined && valueVal !== null && typeof valueVal !== 'object') {
                    itemName = String(valueVal);
                    itemValue = String(valueVal);
                  } else {
                    // If all else fails, use a safe default
                    itemName = 'Unknown';
                    itemValue = '';
                  }
                }
              }
            }

            // Ensure both value and label are strings
            return {
              value: String(itemValue || itemName),
              label: String(itemName)
            };
          }) : []];
        } catch (e) {
          console.error(`Error loading ${key}:`, e);
          return [key, []];
        }
      });

      const results = await Promise.all(promises);
      const newOptions = {};
      results.forEach(([key, options]) => {
        const validOptions = Array.isArray(options) ? options.filter(opt =>
          opt &&
          typeof opt === 'object' &&
          opt.value !== undefined &&
          opt.value !== null &&
          opt.label !== undefined &&
          opt.label !== null
        ) : [];
        newOptions[key] = validOptions;
      });

      // No fallback - employee types are fully dynamic now
      // Users must add employee types through Control Panel

      setDropdownOptions(newOptions);
    } catch (e) {
      console.error('Failed to load dropdown options:', e);
    }
  };

  const fetchEmployees = async (searchTerm = '', filterParams = {}) => {
    try {
      const params = new URLSearchParams();

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      Object.entries(filterParams).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/employees?${params}`, {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }

      if (data.success && Array.isArray(data.data)) {
        const list = data.data.map(e => {
          // Helper function to safely convert to string
          const safeString = (val) => {
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') return val;
            if (typeof val === 'object') {
              // If it's an object, try to extract a string value
              return String(val.name || val.code || val.id || val.value || '');
            }
            return String(val);
          };

          return {
            id: e.id,
            name: `${e.first_name} ${e.last_name}`.trim(),
            firstName: e.first_name || '',
            lastName: e.last_name || '',
            position: safeString(e.position),
            client: safeString(e.client),
            department: safeString(e.department),
            employeeType: safeString(e.employee_type || 'Regular'),
            email: e.email || '',
            phone: e.phone || '',
            address: e.address || '',
            issuedItem: e.issued_item || '',
            issuedEquipment: e.issued_equipment || [],
            user: e.user || null,
            badge: (e.first_name?.[0] || '').toUpperCase(),
            color: getBadgeColor(e.first_name)
          };
        });
        setEmployees(list);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    // Load dropdown options first
    loadDropdownOptions();

    // Support deep-linking via /employee?email=... or ?employee_id=...
    const params = new URLSearchParams(window.location.search);
    const filterEmail = params.get('email');
    const filterEmpId = params.get('employee_id');

    fetchEmployees().then(() => {
      if (filterEmail || filterEmpId) {
        const match = employees.find(e =>
          (filterEmail && e.email?.toLowerCase() === filterEmail.toLowerCase()) ||
          (filterEmpId && (e.employeeId === filterEmpId || e.name?.toLowerCase().includes(filterEmpId.toLowerCase())))
        );
        if (match) {
          setViewing(match);
        }
      }
    });

    // Listen for dropdown updates
    const handleDropdownUpdate = (event) => {
      loadDropdownOptions();
    };

    const eventTypes = ['positions:updated', 'departments:updated', 'clients:updated', 'employeetypes:updated'];
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleDropdownUpdate);
    });

    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleDropdownUpdate);
      });
    };
  }, []);

  // Transform issued equipment when both issuedEquipment and availableEquipment are loaded
  useEffect(() => {
    if (editing && issuedEquipment.length > 0 && availableEquipment.length > 0) {
      // Only transform if the equipment doesn't already have the required fields
      const needsTransformation = issuedEquipment.some(eq => !eq.item_image || !eq.unitKey);

      if (needsTransformation) {
        const transformedEquipment = issuedEquipment.map((eq, index) => {
          // Find the matching equipment in availableEquipment to get full details
          const matchingEquipment = availableEquipment.find(availEq => availEq.id === eq.id);

          // Create a unique key for this specific unit
          const unitKey = eq.unitKey || `${eq.brand || eq.name}-${eq.specifications || 'no-spec'}-${eq.serial_number || index}`;

          return {
            id: eq.id,
            name: eq.name,
            brand: eq.brand || eq.name,
            specifications: eq.specifications || eq.specs || '',
            item_image: eq.item_image || matchingEquipment?.item_image || null,
            category: eq.category || matchingEquipment?.category || null,
            status: eq.status || 'available',
            unitKey: unitKey,
            serial_number: eq.serial_number || 'N/A',
            serial_numbers: [eq.serial_number] || [],
            available_count: 1
          };
        });
        setIssuedEquipment(transformedEquipment);
      }
    }
  }, [editing, availableEquipment]);

  const addEquipmentToIssued = (equipment, serialNumber = null) => {
    // If a specific serial number is provided, add only that unit
    if (serialNumber) {
      const unitKey = `${equipment.brand || equipment.name}-${equipment.specifications}-${serialNumber}`;

      // Check if this specific unit is already added
      if (issuedEquipment.find(eq => eq.unitKey === unitKey)) {
        return;
      }

      // Find the actual equipment item with this serial number from all_items
      let actualEquipment = null;
      if (equipment.all_items && Array.isArray(equipment.all_items)) {
        actualEquipment = equipment.all_items.find(item => item.serial_number === serialNumber);
      }

      // If not found in all_items, search in availableEquipment
      if (!actualEquipment) {
        actualEquipment = availableEquipment.find(eq =>
          eq.serial_number === serialNumber &&
          eq.brand === equipment.brand &&
          eq.specifications === equipment.specifications
        );
      }

      // Use the actual equipment item if found, otherwise use the grouped equipment data
      const equipmentToAdd = {
        id: actualEquipment?.id || equipment.id,
        name: actualEquipment?.name || equipment.name,
        brand: actualEquipment?.brand || equipment.brand,
        specifications: actualEquipment?.specifications || equipment.specifications,
        item_image: actualEquipment?.item_image || equipment.item_image,
        category: actualEquipment?.category || equipment.category,
        status: actualEquipment?.status || equipment.status,
        unitKey: unitKey,
        serial_number: serialNumber,
        serial_numbers: [serialNumber],
        available_count: 1
      };

      setIssuedEquipment(prev => [...prev, equipmentToAdd]);
    } else {
      // Legacy: Add first available unit if no serial specified
      const availableSerials = equipment.serial_numbers || [];
      if (availableSerials.length > 0) {
        addEquipmentToIssued(equipment, availableSerials[0]);
      }
    }
  };

  const removeEquipmentFromIssued = (equipment) => {
    // Remove by unitKey if it exists (for individual units)
    if (equipment.unitKey) {
      setIssuedEquipment(prev => prev.filter(eq => eq.unitKey !== equipment.unitKey));
    } else {
      // Legacy: remove by specKey for grouped equipment
      const specKey = equipment.specKey || `${equipment.brand || equipment.name || 'Unknown'}-${equipment.specifications || equipment.description || 'No specs'}`;
      setIssuedEquipment(prev => prev.filter(eq => eq.specKey !== specKey));
    }
  };

  const openEquipmentModal = async () => {
    // Load available equipment
    await loadAvailableEquipment();

    // If editing, also fetch the equipment currently issued to this employee
    // so it appears in the modal and can be managed
    if (editing && issuedEquipment.length > 0) {
      try {
        const issuedIds = issuedEquipment.map(eq => eq.id).filter(id => id);
        if (issuedIds.length > 0) {
          const res = await fetch(`/api/equipment?ids=${issuedIds.join(',')}&per_page=100`, {
            headers: { 'Accept': 'application/json' },
            credentials: 'include',
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data.data) {
              // Merge issued equipment with available equipment
              const issuedEquipmentList = data.data.data.map(item => ({
                id: item.id,
                name: item.name || item.brand,
                brand: item.brand,
                specifications: item.specifications || '',
                serial_number: item.serial_number,
                status: item.status,
                category: {
                  id: item.category?.id || null,
                  name: item.category?.name || 'Uncategorized'
                },
                item_image: item.item_image,
              }));

              // Add issued equipment to available list (avoiding duplicates)
              setAvailableEquipment(prev => {
                const combined = [...prev];
                issuedEquipmentList.forEach(issued => {
                  if (!combined.find(eq => eq.id === issued.id && eq.serial_number === issued.serial_number)) {
                    combined.push(issued);
                  }
                });
                return combined;
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading issued equipment:', error);
      }
    }

    setIsEquipmentModalOpen(true);
  };

  const closeEquipmentModal = () => {
    setIsEquipmentModalOpen(false);
    setEquipmentSearchTerm('');
    setSelectedCategory('all');
    setViewMode('grid');
  };

  const openPrintModal = async () => {
    if (issuedEquipment.length === 0) {
      alert('No equipment selected for printing');
      return;
    }

    // Ensure we have the latest equipment data loaded
    // This ensures we have all serial numbers for dropdown options
    await loadAvailableEquipment();

    // Prepare print data from current form and issued equipment
    // Convert dropdown IDs to names for display
    const positionName = form.position ? getLabelFromValue(form.position, dropdownOptions.positions) : (form.position || 'N/A');
    const departmentName = form.department ? getLabelFromValue(form.department, dropdownOptions.departments) : (form.department || 'N/A');

    // Use flatMap to create separate items for each serial number
    const printData = {
      full_name: `${form.firstName} ${form.lastName}`.trim(),
      position: positionName,
      department: departmentName,
      items: issuedEquipment.flatMap(eq => {
        // Get all serial numbers for this equipment
        const serialNumbers = Array.isArray(eq.serial_numbers) && eq.serial_numbers.length > 0
          ? eq.serial_numbers
          : [eq.serial_number || 'N/A'];

        // Find all serial numbers for this equipment type from availableEquipment
        // Match by brand and specifications (normalize for comparison)
        const normalizedBrand = (eq.brand || eq.name || '').trim();
        const normalizedSpecs = (eq.specifications || '').trim();

        const equipmentType = availableEquipment.filter(availEq => {
          const availBrand = (availEq.brand || availEq.name || '').trim();
          const availSpecs = (availEq.specifications || '').trim();
          return availBrand === normalizedBrand && availSpecs === normalizedSpecs;
        });

        // Get all unique serial numbers from this equipment type
        const allAvailableSerials = equipmentType
          .map(availEq => availEq.serial_number)
          .filter(serial => serial && serial.trim() !== '' && serial !== 'N/A')
          .filter((serial, index, self) => self.indexOf(serial) === index) // Remove duplicates
          .sort();

        // Also check if we have grouped equipment data with serial_numbers array
        // This happens when equipment is loaded from the equipment modal
        let groupedSerials = [];
        if (equipmentType.length > 0) {
          // Try to find if there's a grouped equipment item with serial_numbers
          const groupedEquipment = getUniqueEquipment().find(grouped => {
            const groupBrand = (grouped.brand || grouped.name || '').trim();
            const groupSpecs = (grouped.specifications || '').trim();
            return groupBrand === normalizedBrand && groupSpecs === normalizedSpecs;
          });

          if (groupedEquipment && groupedEquipment.serial_numbers && groupedEquipment.serial_numbers.length > 0) {
            groupedSerials = groupedEquipment.serial_numbers.filter(serial => serial && serial.trim() !== '');
          }
        }

        // Use grouped serials if available (more complete), otherwise use filtered available equipment
        const availableSerialNumbers = groupedSerials.length > 0
          ? groupedSerials
          : (allAvailableSerials.length > 0 ? allAvailableSerials : serialNumbers);

        // Create a separate item for each serial number
        return serialNumbers.map(serial => ({
          equipment_name: eq.name || eq.brand || 'N/A',
          brand: eq.brand || 'N/A',
          model: eq.name || 'N/A',
          category_name: eq.category?.name || 'N/A',
          serial_number: serial,
          serial_numbers: availableSerialNumbers, // Include all available serial numbers for editing
          specifications: eq.specifications || 'No specifications',
          date_released: new Date().toISOString(),
          date_returned: null
        }));
      }),
    };

    setPrintData(printData);
    setIsPrintModalOpen(true);
  };

  const closePrintModal = () => {
    setIsPrintModalOpen(false);
    setPrintData(null);
  };

  // Get unique categories from available equipment
  const getAvailableCategories = () => {
    const categories = availableEquipment.map(eq => eq.category?.name || 'Uncategorized');
    const uniqueCategories = [...new Set(categories)];
    return uniqueCategories.sort();
  };

  // Get unique equipment items grouped by specifications
  const getUniqueEquipment = () => {
    const groupedMap = new Map();

    availableEquipment.forEach(eq => {
      // Create a unique key combining brand and specifications
      // Normalize the key to handle variations in spacing/casing
      const normalizedBrand = (eq.brand || eq.name || 'Unknown').trim();
      const normalizedSpecs = (eq.specifications || 'No specifications').trim();
      const specKey = `${normalizedBrand}-${normalizedSpecs}`;

      if (!groupedMap.has(specKey)) {
        // First time seeing this specification, create the group
        groupedMap.set(specKey, {
          id: eq.id, // Use first item's ID as reference
          name: eq.name || eq.brand,
          brand: eq.brand,
          specifications: eq.specifications,
          item_image: eq.item_image,
          receipt_image: eq.receipt_image,
          category: eq.category,
          status: eq.status,
          serial_numbers: eq.serial_number ? [eq.serial_number] : [],
          available_count: 1,
          price: eq.purchase_price,
          condition: eq.condition,
          location: eq.location,
          all_items: [eq],
          specKey // Store for reference
        });
      } else {
        // Add to existing group
        const existing = groupedMap.get(specKey);
        // Only add if serial number is unique and not already in the list
        if (eq.serial_number && !existing.serial_numbers.includes(eq.serial_number)) {
          existing.serial_numbers.push(eq.serial_number);
          existing.all_items.push(eq);
          existing.available_count += 1;
        } else if (!eq.serial_number) {
          // If no serial number, still count it as a separate unit
          existing.all_items.push(eq);
          existing.available_count += 1;
          // Add a placeholder serial number for tracking
          const placeholderSerial = `UNIT-${existing.all_items.length}`;
          if (!existing.serial_numbers.includes(placeholderSerial)) {
            existing.serial_numbers.push(placeholderSerial);
          }
        }
      }
    });

    // Sort serial numbers for better display
    return Array.from(groupedMap.values()).map(group => ({
      ...group,
      serial_numbers: group.serial_numbers.sort()
    }));
  };

  // Calculate real availability for equipment, accounting for already selected items
  const getEquipmentAvailability = (equipment) => {
    const baseAvailability = equipment.available_count || 0;
    const specKey = `${equipment.brand || equipment.name || 'Unknown'}-${equipment.specifications || equipment.description || 'No specs'}`;

    // Count how many units of this equipment type are already selected
    const selectedCount = issuedEquipment.filter(eq => {
      const eqSpecKey = `${eq.brand || eq.name || 'Unknown'}-${eq.specifications || 'No specs'}`;
      return eqSpecKey === specKey;
    }).length;

    return Math.max(0, baseAvailability - selectedCount);
  };

  // Check if a specific serial number is already selected
  const isSerialSelected = (equipment, serialNumber) => {
    const unitKey = `${equipment.brand || equipment.name}-${equipment.specifications}-${serialNumber}`;
    return issuedEquipment.some(eq => eq.unitKey === unitKey);
  };

  // Toggle equipment expansion
  const toggleEquipmentExpansion = (specKey) => {
    setExpandedEquipment(prev => {
      const newSet = new Set(prev);
      if (newSet.has(specKey)) {
        newSet.delete(specKey);
      } else {
        newSet.add(specKey);
      }
      return newSet;
    });
  };

  const resetAll = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      contact: '',
      employeeId: '',
      position: '',
      department: '',
      address: '',
      client: '',
      employeeType: 'Regular',
      issuedItem: '',
      status: 'active',
      createAccount: false,
      password: '',
      confirmPassword: '',
      role: 'employee'
    });
    setErrors({});
    setIssuedEquipment([]);
  };

  const closeModal = () => {
    setIsAddOpen(false);
    setErrors({});
  };

  const refreshEmployees = () => {
    fetchEmployees(searchTerm, filters);
  };

  // Helper function to get label (name) from dropdown options by value (ID)
  const getLabelFromValue = (value, options) => {
    if (!value || !options || !Array.isArray(options)) return '';
    const option = options.find(opt => opt && opt.value === value);
    return option ? option.label : '';
  };

  // Helper function to get value (ID) from dropdown options by label (name)
  const getValueFromLabel = (label, options) => {
    if (!label || !options || !Array.isArray(options)) return '';
    const option = options.find(opt => opt && opt.label === label);
    return option ? option.value : '';
  };

  const saveEmployee = () => {
    if (!validateForm()) {
      return;
    }

    // Prepare issued equipment data - simplified for individual units
    const equipmentData = issuedEquipment.map(eq => ({
      id: eq.id,
      name: eq.name || eq.brand,
      brand: eq.brand,
      serial_number: eq.serial_number || (eq.serial_numbers && eq.serial_numbers[0]) || 'N/A',
      category: eq.category?.name || 'N/A',
      item_image: eq.item_image || null
    }));

    // Map dropdown IDs to names for backend
    const clientName = form.client ? getLabelFromValue(form.client, dropdownOptions.clients) : '';
    const positionName = form.position ? getLabelFromValue(form.position, dropdownOptions.positions) : '';
    const departmentName = form.department ? getLabelFromValue(form.department, dropdownOptions.departments) : '';
    const employeeTypeName = form.employeeType ? getLabelFromValue(form.employeeType, dropdownOptions.employeeTypes) : (form.employeeType || 'Regular');

    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    fetch('/api/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.contact.trim(),
        address: form.address.trim(),
        employee_type: employeeTypeName,
        client: clientName,
        position: positionName,
        department: departmentName,
        issued_item: JSON.stringify(equipmentData),
        issued_equipment_ids: [...new Set(issuedEquipment.map(eq => eq.id))], // Remove duplicates
        status: 'active',
      })
    })
      .then(async res => {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return res.json();
        } else {
          const text = await res.text();
          throw new Error(`Server returned an error (${res.status}). Please check your connection and try again.`);
        }
      })
      .then(data => {
        if (data.success) {
          closeModal();
          resetAll();
          refreshEmployees();
          // Reload available equipment to reflect issued items
          loadAvailableEquipment();
          // Dispatch event to refresh equipment page
          window.dispatchEvent(new Event('equipment:updated'));
          showToast('Employee added successfully');
        } else {
          console.error('Employee save failed:', data);
          alert(data.message || 'Failed to save employee');
        }
      })
      .catch(error => {
        console.error('Employee save error:', error);
        alert('Failed to save employee: ' + error.message);
      });
  };

  const openView = (emp) => setViewing(emp);
  const closeView = () => setViewing(null);

  const openEdit = (emp) => {
    setEditing(emp);
    // Map names back to IDs for dropdown fields
    const clientId = emp.client ? getValueFromLabel(emp.client, dropdownOptions.clients) : '';
    const positionId = emp.position ? getValueFromLabel(emp.position, dropdownOptions.positions) : '';
    const departmentId = emp.department ? getValueFromLabel(emp.department, dropdownOptions.departments) : '';
    // Convert employee type name to ID for the dropdown
    const employeeTypeId = emp.employeeType ? getValueFromLabel(emp.employeeType, dropdownOptions.employeeTypes) : '';

    setForm({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      password: '',
      contact: emp.phone || '',
      address: emp.address || '',
      employeeType: employeeTypeId || (emp.employeeType || 'Regular'), // Use ID if found, otherwise fallback to name/Regular
      client: clientId,
      position: positionId,
      department: departmentId,
      issuedItem: emp.issuedItem || ''
    });

    // Load available equipment to get images and full details
    loadAvailableEquipment();

    // Load issued equipment if exists
    if (emp.issuedItem) {
      try {
        const parsedEquipment = JSON.parse(emp.issuedItem);
        if (Array.isArray(parsedEquipment)) {
          // Store the parsed equipment for later processing
          setIssuedEquipment(parsedEquipment);
        }
      } catch (e) {
        console.error('Error parsing issued equipment:', e);
        setIssuedEquipment([]);
      }
    } else {
      setIssuedEquipment([]);
    }

    setErrors({});
    setIsAddOpen(false);
  };

  const closeEdit = () => {
    setEditing(null);
    resetAll();
  };

  const updateEmployee = () => {
    if (!validateForm(true)) {
      return;
    }

    if (!editing) return;

    // Prepare issued equipment data - simplified for individual units
    const equipmentData = issuedEquipment.map(eq => ({
      id: eq.id,
      name: eq.name || eq.brand,
      brand: eq.brand,
      serial_number: eq.serial_number || (eq.serial_numbers && eq.serial_numbers[0]) || 'N/A',
      category: eq.category?.name || 'N/A',
      item_image: eq.item_image || null
    }));

    // Map dropdown IDs to names for backend
    const clientName = form.client ? getLabelFromValue(form.client, dropdownOptions.clients) : '';
    const positionName = form.position ? getLabelFromValue(form.position, dropdownOptions.positions) : '';
    const departmentName = form.department ? getLabelFromValue(form.department, dropdownOptions.departments) : '';
    const employeeTypeName = form.employeeType ? getLabelFromValue(form.employeeType, dropdownOptions.employeeTypes) : (form.employeeType || 'Regular');

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    fetch(`/api/employees/${editing.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      },
      body: JSON.stringify({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password || undefined,
        phone: form.contact.trim(),
        address: form.address.trim(),
        employee_type: employeeTypeName,
        client: clientName,
        position: positionName,
        department: departmentName,
        issued_item: JSON.stringify(equipmentData),
        issued_equipment_ids: [...new Set(issuedEquipment.map(eq => eq.id))], // Remove duplicates
        status: 'active'
      })
    })
      .then(async res => {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return res.json();
        } else {
          const text = await res.text();
          throw new Error(`Server returned an error (${res.status}). Please check your connection and try again.`);
        }
      })
      .then(data => {
        if (data.success) {
          // Update viewing state if it was open for this employee
          if (viewing && viewing.id === editing.id) {
            setViewing({
              ...viewing,
              firstName: form.firstName,
              lastName: form.lastName,
              name: `${form.firstName} ${form.lastName}`.trim(),
              email: form.email,
              phone: form.contact,
              address: form.address,
              employeeType: employeeTypeName, // Use the name, not the ID
              client: clientName,
              position: positionName,
              department: departmentName,
              issuedEquipment: issuedEquipment,
              badge: (form.firstName?.[0] || '').toUpperCase(),
              color: getBadgeColor(form.firstName)
            });
          }

          closeEdit();
          refreshEmployees();
          // Reload available equipment to reflect issued items
          loadAvailableEquipment();
          // Dispatch event to refresh equipment page
          window.dispatchEvent(new Event('equipment:updated'));
          showToast('Employee updated successfully');
        } else {
          alert(data.message || 'Failed to update employee');
        }
      })
      .catch(() => alert('Failed to update employee'));
  };

  const openDelete = (emp) => setDeleting(emp);
  const closeDelete = () => setDeleting(null);

  const confirmDelete = () => {
    if (!deleting) return;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    fetch(`/api/employees/${deleting.id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-CSRF-TOKEN': csrfToken
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          closeDelete();
          refreshEmployees();
          // Dispatch event to refresh equipment page
          window.dispatchEvent(new Event('equipment:updated'));
          showToast('Employee deleted successfully');
        } else {
          alert(data.message || 'Failed to delete employee');
        }
      })
      .catch(() => alert('Failed to delete employee'));
  };

  // Use employees directly since filtering is now done on the backend
  const filteredEmployees = employees;

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchEmployees(searchTerm, newFilters);
  };

  const handleSearchChange = (newSearchTerm) => {
    setSearchTerm(newSearchTerm);
    fetchEmployees(newSearchTerm, filters);
  };

  // (components moved to top-level)

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      <HomeSidebar />

      <div className="flex-1 flex flex-col">
        <GlobalHeader
          title="Employees"
          hideSearch={true}
          showTitle={true}
        />

        <div className="bg-white px-4 md:px-6 lg:px-8 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 flex-1">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 md:w-80"
                />
              </div>
              <EmployeeFilter
                selectedFilters={filters}
                onFilterChange={handleFilterChange}
                className="min-w-[120px] w-full sm:w-auto"
              />
            </div>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
            >
              Add New
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white px-4 md:px-6 lg:px-8 py-4 md:py-6 overflow-y-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">Employees</h2>
            {Object.keys(filters).length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">
                  {filteredEmployees.length} of {employees.length} employees
                </span>
                {Object.entries(filters).map(([key, value]) => (
                  value && value !== 'all' && (
                    <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {key}: {value}
                    </span>
                  )
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 md:px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-2 md:gap-4 text-xs md:text-sm font-medium text-gray-600">
                <div className="col-span-4 md:col-span-3">Name</div>
                <div className="col-span-2 hidden md:block">Client</div>
                <div className="col-span-2 hidden lg:block">Position</div>
                <div className="col-span-2 hidden lg:block">Employee Type</div>
                <div className="col-span-1 hidden xl:block">Department</div>
                <div className="col-span-4 md:col-span-2 text-center">Actions</div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {employees.length === 0 && !filteredEmployees.length ? (
                <>
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="px-4 md:px-6 py-4 animate-pulse">
                      <div className="grid grid-cols-12 gap-2 md:gap-4 items-center">
                        <div className="col-span-4 md:col-span-3 flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                          <div className="flex flex-col space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="col-span-2 hidden md:block">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="col-span-2 hidden lg:block">
                          <div className="h-4 bg-gray-200 rounded w-28"></div>
                        </div>
                        <div className="col-span-2 hidden lg:block">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </div>
                        <div className="col-span-1 hidden xl:block">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="col-span-4 md:col-span-2 flex items-center justify-center space-x-3">
                          <div className="h-8 w-8 bg-gray-200 rounded"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : filteredEmployees.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No employees found.</div>
              ) : (
                currentEmployees.map((e) => (
                  <div key={e.id} className="px-4 md:px-6 py-4 hover:bg-blue-50 transition-colors">
                    <div className="grid grid-cols-12 gap-2 md:gap-4 items-center">
                      <div className="col-span-4 md:col-span-3 flex items-center space-x-3 min-w-0">
                        <div className={`w-8 h-8 ${e.color} rounded-full text-white text-sm flex items-center justify-center font-medium flex-shrink-0`}>
                          {e.badge}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-gray-900 font-medium truncate">{e.name}</span>
                          {e.user && (
                            <span className="text-xs text-green-600 font-medium truncate">
                              ✓ Connected to {e.user.name}
                            </span>
                          )}
                          <div className="md:hidden text-xs text-gray-500 mt-1">
                            {e.client} • {e.position}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 hidden md:block text-gray-600 truncate">{e.client}</div>
                      <div className="col-span-2 hidden lg:block text-gray-600 truncate">{e.position}</div>
                      <div className="col-span-2 hidden lg:block text-gray-600 truncate">{e.employeeType}</div>
                      <div className="col-span-1 hidden xl:block text-gray-600 truncate">{e.department}</div>
                      <div className="col-span-4 md:col-span-2 flex items-center justify-center space-x-3">
                        <button
                          onClick={() => openView(e)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(e)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDelete(e)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {filteredEmployees.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Total: {filteredEmployees.length} items</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`p-1 ${
                    currentPage === 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`p-1 ${
                    currentPage === totalPages
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* View Modal */}
        {viewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20" onClick={closeView} />
            <div className="relative bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full sm:w-[90%] md:w-[600px] lg:w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-4 md:p-6 border border-gray-200">
              <button onClick={closeView} className="sticky top-0 float-right text-gray-400 hover:text-gray-600 text-xl z-10 bg-white rounded-full w-8 h-8 flex items-center justify-center -mt-2 -mr-2 mb-2">✕</button>
              <h3 className="text-xl md:text-2xl font-semibold text-blue-600 mb-6 md:mb-8">Employee Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">First Name</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.firstName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Last Name</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.lastName}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Email</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.email}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">User Account</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.user ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600 font-medium">✓ Connected</span>
                        <span className="text-gray-600">({viewing.user.name} - {viewing.user.role?.name || 'No role'})</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">No user account connected</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Contact Number</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.phone}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Address</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.address}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Client</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.client}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Employee Type</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.employeeType}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Department</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.department}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Position</label>
                  <div className="bg-gray-100 rounded-lg p-3 text-gray-900 w-full">
                    {viewing.position}
                  </div>
                </div>

              </div>

              {/* Issued Item Section - Full Width - Only show for New hire or Probationary */}
              {(viewing.employeeType === 'New hire' || viewing.employeeType === 'Probationary') && (
                <div className="mt-6">
                  <div className="space-y-4">
                    <label className="block text-sm text-gray-700 font-medium mb-2">
                      Issued Equipment
                    </label>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm font-bold text-gray-800">
                          <div>Equipment</div>
                          <div className="hidden sm:block">Serial Number</div>
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <div className="divide-y divide-gray-200">
                          {viewing.issuedEquipment && viewing.issuedEquipment.length > 0 ? (
                            viewing.issuedEquipment.map((item, index) => (
                              <div key={index} className="px-4 py-3 hover:bg-gray-50">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                  <div className="text-blue-600 font-medium">
                                    {item.name || item.brand || 'N/A'}
                                  </div>
                                  <div className="text-gray-700 text-sm leading-tight">
                                    {item.specifications || item.specs || 'No specifications'}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center text-gray-500">
                              <div className="text-lg font-medium mb-2">No equipment issued</div>
                              <div className="text-sm">This employee has not been assigned any equipment yet.</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20" onClick={closeModal} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full sm:w-[90%] md:w-[600px] lg:w-[700px] max-w-[95vw] max-h-[85vh] md:max-h-[70vh] overflow-y-auto modal-scrollbar p-4 md:p-6 border border-gray-200">
              <button onClick={closeModal} className="sticky top-0 float-right text-gray-400 hover:text-gray-600 text-xl z-10 bg-white rounded-full w-8 h-8 flex items-center justify-center -mt-2 -mr-2 mb-2">✕</button>
              <h3 className="text-lg md:text-xl font-semibold text-blue-500 text-center mb-6 md:mb-8">Add employee</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* LEFT SIDE - Z-pattern: 1, 3, 5, 7, 9 */}
                <div className="space-y-6">
                  <ValidatedInput
                    label="First Name"
                    value={form.firstName}
                    onChange={(val) => handleInputChange('firstName', val)}
                    placeholder="Enter first name"
                    required={true}
                    error={errors.firstName}
                    tabIndex={1}
                  />
                  <ValidatedInput
                    label="Email"
                    value={form.email}
                    onChange={(val) => handleInputChange('email', val)}
                    type="email"
                    placeholder="Enter email address"
                    required={true}
                    error={errors.email}
                    tabIndex={3}
                  />
                  <ValidatedInput
                    label="Contact Number"
                    value={form.contact}
                    onChange={(val) => handleInputChange('contact', val)}
                    type="tel"
                    placeholder="Enter phone number"
                    required={true}
                    error={errors.contact}
                    tabIndex={5}
                  />
                  <ValidatedSelect
                    label="Client"
                    value={form.client}
                    onChange={(val) => handleInputChange('client', val)}
                    options={[
                      { value: '', label: 'Select client' },
                      ...dropdownOptions.clients
                    ]}
                    error={errors.client}
                    tabIndex={7}
                  />
                  <ValidatedSelect
                    label="Department"
                    value={form.department}
                    onChange={(val) => handleInputChange('department', val)}
                    options={[
                      { value: '', label: 'Select department' },
                      ...dropdownOptions.departments
                    ]}
                    error={errors.department}
                    tabIndex={9}
                  />
                </div>

                {/* RIGHT SIDE - Z-pattern: 2, 4, 6, 8, 10 */}
                <div className="space-y-6">
                  <ValidatedInput
                    label="Last Name"
                    value={form.lastName}
                    onChange={(val) => handleInputChange('lastName', val)}
                    placeholder="Enter last name"
                    required={true}
                    error={errors.lastName}
                    tabIndex={2}
                  />
                  <ValidatedInput
                    label="Address"
                    value={form.address}
                    onChange={(val) => handleInputChange('address', val)}
                    placeholder="Enter complete address"
                    required={true}
                    error={errors.address}
                    tabIndex={4}
                  />
                  <ValidatedSelect
                    label="Employee Type"
                    value={form.employeeType}
                    onChange={(val) => handleInputChange('employeeType', val)}
                    required={true}
                    options={[
                      { value: '', label: 'Select employee type' },
                      ...dropdownOptions.employeeTypes
                    ]}
                    error={errors.employeeType}
                    tabIndex={6}
                  />
                  <ValidatedSelect
                    label="Position"
                    value={form.position}
                    onChange={(val) => handleInputChange('position', val)}
                    options={[
                      { value: '', label: 'Select position' },
                      ...dropdownOptions.positions
                    ]}
                    error={errors.position}
                    tabIndex={8}
                  />
                </div>
              </div>

              {/* Issued Item Section - Full Width - Only show for New hire or Probationary */}
              {(() => {
                const employeeTypeName = getLabelFromValue(form.employeeType, dropdownOptions.employeeTypes);
                return (employeeTypeName === 'New hire' || employeeTypeName === 'Probationary');
              })() && (
                  <div className="mt-6 mb-6">
                    <div className="space-y-4">
                      <label className="block text-sm text-gray-700 font-medium mb-2">
                        Issued Item
                      </label>
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm font-bold text-gray-800">
                            <div>Equipment</div>
                            <div className="hidden sm:block">Serial Number</div>
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          <div className="divide-y divide-gray-200">
                            {issuedEquipment.length === 0 ? (
                              <div className="px-4 py-6 text-center text-gray-400 text-xs md:text-sm">
                                No equipment issued yet. Click "Add New" to assign equipment.
                              </div>
                            ) : (
                              issuedEquipment.map((equipment, index) => (
                                <div key={equipment.specKey || equipment.id || index} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      {/* Equipment Image */}
                                      {equipment.item_image ? (
                                        <img
                                          src={`/storage/${equipment.item_image}`}
                                          alt={equipment.name}
                                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                          <span className="text-gray-400 text-xs">No img</span>
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <h5 className="text-blue-600 font-medium text-sm truncate">
                                          {equipment.name || equipment.brand}
                                        </h5>
                                        <p className="text-gray-600 text-xs mt-1">
                                          <span className="font-mono font-medium">{equipment.serial_number || 'N/A'}</span>
                                        </p>
                                        {equipment.specifications && (
                                          <p className="text-gray-500 text-xs leading-tight mt-0.5">
                                            {equipment.specifications}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeEquipmentFromIssued(equipment)}
                                      className="sm:ml-4 text-red-500 hover:text-red-700 text-xs font-medium flex-shrink-0 px-2 py-1 rounded hover:bg-red-50 self-start sm:self-center"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={openEquipmentModal}
                            className="px-4 py-2 bg-blue-500 border border-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                            tabIndex={10}
                          >
                            Add New
                          </button>
                          <button
                            type="button"
                            onClick={openPrintModal}
                            disabled={issuedEquipment.length === 0}
                            className={`p-2 rounded transition-colors ${issuedEquipment.length === 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:text-gray-800'
                              }`}
                            title={issuedEquipment.length === 0 ? 'No equipment selected' : 'Print'}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button onClick={resetAll} className="text-blue-500 hover:text-blue-600 font-medium order-2 sm:order-1" tabIndex={12}>Reset all</button>
                <button onClick={saveEmployee} className="px-6 md:px-8 py-2 md:py-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 font-medium transition-colors order-1 sm:order-2" tabIndex={11}>Save →</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20" onClick={closeEdit} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full sm:w-[90%] md:w-[600px] lg:w-[700px] max-w-[95vw] max-h-[85vh] md:max-h-[70vh] overflow-y-auto modal-scrollbar p-4 md:p-6 border border-gray-200">
              <button onClick={closeEdit} className="sticky top-0 float-right text-gray-400 hover:text-gray-600 text-xl z-10 bg-white rounded-full w-8 h-8 flex items-center justify-center -mt-2 -mr-2 mb-2">✕</button>
              <h3 className="text-lg md:text-xl font-semibold text-blue-500 text-center mb-6 md:mb-8">Edit employee</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* LEFT SIDE - Z-pattern: 1, 3, 5, 7, 9 */}
                <div className="space-y-6">
                  <ValidatedInput
                    label="First Name"
                    value={form.firstName}
                    onChange={(val) => handleInputChange('firstName', val)}
                    placeholder="Enter first name"
                    required={true}
                    error={errors.firstName}
                    tabIndex={1}
                  />
                  <ValidatedInput
                    label="Email"
                    value={form.email}
                    onChange={(val) => handleInputChange('email', val)}
                    type="email"
                    placeholder="Enter email address"
                    required={true}
                    error={errors.email}
                    tabIndex={3}
                  />
                  <ValidatedInput
                    label="Contact Number"
                    value={form.contact}
                    onChange={(val) => handleInputChange('contact', val)}
                    type="tel"
                    placeholder="Enter phone number"
                    required={true}
                    error={errors.contact}
                    tabIndex={5}
                  />
                  <ValidatedSelect
                    label="Client"
                    value={form.client}
                    onChange={(val) => handleInputChange('client', val)}
                    options={[
                      { value: '', label: 'Select client' },
                      ...dropdownOptions.clients
                    ]}
                    error={errors.client}
                    tabIndex={7}
                  />
                  <ValidatedSelect
                    label="Department"
                    value={form.department}
                    onChange={(val) => handleInputChange('department', val)}
                    options={[
                      { value: '', label: 'Select department' },
                      ...dropdownOptions.departments
                    ]}
                    error={errors.department}
                    tabIndex={9}
                  />
                </div>

                {/* RIGHT SIDE - Z-pattern: 2, 4, 6, 8, 10 */}
                <div className="space-y-6">
                  <ValidatedInput
                    label="Last Name"
                    value={form.lastName}
                    onChange={(val) => handleInputChange('lastName', val)}
                    placeholder="Enter last name"
                    required={true}
                    error={errors.lastName}
                    tabIndex={2}
                  />
                  <ValidatedInput
                    label="Address"
                    value={form.address}
                    onChange={(val) => handleInputChange('address', val)}
                    placeholder="Enter complete address"
                    required={true}
                    error={errors.address}
                    tabIndex={4}
                  />
                  <ValidatedSelect
                    label="Employee Type"
                    value={form.employeeType}
                    onChange={(val) => handleInputChange('employeeType', val)}
                    required={true}
                    options={[
                      { value: '', label: 'Select employee type' },
                      ...dropdownOptions.employeeTypes
                    ]}
                    error={errors.employeeType}
                    tabIndex={6}
                  />
                  <ValidatedSelect
                    label="Position"
                    value={form.position}
                    onChange={(val) => handleInputChange('position', val)}
                    options={[
                      { value: '', label: 'Select position' },
                      ...dropdownOptions.positions
                    ]}
                    error={errors.position}
                    tabIndex={8}
                  />
                </div>
              </div>

              {/* Issued Item Section - Full Width - Only show for New hire or Probationary */}
              {(() => {
                const employeeTypeName = getLabelFromValue(form.employeeType, dropdownOptions.employeeTypes);
                return (employeeTypeName === 'New hire' || employeeTypeName === 'Probationary');
              })() && (
                  <div className="mt-6">
                    <div className="space-y-4">
                      <label className="block text-sm text-gray-700 font-medium mb-2">
                        Issued Item
                      </label>
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm font-bold text-gray-800">
                            <div>Equipment</div>
                            <div className="hidden sm:block">Serial Number</div>
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          <div className="divide-y divide-gray-200">
                            {issuedEquipment.length === 0 ? (
                              <div className="px-4 py-6 text-center text-gray-400 text-xs md:text-sm">
                                No equipment issued yet. Click "Add New" to assign equipment.
                              </div>
                            ) : (
                              issuedEquipment.map((equipment, index) => (
                                <div key={equipment.specKey || equipment.id || index} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      {/* Equipment Image */}
                                      {equipment.item_image ? (
                                        <img
                                          src={`/storage/${equipment.item_image}`}
                                          alt={equipment.name}
                                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                          <span className="text-gray-400 text-xs">No img</span>
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <h5 className="text-blue-600 font-medium text-sm truncate">
                                          {equipment.name || equipment.brand}
                                        </h5>
                                        <p className="text-gray-600 text-xs mt-1">
                                          <span className="font-mono font-medium">{equipment.serial_number || 'N/A'}</span>
                                        </p>
                                        {equipment.specifications && (
                                          <p className="text-gray-500 text-xs leading-tight mt-0.5">
                                            {equipment.specifications}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeEquipmentFromIssued(equipment)}
                                      className="sm:ml-4 text-red-500 hover:text-red-700 text-xs font-medium flex-shrink-0 px-2 py-1 rounded hover:bg-red-50 self-start sm:self-center"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={openEquipmentModal}
                            className="px-4 py-2 bg-blue-500 border border-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                            tabIndex={10}
                          >
                            Add New
                          </button>
                          <button
                            type="button"
                            onClick={openPrintModal}
                            disabled={issuedEquipment.length === 0}
                            className={`p-2 rounded transition-colors ${issuedEquipment.length === 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:text-gray-800'
                              }`}
                            title={issuedEquipment.length === 0 ? 'No equipment selected' : 'Print'}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button onClick={resetAll} className="text-blue-500 hover:text-blue-600 font-medium order-2 sm:order-1" tabIndex={12}>Reset</button>
                <button onClick={updateEmployee} className="px-6 md:px-8 py-2 md:py-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 font-medium transition-colors order-1 sm:order-2" tabIndex={11}>Update →</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={closeDelete} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full sm:w-[400px] max-w-[95vw] p-4 md:p-6 border border-gray-200">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Employee</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete <span className="font-medium text-gray-900">{deleting.name}</span>?
                  This action cannot be undone.
                </p>
                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={closeDelete}
                    className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium transition-colors"
                    tabIndex={1}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium transition-colors"
                    tabIndex={2}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Selection Modal */}
        {isEquipmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={closeEquipmentModal} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full sm:w-[95%] md:w-[800px] lg:w-[900px] max-w-[95vw] max-h-[90vh] overflow-hidden border border-gray-200">
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-4">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800">Select Equipment</h3>
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'grid'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      Grid View
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      List View
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={equipmentSearchTerm}
                    onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                    tabIndex={1}
                  />
                </div>

                {/* Category Filters */}
                <div className="flex items-center space-x-2 md:space-x-3 flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors mb-2 ${selectedCategory === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    All
                  </button>
                  {getAvailableCategories().sort().map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors mb-2 ${selectedCategory === category
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment Display */}
              <div className="p-4 md:p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {getUniqueEquipment()
                      .filter(eq => {
                        if (!eq) return false;

                        // Search filter
                        const searchTerm = equipmentSearchTerm.toLowerCase();
                        const matchesSearch = !searchTerm || [
                          eq.name,
                          eq.brand,
                          eq.specifications,
                          ...eq.serial_numbers,
                          eq.asset_tag,
                          eq.category?.name
                        ].some(field =>
                          field && field.toString().toLowerCase().includes(searchTerm)
                        );

                        // Category filter
                        const matchesCategory = selectedCategory === 'all' ||
                          eq.category?.name === selectedCategory;

                        return matchesSearch && matchesCategory;
                      })
                      .map((equipment) => {
                        const specKey = `${equipment.brand || equipment.name || 'Unknown'}-${equipment.specifications || equipment.description || 'No specs'}`;
                        const availability = getEquipmentAvailability(equipment);
                        const isExpanded = expandedEquipment.has(specKey);
                        const serialNumbers = equipment.serial_numbers || [];
                        const isAdded = issuedEquipment.find(eq => eq.specKey === specKey);

                        return (
                          <div
                            key={specKey}
                            onClick={() => {
                              if (availability > 0 && !isAdded) {
                                addEquipmentToIssued(equipment);
                              } else if (isAdded) {
                                removeEquipmentFromIssued(equipment);
                              }
                            }}
                            className={`bg-white border-2 rounded-xl overflow-hidden transition-all relative cursor-pointer ${
                              isAdded 
                                ? 'border-blue-500 bg-blue-50 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]' 
                                : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
                            }`}
                            style={isAdded ? {
                              boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
                            } : {}}
                          >
                            <div className="p-4">
                              {/* Equipment Image */}
                              <div className="mb-4">
                                {equipment.item_image ? (
                                  <img
                                    src={`/storage/${equipment.item_image}`}
                                    alt={equipment.name}
                                    className="w-full h-32 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-32 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <span className="text-gray-400 text-sm">No Image</span>
                                  </div>
                                )}
                              </div>

                              {/* Equipment Details */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-gray-900 text-sm truncate">
                                  {equipment.brand || equipment.name}
                                </h4>
                                <p className="text-xs text-gray-600">
                                  Available: {availability} / {equipment.available_count}
                                </p>
                              </div>

                              {/* Show Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleEquipmentExpansion(specKey);
                                }}
                                className="w-full mt-4 py-2 rounded-lg font-medium text-sm transition-colors bg-blue-500 text-white hover:bg-blue-600"
                              >
                                Show
                              </button>
                            </div>

                            {/* Slide Up Details Panel */}
                            {isExpanded && (
                              <div 
                                className="absolute bottom-0 left-0 right-0 bg-blue-50 border-t-2 border-blue-200 rounded-t-2xl shadow-lg"
                                style={{
                                  animation: 'slideUpInCard 0.3s ease-out',
                                  maxHeight: '200px',
                                  overflowY: 'auto'
                                }}
                              >
                                <style jsx>{`
                                  @keyframes slideUpInCard {
                                    from {
                                      transform: translateY(100%);
                                      opacity: 0;
                                    }
                                    to {
                                      transform: translateY(0);
                                      opacity: 1;
                                    }
                                  }
                                `}</style>
                                
                                <div className="p-4">
                                  {/* Close button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleEquipmentExpansion(specKey);
                                    }}
                                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>

                                  <div className="space-y-3 mt-2">
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Brand</label>
                                      <p className="text-sm text-gray-900">{equipment.brand || 'N/A'}</p>
                                    </div>
                                    
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Specifications</label>
                                      <p className="text-sm text-gray-900">
                                        {equipment.specifications || equipment.description || 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getUniqueEquipment()
                      .filter(eq => {
                        // Search filter
                        const matchesSearch =
                          eq.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
                          eq.brand?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
                          (eq.specifications && eq.specifications.toLowerCase().includes(equipmentSearchTerm.toLowerCase())) ||
                          (eq.serial_number && eq.serial_number.toLowerCase().includes(equipmentSearchTerm.toLowerCase())) ||
                          eq.category?.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase());

                        // Category filter
                        const matchesCategory = selectedCategory === 'all' ||
                          (eq.category?.name || 'Uncategorized') === selectedCategory;

                        return matchesSearch && matchesCategory;
                      })
                      .map((equipment) => {
                        const specKey = `${equipment.brand || equipment.name || 'Unknown'}-${equipment.specifications || equipment.description || 'No specs'}`;
                        const isAdded = issuedEquipment.find(eq => eq.specKey === specKey);
                        const availability = getEquipmentAvailability(equipment);
                        return (
                          <div
                            key={specKey}
                            className={`p-4 border rounded-lg transition-all ${isAdded ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }`}
                          >
                            <div className="flex items-start justify-between space-x-4">
                              <div className="flex items-start space-x-4 flex-1">
                                {/* Equipment Image */}
                                {equipment.item_image ? (
                                  <img
                                    src={`/storage/${equipment.item_image}`}
                                    alt={equipment.name}
                                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-gray-400 text-xs">No img</span>
                                  </div>
                                )}

                                {/* Equipment Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h4 className="font-semibold text-gray-900 truncate">{equipment.name || equipment.brand}</h4>
                                    <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${availability > 0
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                      }`}>
                                      {availability > 0 ? `Available: ${availability}` : 'Out of Stock'}
                                    </span>
                                  </div>

                                  {equipment.brand && equipment.name !== equipment.brand && (
                                    <p className="text-sm text-gray-600 mb-1">{equipment.brand}</p>
                                  )}

                                  <p className="text-xs text-gray-600 mb-1">
                                    Serial: <span className="font-mono font-medium">{equipment.serial_number || 'N/A'}</span>
                                  </p>
                                  {equipment.specifications && (
                                    <p className="text-xs text-gray-500 mb-1">
                                      {equipment.specifications}
                                    </p>
                                  )}

                                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                                    <span>
                                      <span className="font-medium">Category:</span> {equipment.category?.name || 'Uncategorized'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Add/Remove Button */}
                              <button
                                onClick={() => isAdded ? removeEquipmentFromIssued(equipment) : addEquipmentToIssued(equipment)}
                                disabled={availability === 0 && !isAdded}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ${isAdded
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                  : availability === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                  }`}
                              >
                                {isAdded ? 'Remove' : availability === 0 ? 'Out of Stock' : 'Add'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {getUniqueEquipment().filter(eq => {
                  const matchesSearch =
                    eq.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
                    eq.brand?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
                    (eq.specifications && eq.specifications.toLowerCase().includes(equipmentSearchTerm.toLowerCase())) ||
                    (eq.serial_number && eq.serial_number.toLowerCase().includes(equipmentSearchTerm.toLowerCase())) ||
                    eq.category?.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase());

                  const matchesCategory = selectedCategory === 'all' ||
                    (eq.category?.name || 'Uncategorized') === selectedCategory;

                  return matchesSearch && matchesCategory;
                }).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-lg font-medium mb-2">No equipment found</div>
                      <div className="text-sm">
                        {equipmentSearchTerm || selectedCategory !== 'all' ? 'Try adjusting your search terms or filters' : 'No available equipment at the moment'}
                      </div>
                    </div>
                  )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-medium">
                    {issuedEquipment.length} equipment selected
                  </span>
                  <button
                    onClick={closeEquipmentModal}
                    className="px-6 py-2 bg-white border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                    tabIndex={2}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Receipt Modal */}
        {isPrintModalOpen && printData && (
          <PrintReceipt
            isOpen={isPrintModalOpen}
            onClose={closePrintModal}
            transactionData={printData}
            onPrint={() => {
              console.log('Printing accountability form for:', printData);
            }}
          />
        )}

        {toast.show && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className={`px-4 py-3 rounded-lg shadow-xl border-l-4 bg-white ${toast.type === 'success' ? 'border-green-500' : 'border-red-500'
              }`}>
              <div className="flex items-center space-x-3">
                <div className={`${toast.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  } w-8 h-8 rounded-full flex items-center justify-center`}>
                  ✓
                </div>
                <div className="text-gray-800 font-medium">
                  {toast.message}
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default EmployeePage;