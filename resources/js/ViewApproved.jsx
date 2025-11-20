import React, { useState, useEffect, useRef } from 'react';
import { Search, Printer, ChevronDown, Clock, User, CheckCircle, Calendar } from 'lucide-react';
import GlobalHeader from './components/GlobalHeader';
import HomeSidebar from './HomeSidebar';
import ConfirmModal from './components/ConfirmModal.jsx';
import PrintReceipt from './components/PrintReceipt.jsx';
import SelectItemsModal from './components/SelectItemsModal.jsx';
import ViewTransactionModal from './components/ViewTransactionModal';
import VerifyReturnModal from './components/VerifyReturnModal';
import { transactionService, apiUtils } from './services/api.js';
import api from './services/api';
import { showSuccess, showError } from './utils/toastUtils';

const ViewApproved = () => {
  const [approved, setApproved] = useState([]);

  const [currentHolders, setCurrentHolders] = useState([]);
  const [verifyReturns, setVerifyReturns] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    new_requests: 0,
    current_holders: 0,
    verify_returns: 0
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState('viewApproved');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrollY, setScrollY] = useState(0);
  const scrollContainerRef = useRef(null);

  // Modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null,
    transactionData: null
  });
  const [printModal, setPrintModal] = useState({
    isOpen: false,
    transactionData: null
  });

  const [selectItemsModal, setSelectItemsModal] = useState({
    isOpen: false,
    transactionData: null
  });

  const [viewHolderModal, setViewHolderModal] = useState({
    isOpen: false,
    holderData: null
  });

  const [viewReturnModal, setViewReturnModal] = useState({
    isOpen: false,
    returnData: null
  });

  const [viewApprovedModal, setViewApprovedModal] = useState({
    isOpen: false,
    transactionData: null
  });

  // State to track expanded rows (to show request dates)
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Helper function to get avatar URL from employee/user data
  const getAvatarUrl = (data) => {
    const avatar = data.avatar_url || data.profile_photo_url || data.photo_url || data.employee_image || data.avatar || null;

    // Check if avatar is null, undefined, empty string, or just whitespace
    if (!avatar || (typeof avatar === 'string' && avatar.trim() === '')) return null;
    // If it's already a full URL, return it
    if (avatar.includes('http') || avatar.startsWith('/storage/')) return avatar;
    // Otherwise prepend storage path
    return `/storage/${avatar}`;
  };

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Handle scroll events for fade-out effect
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setScrollY(scrollContainerRef.current.scrollTop);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats
      const statsResponse = await transactionService.getDashboard();
      if (statsResponse.success) {
        setDashboardStats(statsResponse.data);
      }

      // Fetch approved requests (status = 'approved' - ready for release)
      const approvedResponse = await api.get('/requests', { params: { status: 'approved' } });
      if (approvedResponse.data.success) {
        setApproved(approvedResponse.data.data);
      } else {
        console.error('Failed to fetch approved requests:', approvedResponse.data.message);
      }

      // Fetch current holders (status = 'released' - equipment released)
      const holdersResponse = await transactionService.getAll({ status: 'released' });
      if (holdersResponse.success) {
        const list = Array.isArray(holdersResponse.data) ? holdersResponse.data : [];
        const seen = new Set();
        const deduped = list.filter((h) => {
          const key = h.id || `${h.employee_id}-${h.equipment_id}-${h.status}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        // Enrich with equipment data to ensure correct serial/brand/category
        const enriched = await Promise.all(deduped.map(async (h) => {
          const eqId = h?.equipment_id;
          if (!eqId) return h;
          try {
            const resp = await api.get(`/equipment/${eqId}`);
            const eq = resp?.data?.data || {};
            return {
              ...h,
              serial_number: h.serial_number || h.equipment_serial_number || eq.serial_number || h.asset_tag || h.serial_number,
              brand: h.brand || eq.brand || h.brand,
              category_name: h.category_name || (eq.category?.name || eq.category_name) || h.category_name,
              equipment: h.equipment || eq
            };
          } catch (_) {
            return h;
          }
        }));
        setCurrentHolders(enriched);
      } else {
        console.error('Failed to fetch current holders:', holdersResponse.message);
      }

      // Fetch verify returns (status = 'returned' - equipment returned)
      const returnsResponse = await transactionService.getAll({ status: 'returned' });
      if (returnsResponse.success) {
        setVerifyReturns(returnsResponse.data);
      } else {
        console.error('Failed to fetch verify returns:', returnsResponse.message);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(apiUtils.handleError(err));
    } finally {
      setLoading(false);
    }
  };

  // UI helpers
  const formatRequestMode = (mode) => {
    const normalized = (mode || '').toString().toLowerCase();
    if (['work_from_home', 'wfh', 'work from home'].includes(normalized)) return 'W.F.H';
    return 'On-site';
  };

  const handleSelect = (next) => {
    setView(next);
    setIsMenuOpen(false);
  };

  // Group approved requests by employee
  const groupApprovedByEmployee = (requests) => {
    const grouped = {};
    requests.forEach(req => {
      const employeeName = req.full_name || req.employee_name || req.name || 'Unknown';
      if (!grouped[employeeName]) {
        grouped[employeeName] = {
          id: req.id, // Use first request ID as group ID
          full_name: employeeName,
          position: req.position || 'N/A',
          status: req.status || 'approved',
          approved_by_name: req.approved_by_name || 'N/A',
          employee_id: req.employee_id,
          avatar_url: getAvatarUrl(req),
          request_date: req.request_date || req.created_at || req.approved_at || null,
          requests: [],
          items: []
        };
      }
      grouped[employeeName].requests.push(req);
      grouped[employeeName].items.push({
        id: req.equipment_id,
        requestId: req.id,
        equipment_name: req.equipment_name || 'Unknown Item',
        name: req.equipment_name || 'Unknown Item',
        equipment_id: req.equipment_id,
        brand: req.brand || '',
        model: req.model || '',
        category_name: req.category_name || '',
        category: req.category_name || '',
        serial_number: req.serial_number || req.equipment_serial_number || req.asset_tag || 'N/A',
        specifications: req.specifications || req.specs || [req.brand, req.model].filter(Boolean).join(' ') || req.category_name || '',
        specs: req.specifications || req.specs || [req.brand, req.model].filter(Boolean).join(' ') || req.category_name || '',
        request_date: req.request_date || req.created_at || req.approved_at || null
      });
    });
    return Object.values(grouped);
  };

  const groupedApproved = groupApprovedByEmployee(approved);

  // Group current holders by employee
  const groupCurrentHoldersByEmployee = (holders) => {
    const grouped = {};
    holders.forEach(holder => {
      const employeeName = holder.full_name || holder.employee_name || holder.name || 'Unknown';
      if (!grouped[employeeName]) {
        grouped[employeeName] = {
          id: holder.id,
          full_name: employeeName,
          position: holder.position || 'N/A',
          request_mode: holder.request_mode,
          expected_return_date: holder.expected_return_date,
          request_date: holder.request_date || holder.created_at,
          created_at: holder.created_at,
          holders: [],
          items: []
        };
      }
      grouped[employeeName].holders.push(holder);
      grouped[employeeName].items.push({
        id: holder.equipment_id || holder.id,
        equipment_id: holder.equipment_id,
        equipment_name: holder.equipment_name || 'Unknown Item',
        name: holder.equipment_name || 'Unknown Item',
        brand: holder.brand || '',
        model: holder.model || '',
        category_id: holder.category_id || null,
        category_name: holder.category_name || holder.category || '',
        category: holder.category_name || holder.category || '',
        serial_number: holder.serial_number || holder.equipment_serial_number || holder.asset_tag || 'N/A',
        specifications: holder.specifications || holder.specs || [holder.brand, holder.model].filter(Boolean).join(' ') || holder.category_name || '',
        specs: holder.specifications || holder.specs || [holder.brand, holder.model].filter(Boolean).join(' ') || holder.category_name || ''
      });
    });
    return Object.values(grouped);
  };

  const groupedCurrentHolders = groupCurrentHoldersByEmployee(currentHolders);

  // Group verify returns by employee
  const groupVerifyReturnsByEmployee = (returns) => {
    const grouped = {};
    returns.forEach(returnItem => {
      const employeeName = returnItem.full_name || returnItem.employee_name || returnItem.name || 'Unknown';
      if (!grouped[employeeName]) {
        grouped[employeeName] = {
          id: returnItem.id,
          full_name: employeeName,
          position: returnItem.position || 'N/A',
          return_date: returnItem.return_date || returnItem.expected_return_date,
          returns: [],
          items: []
        };
      }
      grouped[employeeName].returns.push(returnItem);
      grouped[employeeName].items.push({
        id: returnItem.equipment_id || returnItem.id,
        equipment_name: returnItem.equipment_name || 'Unknown Item',
        category_name: returnItem.category_name || returnItem.category || 'Uncategorized',
        // pass through serial number from multiple possible fields
        serial_number: returnItem.serial_number || returnItem.equipment_serial_number || returnItem.asset_tag || null,
        // pass through specifications/specs
        specifications: returnItem.specifications || returnItem.specs || [returnItem.brand, returnItem.model].filter(Boolean).join(' '),
        // pass through return condition and notes
        return_condition: returnItem.return_condition || null,
        return_notes: returnItem.return_notes || null,
        // image fields for thumbnail
        item_image: returnItem.item_image || null,
        item_image_url: returnItem.item_image_url || null,
        // evidence can be stored under multiple possible keys
        return_evidence: returnItem.return_evidence || returnItem.damage_evidence || returnItem.evidence_url || returnItem.evidence || null
      });
    });
    return Object.values(grouped);
  };

  const groupedVerifyReturns = groupVerifyReturnsByEmployee(verifyReturns);

  // Handle release action
  const handleRelease = async (data) => {
    try {
      // Check if we have saved print data with updated serial numbers
      const savedPrintData = printModal.transactionData;
      // Prefer mapping by equipment_id; fall back to index order; avoid name-based clashes
      const savedByEquipmentId = {};
      const savedByIndex = [];
      if (savedPrintData?.items && Array.isArray(savedPrintData.items)) {
        savedPrintData.items.forEach((item, idx) => {
          savedByIndex[idx] = item?.serial_number;
          if (item?.equipment_id) {
            savedByEquipmentId[item.equipment_id] = item.serial_number;
          }
        });
      }
      console.log('Saved serials by equipment_id:', savedByEquipmentId);

      // Handle grouped requests
      const requests = data.requests || [data];
      const releasedTransactions = [];
      // Track already assigned equipment within this batch to avoid duplicates
      const usedEquipmentIds = new Set();
      const usedSerials = new Set();
      const processedRequestIds = [];

      for (let requestIndex = 0; requestIndex < requests.length; requestIndex++) {
        const request = requests[requestIndex];

        // Resolve the actual transaction id from the approved request row
        let txId = null;
        let existingTransaction = null;

        // Primary: by request_id
        const byRequest = await transactionService.getAll({ request_id: request.id });
        if (byRequest?.success && Array.isArray(byRequest.data) && byRequest.data.length > 0) {
          txId = byRequest.data[0].id;
          existingTransaction = byRequest.data[0];
        }

        // Fallback: by employee and equipment for older rows not linked
        if (!txId && (request.employee_id && request.equipment_id)) {
          const byRefs = await transactionService.getAll({ employee_id: request.employee_id, equipment_id: request.equipment_id, status: 'pending' });
          if (byRefs?.success && Array.isArray(byRefs.data) && byRefs.data.length > 0) {
            txId = byRefs.data[0].id;
            existingTransaction = byRefs.data[0];
          }
        }

        if (!txId) {
          console.warn(`No transaction found for request ${request.id}`);
          continue;
        }

        // Check if already released
        if (existingTransaction?.status === 'released') {
          console.log(`Transaction ${txId} is already released, moving to current holders...`);
          releasedTransactions.push(existingTransaction);
          processedRequestIds.push(request.id);
          continue;
        }

        // Resolve updated serial number from saved print data
        let savedSerialNumber = null;
        // 1) Prefer mapping by equipment_id
        if (request.equipment_id && savedByEquipmentId[request.equipment_id]) {
          savedSerialNumber = savedByEquipmentId[request.equipment_id];
        }
        // 2) If counts align, use index-based mapping
        if (!savedSerialNumber && savedByIndex.length && savedByIndex.length === requests.length) {
          savedSerialNumber = savedByIndex[requestIndex] || null;
          if (savedSerialNumber) {
            console.log(`Using index-based serial for request ${request.id}:`, savedSerialNumber);
          }
        }
        // 3) As a last resort when only one item exists
        if (!savedSerialNumber && savedPrintData?.items?.length === 1 && requests.length === 1) {
          savedSerialNumber = savedPrintData.items[0]?.serial_number || null;
        }
        // Define for logging below
        const requestEquipmentName = (request.equipment_name || request.equipment?.name || '').trim();

        console.log(`Checking serial number for request ${request.id}:`, {
          equipmentName: requestEquipmentName,
          savedSerialNumber: savedSerialNumber,
          hasSavedData: !!savedSerialNumber,
          savedItemsCount: savedPrintData?.items?.length || 0,
          requestsCount: requests.length
        });

        // Track if we changed equipment for this transaction
        let matchingEquipment = null;

        if (savedSerialNumber && savedSerialNumber !== 'N/A' && existingTransaction) {
          // Get the original serial number from the transaction
          const originalEquipmentId = existingTransaction.equipment_id;

          try {
            // Fetch the original equipment to get its serial number
            const originalEquipmentResponse = await api.get(`/equipment/${originalEquipmentId}`);
            const originalSerialNumber = originalEquipmentResponse?.data?.data?.serial_number;

            // If the serial number changed, find the new equipment
            if (savedSerialNumber !== originalSerialNumber) {
              console.log(`Serial number changed from ${originalSerialNumber} to ${savedSerialNumber}, updating equipment...`);

              // Find equipment with the new serial number
              const equipmentListResponse = await api.get('/equipment', {
                params: {
                  search: savedSerialNumber,
                  per_page: 100
                }
              });

              if (equipmentListResponse?.data?.success && equipmentListResponse.data.data?.data) {
                matchingEquipment = equipmentListResponse.data.data.data.find(
                  eq => eq.serial_number === savedSerialNumber
                );

                if (matchingEquipment) {
                  // Avoid assigning the same equipment/serial to multiple requests in this batch
                  if (usedEquipmentIds.has(matchingEquipment.id) || usedSerials.has(savedSerialNumber)) {
                    console.warn(`Serial ${savedSerialNumber} already assigned in this batch. Skipping reassignment for request ${request.id}.`);
                    matchingEquipment = null;
                  }
                }

                if (matchingEquipment) {
                  console.log(`Found equipment with serial ${savedSerialNumber}, updating transaction equipment_id...`);

                  // Update equipment statuses:
                  // IMPORTANT: Update transaction FIRST, then update equipment statuses
                  // This ensures the old equipment is no longer linked to this transaction

                  // 1. Update the transaction's equipment_id to point to the new equipment FIRST
                  await transactionService.update(txId, {
                    equipment_id: matchingEquipment.id
                  });
                  console.log(`✓ Updated transaction ${txId} equipment_id from ${originalEquipmentId} to ${matchingEquipment.id}`);

                  // 2. Set old equipment back to "available" (now that transaction is updated)
                  try {
                    const oldEquipmentData = originalEquipmentResponse?.data?.data;
                    if (oldEquipmentData) {
                      // Check if there are other active transactions (pending or released) for this equipment
                      // Exclude the current transaction we just updated
                      const allTransactions = await transactionService.getAll({
                        equipment_id: originalEquipmentId
                      });

                      // Filter out the current transaction and check if any remain
                      const otherActiveTransactions = (allTransactions?.data || []).filter(
                        tx => tx.id !== txId && (tx.status === 'pending' || tx.status === 'released')
                      );

                      // Only set to available if no other active transactions are using this equipment
                      if (otherActiveTransactions.length === 0) {
                        await api.put(`/equipment/${originalEquipmentId}`, {
                          status: 'available'
                        });
                        console.log(`✓ Updated old equipment ${originalEquipmentId} (${originalSerialNumber}) to available`);
                      } else {
                        console.log(`⚠ Old equipment ${originalEquipmentId} has ${otherActiveTransactions.length} other active transaction(s), keeping status`);
                      }
                    }
                  } catch (e) {
                    console.warn('Error updating old equipment status:', e);
                  }

                  // 3. Set new equipment to "borrowed" (will be released)
                  try {
                    const currentStatus = matchingEquipment.status;
                    if (currentStatus !== 'borrowed' && currentStatus !== 'issued') {
                      await api.put(`/equipment/${matchingEquipment.id}`, {
                        status: 'borrowed'
                      });
                      console.log(`✓ Updated new equipment ${matchingEquipment.id} (${savedSerialNumber}) to borrowed`);
                    } else {
                      console.log(`ℹ New equipment ${matchingEquipment.id} status is already ${currentStatus}`);
                    }
                    // Mark this serial/equipment as used in this batch
                    usedEquipmentIds.add(matchingEquipment.id);
                    usedSerials.add(savedSerialNumber);
                  } catch (e) {
                    console.warn('Error updating new equipment status:', e);
                  }

                  // Refresh the transaction data
                  const updatedTx = await transactionService.getById(txId);
                  if (updatedTx?.success) {
                    existingTransaction = updatedTx.data;
                  }
                } else {
                  console.warn(`❌ Equipment with serial number ${savedSerialNumber} not found`);
                }
              }
            }
          } catch (e) {
            console.warn('Error updating equipment for serial number change:', e);
          }
        }

        try {
          const response = await transactionService.release(txId, {
            notes: data.notes || request.notes,
            condition_on_issue: data.condition_on_issue || request.condition_on_issue
          });

          if (response.success) {
            // Ensure equipment status is updated to "borrowed" after release
            // Only update if we didn't already change the equipment (to avoid overwriting)
            const finalEquipmentId = existingTransaction.equipment_id;
            if (finalEquipmentId && finalEquipmentId === matchingEquipment?.id) {
              // Only update if this is the new equipment we just switched to
              try {
                const equipmentCheck = await api.get(`/equipment/${finalEquipmentId}`);
                const currentStatus = equipmentCheck?.data?.data?.status;
                if (currentStatus !== 'borrowed' && currentStatus !== 'issued') {
                  await api.put(`/equipment/${finalEquipmentId}`, {
                    status: 'borrowed'
                  });
                  console.log(`✓ Updated equipment ${finalEquipmentId} to borrowed after release`);
                } else {
                  console.log(`ℹ Equipment ${finalEquipmentId} status is already ${currentStatus} after release`);
                }
              } catch (e) {
                console.warn('Error updating equipment status after release:', e);
              }
            } else if (finalEquipmentId && !matchingEquipment) {
              // If no equipment change, just ensure it's borrowed
              try {
                await api.put(`/equipment/${finalEquipmentId}`, {
                  status: 'borrowed'
                });
                console.log(`✓ Updated equipment ${finalEquipmentId} to borrowed after release (no change)`);
              } catch (e) {
                console.warn('Error updating equipment status after release:', e);
              }
            }

            releasedTransactions.push(response.data);
            processedRequestIds.push(request.id);
          }
        } catch (releaseError) {
          // If error indicates already released, fetch the transaction and add to current holders
          const errorMsg = releaseError.response?.data?.message || releaseError.message || '';
          if (errorMsg.toLowerCase().includes('already released')) {
            console.log(`Transaction ${txId} is already released, fetching and moving to current holders...`);

            // Fetch the released transaction with status 'released'
            const releasedTx = await transactionService.getAll({ id: txId, status: 'released' });
            if (releasedTx?.success && Array.isArray(releasedTx.data) && releasedTx.data.length > 0) {
              releasedTransactions.push(releasedTx.data[0]);
              processedRequestIds.push(request.id);
            } else if (existingTransaction) {
              // Use the existing transaction data if we can't fetch it
              releasedTransactions.push(existingTransaction);
              processedRequestIds.push(request.id);
            }
          } else {
            // Re-throw if it's a different error
            throw releaseError;
          }
        }
      }

      if (releasedTransactions.length > 0) {
        // Update the local state - remove all processed requests from approved
        setApproved(prev => prev.filter(item => !processedRequestIds.includes(item.id)));

        // Add released transactions to current holders (dedup)
        setCurrentHolders(prev => {
          const combined = [...(Array.isArray(prev) ? prev : []), ...releasedTransactions];
          const seen = new Set();
          return combined.filter((h) => {
            const key = h.id || `${h.employee_id}-${h.equipment_id}-${h.status}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });

        // Update dashboard stats
        setDashboardStats(prev => ({
          ...prev,
          new_requests: Math.max(0, prev.new_requests - releasedTransactions.length),
          current_holders: prev.current_holders + releasedTransactions.length
        }));

        // Close modal
        setConfirmModal({ isOpen: false, type: null, transactionData: null });

        // Show success message
        const itemText = releasedTransactions.length === 1 ? 'item' : 'items';
        const alreadyReleasedCount = releasedTransactions.filter(tx => tx.status === 'released').length;
        const newlyReleasedCount = releasedTransactions.length - alreadyReleasedCount;

        let message = '';
        if (alreadyReleasedCount > 0 && newlyReleasedCount > 0) {
          message = `${newlyReleasedCount} ${itemText} released successfully! ${alreadyReleasedCount} ${alreadyReleasedCount === 1 ? 'was' : 'were'} already released. Moving to Current Holder view...`;
        } else if (alreadyReleasedCount > 0) {
          message = `${alreadyReleasedCount} ${itemText} ${alreadyReleasedCount === 1 ? 'was' : 'were'} already released. Moving to Current Holder view...`;
        } else {
          message = `${releasedTransactions.length} ${itemText} released successfully! Switching to Current Holder view...`;
        }

        alert(message);

        // Automatically switch to Current Holder view to show the released items
        setTimeout(() => {
          setView('currentHolder');
        }, 1000);
      } else {
        alert('No transactions found to release.');
      }
    } catch (err) {
      console.error('Error releasing equipment:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      if (window.showToast) {
        window.showToast({
          type: 'error',
          title: 'Release Failed',
          message: 'Error releasing equipment: ' + errorMessage,
          duration: 6000
        });
      } else {
        alert('Error releasing equipment: ' + errorMessage);
      }
    }
  };


  // Handle print action - show item selection first
  const handlePrint = async (transactionData) => {
    // Open the item selection modal
    setSelectItemsModal({
      isOpen: true,
      transactionData: transactionData
    });
  };

  const closeSelectItemsModal = () => {
    setSelectItemsModal({
      isOpen: false,
      transactionData: null
    });
  };

  const handleItemsSelected = async (selectedItems) => {
    // Close selection modal
    closeSelectItemsModal();
    
    const transactionData = selectItemsModal.transactionData;
    
    console.log('Selected items from modal:', selectedItems);
    
    // Simply use the selected items directly - they already have all needed properties
    // Just need to ensure they have the print-specific fields
    const itemsForPrint = selectedItems.map(item => ({
      equipment_name: item.equipment_name || item.name || 'N/A',
      brand: item.brand || 'N/A',
      model: item.model || 'N/A',
      serial_number: item.serial_number || 'N/A',
      serial_numbers: item.serial_numbers || (item.serial_number && item.serial_number !== 'N/A' ? [item.serial_number] : []),
      date_released: item.date_released || item.created_at || new Date().toISOString(),
      date_returned: item.date_returned || item.returned_at || null,
      specifications: item.specifications || item.specs || '',
      category_name: item.category_name || item.category || 'Uncategorized'
    }));
    
    const transactionKey = transactionData.requests?.[0]?.id ||
      transactionData.id ||
      `${transactionData.full_name}_${transactionData.items?.[0]?.equipment_name || ''}`;
    
    // Prepare print data with selected items
    const printData = {
      full_name: transactionData.full_name || 'N/A',
      position: transactionData.position || 'N/A',
      department: transactionData.department || 'IT Department',
      items: itemsForPrint,
      notes: transactionData.notes || '',
      _transactionKey: transactionKey
    };
    
    console.log('Print data prepared:', printData);
    
    setPrintModal({ isOpen: true, transactionData: printData });
  };

  // Modal handlers
  const openConfirmModal = (type, transactionData) => {
    setConfirmModal({
      isOpen: true,
      type,
      transactionData
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null, transactionData: null });
  };

  const closePrintModal = () => {
    // Keep transactionData when closing so saved changes persist
    setPrintModal(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const handlePrintDataSave = (updatedData) => {
    // Update the stored transaction data with saved changes
    // Preserve the transaction key so we can match it later
    setPrintModal(prev => ({
      ...prev,
      transactionData: {
        ...updatedData,
        _transactionKey: prev.transactionData?._transactionKey
      }
    }));
  };

  const handleViewHolder = (groupId) => {
    const group = groupedCurrentHolders.find(g => g.id === groupId);
    if (group) {
      setViewHolderModal({
        isOpen: true,
        holderData: group
      });
    }
  };

  const handleCloseViewHolderModal = () => {
    setViewHolderModal({
      isOpen: false,
      holderData: null
    });
  };

  const handleViewReturn = (groupId) => {
    const group = groupedVerifyReturns.find(g => g.id === groupId);
    if (group) {
      setViewReturnModal({
        isOpen: true,
        returnData: group
      });
    }
  };

  const handleCloseViewReturnModal = () => {
    setViewReturnModal({
      isOpen: false,
      returnData: null
    });
  };

  const handleViewApproved = (groupId) => {
    const group = groupedApproved.find(g => g.id === groupId);
    if (group) {
      setViewApprovedModal({
        isOpen: true,
        transactionData: group
      });
    }
  };

  const handleCloseViewApprovedModal = () => {
    setViewApprovedModal({
      isOpen: false,
      transactionData: null
    });
  };

  const handleConfirmReturn = async (returnData) => {
    try {
      // Get all returns in the group
      const returns = returnData.returns || [returnData];
      
      if (!returns || returns.length === 0) {
        showError('No returns found to process', 'Return Error');
        return;
      }

      const processedTransactionIds = [];
      const processedEquipmentIds = [];

      // Process all returns in the group
      for (const returnItem of returns) {
        const transactionId = returnItem.id || returnItem.transaction_id;
        
        if (!transactionId) {
          console.warn('Transaction ID not found for item:', returnItem);
          continue;
        }

        const response = await api.post(`/transactions/${transactionId}/verify-return`, {
          verification_notes: returnData.verificationNotes || 'Return verified and completed'
        });
        
        if (response.data.success) {
          // Track processed transactions and equipment
          processedTransactionIds.push(transactionId);
          if (returnItem.equipment_id) {
            processedEquipmentIds.push(returnItem.equipment_id);
          }
        } else {
          throw new Error(response.data.message || 'Failed to verify return');
        }
      }
      
      // Immediately remove processed returns from verifyReturns state
      if (processedTransactionIds.length > 0) {
        setVerifyReturns(prev => 
          prev.filter(returnItem => {
            const transactionId = returnItem.id || returnItem.transaction_id;
            return !processedTransactionIds.includes(transactionId);
          })
        );
      }
      
      // After processing all returns, refresh data to ensure everything is synced
      await fetchData();
      handleCloseViewReturnModal();
      
      showSuccess(`All equipment items have been successfully returned and are now available`, 'Returns Confirmed');
    } catch (error) {
      console.error('Error processing return:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process return';
      showError(errorMessage, 'Verification Error');
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      <HomeSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <GlobalHeader />
        <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">View Approved Requests</h1>
              <p className="text-gray-600 mt-1">Manage approved equipment requests and current holders</p>
            </div>

            {/* View Selector */}
            <div className="mb-6">
              <div className="relative inline-block">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-700">
                    {view === 'viewApproved' && 'View Approved'}
                    {view === 'currentHolder' && 'Current Holder'}
                    {view === 'verifyReturn' && 'Verify Return'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => handleSelect('viewApproved')}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                        view === 'viewApproved' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      View Approved
                    </button>
                    <button
                      onClick={() => handleSelect('currentHolder')}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                        view === 'currentHolder' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      Current Holder
                    </button>
                    <button
                      onClick={() => handleSelect('verifyReturn')}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                        view === 'verifyReturn' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      Verify Return
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content based on selected view */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-red-500">{error}</div>
              </div>
            ) : (
              <>
                {/* View Approved */}
                {view === 'viewApproved' && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Approved Requests</h2>
                      <p className="text-sm text-gray-600 mt-1">Ready to be released to employees</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groupedApproved.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                No approved requests found
                              </td>
                            </tr>
                          ) : (
                            groupedApproved.map((group) => (
                              <tr 
                                key={group.id}
                                onClick={() => handleViewApproved(group.id)}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      {group.avatar_url ? (
                                        <img className="h-10 w-10 rounded-full" src={group.avatar_url} alt="" />
                                      ) : (
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                          <span className="text-blue-600 font-medium text-sm">{getInitials(group.full_name)}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">{group.full_name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{group.position}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{group.items.length} item(s)</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Approved
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {group.approved_by_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrint(group);
                                      }}
                                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                      title="Print"
                                    >
                                      <Printer className="h-4 w-4 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openConfirmModal('release', group);
                                      }}
                                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                    >
                                      Release
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Current Holder */}
                {view === 'currentHolder' && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Current Holders</h2>
                      <p className="text-sm text-gray-600 mt-1">Employees currently holding equipment</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Return</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groupedCurrentHolders.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                No current holders found
                              </td>
                            </tr>
                          ) : (
                            groupedCurrentHolders.map((group) => (
                              <tr 
                                key={group.id}
                                onClick={() => handleViewHolder(group.id)}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      {group.avatar_url ? (
                                        <img className="h-10 w-10 rounded-full" src={group.avatar_url} alt="" />
                                      ) : (
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                          <span className="text-blue-600 font-medium text-sm">{getInitials(group.full_name)}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">{group.full_name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{group.position}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{group.items.length} item(s)</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    formatRequestMode(group.request_mode) === 'W.F.H' 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {formatRequestMode(group.request_mode)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {group.expected_return_date ? new Date(group.expected_return_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrint(group);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Print"
                                  >
                                    <Printer className="h-4 w-4 text-gray-600" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Verify Return */}
                {view === 'verifyReturn' && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Verify Returns</h2>
                      <p className="text-sm text-gray-600 mt-1">Equipment pending return verification</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groupedVerifyReturns.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                No returns to verify
                              </td>
                            </tr>
                          ) : (
                            groupedVerifyReturns.map((group) => (
                              <tr 
                                key={group.id}
                                onClick={() => handleViewReturn(group.id)}
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      {group.avatar_url ? (
                                        <img className="h-10 w-10 rounded-full" src={group.avatar_url} alt="" />
                                      ) : (
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                          <span className="text-blue-600 font-medium text-sm">{getInitials(group.full_name)}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">{group.full_name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{group.position}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{group.items.length} item(s)</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {group.return_date ? new Date(group.return_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewReturn(group.id);
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                  >
                                    Verify
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={handleRelease}
        transactionData={confirmModal.transactionData}
        type={confirmModal.type}
      />

      {/* Select Items Modal */}
      <SelectItemsModal
        isOpen={selectItemsModal.isOpen}
        onClose={closeSelectItemsModal}
        transactionData={selectItemsModal.transactionData}
        onConfirm={handleItemsSelected}
      />

      {/* Print Receipt Modal */}
      <PrintReceipt
        isOpen={printModal.isOpen}
        onClose={closePrintModal}
        transactionData={printModal.transactionData}
        onSave={handlePrintDataSave}
      />

      {/* View Holder Modal */}
      <ViewTransactionModal
        isOpen={viewHolderModal.isOpen}
        onClose={handleCloseViewHolderModal}
        transactionData={viewHolderModal.holderData}
        onPrint={handlePrint}
      />

      {/* View Return Modal */}
      <VerifyReturnModal
        isOpen={viewReturnModal.isOpen}
        onClose={handleCloseViewReturnModal}
        returnData={viewReturnModal.returnData}
        onConfirmReturn={handleConfirmReturn}
      />

      {/* View Approved Modal */}
      <ViewTransactionModal
        isOpen={viewApprovedModal.isOpen}
        onClose={handleCloseViewApprovedModal}
        transactionData={viewApprovedModal.transactionData}
        onRelease={async (data) => {
          await handleRelease(data);
          handleCloseViewApprovedModal();
        }}
      />

    </div>
  );
};

export default ViewApproved;

          // Try to get serial number from multiple sources
          let serialNumber = tx?.serial_number
            || tx?.equipment_serial_number
            || tx?.equipment?.serial_number
            || request?.serial_number
            || request?.equipment_serial_number;

          // Get equipment name/brand for fetching all serial numbers
          const equipmentName = request.equipment_name || tx?.equipment_name || tx?.equipment?.name || 'N/A';
          const equipmentBrand = request.brand || tx?.brand || 'N/A';
          const equipmentCategoryId = request.category_id || tx?.category_id || tx?.equipment?.category_id || null;

          // Fetch all serial numbers for this equipment (exact match by name AND brand)
          let serialNumbers = [];
          try {
            // Use equipment_id if available for most precise match
            if (request.equipment_id) {
              // First, get the specific equipment to know its exact name and brand
              try {
                const specificEquipmentResponse = await api.get(`/equipment/${request.equipment_id}`);
                if (specificEquipmentResponse?.data?.success) {
                  const specificEq = specificEquipmentResponse.data.data;
                  const exactName = (specificEq.name || '').trim();
                  const exactBrand = (specificEq.brand || '').trim();
                  const exactCategoryId = specificEq.category_id || null;

                  console.log('Fetching serial numbers for equipment:', {
                    id: request.equipment_id,
                    name: exactName,
                    brand: exactBrand,
                    category_id: exactCategoryId
                  });

                  // Build API params - use category_id filter if available (this is critical!)
                  const apiParams = {
                    per_page: 1000
                  };

                  // Add category_id filter if available (this prevents cross-category matches)
                  if (exactCategoryId) {
                    apiParams.category_id = exactCategoryId;
                  }

                  // Now fetch all equipment with the same category (filtered by API)
                  const equipmentListResponse = await api.get('/equipment', {
                    params: apiParams
                  });

                  if (equipmentListResponse?.data?.success && equipmentListResponse.data.data?.data) {
                    const equipmentList = equipmentListResponse.data.data.data;

                    console.log(`Found ${equipmentList.length} equipment items in category ${exactCategoryId}`);

                    serialNumbers = equipmentList
                      .filter(eq => {
                        // First, must have a serial number
                        if (!eq.serial_number) return false;

                        // Primary filter: MUST match category_id if it exists (double-check)
                        if (exactCategoryId && eq.category_id !== exactCategoryId) {
                          return false;
                        }

                        // Get equipment name and brand (don't use fallback - compare actual fields)
                        const eqName = (eq.name || '').trim();
                        const eqBrand = (eq.brand || '').trim();

                        // Secondary filter: Must match both name AND brand exactly
                        const nameMatch = exactName && eqName === exactName;
                        const brandMatch = exactBrand && eqBrand === exactBrand;

                        // Both name and brand must match
                        if (nameMatch && brandMatch) {
                          console.log(`✓ Matched: ${eqName} ${eqBrand} - Serial: ${eq.serial_number}`);
                        }

                        return nameMatch && brandMatch;
                      })
                      .map(eq => eq.serial_number)
                      .filter(Boolean);

                    console.log(`Final serial numbers list (${serialNumbers.length} items):`, serialNumbers);
                  }
                }
              } catch (e) {
                console.warn('Could not fetch specific equipment:', e);
              }
            }

            // Fallback: if equipment_id approach didn't work, try by name and brand
            if (serialNumbers.length === 0 && equipmentName !== 'N/A' && equipmentBrand !== 'N/A') {
              console.log('Using fallback method with name and brand:', { equipmentName, equipmentBrand, equipmentCategoryId });

              // Build API params - use category_id filter if available
              const apiParams = {
                per_page: 1000
              };

              // Add category_id filter if available (this prevents cross-category matches)
              if (equipmentCategoryId) {
                apiParams.category_id = equipmentCategoryId;
              }

              const equipmentListResponse = await api.get('/equipment', {
                params: apiParams
              });

              if (equipmentListResponse?.data?.success && equipmentListResponse.data.data?.data) {
                const equipmentList = equipmentListResponse.data.data.data;
                serialNumbers = equipmentList
                  .filter(eq => {
                    // First, must have a serial number
                    if (!eq.serial_number) return false;

                    // Primary filter: MUST match category_id if it exists (double-check)
                    if (equipmentCategoryId && eq.category_id !== equipmentCategoryId) {
                      return false;
                    }

                    // Get equipment name and brand (don't use fallback - compare actual fields)
                    const eqName = (eq.name || '').trim();
                    const eqBrand = (eq.brand || '').trim();

                    // Secondary filter: Must match both name AND brand exactly
                    const nameMatch = eqName === equipmentName.trim();
                    const brandMatch = eqBrand === equipmentBrand.trim();

                    // Both name and brand must match
                    return nameMatch && brandMatch;
                  })
                  .map(eq => eq.serial_number)
                  .filter(Boolean);
              }
            }
          } catch (e) {
            console.warn('Could not fetch equipment serial numbers:', e);
          }

          // If still no serial number, try fetching equipment details
          if (!serialNumber && request.equipment_id) {
            try {
              const equipmentResponse = await api.get(`/equipment/${request.equipment_id}`);
              if (equipmentResponse?.data?.success) {
                serialNumber = equipmentResponse.data.data?.serial_number;
                // Add to serial numbers array if not already present
                if (serialNumber && !serialNumbers.includes(serialNumber)) {
                  serialNumbers.push(serialNumber);
                }
              }
            } catch (e) {
              console.warn('Could not fetch equipment details:', e);
            }
          }

          // If we have a serial number but it's not in the array, add it
          if (serialNumber && serialNumber !== 'N/A' && !serialNumbers.includes(serialNumber)) {
            serialNumbers.unshift(serialNumber); // Add at the beginning
          }

          allItems.push({
            equipment_id: tx?.equipment_id || request.equipment_id || null,
            equipment_name: equipmentName,
            category_name: request.category_name || tx?.category_name || 'N/A',
            brand: equipmentBrand,
            model: request.model || tx?.model || 'N/A',
            serial_number: serialNumber || 'N/A',
            serial_numbers: serialNumbers.length > 0 ? serialNumbers : (serialNumber && serialNumber !== 'N/A' ? [serialNumber] : []),
            date_released: tx?.release_date || tx?.released_at || tx?.created_at || new Date().toISOString(),
            date_returned: tx?.return_date || tx?.returned_at || null
          });
        } else {
          // If no transaction found, try to fetch equipment serial number directly
          let serialNumber = request?.serial_number || request?.equipment_serial_number;
          const equipmentName = request.equipment_name || 'N/A';
          const equipmentBrand = request.brand || 'N/A';
          const equipmentCategoryId = request.category_id || null;

          // Fetch all serial numbers for this equipment (exact match by name AND brand)
          let serialNumbers = [];
          try {
            // Use equipment_id if available for most precise match
            if (request.equipment_id) {
              // First, get the specific equipment to know its exact name and brand
              try {
                const specificEquipmentResponse = await api.get(`/equipment/${request.equipment_id}`);
                if (specificEquipmentResponse?.data?.success) {
                  const specificEq = specificEquipmentResponse.data.data;
                  const exactName = (specificEq.name || '').trim();
                  const exactBrand = (specificEq.brand || '').trim();
                  const exactCategoryId = specificEq.category_id || null;

                  console.log('Fetching serial numbers for equipment (fallback):', {
                    id: request.equipment_id,
                    name: exactName,
                    brand: exactBrand,
                    category_id: exactCategoryId
                  });

                  // Build API params - use category_id filter if available (this is critical!)
                  const apiParams = {
                    per_page: 1000
                  };

                  // Add category_id filter if available (this prevents cross-category matches)
                  if (exactCategoryId) {
                    apiParams.category_id = exactCategoryId;
                  }

                  // Now fetch all equipment with the same category (filtered by API)
                  const equipmentListResponse = await api.get('/equipment', {
                    params: apiParams
                  });

                  if (equipmentListResponse?.data?.success && equipmentListResponse.data.data?.data) {
                    const equipmentList = equipmentListResponse.data.data.data;

                    console.log(`Found ${equipmentList.length} equipment items in category ${exactCategoryId} (fallback)`);

                    serialNumbers = equipmentList
                      .filter(eq => {
                        // First, must have a serial number
                        if (!eq.serial_number) return false;

                        // Primary filter: MUST match category_id if it exists (double-check)
                        if (exactCategoryId && eq.category_id !== exactCategoryId) {
                          return false;
                        }

                        // Get equipment name and brand (don't use fallback - compare actual fields)
                        const eqName = (eq.name || '').trim();
                        const eqBrand = (eq.brand || '').trim();

                        // Secondary filter: Must match both name AND brand exactly
                        const nameMatch = exactName && eqName === exactName;
                        const brandMatch = exactBrand && eqBrand === exactBrand;

                        // Both name and brand must match
                        if (nameMatch && brandMatch) {
                          console.log(`✓ Matched (fallback): ${eqName} ${eqBrand} - Serial: ${eq.serial_number}`);
                        }

                        return nameMatch && brandMatch;
                      })
                      .map(eq => eq.serial_number)
                      .filter(Boolean);

                    console.log(`Final serial numbers list (fallback, ${serialNumbers.length} items):`, serialNumbers);
                  }
                }
              } catch (e) {
                console.warn('Could not fetch specific equipment:', e);
              }
            }

            // Fallback: if equipment_id approach didn't work, try by name and brand
            if (serialNumbers.length === 0 && equipmentName !== 'N/A' && equipmentBrand !== 'N/A') {
              console.log('Using fallback method with name and brand (no transaction):', { equipmentName, equipmentBrand, equipmentCategoryId });

              // Build API params - use category_id filter if available
              const apiParams = {
                per_page: 1000
              };

              // Add category_id filter if available (this prevents cross-category matches)
              if (equipmentCategoryId) {
                apiParams.category_id = equipmentCategoryId;
              }

              const equipmentListResponse = await api.get('/equipment', {
                params: apiParams
              });

              if (equipmentListResponse?.data?.success && equipmentListResponse.data.data?.data) {
                const equipmentList = equipmentListResponse.data.data.data;
                serialNumbers = equipmentList
                  .filter(eq => {
                    // First, must have a serial number
                    if (!eq.serial_number) return false;

                    // Primary filter: MUST match category_id if it exists (double-check)
                    if (equipmentCategoryId && eq.category_id !== equipmentCategoryId) {
                      return false;
                    }

                    // Get equipment name and brand (don't use fallback - compare actual fields)
                    const eqName = (eq.name || '').trim();
                    const eqBrand = (eq.brand || '').trim();

                    // Secondary filter: Must match both name AND brand exactly
                    const nameMatch = eqName === equipmentName.trim();
                    const brandMatch = eqBrand === equipmentBrand.trim();

                    // Both name and brand must match
                    return nameMatch && brandMatch;
                  })
                  .map(eq => eq.serial_number)
                  .filter(Boolean);
              }
            }
          } catch (e) {
            console.warn('Could not fetch equipment serial numbers:', e);
          }

          if (!serialNumber && request.equipment_id) {
            try {
              const equipmentResponse = await api.get(`/equipment/${request.equipment_id}`);
              if (equipmentResponse?.data?.success) {
                serialNumber = equipmentResponse.data.data?.serial_number;
                if (serialNumber && !serialNumbers.includes(serialNumber)) {
                  serialNumbers.push(serialNumber);
                }
              }
            } catch (e) {
              console.warn('Could not fetch equipment details:', e);
            }
          }

          // If we have a serial number but it's not in the array, add it
          if (serialNumber && serialNumber !== 'N/A' && !serialNumbers.includes(serialNumber)) {
            serialNumbers.unshift(serialNumber);
          }

          allItems.push({
            equipment_id: request.equipment_id || null,
            equipment_name: equipmentName,
            category_name: request.category_name || 'N/A',
            brand: equipmentBrand,
            model: request.model || 'N/A',
            serial_number: serialNumber || 'N/A',
            serial_numbers: serialNumbers.length > 0 ? serialNumbers : (serialNumber && serialNumber !== 'N/A' ? [serialNumber] : []),
            date_released: request?.release_date || request?.created_at || new Date().toISOString(),
            date_returned: request?.return_date || request?.returned_at || null
          });
        }
      }

      // Use first request for employee info
      const firstRequest = requests[0];

      // Filter allItems to only include selected items
      // Match by equipment_name since that's what we have in selectedItems
      const filteredItems = allItems.filter(item => 
        selectedItems.some(selected => 
          selected.equipment_name === item.equipment_name &&
          selected.serial_number === item.serial_number
        )
      );

      // Prepare print data with selected items only
      const printData = {
        full_name: transactionData.full_name || firstRequest.full_name || 'N/A',
        position: transactionData.position || firstRequest.position || 'N/A',
        department: firstRequest.department || transactionData.department || 'IT Department',
        items: filteredItems.length > 0 ? filteredItems : allItems, // Fallback to all if filtering fails
        notes: transactionData.notes || firstRequest.notes || '',
        _transactionKey: transactionKey // Store the key to identify this transaction
      };

      console.log('ViewApproved - Print data prepared:', printData);
      console.log('ViewApproved - Selected items:', selectedItems);
      console.log('ViewApproved - Filtered items:', filteredItems);

      setPrintModal({ isOpen: true, transactionData: printData });
    } catch (err) {
      console.error('Error fetching print data:', err);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          title: 'Print Error',
          message: 'Error generating receipt: ' + apiUtils.handleError(err),
          duration: 6000
        });
      } else {
        alert('Error generating receipt: ' + apiUtils.handleError(err));
      }
    }
  };

  // Modal handlers
  const openConfirmModal = (type, transactionData) => {
    setConfirmModal({
      isOpen: true,
      type,
      transactionData
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null, transactionData: null });
  };

  const closePrintModal = () => {
    // Keep transactionData when closing so saved changes persist
    setPrintModal(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const handlePrintDataSave = (updatedData) => {
    // Update the stored transaction data with saved changes
    // Preserve the transaction key so we can match it later
    setPrintModal(prev => ({
      ...prev,
      transactionData: {
        ...updatedData,
        _transactionKey: prev.transactionData?._transactionKey || updatedData._transactionKey
      }
    }));
  };

  const handleViewHolder = (groupId) => {
    const group = groupedCurrentHolders.find(g => g.id === groupId);
    if (group) {
      setViewHolderModal({
        isOpen: true,
        holderData: group
      });
    }
  };

  const handleCloseViewHolderModal = () => {
    setViewHolderModal({
      isOpen: false,
      holderData: null
    });
  };

  const handleViewReturn = (groupId) => {
    const group = groupedVerifyReturns.find(g => g.id === groupId);
    if (group) {
      setViewReturnModal({
        isOpen: true,
        returnData: group
      });
    }
  };

  const handleCloseViewReturnModal = () => {
    setViewReturnModal({
      isOpen: false,
      returnData: null
    });
  };

  const handleViewApproved = (groupId) => {
    const group = groupedApproved.find(g => g.id === groupId);
    if (group) {
      setViewApprovedModal({
        isOpen: true,
        transactionData: group
      });
    }
  };

  const handleCloseViewApprovedModal = () => {
    setViewApprovedModal({
      isOpen: false,
      transactionData: null
    });
  };

  const handleConfirmReturn = async (returnData) => {
    try {
      // Get all returns in the group
      const returns = returnData.returns || [returnData];

      if (!returns || returns.length === 0) {
        showError('No returns found to process', 'Verification Failed');
        return;
      }

      // Process all returns in the group
      for (const returnItem of returns) {
        const transactionId = returnItem.id || returnItem.transaction_id;

        if (!transactionId) {
          console.warn('Transaction ID not found for item:', returnItem);
          continue;
        }

        // First, check the transaction status
        const statusCheck = await api.get(`/transactions/${transactionId}`);
        const currentStatus = statusCheck.data?.data?.status || statusCheck.data?.status;

        console.log('Current transaction status:', currentStatus);

        // If transaction is still released, return it first
        if (currentStatus === 'released') {
          console.log('Transaction still released, returning first...');
          const returnResponse = await api.post(`/transactions/${transactionId}/return`, {
            return_condition: 'good_condition',
            return_notes: 'Returned and verified'
          });

          if (!returnResponse.data.success) {
            throw new Error('Failed to return transaction');
          }
          console.log('Transaction returned successfully');
        }

        // Now verify the return to complete the transaction
        const verifyResponse = await api.post(`/transactions/${transactionId}/verify-return`, {
          verification_notes: returnData.verificationNotes || 'Return verified and completed'
        });

        if (!verifyResponse.data.success) {
          throw new Error(verifyResponse.data.message || 'Failed to verify return');
        }
      }

      // After processing all returns, show success message
      const employeeName = returnData.full_name || returnData.employee_name || 'Unknown';
      const itemCount = returns.length;
      showSuccess(
        `Return confirmed! ${employeeName} has returned ${itemCount} item${itemCount > 1 ? 's' : ''}.\nAll transactions completed.\nEquipment is now available for new requests.`,
        'Returns Verified'
      );

      // Close the modal
      handleCloseViewReturnModal();

      // Immediately refresh data to remove from verify returns list
      await fetchData();
    } catch (error) {
      console.error('Error verifying return:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to verify return';
      showError(errorMessage, 'Verification Error');
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      <div className="flex-shrink-0">
        <HomeSidebar />
      </div>

      <div className="flex-1 flex flex-col">
        <GlobalHeader title="View Approved" />

        <main className="px-10 py-6 mb-10 flex flex-col overflow-hidden">
          {/* Scrollable Content Container */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto transaction-scrollbar sticky-transition"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {/* Labels that fade out on scroll */}
            <div
              className={`transition-all duration-500 ease-in-out ${scrollY > 50 ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'
                }`}
            >
              <h2 className="text-4xl font-bold text-blue-600 transition-all duration-300">Transaction</h2>
              <h3 className="text-base font-semibold text-gray-700 mt-3 tracking-wide transition-all duration-300">QUICK ACCESS</h3>
            </div>

            {/* Stats Cards - scroll with content initially, then stick at top */}
            <div className="sticky top-0 z-10 bg-white pb-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-9 transition-all duration-300">
                <div className="bg-gradient-to-b from-[#0064FF] to-[#003C99] text-white rounded-2xl p-3 shadow flex flex-col h-26">
                  <h4 className="text-sm uppercase tracking-wider opacity-80">New Approved</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-5xl font-bold">{loading ? '...' : groupedApproved.length}</p>
                    <Clock className="w-8 h-8 text-white/70" />
                  </div>
                </div>
                <div className="bg-gray-100 rounded-2xl p-3 shadow flex flex-col h-26">
                  <h4 className="text-sm font-semibold text-gray-600">Approved Requests</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : groupedCurrentHolders.length}</p>
                    <User className="w-8 h-8 text-gray-500" />
                  </div>
                </div>
                <div className="bg-gray-100 rounded-2xl p-6 shadow flex flex-col h-26">
                  <h4 className="text-sm font-semibold text-gray-600">Verify Return</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900">{loading ? '...' : groupedVerifyReturns.length}</p>
                    <CheckCircle className="w-8 h-8 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mode dropdown moved to section headers for alignment with titles */}

            {view === 'viewApproved' && (
              <>
                <div className="mt-8">
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-800">View Approved</h4>
                      <div className="relative">
                        <button
                          type="button"
                          className="w-44 h-10 bg-gray-300 rounded-md flex items-center justify-between px-4 text-gray-700"
                          onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                          <span className="text-sm font-medium">
                            {view === 'viewApproved' ? 'View Approved' :
                              view === 'currentHolder' ? 'Approved requests' : 'Verify return'}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 z-10 mt-2 w-44 bg-white rounded-md shadow border border-gray-200">
                            <button onClick={() => handleSelect('viewApproved')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">View Approved</button>
                            <button onClick={() => handleSelect('currentHolder')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Approved requests</button>
                            <button onClick={() => handleSelect('verifyReturn')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Verify return</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex text-xs font-medium text-gray-900 uppercase tracking-wider mb-4 px-4 mt-4">
                      <div className="flex-1">Name</div>
                      <div className="flex-1">Item</div>
                      <div className="w-40">Request Date</div>
                      <div className="w-32 text-right">Actions</div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="py-8 text-center text-gray-500">
                      Loading approved transactions...
                    </div>
                  ) : error ? (
                    <div className="py-8 text-center text-red-500">
                      Error: {error}
                    </div>
                  ) : groupedApproved.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      No approved transactions found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupedApproved.map((group) => {
                        // Format request date
                        const formatDate = (dateString) => {
                          if (!dateString) return 'N/A';
                          try {
                            const date = new Date(dateString);
                            return date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            });
                          } catch (e) {
                            return 'N/A';
                          }
                        };

                        // Check if items have different request dates
                        const uniqueDates = [...new Set(group.items.map(item => item.request_date).filter(Boolean))];
                        const hasMultipleDates = uniqueDates.length > 1;
                        const isExpanded = expandedRows.has(group.id);

                        const toggleExpand = (e) => {
                          e.stopPropagation();
                          setExpandedRows(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(group.id)) {
                              newSet.delete(group.id);
                            } else {
                              newSet.add(group.id);
                            }
                            return newSet;
                          });
                        };

                        return (
                          <div key={group.id} className="relative">
                            <div
                              onClick={() => handleViewApproved(group.id)}
                              className="relative flex items-center py-4 px-4 rounded-xl cursor-pointer border-2 bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200"
                            >
                              {/* Name with Avatar */}
                              <div className="flex-1 flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold overflow-hidden flex-shrink-0">
                                  {group.avatar_url ? (
                                    <img
                                      src={group.avatar_url}
                                      alt={group.full_name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.textContent = getInitials(group.full_name);
                                      }}
                                    />
                                  ) : (
                                    getInitials(group.full_name)
                                  )}
                                </div>
                                <div className="text-base font-medium text-gray-900">{group.full_name}</div>
                              </div>

                              {/* Items (plain text, aligned like Name) */}
                              <div className="flex-1">
                                <div className="text-base font-medium text-gray-900">
                                  {group.items.length === 1
                                    ? group.items[0].equipment_name
                                    : `${group.items.length} items`}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="w-40 flex items-center justify-end space-x-2">
                                <button
                                  onClick={toggleExpand}
                                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${isExpanded ? 'bg-blue-100' : ''}`}
                                  title="Show Request Date"
                                >
                                  <Calendar className={`h-5 w-5 ${isExpanded ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrint(group);
                                  }}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Print Receipt"
                                >
                                  <Printer className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openConfirmModal('release', group);
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white rounded-full text-xs hover:bg-green-700 transition-colors"
                                >
                                  Release
                                </button>
                              </div>
                            </div>

                            {/* Expanded Request Date Section */}
                            {isExpanded && (
                              <div className="mt-2 ml-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3">Request Details</h5>
                                {hasMultipleDates ? (
                                  <div className="space-y-2">
                                    {group.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">{item.equipment_name}</span>
                                        <span className="text-gray-900 font-medium">{formatDate(item.request_date)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm">
                                    <span className="text-gray-600">Request Date: </span>
                                    <span className="text-gray-900 font-medium">
                                      {formatDate(group.request_date || group.items[0]?.request_date)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

          {view === 'currentHolder' && (
            <>
              <div className="mt-10 flex items-center justify-between">
                <h3 className="text-3xl font-semibold text-gray-700">Approved requests</h3>
                <div className="relative">
                  <button
                    type="button"
                    className="w-44 h-10 bg-gray-300 rounded-md flex items-center justify-between px-4 text-gray-700"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    <span className="text-sm font-medium">
                      {view === 'viewApproved' ? 'View Approved' : 
                       view === 'currentHolder' ? 'Approved requests' : 'Verify return'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 z-10 mt-2 w-44 bg-white rounded-md shadow border border-gray-200">
                      <button onClick={() => handleSelect('viewApproved')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">View Approved</button>
                      <button onClick={() => handleSelect('currentHolder')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Approved requests</button>
                      <button onClick={() => handleSelect('verifyReturn')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Verify return</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Name</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Item</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Request mode</th>
                        <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-gray-500">
                            Loading current holders...
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-red-500">
                            Error: {error}
                          </td>
                        </tr>
                      ) : groupedCurrentHolders.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-gray-500">
                            No current holders found
                          </td>
                        </tr>
                      ) : (
                        groupedCurrentHolders.map((group) => (
                          <tr 
                            key={group.id}
                            onClick={() => handleViewHolder(group.id)}
                            className="border-b border-gray-100 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors duration-200"
                          >
                            <td className="py-4 px-6 text-sm font-medium text-gray-900">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold overflow-hidden flex-shrink-0">
                                  {group.avatar_url ? (
                                    <img 
                                      src={group.avatar_url} 
                                      alt={group.full_name} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.textContent = getInitials(group.full_name);
                                      }}
                                    />
                                  ) : (
                                    getInitials(group.full_name)
                                  )}
                                </div>
                                <span>{group.full_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-700">
                              <span>
                                {group.items.length === 1 
                                  ? group.items[0].equipment_name 
                                  : `${group.items.length} items`}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-700">
                              {formatRequestMode(group.request_mode)}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-end space-x-2">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
                                  Released
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

            {view === 'verifyReturn' && (
              <>
                <div className="mt-10 flex items-center justify-between">
                  <h3 className="text-3xl font-semibold text-gray-700">Verify return</h3>
                  <div className="relative">
                    <button
                      type="button"
                      className="w-44 h-10 bg-gray-300 rounded-md flex items-center justify-between px-4 text-gray-700"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                      <span className="text-sm font-medium">
                        {view === 'viewApproved' ? 'View Approved' :
                          view === 'currentHolder' ? 'Approved requests' : 'Verify return'}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {isMenuOpen && (
                      <div className="absolute right-0 z-10 mt-2 w-44 bg-white rounded-md shadow border border-gray-200">
                        <button onClick={() => handleSelect('viewApproved')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">View Approved</button>
                        <button onClick={() => handleSelect('currentHolder')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Approved requests</button>
                        <button onClick={() => handleSelect('verifyReturn')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Verify return</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 bg-white rounded-2xl shadow p-4 md:p-6 border border-gray-100 transition-all duration-300">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-full">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr className="border-b">
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Position</th>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3">Condition</th>
                          <th className="py-2 px-3">End Date</th>
                          <th className="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loading ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-gray-500">
                              Loading verify returns...
                            </td>
                          </tr>
                        ) : error ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-red-500">
                              Error: {error}
                            </td>
                          </tr>
                        ) : groupedVerifyReturns.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-gray-500">
                              No returns to verify found
                            </td>
                          </tr>
                        ) : (
                          groupedVerifyReturns.map((group) => (
                            <tr
                              key={group.id}
                              onClick={() => handleViewReturn(group.id)}
                              className="border-b last:border-0 cursor-pointer transition-colors duration-200 hover:bg-blue-50"
                            >
                              <td className="py-3 px-3">{group.full_name}</td>
                              <td className="py-3 px-3">{group.position}</td>
                              <td className="py-3 px-3">
                                <span>
                                  {group.items.length === 1
                                    ? group.items[0].equipment_name
                                    : `${group.items.length} items`}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {(() => {
                                  const codes = (group.items || []).map(i => (i.return_condition || '').toString().toLowerCase()).filter(Boolean);
                                  const unique = Array.from(new Set(codes));
                                  const code = unique.length === 1 ? unique[0] : (unique.length > 1 ? 'mixed' : '');
                                  const label = code === 'good_condition' ? 'Good Condition'
                                    : code === 'damaged' ? 'Damaged'
                                    : code === 'has_defect' ? 'Has Defect'
                                    : code === 'mixed' ? 'Mixed'
                                    : 'N/A';
                                  const cls = code === 'good_condition'
                                    ? 'bg-green-100 text-green-700'
                                    : code === 'damaged'
                                    ? 'bg-red-100 text-red-700'
                                    : code === 'has_defect'
                                    ? 'bg-amber-100 text-amber-700'
                                    : code === 'mixed'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700';
                                  return (
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-3 text-red-600">{group.return_date || 'N/A'}</td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-end space-x-3">
                                  <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">Pending</span>
                                  <span className="px-3 py-1 rounded-full text-xs bg-green-600 text-white">Returned</span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={handleRelease}
        transactionData={confirmModal.transactionData}
        type={confirmModal.type}
      />

      {/* Select Items Modal */}
      <SelectItemsModal
        isOpen={selectItemsModal.isOpen}
        onClose={closeSelectItemsModal}
        transactionData={selectItemsModal.transactionData}
        onConfirm={handleItemsSelected}
      />

      {/* Print Receipt Modal */}
      <PrintReceipt
        isOpen={printModal.isOpen}
        onClose={closePrintModal}
        transactionData={printModal.transactionData}
        onSave={handlePrintDataSave}
      />

      {/* View Holder Modal */}
      <ViewTransactionModal
        isOpen={viewHolderModal.isOpen}
        onClose={handleCloseViewHolderModal}
        transactionData={viewHolderModal.holderData}
        onPrint={handlePrint}
      />

      {/* View Return Modal */}
      <VerifyReturnModal
        isOpen={viewReturnModal.isOpen}
        onClose={handleCloseViewReturnModal}
        returnData={viewReturnModal.returnData}
        onConfirmReturn={handleConfirmReturn}
      />

      {/* View Approved Modal */}
      <ViewTransactionModal
        isOpen={viewApprovedModal.isOpen}
        onClose={handleCloseViewApprovedModal}
        transactionData={viewApprovedModal.transactionData}
        onRelease={async (data) => {
          await handleRelease(data);
          handleCloseViewApprovedModal();
        }}
      />

    </div>
  );
};

export default ViewApproved;