<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Employee;

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
                'employee_type' => 'nullable|string|max:255',
                'department' => 'nullable|string|max:255',
                'position' => 'nullable|string|max:255',
                'client' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
                'address' => 'nullable|string',
                'issued_item' => 'nullable|string',
                'status' => 'nullable|in:active,inactive,terminated',
                'hire_date' => 'nullable|date',
            ]);

            // Generate a unique employee_id (e.g., EMP + timestamp)
            $validated['employee_id'] = 'EMP' . time();
            $validated['status'] = $validated['status'] ?? 'active';

            $employee = Employee::create($validated);

            // Update equipment status to 'in_use' if equipment IDs are provided
            if ($request->has('issued_equipment_ids') && is_array($request->issued_equipment_ids)) {
                foreach ($request->issued_equipment_ids as $equipmentId) {
                    DB::table('equipment')
                        ->where('id', $equipmentId)
                        ->update([
                            'status' => 'in_use',
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

            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|email|max:255|unique:employees,email,' . $id,
                'employee_type' => 'nullable|string|max:255',
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

            // Equipment that was added - set to 'in_use'
            $addedEquipmentIds = array_diff($newEquipmentIds, $oldEquipmentIds);
            foreach ($addedEquipmentIds as $equipmentId) {
                DB::table('equipment')
                    ->where('id', $equipmentId)
                    ->update([
                        'status' => 'in_use',
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
     * Get all employees (excluding soft-deleted)
     */
    public function index()
    {
        try {
            // Using Employee model to respect soft deletes
            $employees = Employee::orderBy('first_name', 'asc')->get();

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
            $employee = Employee::find($id);
            
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
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
                ->join('equipments', 'transactions.equipment_id', '=', 'equipments.id')
                ->where('transactions.status', 'released')
                ->select(
                    'transactions.id as transaction_id',
                    'transactions.transaction_number',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.position',
                    'equipments.name as equipment_name',
                    'equipments.category',
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
                ->join('equipments', 'requests.equipment_id', '=', 'equipments.id')
                ->where('requests.status', 'pending')
                ->select(
                    'requests.id as request_id',
                    'requests.request_number',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.position',
                    'equipments.name as equipment_name',
                    'equipments.category',
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
                ->join('equipments', 'transactions.equipment_id', '=', 'equipments.id')
                ->where('transactions.status', 'returned')
                ->select(
                    'transactions.id as transaction_id',
                    'transactions.transaction_number',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.position',
                    'equipments.name as equipment_name',
                    'equipments.category',
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
}