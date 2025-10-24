<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountType;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $accountTypes = AccountType::all();
        return response()->json([
            'success' => true,
            'data' => $accountTypes,
            'message' => 'Account types retrieved successfully'
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255|unique:account_types,name',
            ]);

            $accountType = AccountType::create(['name' => $request->name]);

            ActivityLogService::logSystemActivity(
                'Created account type',
                "Created new account type: {$accountType->name}"
            );

            return response()->json([
                'success' => true,
                'data' => $accountType,
                'message' => 'Account type created successfully'
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

    public function show(AccountType $accountType): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $accountType,
            'message' => 'Account type retrieved successfully'
        ]);
    }

    public function update(Request $request, AccountType $accountType): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255|unique:account_types,name,' . $accountType->id,
            ]);

            $accountType->update(['name' => $request->name]);

            ActivityLogService::logSystemActivity(
                'Updated account type',
                "Updated account type: {$accountType->name}"
            );

            return response()->json([
                'success' => true,
                'data' => $accountType,
                'message' => 'Account type updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(AccountType $accountType): JsonResponse
    {
        try {
            ActivityLogService::logSystemActivity(
                'Deleted account type',
                "Deleted account type: {$accountType->name}"
            );
            
            $accountType->delete();

            return response()->json([
                'success' => true,
                'message' => 'Account type deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete account type',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
