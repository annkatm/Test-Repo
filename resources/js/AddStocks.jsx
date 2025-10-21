import React, { useState, useEffect } from 'react';
import HomeSidebar from './HomeSidebar';
import { Copy, Plus, Minus, X, ChevronRight, ArrowLeft, Grid3X3, Search } from 'lucide-react';
import GlobalHeader from './components/GlobalHeader';

// Add custom scrollbar styles
const scrollbarStyles = `
  .select-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #3B82F6 #F3F4F6;
  }
  .select-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .select-scrollbar::-webkit-scrollbar-track {
    background: #F3F4F6;
    border-radius: 4px;
  }
  .select-scrollbar::-webkit-scrollbar-thumb {
    background: #3B82F6;
    border-radius: 4px;
  }
  .select-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #2563EB;
  }
`;

const style = document.createElement('style');
style.textContent = scrollbarStyles;
document.head.appendChild(style);

const rows = [
  { id: 1, item: 'Lenovo', serial: '353454', date: 'Sept 05 2025', status: 'Available', price: '₱0.00' },
  { id: 2, item: 'Mouse', serial: '4543543', date: 'Sept 5 2025', status: 'Available', price: '₱0.00' },
  { id: 3, item: 'Acer', serial: '345435', date: 'Sept 5 2025', status: 'Available', price: '₱0.00' },
  { id: 4, item: 'Keyboard', serial: '6456546', date: 'Sept 5 2025', status: 'Available', price: '₱0.00' },
  { id: 5, item: 'Monitor', serial: '545644', date: 'Sept 5 2025', status: 'Available', price: '₱0.00' },
  { id: 6, item: 'Mouse', serial: '5646436', date: 'Sept 5 2025', status: 'Available', price: '₱0.00' },
];

const AddStocks = () => {
  const [isAddStocksOpen, setIsAddStocksOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [formData, setFormData] = useState({
    category: '',
    serial_number: '',
    brand: '',
    supplier: '',
    description: '',
    price: '',
    item_image: null,
    receipt_image: null
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch equipment data
  useEffect(() => {
    fetchEquipment();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        setError('Failed to fetch categories');
      }
    } catch (err) {
      setError('Error fetching categories');
    }
  };

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      // Fetch all equipment by setting a large per_page value
      const response = await fetch('/api/equipment?per_page=10000');
      const data = await response.json();
      
      if (data.success) {
        const equipmentWithCategories = data.data.data.map(item => ({
          ...item,
          category: item.category || { id: null, name: 'Uncategorized' }
        }));
        setEquipment(equipmentWithCategories);
      } else {
        setError('Failed to fetch equipment');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error('Error fetching equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort equipment
  const getFilteredAndSortedEquipment = () => {
    let filteredEquipment = [...equipment];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredEquipment = filteredEquipment.filter(
        item =>
          item.name?.toLowerCase().includes(searchLower) ||
          item.brand?.toLowerCase().includes(searchLower) ||
          item.serial_number?.toLowerCase().includes(searchLower) ||
          item.category?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filteredEquipment.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle special cases
        if (sortConfig.key === 'category') {
          aValue = a.category?.name || 'Uncategorized';
          bValue = b.category?.name || 'Uncategorized';
        } else if (sortConfig.key === 'price') {
          aValue = parseFloat(a.purchase_price) || 0;
          bValue = parseFloat(b.purchase_price) || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredEquipment;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'category' ? (value ? parseInt(value, 10) : '') : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      // Check file size (5MB max)
      if (files[0].size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [name]: 'File size must be less than 5MB'
        }));
        return;
      }
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });

      const response = await fetch('/api/equipment', {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error adding equipment');
      }

      // Reset form and close modal on success
      setFormData({
        category: '',
        serial_number: '',
        brand: '',
        supplier: '',
        description: '',
        price: '',
        item_image: null,
        receipt_image: null
      });
      setIsAddItemOpen(false);

    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => setIsAddStocksOpen(false);

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      <div className="flex-shrink-0">
        <HomeSidebar />
      </div>
      <div className="flex-1 flex flex-col">
        <GlobalHeader title="Add Stocks" />

        <main className="flex-1 px-10 py-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-blue-600">Equipment History</h2>
              <p className="text-sm text-gray-600 mt-1">Complete history of all equipment with status and dates</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex-1 max-w-2xl flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search equipment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>
            <div className="space-x-3">
              <button 
                onClick={() => setIsAddStocksOpen(true)} 
                className="px-4 py-2 rounded-md bg-blue-100 text-blue-700 text-sm hover:bg-blue-600 hover:text-white"
              >
                Add Stocks
              </button>
              <button 
                onClick={() => setIsAddItemOpen(true)} 
                className="px-4 py-2 rounded-md bg-blue-100 text-blue-700 text-sm hover:bg-blue-600 hover:text-white"
              >
                Add Item
              </button>
            </div>
          </div>

          {/* Table with proper HTML structure */}
          <div className="mt-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading equipment...</div>
              ) : error ? (
                <div className="p-8 text-center text-red-500">{error}</div>
              ) : equipment.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No equipment found. Add some items to get started.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th 
                        onClick={() => {
                          const direction = sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                          setSortConfig({ key: 'name', direction });
                        }}
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          Items
                          {sortConfig.key === 'name' && (
                            <span className="ml-2">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => {
                          const direction = sortConfig.key === 'serial_number' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                          setSortConfig({ key: 'serial_number', direction });
                        }}
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          Serial Number
                          {sortConfig.key === 'serial_number' && (
                            <span className="ml-2">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => {
                          const direction = sortConfig.key === 'category' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                          setSortConfig({ key: 'category', direction });
                        }}
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          Category
                          {sortConfig.key === 'category' && (
                            <span className="ml-2">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                      <th 
                        onClick={() => {
                          const direction = sortConfig.key === 'price' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                          setSortConfig({ key: 'price', direction });
                        }}
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          Price
                          {sortConfig.key === 'price' && (
                            <span className="ml-2">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Date Added</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAndSortedEquipment().map((item, index) => (
                      <tr 
                        key={item.id}
                        className={`
                          ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} 
                          hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0
                        `}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            {item.item_image ? (
                              <img 
                                src={`/storage/${item.item_image}`} 
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover mr-3"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                                <span className="text-gray-400 text-xs">No img</span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.brand}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-700">{item.serial_number}</td>
                        <td className="py-4 px-6 text-gray-700">
                          {item.category?.name || 'Uncategorized'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium
                            ${item.status === 'available' ? 'bg-green-100 text-green-800' : ''}
                            ${item.status === 'in_use' ? 'bg-blue-100 text-blue-800' : ''}
                            ${item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${item.status === 'retired' ? 'bg-gray-100 text-gray-800' : ''}
                          `}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-700 font-medium">
                          ₱{Number(item.purchase_price).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                        <td className="py-4 px-6 text-gray-700 text-sm">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          <button 
                            onClick={() => {
                              setSelectedEquipment(item);
                              setIsAddStocksOpen(true);
                            }}
                            className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Add Stock"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>

        {isAddStocksOpen && (
          <AddStocksModal
            onClose={closeModal}
            selectedEquipment={selectedEquipment}
            categories={categories}
            onSuccess={fetchEquipment}
          />
        )}
        {isAddItemOpen && (
          <AddItemModal 
            onClose={() => setIsAddItemOpen(false)} 
            categories={categories}
            onSuccess={fetchEquipment}
          />
        )}
      </div>
    </div>
  );
};

export default AddStocks;

// New AddStocksModal Component with Three Progressive Modes
const AddStocksModal = ({ onClose, selectedEquipment, categories = [], onSuccess }) => {
  const [currentMode, setCurrentMode] = useState('category'); // 'category', 'product', 'serial'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [serialNumbers, setSerialNumbers] = useState(['']);
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch products when category is selected
  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory.id);
    }
  }, [selectedCategory]);

  const fetchProducts = async (categoryId) => {
    try {
      setLoading(true);
      // Fetch all products for the category by setting a large per_page value
      const response = await fetch(`/api/equipment?category_id=${categoryId}&per_page=10000`);
      const data = await response.json();
      
      if (data.success) {
        // Group equipment by name/brand to show only item types, not individual units
        const equipmentItems = data.data.data || [];
        const groupedItems = equipmentItems.reduce((acc, item) => {
          // Create unique key based on name and brand for grouping
          const key = `${item.name || 'Unknown'}_${item.brand || 'Unknown'}`;
          if (!acc[key]) {
            acc[key] = {
              id: item.id, // Use the first item's ID as the group ID
              name: item.name,
              brand: item.brand,
              specifications: item.specifications,
              item_image: item.item_image,
              category_id: item.category_id,
              // Count how many units exist (dynamic count)
              existing_count: 1,
              available_count: item.status === 'available' ? 1 : 0,
              in_use_count: item.status === 'in_use' ? 1 : 0,
              items: [item] // Keep track of all items
            };
          } else {
            // Increment count for each additional item with same name/brand
            acc[key].existing_count += 1;
            if (item.status === 'available') {
              acc[key].available_count += 1;
            }
            if (item.status === 'in_use') {
              acc[key].in_use_count += 1;
            }
            acc[key].items.push(item);
          }
          return acc;
        }, {});
        
        setProducts(Object.values(groupedItems));
      } else {
        setErrors({ products: 'Failed to fetch products' });
      }
    } catch (err) {
      setErrors({ products: 'Error fetching products' });
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    fetchProducts(category.id); // Fetch products when category is selected
    setCurrentMode('product');
    setErrors({});
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setCurrentMode('serial');
    setErrors({});
  };

  const handleSerialChange = (index, value) => {
    const newSerialNumbers = [...serialNumbers];
    newSerialNumbers[index] = value;
    setSerialNumbers(newSerialNumbers);
  };

  const addSerialField = () => {
    setSerialNumbers([...serialNumbers, '']);
  };

  const removeSerialField = (index) => {
    const newSerialNumbers = serialNumbers.filter((_, idx) => idx !== index);
    setSerialNumbers(newSerialNumbers);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ receipt: 'File size must be less than 5MB' });
        return;
      }
      setReceipt(file);
      setReceiptPreview(URL.createObjectURL(file));
      setErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate serial numbers
    const emptySerials = serialNumbers.filter(s => !s.trim());
    if (emptySerials.length > 0) {
      setErrors({ serials: 'All serial numbers must be filled' });
      setLoading(false);
      return;
    }

    // Validate receipt
    if (!receipt) {
      setErrors({ receipt: 'Receipt image is required' });
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('equipment_id', selectedProduct.id);
      formData.append('serial_numbers', JSON.stringify(serialNumbers));
      formData.append('receipt_image', receipt);

      const response = await fetch('/api/equipment/add-stock', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error adding stocks');
      }

      // Trigger equipment update event for dynamic refresh
      window.dispatchEvent(new Event('equipment:updated'));
      
      if (onSuccess) onSuccess();
      onClose();
      
      // Refresh the products list to show updated counts
      if (selectedCategory) {
        await fetchProducts(selectedCategory.id);
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (currentMode === 'product') {
      setCurrentMode('category');
      setSelectedCategory(null);
    } else if (currentMode === 'serial') {
      setCurrentMode('product');
      setSelectedProduct(null);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.specifications?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[700px] max-w-[92vw] p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-blue-600">
          <X className="h-6 w-6" />
        </button>
        <h3 className="text-xl font-bold text-blue-600 text-center">Add Stocks</h3>

        {/* Category Selection Mode */}
        {currentMode === 'category' && (
          <div className="mt-6">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Monitor"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
              />
              <div className="absolute left-3 top-3.5 text-gray-400">
                <Search className="h-5 w-5" />
              </div>
              <button className="absolute right-3 top-3.5 text-gray-400">
                <Grid3X3 className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                >
                  <div className="font-medium text-gray-900">{category.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Selection Mode */}
        {currentMode === 'product' && (
          <div className="mt-6">
            <div className="flex items-center mb-4">
              <button
                onClick={goBack}
                className="flex items-center text-blue-600 hover:text-blue-700 mr-3"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </button>
              <span className="text-sm text-gray-600">{selectedCategory?.name}</span>
            </div>

            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
              />
              <div className="absolute left-3 top-3.5 text-gray-400">
                <Search className="h-5 w-5" />
              </div>
              <button className="absolute right-3 top-3.5 text-gray-400">
                <Grid3X3 className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No products found</div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-gray-900">{product.brand}</div>
                    <div className="text-sm text-gray-500">{product.specifications}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Available: {product.available_count || 0}/{product.existing_count || 0}
                      {product.in_use_count > 0 && (
                        <span className="ml-2 text-orange-600">({product.in_use_count} in use)</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Serial Number Entry Mode */}
        {currentMode === 'serial' && (
          <form onSubmit={handleSubmit}>
            {/* Selected Product Info */}
            <div className="mt-6">
              <div className="flex items-center mb-4">
                <button
                  onClick={goBack}
                  className="flex items-center text-blue-600 hover:text-blue-700 mr-3"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </button>
                <span className="text-sm text-gray-600">{selectedCategory?.name}</span>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-4">
                  {selectedProduct?.item_image ? (
                    <img 
                      src={`/storage/${selectedProduct.item_image}`}
                      alt={selectedProduct.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No img</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900">{selectedProduct?.brand}</h4>
                      <button className="p-1 rounded text-gray-400 hover:text-blue-600">
                        <Grid3X3 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{selectedProduct?.specifications}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Serial Numbers */}
            <div className="mb-6">
              <label className="text-sm text-gray-600 mb-2 block">Serial Numbers</label>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {serialNumbers.map((serial, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <label className="text-sm text-gray-500 w-20">Serial No.</label>
                    <input 
                      value={serial}
                      onChange={(e) => handleSerialChange(idx, e.target.value)}
                      placeholder="4354354"
                      className="flex-1 px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                    <button 
                      type="button"
                      onClick={addSerialField}
                      className="p-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    {serialNumbers.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeSerialField(idx)}
                        className="p-1.5 rounded-md bg-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.serials && (
                <p className="mt-1 text-sm text-red-500">{errors.serials}</p>
              )}
            </div>

            {/* Receipt Upload */}
            <div className="mb-6">
              <label className="text-sm text-gray-600 mb-2 block">Description</label>
              <div 
                className={`h-36 w-full border-2 border-dashed rounded-lg ${
                  receipt ? 'border-blue-300' : 'border-gray-300'
                } ${
                  errors.receipt ? 'border-red-500' : ''
                } hover:border-blue-400 transition-colors relative overflow-hidden`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileChange({ target: { files: [file] } });
                }}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {receiptPreview ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={receiptPreview} 
                      alt="Receipt preview" 
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReceipt(null);
                        setReceiptPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="p-2 rounded-full bg-gray-100 mb-2">
                      <Grid3X3 className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="text-sm font-medium text-gray-700">Click to upload</div>
                    <div className="text-xs text-gray-500 mt-1">or drag and drop</div>
                    <div className="text-xs text-gray-400 mt-2">
                      JPEG, PNG, GIF, WebP up to 5MB
                    </div>
                  </div>
                )}
              </div>
              {errors.receipt && (
                <p className="mt-1 text-sm text-red-500">{errors.receipt}</p>
              )}
            </div>

            {errors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {errors.submit}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-5 py-2 rounded-full ${
                  loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                } text-white transition-colors`}
              >
                <span>{loading ? 'Saving...' : 'Save'}</span>
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const AddItemModal = ({ onClose, categories = [], onSuccess }) => {
  const [formData, setFormData] = useState({
    category: '',
    serial_number: '',
    brand: '',
    supplier: '',
    description: '',
    price: '',
    item_image: null,
    receipt_image: null
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [preview, setPreview] = useState({
    item_image: null,
    receipt_image: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      if (files[0].size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [name]: 'File size must be less than 5MB'
        }));
        return;
      }

      // Create preview URL
      const url = URL.createObjectURL(files[0]);
      setPreview(prev => ({
        ...prev,
        [name]: url
      }));

      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));

      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: null }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validation
    const requiredFields = ['category', 'serial_number', 'brand', 'supplier', 'description'];
    const newErrors = {};
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'This field is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();

      // Special handling for category - convert to category_id
      if (formData.category) {
        formDataToSend.append('category_id', formData.category);
      }

      // Add other form fields
      const fieldsToAdd = ['serial_number', 'brand', 'supplier', 'description', 'price'];
      fieldsToAdd.forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add files if they exist
      if (formData.item_image) {
        formDataToSend.append('item_image', formData.item_image);
      }
      if (formData.receipt_image) {
        formDataToSend.append('receipt_image', formData.receipt_image);
      }

      const response = await fetch('/api/equipment', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Server response:', data);
        throw new Error(data.message || 'Error adding equipment');
      }

      // Show success message
      setShowSuccess(true);
      
      // Reset form and refresh after a short delay
      setTimeout(() => {
        handleReset();
        if (onSuccess) {
          onSuccess();
        }
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };



  const handleReset = () => {
    setFormData({
      category: '',
      serial_number: '',
      brand: '',
      supplier: '',
      description: '',
      price: '0',
      item_image: null,
      receipt_image: null
    });
    setPreview({
      item_image: null,
      receipt_image: null
    });
    setErrors({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[880px] max-w-[95vw] p-8">
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 text-gray-500 hover:text-blue-600"
          type="button"
        >
          <X className="h-6 w-6" />
        </button>
        <h3 className="text-xl font-bold text-blue-600 text-center">Add Equipment</h3>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="text-sm text-gray-600">Category*</label>
              <div className="mt-2">
                <div className="relative">
                  {/* Dropdown trigger button */}
                  <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full px-3 py-2 rounded-md bg-gray-100 cursor-pointer flex items-center justify-between ${
                      errors.category ? 'border-red-500' : 'border-transparent'
                    } border hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <span className={!formData.category ? 'text-gray-500' : ''}>
                      {formData.category ? 
                        categories.find(c => c.id === formData.category)?.name 
                        : 'Select a category'}
                    </span>
                    <ChevronRight 
                      className={`h-4 w-4 text-gray-700 transform transition-transform ${
                        isDropdownOpen ? 'rotate-90' : ''
                      }`} 
                    />
                  </div>

                  {/* Dropdown menu */}
                  {isDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                      <div 
                        className="max-h-48 overflow-y-auto select-scrollbar"
                      >
                        {categories && categories.map(category => (
                          <div
                            key={category.id}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                              formData.category === category.id ? 'bg-blue-50 text-blue-600' : ''
                            }`}
                            onClick={() => {
                              handleInputChange({
                                target: { name: 'category', value: category.id }
                              });
                              setIsDropdownOpen(false);
                            }}
                          >
                            {category.name || 'Unknown Category'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Serial Number*</label>
              <input 
                name="serial_number"
                value={formData.serial_number}
                onChange={handleInputChange}
                className={`mt-2 w-full px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.serial_number ? 'border-red-500' : ''
                }`}
                placeholder="4354354"
              />
              {errors.serial_number && <p className="mt-1 text-sm text-red-500">{errors.serial_number}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600">Brand*</label>
              <input 
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                className={`mt-2 w-full px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.brand ? 'border-red-500' : ''
                }`}
                placeholder="Brand name"
              />
              {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Supplier*</label>
              <input 
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                className={`mt-2 w-full px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.supplier ? 'border-red-500' : ''
                }`}
                placeholder="Supplier name"
              />
              {errors.supplier && <p className="mt-1 text-sm text-red-500">{errors.supplier}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600">Description*</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={`mt-2 w-full px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : ''
                }`}
                placeholder="Item description"
                rows={3}
              />
              {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Price</label>
              <input 
                name="price"
                type="number"
                value={formData.price}
                onChange={handleInputChange}
                className="mt-2 w-full px-3 py-2 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="₱ 0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Item image</label>
              <div className="mt-2">
                <div 
                  className={`h-36 w-full border-2 border-dashed rounded-lg ${
                    formData.item_image ? 'border-blue-300' : 'border-gray-300'
                  } ${
                    errors.item_image ? 'border-red-500' : ''
                  } hover:border-blue-400 transition-colors relative overflow-hidden`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileChange({ target: { name: 'item_image', files: [file] }});
                  }}
                >
                  <input
                    type="file"
                    name="item_image"
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {formData.item_image ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={preview.item_image} 
                        alt="Item preview" 
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData(prev => ({ ...prev, item_image: null }));
                          setPreview(prev => ({ ...prev, item_image: null }));
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="p-2 rounded-full bg-blue-50 mb-2">
                        <Plus className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="text-sm font-medium text-gray-700">Click to upload</div>
                      <div className="text-xs text-gray-500 mt-1">or drag and drop</div>
                      <div className="text-xs text-gray-400 mt-2">
                        JPEG, PNG, GIF, WebP up to 5MB
                      </div>
                    </div>
                  )}
                </div>
                {errors.item_image && (
                  <p className="mt-1 text-sm text-red-500">{errors.item_image}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">Receipt image</label>
              <div className="mt-2">
                <div 
                  className={`h-36 w-full border-2 border-dashed rounded-lg ${
                    formData.receipt_image ? 'border-blue-300' : 'border-gray-300'
                  } ${
                    errors.receipt_image ? 'border-red-500' : ''
                  } hover:border-blue-400 transition-colors relative overflow-hidden`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileChange({ target: { name: 'receipt_image', files: [file] }});
                  }}
                >
                  <input
                    type="file"
                    name="receipt_image"
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {formData.receipt_image ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={preview.receipt_image} 
                        alt="Receipt preview" 
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData(prev => ({ ...prev, receipt_image: null }));
                          setPreview(prev => ({ ...prev, receipt_image: null }));
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="p-2 rounded-full bg-blue-50 mb-2">
                        <Plus className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="text-sm font-medium text-gray-700">Click to upload</div>
                      <div className="text-xs text-gray-500 mt-1">or drag and drop</div>
                      <div className="text-xs text-gray-400 mt-2">
                        JPEG, PNG, GIF, WebP up to 5MB
                      </div>
                    </div>
                  )}
                </div>
                {errors.receipt_image && (
                  <p className="mt-1 text-sm text-red-500">{errors.receipt_image}</p>
                )}
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {errors.submit}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-blue-600 hover:underline"
              disabled={loading}
            >
              Reset all
            </button>
            <button
              type="submit"
              className={`inline-flex items-center px-5 py-2 rounded-full ${
                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } text-white transition-colors`}
              disabled={loading}
            >
              <span>{loading ? 'Saving...' : 'Save'}</span>
              <ChevronRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};