<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Transaction;
use App\Models\Equipment;
use App\Models\Employee;
use App\Models\User;
use App\Services\ActivityLogService;

class TransactionController extends Controller
{
    /**
     * Generate a unique transaction number
     */
    private function generateUniqueTransactionNumber(): string
    {
        $maxAttempts = 10;
        $attempt = 0;
        
        do {
            $attempt++;
            
            // Get the highest existing transaction number
            $lastTransaction = DB::table('transactions')
                ->where('transaction_number', 'LIKE', 'TXN-%')
                ->orderBy('transaction_number', 'desc')
                ->first();
            
            if ($lastTransaction) {
                // Extract the number part and increment
                $lastNumber = (int) substr($lastTransaction->transaction_number, 4);
                $nextNumber = $lastNumber + 1;
            } else {
                // First transaction
                $nextNumber = 1;
            }
            
            $transactionNumber = 'TXN-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
            
            // Check if this number already exists
            $exists = DB::table('transactions')
                ->where('transaction_number', $transactionNumber)
                ->exists();
            
            if (!$exists) {
                return $transactionNumber;
            }
            
        } while ($attempt < $maxAttempts);
        
        // Fallback: use timestamp-based number
        return 'TXN-' . date('YmdHis');
    }
    /**
     * Get transaction statistics for employee dashboard
     */
    public function stats()
    {
        try {
            $userId = auth()->id();
            
            // Get employee record for current user
            $employee = DB::table('employees')->where('user_id', $userId)->first();
            
            if (!$employee) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'borrowed' => 0,
                        'available' => 0,
                        'overdue' => 0
                    ]
                ]);
            }

            // Count currently borrowed items (released status)
            $borrowed = DB::table('transactions')
                ->where('employee_id', $employee->id)
                ->where('status', 'released')
                ->count();

            // Count overdue items (released past expected_return_date)
            $overdue = DB::table('transactions')
                ->where('employee_id', $employee->id)
                ->where('status', 'released')
                ->where('expected_return_date', '<', now())
                ->count();

            // Count available equipment
            $available = DB::table('equipment')
                ->where('status', 'available')
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'borrowed' => $borrowed,
                    'available' => $available,
                    'overdue' => $overdue
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get currently borrowed items for current user (for modal view)
     */
    public function borrowed()
    {
        try {
            $userId = auth()->id();
            
            // Get employee record for current user
            $employee = DB::table('employees')->where('user_id', $userId)->first();
            
            if (!$employee) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }

            $transactions = DB::table('transactions')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('transactions.employee_id', $employee->id)
                ->where('transactions.status', 'released')
                ->select(
                    'transactions.*',
                    'equipment.name as equipment_name',
                    'equipment.brand',
                    'equipment.model',
                    'equipment.serial_number',
                    'categories.name as category_name',
                    DB::raw('CASE WHEN transactions.expected_return_date < NOW() THEN 1 ELSE 0 END as is_overdue'),
                    DB::raw('DATEDIFF(NOW(), transactions.expected_return_date) as days_overdue')
                )
                ->orderBy('transactions.expected_return_date', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $transactions,
                'count' => $transactions->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching borrowed items: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get overdue items for current user (for modal view)
     */
    public function overdue()
    {
        try {
            $userId = auth()->id();
            
            // Get employee record for current user
            $employee = DB::table('employees')->where('user_id', $userId)->first();
            
            if (!$employee) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }

            $transactions = DB::table('transactions')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('transactions.employee_id', $employee->id)
                ->where('transactions.status', 'released')
                ->where('transactions.expected_return_date', '<', now())
                ->select(
                    'transactions.*',
                    'equipment.name as equipment_name',
                    'equipment.brand',
                    'equipment.model',
                    'equipment.serial_number',
                    'categories.name as category_name',
                    DB::raw('DATEDIFF(NOW(), transactions.expected_return_date) as days_overdue')
                )
                ->orderBy('transactions.expected_return_date', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $transactions,
                'count' => $transactions->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching overdue items: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get approved transactions for current user
     */
    public function approved()
    {
        try {
            $userId = auth()->id();
            
            // Get employee record for current user
            $employee = DB::table('employees')->where('user_id', $userId)->first();
            
            if (!$employee) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }

            $transactions = DB::table('transactions')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('transactions.employee_id', $employee->id)
                ->where('transactions.status', 'released')
                ->select(
                    'transactions.*',
                    'equipment.name as equipment_name',
                    'equipment.brand',
                    'equipment.model',
                    'equipment.serial_number',
                    'categories.name as category_name'
                )
                ->orderBy('transactions.created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $transactions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching approved transactions: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get transaction history for current user
     */
    public function history()
    {
        try {
            $userId = auth()->id();
            
            // Get employee record for current user
            $employee = DB::table('employees')->where('user_id', $userId)->first();
            
            if (!$employee) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }

            $transactions = DB::table('transactions')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->where('transactions.employee_id', $employee->id)
                ->where('transactions.status', 'returned')
                ->select(
                    'transactions.*',
                    'equipment.name as equipment_name',
                    'equipment.brand',
                    'equipment.model'
                )
                ->orderBy('transactions.return_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $transactions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching history: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unified history for current user: combines requests (pending/approved/rejected) and transactions (released/returned)
     */
    public function unifiedHistory()
    {
        try {
            $userId = auth()->id();

            // Get employee record for current user
            $employee = DB::table('employees')->where('user_id', $userId)->first();

            if (!$employee) {
                return response()->json(['success' => true, 'data' => []]);
            }

            // Fetch requests for this employee
            $requests = DB::table('requests')
                ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('requests.employee_id', $employee->id)
                ->select(
                    'requests.id as id',
                    DB::raw("'request' as type"),
                    'requests.request_number as number',
                    'requests.status as status',
                    'equipment.name as item',
                    'equipment.brand as brand',
                    'requests.reason as reason',
                    'requests.created_at as date',
                    'requests.updated_at as updated_at'
                )
                ->get()
                ->map(function ($r) {
                    return (array) $r;
                })->toArray();

            // Fetch transactions for this employee
            $transactions = DB::table('transactions')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('transactions.employee_id', $employee->id)
                ->select(
                    'transactions.id as id',
                    DB::raw("'transaction' as type"),
                    'transactions.transaction_number as number',
                    'transactions.status as status',
                    'equipment.name as item',
                    'equipment.brand as brand',
                    'transactions.request_id as request_id',
                    'transactions.created_at as date',
                    'transactions.updated_at as updated_at'
                )
                ->get()
                ->map(function ($t) {
                    return (array) $t;
                })->toArray();

            // Merge and sort by date descending (use updated_at or date)
            $combined = array_merge($requests, $transactions);
            usort($combined, function ($a, $b) {
                $da = isset($a['updated_at']) ? strtotime($a['updated_at']) : strtotime($a['date'] ?? null);
                $db = isset($b['updated_at']) ? strtotime($b['updated_at']) : strtotime($b['date'] ?? null);
                return $db <=> $da;
            });

            return response()->json([
                'success' => true,
                'data' => $combined,
                'count' => count($combined)
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Error fetching unified history: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Return a transaction
     */
    public function returnTransaction(Request $request, $id)
    {
        try {
            $transaction = DB::table('transactions')->where('id', $id)->first();
            
            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found'
                ], 404);
            }

            if ($transaction->status !== 'released') {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction is not currently released'
                ], 400);
            }

            $validatedData = $request->validate([
                'return_condition' => 'required|in:good_condition,damaged,lost',
                'return_notes' => 'nullable|string|max:500'
            ]);

            $updateData = [
                'status' => 'returned',
                'return_date' => now(),
                'return_condition' => $validatedData['return_condition'],
                'return_notes' => $validatedData['return_notes'] ?? null,
                'received_by' => auth()->id(),
                'updated_at' => now()
            ];

            DB::table('transactions')->where('id', $id)->update($updateData);

            // Update equipment status back to available
            if ($transaction->equipment_id) {
                DB::table('equipment')
                    ->where('id', $transaction->equipment_id)
                    ->update([
                        'status' => 'available',
                        'updated_at' => now()
                    ]);
            }

            // Get updated equipment info
            $equipment = null;
            if ($transaction->equipment_id) {
                $equipment = DB::table('equipment')->where('id', $transaction->equipment_id)->first();
            }

            return response()->json([
                'success' => true,
                'message' => 'Transaction returned successfully. Equipment is now available.',
                'data' => [
                    'transaction_id' => $id,
                    'equipment' => $equipment
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error returning transaction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Request equipment exchange
     */
    public function exchange(Request $request, $id)
    {
        try {
            $transaction = DB::table('transactions')->where('id', $id)->first();
            
            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found'
                ], 404);
            }

            $validatedData = $request->validate([
                'new_equipment_id' => 'required|exists:equipment,id',
                'reason' => 'required|string|max:1000',
                'evidence_file' => 'nullable|string|max:500'
            ]);

            // Create an exchange request (stored as a new request)
            $exchangeRequestId = DB::table('requests')->insertGetId([
                'employee_id' => $transaction->employee_id,
                'equipment_id' => $validatedData['new_equipment_id'],
                'request_type' => 'exchange',
                'status' => 'pending',
                'reason' => $validatedData['reason'],
                'evidence_file' => $validatedData['evidence_file'] ?? null,
                'original_transaction_id' => $id,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Exchange request submitted successfully',
                'data' => ['request_id' => $exchangeRequestId]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating exchange request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify and complete a returned transaction
     */
    public function verifyReturn(Request $request, $id)
    {
        try {
            $transaction = DB::table('transactions')->where('id', $id)->first();
            
            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found'
                ], 404);
            }

            if ($transaction->status !== 'returned') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only returned transactions can be verified'
                ], 400);
            }

            $validatedData = $request->validate([
                'verification_notes' => 'nullable|string|max:500'
            ]);

            // Update transaction to completed status
            DB::table('transactions')->where('id', $id)->update([
                'status' => 'completed',
                'verified_by' => Auth::id(),
                'verified_at' => now(),
                'verification_notes' => $validatedData['verification_notes'] ?? null,
                'updated_at' => now()
            ]);

            // Update the associated request to completed status so it doesn't appear in "approved" list
            if ($transaction->request_id) {
                DB::table('requests')->where('id', $transaction->request_id)->update([
                    'status' => 'completed',
                    'updated_at' => now()
                ]);
            } else {
                // Fallback for legacy rows without request linkage
                if ($transaction->employee_id && $transaction->equipment_id) {
                    DB::table('requests')
                        ->where('employee_id', $transaction->employee_id)
                        ->where('equipment_id', $transaction->equipment_id)
                        ->whereIn('status', ['approved', 'fulfilled'])
                        ->update([
                            'status' => 'completed',
                            'updated_at' => now()
                        ]);
                }
            }

            // Ensure equipment status is available (should already be, but double-check)
            if ($transaction->equipment_id) {
                DB::table('equipment')
                    ->where('id', $transaction->equipment_id)
                    ->update([
                        'status' => 'available',
                        'updated_at' => now()
                    ]);
            }

            // Get updated equipment info
            $equipment = null;
            if ($transaction->equipment_id) {
                $equipment = DB::table('equipment')->where('id', $transaction->equipment_id)->first();
            }

            return response()->json([
                'success' => true,
                'message' => 'Return verified and transaction completed successfully. Equipment is now available for new requests.',
                'data' => [
                    'transaction_id' => $id,
                    'equipment' => $equipment
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error verifying return: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel a pending request
     */
    public function cancel($id)
    {
        try {
            // Check if it's a request or transaction
            $request = DB::table('requests')->where('id', $id)->first();
            
            if ($request) {
                if ($request->status !== 'pending') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Only pending requests can be cancelled'
                    ], 400);
                }

                DB::table('requests')
                    ->where('id', $id)
                    ->update([
                        'status' => 'cancelled',
                        'updated_at' => now()
                    ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Request cancelled successfully'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Request not found'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error cancelling request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Appeal a denied request
     */
    public function appeal(Request $request, $id)
    {
        try {
            $deniedRequest = DB::table('requests')->where('id', $id)->first();
            
            if (!$deniedRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found'
                ], 404);
            }

            if ($deniedRequest->status !== 'denied') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only denied requests can be appealed'
                ], 400);
            }

            $validatedData = $request->validate([
                'appeal_reason' => 'required|string|max:1000'
            ]);

            // Update request status to appealed
            DB::table('requests')
                ->where('id', $id)
                ->update([
                    'status' => 'appealed',
                    'appeal_reason' => $validatedData['appeal_reason'],
                    'appeal_date' => now(),
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Appeal submitted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error submitting appeal: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate a receipt for the transaction
     */
    public function print($id)
    {
        try {
            Log::info("Attempting to generate receipt for transaction ID: " . $id);
            
            // Get the transaction with related data
            $transaction = Transaction::with(['user', 'employee', 'equipment', 'releasedBy', 'receivedBy'])
                ->where('id', $id)
                ->first();

            Log::info("Transaction query completed", ['found' => (bool)$transaction]);

            if (!$transaction) {
                Log::warning("Transaction not found", ['id' => $id]);
                return response()->json([
                    'success' => false,
                    'message' => "Transaction with ID {$id} not found"
                ], 404);
            }

            // Log the found transaction data
            Log::info("Transaction found", [
                'transaction_number' => $transaction->transaction_number,
                'status' => $transaction->status,
                'has_employee' => (bool)$transaction->employee,
                'has_equipment' => (bool)$transaction->equipment
            ]);

            // Ensure all required relationships are loaded
            if (!$transaction->employee || !$transaction->equipment) {
                Log::error("Missing required relationships", [
                    'has_employee' => (bool)$transaction->employee,
                    'has_equipment' => (bool)$transaction->equipment
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction is missing required related data (employee or equipment)'
                ], 500);
            }

            // Format the data for the receipt
            $receiptData = [
                'transaction' => [
                    'number' => $transaction->transaction_number,
                    'status' => ucfirst($transaction->status),
                    'request_mode' => $transaction->request_mode ? ucwords(str_replace('_', ' ', $transaction->request_mode)) : null,
                    'created_at' => $transaction->created_at->format('F j, Y, g:i a'),
                ],
                'equipment' => [
                    'name' => $transaction->equipment->name,
                    'serial_number' => $transaction->equipment->serial_number,
                    'model' => $transaction->equipment->model,
                    'brand' => $transaction->equipment->brand,
                ],
                'employee' => [
                    'name' => $transaction->employee->first_name . ' ' . $transaction->employee->last_name,
                    'first_name' => $transaction->employee->first_name,
                    'last_name' => $transaction->employee->last_name,
                    'full_name' => $transaction->employee->first_name . ' ' . $transaction->employee->last_name,
                    'position' => $transaction->employee->position,
                    'department' => $transaction->employee->department,
                ],
                'release_info' => $transaction->release_date ? [
                    'date' => date('F j, Y', strtotime($transaction->release_date)),
                    'condition' => ucwords(str_replace('_', ' ', $transaction->release_condition)),
                    'released_by' => $transaction->releasedBy ? $transaction->releasedBy->name : null,
                    'notes' => $transaction->release_notes,
                    'expected_return_date' => $transaction->expected_return_date ? 
                        date('F j, Y', strtotime($transaction->expected_return_date)) : null,
                ] : null,
                'return_info' => $transaction->return_date ? [
                    'date' => date('F j, Y', strtotime($transaction->return_date)),
                    'condition' => ucwords(str_replace('_', ' ', $transaction->return_condition)),
                    'received_by' => $transaction->receivedBy ? $transaction->receivedBy->name : null,
                    'notes' => $transaction->return_notes,
                ] : null,
            ];

            return response()->json([
                'success' => true,
                'data' => $receiptData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating receipt: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function dashboard()
    {
        try {
            // Count new approved requests (approved status - ready for release)
            $newRequests = DB::table('requests')
                ->where('status', 'approved')
                ->count();

            // Count current holders (released transactions)
            $currentHolders = DB::table('transactions')
                ->where('status', 'released')
                ->count();

            // Count verify returns (returned transactions)
            $verifyReturns = DB::table('transactions')
                ->where('status', 'returned')
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'new_requests' => $newRequests,
                    'current_holders' => $currentHolders,
                    'verify_returns' => $verifyReturns
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching dashboard data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            // Use left joins and coalesce to avoid hard failures if related tables/columns differ
            $query = DB::table('transactions')
                ->leftJoin('employees', 'transactions.employee_id', '=', 'employees.id')
                // Join the user associated with the employee (employees.user_id -> users.id)
                ->leftJoin('users', 'employees.user_id', '=', 'users.id')
                // Join the correct equipment table used by the current database
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->select(
                    'transactions.*',
                    DB::raw("COALESCE(employees.first_name, '') as first_name"),
                    DB::raw("COALESCE(employees.last_name, '') as last_name"),
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.position, '') as position"),
                    // Include both raw employee_image and processed avatar_url
                    // Priority: employee_image from employees table, then avatar from users table
                    'employees.employee_image',
                    DB::raw("NULLIF(COALESCE(employees.employee_image, users.avatar, ''), '') as avatar_url"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model"),
                    DB::raw("COALESCE(equipment.serial_number, '') as serial_number"),
                    DB::raw("COALESCE(equipment.specifications, '') as specifications"),
                    DB::raw("COALESCE(equipment.asset_tag, '') as asset_tag"),
                    DB::raw("COALESCE(categories.name, '') as category_name")
                )
                ->orderBy('transactions.created_at', 'desc');

            // Optional status filter with compatibility mapping
            $status = request()->query('status');
            if (!empty($status)) {
                $statusMap = [
                    'active' => 'pending',
                    'completed' => 'released',
                    'overdue' => 'returned',
                ];
                $normalized = $statusMap[$status] ?? $status;
                $query->where('transactions.status', $normalized);
            }

            // Optional filter by related request id (to map approved requests to their transaction)
            $requestId = request()->query('request_id');
            if (!empty($requestId)) {
                // First, constrain by direct linkage
                $query->where(function($q) use ($requestId) {
                    $q->where('transactions.request_id', $requestId);
                });

                // Additionally, if the direct linkage was not set in older rows,
                // also match by employee_id and equipment_id derived from the request
                try {
                    $req = DB::table('requests')->where('id', $requestId)->first();
                    if ($req) {
                        $query->orWhere(function($q) use ($req) {
                            $q->where('transactions.employee_id', $req->employee_id)
                              ->where('transactions.equipment_id', $req->equipment_id);
                        });
                    }
                } catch (\Exception $e) {
                    // Best-effort fallback; ignore if requests table not available
                }
            }

            // Optional direct filters for convenience
            $employeeId = request()->query('employee_id');
            if (!empty($employeeId)) {
                $query->where('transactions.employee_id', $employeeId);
            }

            $equipmentId = request()->query('equipment_id');
            if (!empty($equipmentId)) {
                $query->where('transactions.equipment_id', $equipmentId);
            }

            $transactions = $query->get();

            return response()->json([
                'success' => true,
                'data' => $transactions,
                'count' => $transactions->count()
            ]);
        } catch (\Exception $e) {
            // Fallback: return bare transactions to keep UI working
            try {
                $fallback = DB::table('transactions')->orderBy('created_at', 'desc')->get();
                return response()->json([
                    'success' => true,
                    'data' => $fallback,
                    'count' => $fallback->count(),
                    'warning' => 'Returned minimal transaction data due to join error',
                ]);
            } catch (\Exception $inner) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error fetching transactions: ' . $e->getMessage()
                ], 500);
            }
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'equipment_id' => 'required|exists:equipment,id',
                'transaction_number' => 'sometimes|string|unique:transactions,transaction_number',
                'request_mode' => 'required|in:on_site,work_from_home',
                'expected_return_date' => 'required|date',
                'status' => 'sometimes|in:pending,released,returned,lost,damaged',
            ]);

            $validatedData['status'] = $validatedData['status'] ?? 'pending';
            
            // Generate transaction number if not provided
            if (empty($validatedData['transaction_number'])) {
                $validatedData['transaction_number'] = $this->generateUniqueTransactionNumber();
            }
            
            // Attach user_id of the staff processing/creating this transaction
            $validatedData['user_id'] = auth()->id();
            $validatedData['created_at'] = now();
            $validatedData['updated_at'] = now();

            $transactionId = DB::table('transactions')->insertGetId($validatedData);

            $transaction = DB::table('transactions')
                ->leftJoin('employees', 'transactions.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->where('transactions.id', $transactionId)
                ->select(
                    'transactions.*',
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name")
                )
                ->first();

            return response()->json([
                'success' => true,
                'message' => 'Transaction created successfully',
                'data' => $transaction
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating transaction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $transaction = DB::table('transactions')
                ->leftJoin('employees', 'transactions.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('transactions.id', $id)
                ->select(
                    'transactions.*',
                    'employees.first_name',
                    'employees.last_name',
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    'employees.position',
                    'equipment.name as equipment_name',
                    'equipment.brand',
                    'equipment.model',
                    'categories.name as category_name'
                )
                ->first();

            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $transaction
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching transaction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        try {
            $transaction = DB::table('transactions')->where('id', $id)->first();
            
            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found'
                ], 404);
            }

            $validatedData = $request->validate([
                'status' => 'sometimes|in:pending,released,returned,lost,damaged',
                'expected_return_date' => 'sometimes|date',
                'return_date' => 'sometimes|date',
                'return_condition' => 'sometimes|in:good_condition,damaged,lost',
                'return_notes' => 'sometimes|string|max:500',
            ]);

            $validatedData['updated_at'] = now();

            DB::table('transactions')->where('id', $id)->update($validatedData);

            $updatedTransaction = DB::table('transactions')
                ->leftJoin('employees', 'transactions.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->where('transactions.id', $id)
                ->select(
                    'transactions.*',
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name")
                )
                ->first();

            return response()->json([
                'success' => true,
                'message' => 'Transaction updated successfully',
                'data' => $updatedTransaction
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating transaction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $transaction = DB::table('transactions')->where('id', $id)->first();
            
            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found'
                ], 404);
            }

            $transaction = Transaction::find($id);
            if ($transaction) {
                $transaction->delete(); // This will now soft delete due to SoftDeletes trait
            }

            return response()->json([
                'success' => true,
                'message' => 'Transaction deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting transaction: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Release a transaction (change status to released)
     */
    public function release(Request $request, string $id)
    {
        try {
            $transaction = DB::table('transactions')->where('id', $id)->first();
            
            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found'
                ], 404);
            }

            if ($transaction->status === 'released') {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction is already released'
                ], 400);
            }

            $validatedData = $request->validate([
                'release_notes' => 'sometimes|string|max:500',
                'notes' => 'sometimes|string|max:500',
                'release_condition' => 'sometimes|in:good_condition,brand_new,damaged',
                'condition_on_issue' => 'sometimes|string|max:255',
                'released_by' => 'sometimes|exists:users,id',
                'release_date' => 'sometimes|date',
            ]);

            $updateData = [
                'status' => 'released',
                'release_date' => now(),
                'updated_at' => now(),
            ];

            // Handle notes field (support both field names)
            if (isset($validatedData['release_notes'])) {
                $updateData['release_notes'] = $validatedData['release_notes'];
            } elseif (isset($validatedData['notes'])) {
                $updateData['release_notes'] = $validatedData['notes'];
            }

            // Handle condition field (support both field names)
            if (isset($validatedData['release_condition'])) {
                $updateData['release_condition'] = $validatedData['release_condition'];
            } elseif (isset($validatedData['condition_on_issue'])) {
                // Map free text condition to enum values
                $conditionText = strtolower(trim($validatedData['condition_on_issue']));
                if (strpos($conditionText, 'excellent') !== false || strpos($conditionText, 'brand new') !== false || strpos($conditionText, 'perfect') !== false) {
                    $updateData['release_condition'] = 'brand_new';
                } elseif (strpos($conditionText, 'damaged') !== false || strpos($conditionText, 'broken') !== false || strpos($conditionText, 'defective') !== false) {
                    $updateData['release_condition'] = 'damaged';
                } else {
                    // Default to good_condition for any other text
                    $updateData['release_condition'] = 'good_condition';
                }
            }

            // Handle released_by field (make it optional)
            if (isset($validatedData['released_by'])) {
                $updateData['released_by'] = $validatedData['released_by'];
            } else {
                // Use currently authenticated user's ID
                $updateData['released_by'] = Auth::id();
            }

            DB::table('transactions')->where('id', $id)->update($updateData);

            // Ensure linked request is not shown in Approved anymore
            if ($transaction->request_id) {
                DB::table('requests')->where('id', $transaction->request_id)->update([
                    'status' => 'fulfilled',
                    'updated_at' => now()
                ]);
            } else if ($transaction->employee_id && $transaction->equipment_id) {
                DB::table('requests')
                    ->where('employee_id', $transaction->employee_id)
                    ->where('equipment_id', $transaction->equipment_id)
                    ->whereIn('status', ['approved'])
                    ->update([
                        'status' => 'fulfilled',
                        'updated_at' => now()
                    ]);
            }

            $updatedTransaction = DB::table('transactions')
                ->leftJoin('employees', 'transactions.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->where('transactions.id', $id)
                ->select(
                    'transactions.*',
                    DB::raw("COALESCE(employees.first_name, '') as first_name"),
                    DB::raw("COALESCE(employees.last_name, '') as last_name"),
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.position, '') as position"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model")
                )
                ->first();

            // Log the release activity with the person who released it
            $releasedByUser = User::find($updateData['released_by']);
            $releasedByName = $releasedByUser ? $releasedByUser->name : 'Unknown';
            $employeeName = trim(($updatedTransaction->first_name ?? '') . ' ' . ($updatedTransaction->last_name ?? ''));
            $equipmentInfo = trim(($updatedTransaction->equipment_name ?? '') . ' ' . ($updatedTransaction->brand ?? ''));
            
            ActivityLogService::logTransactionActivity(
                'Released',
                "Equipment '{$equipmentInfo}' released to {$employeeName} by {$releasedByName}",
                Transaction::find($id)
            );

            return response()->json([
                'success' => true,
                'message' => 'Transaction released successfully',
                'data' => $updatedTransaction
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error releasing transaction: ' . $e->getMessage()
            ], 500);
        }
    }
}
