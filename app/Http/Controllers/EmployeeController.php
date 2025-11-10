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
                'employee_type' => 'nullable|in:End of Service,Independent Contractor,New hire,Probationary,Regular,Resigned,Separated,Terminated',
                'department' => 'nullable|string|max:255',
                'position' => 'nullable|string|max:255',
                'client' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
                'address' => 'nullable|string',
                'issued_item' => 'nullable|string',
                'status' => 'nullable|in:active,inactive,terminated',
                'hire_date' => 'nullable|date',
                'issued_equipment_ids' => 'nullable|array',
                'issued_equipment_ids.*' => 'integer|exists:equipment,id',
            ]);
            
            // Remove issued_equipment_ids from validated data as it's not a column
            $equipmentIds = $validated['issued_equipment_ids'] ?? [];
            unset($validated['issued_equipment_ids']);

            // Generate a unique employee_id with timestamp + random number
            // Loop until we get a unique ID to prevent duplicate key errors
            do {
                $validated['employee_id'] = 'EMP' . time() . rand(100, 999);
            } while (Employee::where('employee_id', $validated['employee_id'])->exists());
            
            $validated['status'] = $validated['status'] ?? 'active';

            // Log the data being inserted for debugging
            \Log::info('Creating employee with data:', $validated);
            \Log::info('Issued item length: ' . strlen($validated['issued_item'] ?? ''));

            $employee = Employee::create($validated);

            // Update equipment status to 'issued' if equipment IDs are provided
            if (!empty($equipmentIds)) {
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
                'message' => $e->getMessage(),
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Employee creation error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Error creating employee: ' . $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
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

            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|email|max:255|unique:employees,email,' . $id,
                'user_id' => 'nullable|exists:users,id',
                'employee_type' => 'nullable|in:End of Service,Independent Contractor,New hire,Probationary,Regular,Resigned,Separated,Terminated',
                'department' => 'nullable|string|max:255',
                'position' => 'nullable|string|max:255',
                'client' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
                'address' => 'nullable|string',
                'issued_item' => 'nullable|string',
                'status' => 'nullable|in:active,inactive,terminated',
                'hire_date' => 'nullable|date',
            ]);

            // Get old issued equipment IDs from current issued_item JSON
            $oldEquipmentIds = [];
            if ($employee->issued_item) {
                $oldIssuedData = json_decode($employee->issued_item, true);
                if (is_array($oldIssuedData)) {
                    $oldEquipmentIds = array_column($oldIssuedData, 'id');
                }
            }

            // Get new equipment IDs from request
            $newEquipmentIds = $request->has('issued_equipment_ids') && is_array($request->issued_equipment_ids) 
                ? $request->issued_equipment_ids 
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

            $employee->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Employee updated successfully'
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
}