<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeType;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $employeeTypes = EmployeeType::orderBy('code')->get();
        return response()->json([
            'success' => true,
            'data' => $employeeTypes,
            'message' => 'Employee types retrieved successfully'
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255|unique:employee_types,name',
                'code' => 'required|integer|min:0|max:6|unique:employee_types,code',
            ]);

            $employeeType = EmployeeType::create([
                'name' => $request->name,
                'code' => $request->code,
            ]);

            ActivityLogService::logSystemActivity(
                'Created employee type',
                "Created new employee type: {$employeeType->name} (Code: {$employeeType->code})"
            );

            return response()->json([
                'success' => true,
                'data' => $employeeType,
                'message' => 'Employee type created successfully'
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(EmployeeType $employeeType): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $employeeType,
            'message' => 'Employee type retrieved successfully'
        ]);
    }

    public function update(Request $request, EmployeeType $employeeType): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255|unique:employee_types,name,' . $employeeType->id,
                'code' => 'required|integer|min:0|max:6|unique:employee_types,code,' . $employeeType->id,
            ]);

            $employeeType->update([
                'name' => $request->name,
                'code' => $request->code,
            ]);

            ActivityLogService::logSystemActivity(
                'Updated employee type',
                "Updated employee type: {$employeeType->name} (Code: {$employeeType->code})"
            );

            return response()->json([
                'success' => true,
                'data' => $employeeType,
                'message' => 'Employee type updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(EmployeeType $employeeType): JsonResponse
    {
        try {
            ActivityLogService::logSystemActivity(
                'Deleted employee type',
                "Deleted employee type: {$employeeType->name}"
            );
            
            $employeeType->forceDelete(); // Permanent delete

            return response()->json([
                'success' => true,
                'message' => 'Employee type deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete employee type',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
