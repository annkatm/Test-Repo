import React, { useState, useEffect, useRef } from 'react';
import { Search, Printer, ChevronDown, Clock, User, CheckCircle } from 'lucide-react';
import GlobalHeader from './components/GlobalHeader';
import HomeSidebar from './HomeSidebar';
import ConfirmModal from './components/ConfirmModal.jsx';
import PrintReceipt from './components/PrintReceipt.jsx';
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
        setCurrentHolders(holdersResponse.data);
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
        specs: req.specifications || req.specs || [req.brand, req.model].filter(Boolean).join(' ') || req.category_name || ''
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
          holders: [],
          items: []
        };
      }
      grouped[employeeName].holders.push(holder);
      grouped[employeeName].items.push({
        id: holder.equipment_id || holder.id,
        equipment_name: holder.equipment_name || 'Unknown Item'
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
        return_notes: returnItem.return_notes || null
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
      // Create a map of saved serial numbers by equipment name for easier lookup
      const savedSerialNumbersMap = {};
      if (savedPrintData?.items && Array.isArray(savedPrintData.items)) {
        savedPrintData.items.forEach(item => {
          if (item.serial_number && item.serial_number !== 'N/A' && item.equipment_name) {
            // Use equipment_name as key for matching
            savedSerialNumbersMap[item.equipment_name] = item.serial_number;
          }
        });
      }
      console.log('Saved serial numbers map:', savedSerialNumbersMap);

      // Handle grouped requests
      const requests = data.requests || [data];
      const releasedTransactions = [];
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

        // Check if serial number was changed in print form
        // Match by equipment name from the request
        const requestEquipmentName = (request.equipment_name || request.equipment?.name || '').trim();
        let savedSerialNumber = savedSerialNumbersMap[requestEquipmentName];

        // Try case-insensitive matching if exact match failed
        if (!savedSerialNumber && requestEquipmentName) {
          const matchingKey = Object.keys(savedSerialNumbersMap).find(
            key => key.trim().toLowerCase() === requestEquipmentName.toLowerCase()
          );
          if (matchingKey) {
            savedSerialNumber = savedSerialNumbersMap[matchingKey];
            console.log(`Matched equipment by case-insensitive name: "${matchingKey}" -> "${requestEquipmentName}"`);
          }
        }

        // Fallback: if only one item in saved data and one request, use that
        if (!savedSerialNumber && savedPrintData?.items?.length === 1 && requests.length === 1) {
          savedSerialNumber = savedPrintData.items[0].serial_number;
          console.log('Using fallback: single item match');
        }

        // Another fallback: match by index if counts match
        if (!savedSerialNumber && savedPrintData?.items?.length === requests.length && requestIndex < savedPrintData.items.length) {
          savedSerialNumber = savedPrintData.items[requestIndex]?.serial_number;
          if (savedSerialNumber) {
            console.log(`Using index-based match: item[${requestIndex}]`);
          }
        }

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

        // Add released transactions to current holders
        setCurrentHolders(prev => [...prev, ...releasedTransactions]);

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


  // Handle print action
  const handlePrint = async (transactionData) => {
    try {
      // Check if we already have saved data for this transaction
      // Use a unique identifier to match - we'll use the first request ID or employee name + equipment
      const transactionKey = transactionData.requests?.[0]?.id ||
        transactionData.id ||
        `${transactionData.full_name}_${transactionData.items?.[0]?.equipment_name || ''}`;

      // Check if we have saved data for this transaction
      if (printModal.transactionData &&
        printModal.transactionData._transactionKey === transactionKey) {
        // Reuse saved data instead of refetching
        setPrintModal({
          isOpen: true,
          transactionData: printModal.transactionData
        });
        return;
      }

      // Handle grouped requests - get all items for printing
      const requests = transactionData.requests || [transactionData];

      if (!requests || requests.length === 0) {
        console.error('Invalid row for printing:', transactionData);
        if (window.showToast) {
          window.showToast({
            type: 'error',
            title: 'Print Error',
            message: 'Error: Invalid data for printing',
            duration: 5000
          });
        } else {
          alert('Error: Invalid data for printing');
        }
        return;
      }


      // Collect all equipment items with their details
      const allItems = [];
      for (const request of requests) {
        const txList = await transactionService.getAll({ request_id: request.id });
        if (txList?.success && Array.isArray(txList.data) && txList.data.length > 0) {
          const tx = txList.data[0];

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

      // Prepare print data with all items
      const printData = {
        full_name: transactionData.full_name || firstRequest.full_name || 'N/A',
        position: transactionData.position || firstRequest.position || 'N/A',
        department: firstRequest.department || transactionData.department || 'IT Department',
        items: allItems,
        notes: transactionData.notes || firstRequest.notes || '',
        _transactionKey: transactionKey // Store the key to identify this transaction
      };

      console.log('ViewApproved - Print data prepared:', printData);
      console.log('ViewApproved - All items with serial numbers:', allItems);

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
                      {groupedApproved.map((group) => (
                        <div
                          key={group.id}
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
                          <div className="w-32 flex items-center justify-end space-x-2">
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
                      ))}
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
                <div className="mt-4 bg-white rounded-2xl shadow p-4 md:p-6 border border-gray-100 transition-all duration-300">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-full">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr className="border-b">
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Position</th>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3">Request mode</th>
                          <th className="py-2 px-3">End Date</th>
                          <th className="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loading ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-gray-500">
                              Loading current holders...
                            </td>
                          </tr>
                        ) : error ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-red-500">
                              Error: {error}
                            </td>
                          </tr>
                        ) : groupedCurrentHolders.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-gray-500">
                              No current holders found
                            </td>
                          </tr>
                        ) : (
                          groupedCurrentHolders.map((group) => (
                            <tr
                              key={group.id}
                              onClick={() => handleViewHolder(group.id)}
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
                              <td className="py-3 px-3">{formatRequestMode(group.request_mode)}</td>
                              <td className="py-3 px-3 text-red-600">{group.expected_return_date || 'N/A'}</td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-end space-x-4 text-gray-700">
                                  <span className="px-3 py-1 rounded-full text-xs bg-green-600 text-white">Released</span>
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
        hideCancel={true}
        buttonText="Close"
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