<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
                'employee_type' => 'required|in:Regular,Contractor,Temporary',
                'department' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
                'status' => 'required|in:active,inactive,terminated',
                'hire_date' => 'nullable|date',
            ]);

            // Generate a unique employee_id (e.g., EMP + timestamp)
            $employee_id = 'EMP' . time();

            $id = DB::table('employees')->insertGetId([
                'employee_id' => $employee_id,
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'employee_type' => $validated['employee_type'],
                'department' => $validated['department'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'status' => $validated['status'],
                'hire_date' => $validated['hire_date'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Employee created successfully',
                'id' => $id
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
            $employee = DB::table('employees')->where('id', $id)->first();
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
                'employee_type' => 'required|in:Regular,Contractor,Temporary',
                'department' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
                'status' => 'required|in:active,inactive,terminated',
                'hire_date' => 'nullable|date',
            ]);

            DB::table('employees')->where('id', $id)->update([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'employee_type' => $validated['employee_type'],
                'department' => $validated['department'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'status' => $validated['status'],
                'hire_date' => $validated['hire_date'] ?? null,
                'updated_at' => now(),
            ]);

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
     * Delete an employee
     */
    public function destroy($id)
    {
        try {
            $employee = DB::table('employees')->where('id', $id)->first();
            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee not found'
                ], 404);
            }

            $employee = Employee::find($id);
            if ($employee) {
                $employee->delete(); // This will now soft delete due to SoftDeletes trait
            }

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
     * Get all employees
     */
    public function index()
    {
        try {
            $employees = DB::table('employees')
                ->where('status', 'active')
                ->orderBy('first_name', 'asc')
                ->get();

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
     * Get employee by ID
     */
    public function show($id)
    {
        try {
            $employee = DB::table('employees')->where('id', $id)->first();
            
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