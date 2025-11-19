<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        $departments = Department::all();
        return response()->json([
            'success' => true,
            'data' => $departments,
            'message' => 'Departments retrieved successfully'
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255|unique:departments,name',
            ]);

            $department = Department::create(['name' => $request->name]);

            ActivityLogService::logSystemActivity(
                'Created department',
                "Created new department: {$department->name}"
            );

            return response()->json([
                'success' => true,
                'data' => $department,
                'message' => 'Department created successfully'
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

    public function show(Department $department): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $department,
            'message' => 'Department retrieved successfully'
        ]);
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255|unique:departments,name,' . $department->id,
            ]);

            $department->update(['name' => $request->name]);

            ActivityLogService::logSystemActivity(
                'Updated department',
                "Updated department: {$department->name}"
            );

            return response()->json([
                'success' => true,
                'data' => $department,
                'message' => 'Department updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Department $department): JsonResponse
    {
        try {
            ActivityLogService::logSystemActivity(
                'Deleted department',
                "Deleted department: {$department->name}"
            );
            
            $department->forceDelete(); // Permanent delete

            return response()->json([
                'success' => true,
                'message' => 'Department deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
