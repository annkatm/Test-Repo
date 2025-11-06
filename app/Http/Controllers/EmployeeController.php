<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Employee;
use App\Models\User;

class EmployeeController extends Controller
{
    /**
     * Store a new employee
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|email|max:255|unique:employees,email',
                'user_id' => 'nullable|exists:users,id',
                'employee_type' => 'nullable|string|max:50|in:End of Service,Independent Contractor,New hire,Probationary,Regular,Resigned,Separated,Terminated',
                'department' => 'nullable|string|max:255',
                'position' => 'nullable|string|max:255',
                'client' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
                'address' => 'nullable|string',
                'issued_item' => 'nullable|string',
                'status' => 'nullable|in:active,inactive,terminated',
                'hire_date' => 'nullable|date',
                'issued_equipment_ids' => 'nullable|array',
                'issued_equipment_ids.*' => 'integer|exists:equipment,id'
            ]);

            // Generate a unique employee_id (e.g., EMP + timestamp)
            $validated['employee_id'] = 'EMP' . time();
            $validated['status'] = $validated['status'] ?? 'active';

            $employee = Employee::create($validated);

            // Update equipment status to 'issued' if equipment IDs are provided
            if ($request->has('issued_equipment_ids') && is_array($request->issued_equipment_ids)) {
                $equipmentIds = array_filter($request->issued_equipment_ids, function($id) {
                    return !is_null($id) && is_numeric($id);
                });
                
                foreach ($equipmentIds as $equipmentId) {
                    DB::table('equipment')
                        ->where('id', $equipmentId)
                        ->update([
                            'status' => 'issued',
                            'updated_at' => now()
                        ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Employee created successfully',
                'data' => $employee
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Employee creation error: ' . $e->getMessage(), [
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error creating employee: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an existing employee
     */
    public function update(Request $request, $id)
    {
        try {
            $employee = Employee::find($id);
            
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            // Validation rules
            $rules = [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|email|max:255|unique:employees,email,' . $id,
                'user_id' => 'nullable|exists:users,id',
                'employee_type' => 'nullable|string|max:50|in:End of Service,Independent Contractor,New hire,Probationary,Regular,Resigned,Separated,Terminated',
                'department' => 'nullable|string|max:255',
                'position' => 'nullable|string|max:255',
                'client' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
                'address' => 'nullable|string',
                'issued_item' => 'nullable|string',
                'status' => 'nullable|in:active,inactive,terminated',
                'hire_date' => 'nullable|date',
                'issued_equipment_ids' => 'nullable|array',
                'issued_equipment_ids.*' => 'integer|exists:equipment,id'
            ];

            // Only validate password if it's provided
            if ($request->has('password') && !empty($request->password)) {
                $rules['password'] = 'string|min:8';
            }

            $validated = $request->validate($rules);

            // Handle password hashing if provided
            if (isset($validated['password'])) {
                $validated['password'] = bcrypt($validated['password']);
            }

            // Get old issued equipment IDs from current issued_item JSON
            $oldEquipmentIds = [];
            if ($employee->issued_item) {
                try {
                    $oldIssuedData = json_decode($employee->issued_item, true);
                    if (is_array($oldIssuedData)) {
                        $oldEquipmentIds = array_column($oldIssuedData, 'id');
                        // Filter out null/empty values
                        $oldEquipmentIds = array_filter($oldEquipmentIds, function($id) {
                            return !is_null($id) && is_numeric($id);
                        });
                    }
                } catch (\Exception $e) {
                    // If JSON parsing fails, assume no old equipment
                    $oldEquipmentIds = [];
                }
            }

            // Get new equipment IDs from request
            $newEquipmentIds = $request->has('issued_equipment_ids') && is_array($request->issued_equipment_ids) 
                ? array_filter($request->issued_equipment_ids, function($id) {
                    return !is_null($id) && is_numeric($id);
                })
                : [];

            // Equipment that was removed - set back to 'available'
            $removedEquipmentIds = array_diff($oldEquipmentIds, $newEquipmentIds);
            foreach ($removedEquipmentIds as $equipmentId) {
                DB::table('equipment')
                    ->where('id', $equipmentId)
                    ->update([
                        'status' => 'available',
                        'updated_at' => now()
                    ]);
            }

            // Equipment that was added - set to 'issued'
            $addedEquipmentIds = array_diff($newEquipmentIds, $oldEquipmentIds);
            foreach ($addedEquipmentIds as $equipmentId) {
                DB::table('equipment')
                    ->where('id', $equipmentId)
                    ->update([
                        'status' => 'issued',
                        'updated_at' => now()
                    ]);
            }

            // Remove password from validated data if it's empty
            if (isset($validated['password']) && empty($validated['password'])) {
                unset($validated['password']);
            }

            $employee->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Employee updated successfully',
                'data' => $employee->fresh()
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Employee update error: ' . $e->getMessage(), [
                'employee_id' => $id,
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error updating employee: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an employee (soft delete)
     */
    public function destroy($id)
    {
        try {
            $employee = Employee::find($id);
            
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            // Release all issued equipment back to 'available' status
            if ($employee->issued_item) {
                $issuedData = json_decode($employee->issued_item, true);
                if (is_array($issuedData)) {
                    $equipmentIds = array_column($issuedData, 'id');
                    foreach ($equipmentIds as $equipmentId) {
                        DB::table('equipment')
                            ->where('id', $equipmentId)
                            ->update([
                                'status' => 'available',
                                'updated_at' => now()
                            ]);
                    }
                }
            }

            // Soft delete the employee
            $employee->delete();

            return response()->json([
                'success' => true,
                'message' => 'Employee deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting employee: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Get all employees (excluding soft-deleted) with optional filtering
     */
    public function index(Request $request)
    {
        try {
            $query = Employee::with('user');

            // Apply filters
            if ($request->has('employee_type') && $request->employee_type !== 'all') {
                $query->where('employee_type', $request->employee_type);
            }

            if ($request->has('department') && $request->department !== 'all') {
                $query->where('department', $request->department);
            }

            if ($request->has('client') && $request->client !== 'all') {
                $query->where('client', $request->client);
            }


            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('first_name', 'like', "%{$searchTerm}%")
                      ->orWhere('last_name', 'like', "%{$searchTerm}%")
                      ->orWhere('email', 'like', "%{$searchTerm}%")
                      ->orWhere('position', 'like', "%{$searchTerm}%")
                      ->orWhere('department', 'like', "%{$searchTerm}%")
                      ->orWhere('client', 'like', "%{$searchTerm}%");
                });
            }

            $employees = $query->orderBy('first_name', 'asc')->get();

            // Enhance each employee with issued equipment details
            $employees->each(function ($employee) {
                if ($employee->issued_item) {
                    try {
                        $issuedData = json_decode($employee->issued_item, true);
                        if (is_array($issuedData) && count($issuedData) > 0) {
                            $equipmentIds = array_column($issuedData, 'id');
                            // Fetch full equipment details
                            $equipmentDetails = DB::table('equipment')
                                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                                ->whereIn('equipment.id', $equipmentIds)
                                ->select(
                                    'equipment.*',
                                    'categories.name as category_name'
                                )
                                ->get();
                            $employee->issued_equipment = $equipmentDetails;
                        } else {
                            $employee->issued_equipment = [];
                        }
                    } catch (\Exception $e) {
                        $employee->issued_equipment = [];
                    }
                } else {
                    $employee->issued_equipment = [];
                }
            });

            return response()->json([
                'success' => true,
                'data' => $employees,
                'count' => $employees->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching employees: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employee by ID (excluding soft-deleted)
     */
    public function show($id)
    {
        try {
            $employee = Employee::with('user')->find($id);
            
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            // Enhance with issued equipment details
            if ($employee->issued_item) {
                try {
                    $issuedData = json_decode($employee->issued_item, true);
                    if (is_array($issuedData) && count($issuedData) > 0) {
                        $equipmentIds = array_column($issuedData, 'id');
                        // Fetch full equipment details
                        $equipmentDetails = DB::table('equipment')
                            ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                            ->whereIn('equipment.id', $equipmentIds)
                            ->select(
                                'equipment.*',
                                'categories.name as category_name'
                            )
                            ->get();
                        $employee->issued_equipment = $equipmentDetails;
                    } else {
                        $employee->issued_equipment = [];
                    }
                } catch (\Exception $e) {
                    $employee->issued_equipment = [];
                }
            } else {
                $employee->issued_equipment = [];
            }

            return response()->json([
                'success' => true,
                'data' => $employee
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching employee: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employees with their current equipment assignments
     */
    public function currentHolders()
    {
        try {
            $currentHolders = DB::table('transactions')
                ->join('employees', 'transactions.employee_id', '=', 'employees.id')
                ->join('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('transactions.status', 'released')
                ->select(
                    'transactions.id as transaction_id',
                    'transactions.transaction_number',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.position',
                    'equipment.name as equipment_name',
                    'categories.name as category_name',
                    'transactions.request_mode',
                    'transactions.expected_return_date',
                    'transactions.release_date'
                )
                ->orderBy('transactions.release_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $currentHolders,
                'count' => $currentHolders->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching current holders: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employees with pending requests
     */
    public function pendingRequests()
    {
        try {
            $pendingRequests = DB::table('requests')
                ->join('employees', 'requests.employee_id', '=', 'employees.id')
                ->join('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('requests.status', 'pending')
                ->select(
                    'requests.id as request_id',
                    'requests.request_number',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.position',
                    'equipment.name as equipment_name',
                    'categories.name as category_name',
                    'requests.request_mode',
                    'requests.reason',
                    'requests.requested_date'
                )
                ->orderBy('requests.requested_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $pendingRequests,
                'count' => $pendingRequests->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching pending requests: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employees with returned equipment for verification
     */
    public function verifyReturns()
    {
        try {
            $verifyReturns = DB::table('transactions')
                ->join('employees', 'transactions.employee_id', '=', 'employees.id')
                ->join('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('transactions.status', 'returned')
                ->select(
                    'transactions.id as transaction_id',
                    'transactions.transaction_number',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.position',
                    'equipment.name as equipment_name',
                    'categories.name as category_name',
                    'transactions.return_date',
                    'transactions.expected_return_date',
                    'transactions.return_condition'
                )
                ->orderBy('transactions.return_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $verifyReturns,
                'count' => $verifyReturns->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching verify returns: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dynamic dashboard statistics
     */
    public function getDashboardStats()
    {
        try {
            // Count items currently borrowed/issued (from employee issued_item field)
            $itemsBorrowed = DB::table('employees')
                ->whereNotNull('issued_item')
                ->where('issued_item', '!=', '')
                ->where('issued_item', '!=', '[]')
                ->whereNull('deleted_at')
                ->get()
                ->sum(function ($employee) {
                    try {
                        $issuedItems = json_decode($employee->issued_item, true);
                        return is_array($issuedItems) ? count($issuedItems) : 0;
                    } catch (\Exception $e) {
                        return 0;
                    }
                });

            // Alternative count from equipment status
            $equipmentIssued = DB::table('equipment')
                ->where('status', 'issued')
                ->whereNull('deleted_at')
                ->count();

            // Count from transactions table (active/released status)
            $transactionsBorrowed = DB::table('transactions')
                ->whereIn('status', ['released', 'borrowed', 'active'])
                ->whereNull('deleted_at')
                ->count();

            // Count total equipment
            $totalEquipment = DB::table('equipment')
                ->whereNull('deleted_at')
                ->count();

            // Count available equipment
            $availableEquipment = DB::table('equipment')
                ->where('status', 'available')
                ->whereNull('deleted_at')
                ->count();

            // Count employees with issued items
            $employeesWithItems = DB::table('employees')
                ->whereNotNull('issued_item')
                ->where('issued_item', '!=', '')
                ->where('issued_item', '!=', '[]')
                ->whereNull('deleted_at')
                ->count();

            // Count pending requests
            $pendingRequests = DB::table('requests')
                ->where('status', 'pending')
                ->whereNull('deleted_at')
                ->count();

            // Count approved requests
            $approvedRequests = DB::table('requests')
                ->where('status', 'approved')
                ->whereNull('deleted_at')
                ->count();

            // Use the highest count as the most accurate representation
            $currentlyBorrowed = max($itemsBorrowed, $equipmentIssued, $transactionsBorrowed);

            return response()->json([
                'success' => true,
                'data' => [
                    'items_currently_borrowed' => $currentlyBorrowed,
                    'items_borrowed_from_employees' => $itemsBorrowed,
                    'equipment_marked_issued' => $equipmentIssued,
                    'active_transactions' => $transactionsBorrowed,
                    'total_equipment' => $totalEquipment,
                    'available_equipment' => $availableEquipment,
                    'employees_with_items' => $employeesWithItems,
                    'pending_requests' => $pendingRequests,
                    'approved_requests' => $approvedRequests,
                    'last_updated' => now()->toISOString()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching dashboard stats: ' . $e->getMessage()
            ], 500);
        }
    }





    /**
     * Get available users for employee connection
     */
    public function getAvailableUsers()
    {
        try {
            // Get users that don't have an employee record yet
            $availableUsers = User::whereDoesntHave('employee')
                ->where('is_active', true)
                ->select('id', 'name', 'email', 'role_id')
                ->with('role:id,name')
                ->orderBy('name', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $availableUsers,
                'count' => $availableUsers->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching available users: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Connect an employee to a user
     */
    public function connectUser(Request $request, $id)
    {
        try {
            $employee = Employee::find($id);
            
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            $validated = $request->validate([
                'user_id' => 'required|exists:users,id'
            ]);

            // Check if user is already connected to another employee
            $existingEmployee = Employee::where('user_id', $validated['user_id'])->first();
            if ($existingEmployee && $existingEmployee->id != $id) {
                return response()->json([
                    'success' => false,
                    'message' => 'This user is already connected to another employee'
                ], 422);
            }

            $employee->update(['user_id' => $validated['user_id']]);
            $employee->load('user');

            return response()->json([
                'success' => true,
                'message' => 'Employee connected to user successfully',
                'data' => $employee
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error connecting employee to user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Disconnect an employee from a user
     */
    public function disconnectUser($id)
    {
        try {
            $employee = Employee::find($id);
            
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            $employee->update(['user_id' => null]);

            return response()->json([
                'success' => true,
                'message' => 'Employee disconnected from user successfully',
                'data' => $employee
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error disconnecting employee from user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employee history including current items and transaction history
     */
    public function getEmployeeHistory($id)
    {
        try {
            $employee = Employee::find($id);
            
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            // Get current items assigned to this employee
            // This could be from transactions with 'released' status or direct assignments
            $currentItems = [];
            
            // Method 1: Get from active transactions
            $activeTransactions = DB::table('transactions')
                ->join('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('transactions.employee_id', $id)
                ->where('transactions.status', 'released')
                ->select(
                    'equipment.id',
                    'equipment.name',
                    'equipment.brand',
                    'equipment.model',
                    'equipment.specifications as specs',
                    'categories.name as category_name',
                    'transactions.created_at',
                    'transactions.expected_return_date'
                )
                ->get();

            foreach ($activeTransactions as $transaction) {
                $currentItems[] = [
                    'id' => $transaction->id,
                    'name' => $transaction->name,
                    'brand' => $transaction->brand,
                    'model' => $transaction->model,
                    'specs' => $transaction->specs,
                    'category' => ['name' => $transaction->category_name],
                    'assigned_date' => $transaction->created_at,
                    'expected_return_date' => $transaction->expected_return_date
                ];
            }

            // Method 2: Get directly issued equipment (if no active transactions found)
            if (empty($currentItems)) {
                // Look for equipment that might be directly assigned
                // This is a fallback method - you might need to adjust based on your actual data structure
                $directlyIssued = DB::table('equipment')
                    ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                    ->where('equipment.status', 'issued')
                    ->select(
                        'equipment.id',
                        'equipment.name',
                        'equipment.brand',
                        'equipment.model',
                        'equipment.specifications as specs',
                        'categories.name as category_name',
                        'equipment.created_at'
                    )
                    ->get();

                foreach ($directlyIssued as $equipment) {
                    $currentItems[] = [
                        'id' => $equipment->id,
                        'name' => $equipment->name,
                        'brand' => $equipment->brand,
                        'model' => $equipment->model,
                        'specs' => $equipment->specs,
                        'category' => ['name' => $equipment->category_name],
                        'assigned_date' => $equipment->created_at
                    ];
                }
            }

            // Get transaction history (completed transactions)
            $transactionHistory = DB::table('transactions')
                ->join('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('transactions.employee_id', $id)
                ->whereIn('transactions.status', ['returned', 'completed'])
                ->select(
                    'transactions.id as transaction_id',
                    'transactions.transaction_number',
                    'equipment.name as equipment_name',
                    'equipment.brand',
                    'equipment.model',
                    'categories.name as category_name',
                    'transactions.status',
                    'transactions.release_date',
                    'transactions.return_date',
                    'transactions.created_at'
                )
                ->orderBy('transactions.created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'employee' => $employee,
                    'current_items' => $currentItems,
                    'transaction_history' => $transactionHistory
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching employee history: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Return an item for an employee
     */
    public function returnItem(Request $request, $id)
    {
        try {
            $employee = Employee::find($id);
            
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            $validated = $request->validate([
                'equipment_id' => 'required|integer',
                'return_condition' => 'required|in:good_condition,brand_new,damaged',
                'notes' => 'nullable|string|max:500'
            ]);

            $equipmentId = $validated['equipment_id'];
            
            // Check if the equipment exists and is currently assigned to this employee
            $equipment = DB::table('equipment')->where('id', $equipmentId)->first();
            
            if (!$equipment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Equipment not found'
                ], 404);
            }

            // Check if there's an active transaction for this equipment and employee
            $activeTransaction = DB::table('transactions')
                ->where('employee_id', $id)
                ->where('equipment_id', $equipmentId)
                ->where('status', 'released')
                ->first();

            if ($activeTransaction) {
                // Update the transaction to returned status
                DB::table('transactions')
                    ->where('id', $activeTransaction->id)
                    ->update([
                        'status' => 'returned',
                        'return_date' => now(),
                        'return_condition' => $validated['return_condition'],
                        'return_notes' => $validated['notes'],
                        'received_by' => auth()->id(),
                        'updated_at' => now()
                    ]);
            } else {
                // For directly issued items, check if equipment is currently issued
                if ($equipment->status !== 'issued') {
                    return response()->json([
                        'success' => false,
                        'message' => 'This equipment is not currently issued to any employee'
                    ], 400);
                }

                // Create a transaction record for the return (for tracking purposes)
                DB::table('transactions')->insert([
                    'user_id' => $employee->user_id ?? auth()->id(),
                    'employee_id' => $id,
                    'equipment_id' => $equipmentId,
                    'transaction_number' => 'RTN-' . time(),
                    'status' => 'returned',
                    'return_date' => now(),
                    'return_condition' => $validated['return_condition'],
                    'return_notes' => $validated['notes'],
                    'received_by' => auth()->id(),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            // Update equipment status back to available
            DB::table('equipment')
                ->where('id', $equipmentId)
                ->update([
                    'status' => 'available',
                    'updated_at' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Equipment returned successfully',
                'data' => [
                    'employee_id' => $id,
                    'equipment_id' => $equipmentId,
                    'return_date' => now()->toDateTimeString()
                ]
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
                'message' => 'Error returning equipment: ' . $e->getMessage()
            ], 500);
        }
    }
}