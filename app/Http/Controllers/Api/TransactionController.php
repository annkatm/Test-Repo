<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Transaction;
use App\Models\Equipment;
use App\Models\Employee;
use App\Models\User;

class TransactionController extends Controller
{
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
            // Count new requests (pending status)
            $newRequests = DB::table('requests')
                ->where('status', 'pending')
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
                // Join the correct equipment table used by the current database
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->select(
                    'transactions.*',
                    DB::raw("COALESCE(employees.first_name, '') as first_name"),
                    DB::raw("COALESCE(employees.last_name, '') as last_name"),
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.position, '') as position"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model"),
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
                'transaction_number' => 'required|string|unique:transactions,transaction_number',
                'request_mode' => 'required|in:on_site,work_from_home',
                'expected_return_date' => 'required|date',
                'status' => 'sometimes|in:pending,released,returned,lost,damaged',
            ]);

            $validatedData['status'] = $validatedData['status'] ?? 'pending';
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
                'return_condition' => 'sometimes|string',
                'notes' => 'sometimes|string',
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

            DB::table('transactions')->where('id', $id)->delete();

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
                // Set a default user ID or leave null if not required
                $updateData['released_by'] = 1; // Default admin user, you may want to get this from auth
            }

            DB::table('transactions')->where('id', $id)->update($updateData);

            $updatedTransaction = DB::table('transactions')
                ->leftJoin('employees', 'transactions.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->where('transactions.id', $id)
                ->select(
                    'transactions.*',
                    DB::raw("COALESCE(employees.first_name, '') as first_name"),
                    DB::raw("COALESCE(employees.last_name, '') as last_name"),
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.employee_type, '') as position"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model")
                )
                ->first();

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