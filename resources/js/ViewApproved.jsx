import React, { useState, useEffect, useRef } from 'react';
import { Search, Printer, ChevronDown, Clock, User, CheckCircle, Calendar, RefreshCcw } from 'lucide-react';
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
          message = `${newlyReleasedCount} ${itemText} released successfully! ${alreadyReleasedCount} ${alreadyReleasedCount === 1 ? 'was' : 'were'} already released. Moving to Approved Requests view...`;
        } else if (alreadyReleasedCount > 0) {
          message = `${alreadyReleasedCount} ${itemText} ${alreadyReleasedCount === 1 ? 'was' : 'were'} already released. Moving to Approved Requests view...`;
        } else {
          message = `${releasedTransactions.length} ${itemText} released successfully! Switching to Approved Requests view...`;
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

      const processedTransactionIds = [];
      const processedEquipmentIds = [];

      // Process all returns in the group
      for (const returnItem of returns) {
        const transactionId = returnItem.id || returnItem.transaction_id;

        if (!transactionId) {
          console.warn('Transaction ID not found for item:', returnItem);
          continue;
        }

        // Check the current transaction status before verification
        const statusCheck = await api.get(`/transactions/${transactionId}`);
        const currentStatus = statusCheck.data?.data?.status || statusCheck.data?.status;

        if (currentStatus === 'released') {
          const returnResponse = await api.post(`/transactions/${transactionId}/return`, {
            return_condition: 'good_condition',
            return_notes: 'Returned and verified'
          });

          if (!returnResponse.data.success) {
            throw new Error(returnResponse.data.message || 'Failed to return transaction');
          }
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

      const employeeName = returnData.full_name || returnData.employee_name || 'Unknown';
      const itemCount = returns.length;
      showSuccess(
        `Return confirmed! ${employeeName} has returned ${itemCount} item${itemCount > 1 ? 's' : ''}. Equipment is now available for new requests.`,
        'Returns Verified'
      );
    } catch (error) {
      console.error('Error verifying return:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to verify return';
      showError(errorMessage, 'Verification Error');
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white flex">
      <HomeSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <GlobalHeader />
        <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
          <div className="p-6 md:p-10">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-[#2262C6] mb-2">View Request</h1>
              <p className="text-gray-600 text-base">View and manage requests, approvals, and returns</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
              <div className="bg-gradient-to-b from-[#0064FF] to-[#003C99] text-white rounded-2xl p-4 shadow-md">
                <h4 className="text-xs uppercase tracking-wider opacity-80 mb-2">New Requests</h4>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold">{loading ? '...' : dashboardStats.new_requests}</p>
                  <Clock className="w-8 h-8 text-white/70" />
                </div>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4 shadow-md">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Approved Requests</h4>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-gray-900">{loading ? '...' : groupedApproved.length}</p>
                  <RefreshCcw className="w-8 h-8 text-gray-500" />
                </div>
              </div>
              <div className="bg-gray-100 rounded-2xl p-4 shadow-md">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Verify Return</h4>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-gray-900">{loading ? '...' : dashboardStats.verify_returns}</p>
                  <CheckCircle className="w-8 h-8 text-gray-500" />
                </div>
              </div>
            </div>

            {/* View Selector */}
            <div className="mb-6 flex items-center justify-between">
              <div className="relative inline-block">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-blue-400 transition-all shadow-sm"
                >
                  <span className="font-semibold text-gray-700">View Request</span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-10 overflow-hidden">
                    <button
                      onClick={() => handleSelect('viewApproved')}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        view === 'viewApproved' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      View Approved
                    </button>
                    <button
                      onClick={() => handleSelect('currentHolder')}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        view === 'currentHolder' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      Approved Requests
                    </button>
                    <button
                      onClick={() => handleSelect('verifyReturn')}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        view === 'verifyReturn' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
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
              <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-gray-500 text-lg">Loading...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-red-200 shadow-sm">
                <div className="text-red-500 text-lg font-medium">{error}</div>
              </div>
            ) : (
              <>
                {/* View Approved */}
                {view === 'viewApproved' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-gray-200 bg-gray-50">
                      <h2 className="text-xl font-semibold text-gray-900">View Request</h2>
                      <p className="text-sm text-gray-600 mt-1">Approved items ready for release</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Item</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {groupedApproved.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="px-6 py-16 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <CheckCircle className="w-16 h-16 text-gray-300 mb-4" />
                                  <p className="text-gray-500 text-lg font-medium">No approved requests found</p>
                                  <p className="text-gray-400 text-sm mt-2">Approved requests will appear here</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            groupedApproved.map((group) => (
                              <tr 
                                key={group.id}
                                onClick={() => handleViewApproved(group.id)}
                                className="hover:bg-blue-50/40 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-0"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-12 w-12">
                                      {group.avatar_url ? (
                                        <img className="h-12 w-12 rounded-full object-cover border-2 border-gray-200" src={group.avatar_url} alt="" />
                                      ) : (
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-blue-200">
                                          <span className="text-white font-semibold text-sm">{getInitials(group.full_name)}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-semibold text-gray-900">{group.full_name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                                  </span>
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
                                      <Printer className="h-5 w-5 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openConfirmModal('release', group);
                                      }}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
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
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-gray-200 bg-gray-50">
                      <h2 className="text-xl font-semibold text-gray-900">Approved Requests</h2>
                      <p className="text-sm text-gray-600 mt-1">All approved equipment requests</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Position</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Items</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Mode</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Expected Return</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {groupedCurrentHolders.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-6 py-16 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <User className="w-16 h-16 text-gray-300 mb-4" />
                                  <p className="text-gray-500 text-lg font-medium">No approved requests found</p>
                                  <p className="text-gray-400 text-sm mt-2">Approved requests will appear here</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            groupedCurrentHolders.map((group) => (
                              <tr 
                                key={group.id}
                                onClick={() => handleViewHolder(group.id)}
                                className="hover:bg-blue-50/40 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-0"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-12 w-12">
                                      {group.avatar_url ? (
                                        <img className="h-12 w-12 rounded-full object-cover border-2 border-gray-200" src={group.avatar_url} alt="" />
                                      ) : (
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-blue-200">
                                          <span className="text-white font-semibold text-sm">{getInitials(group.full_name)}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-semibold text-gray-900">{group.full_name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-700">{group.position}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    formatRequestMode(group.request_mode) === 'W.F.H' 
                                      ? 'bg-purple-100 text-purple-700' 
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {formatRequestMode(group.request_mode)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
                                    <Printer className="h-5 w-5 text-gray-600" />
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
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-gray-200 bg-gray-50">
                      <h2 className="text-xl font-semibold text-gray-900">Verify Returns</h2>
                      <p className="text-sm text-gray-600 mt-1">Equipment pending return verification</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Position</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Items</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Return Date</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {groupedVerifyReturns.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-6 py-16 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <Clock className="w-16 h-16 text-gray-300 mb-4" />
                                  <p className="text-gray-500 text-lg font-medium">No returns to verify</p>
                                  <p className="text-gray-400 text-sm mt-2">Returned equipment awaiting verification will appear here</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            groupedVerifyReturns.map((group) => (
                              <tr 
                                key={group.id}
                                onClick={() => handleViewReturn(group.id)}
                                className="hover:bg-blue-50/40 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-0"
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-12 w-12">
                                      {group.avatar_url ? (
                                        <img className="h-12 w-12 rounded-full object-cover border-2 border-gray-200" src={group.avatar_url} alt="" />
                                      ) : (
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-blue-200">
                                          <span className="text-white font-semibold text-sm">{getInitials(group.full_name)}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-semibold text-gray-900">{group.full_name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-700">{group.position}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {group.return_date ? new Date(group.return_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewReturn(group.id);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
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
