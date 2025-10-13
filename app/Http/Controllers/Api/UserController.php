<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    /**
     * Display a listing of users grouped by role
     */
    public function index(): JsonResponse
    {
        try {
            // Get all users with their roles and permissions
            $users = User::with(['role', 'userPermissions'])->get();
            
            // Separate admins and employees based on role
            $admins = $users->filter(function ($user) {
                return $user->role && in_array($user->role->name, ['admin', 'super_admin']);
            })->values();
            
            $employees = $users->filter(function ($user) {
                return !$user->role || $user->role->name === 'employee';
            })->values();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'admins' => $admins,
                    'employees' => $employees
                ],
                'message' => 'Users retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving users: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created user
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
                'username' => 'nullable|string|max:255',
                'accountType' => 'required|in:admin,employee',
                'position' => 'nullable|string|max:255',
                'department' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get role based on accountType
            $roleName = $request->accountType === 'admin' ? 'admin' : 'employee';
            $role = Role::where('name', $roleName)->first();

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role_id' => $role ? $role->id : null,
                'employee_id' => $request->username,
                'position' => $request->position,
                'department' => $request->department,
                'phone' => $request->phone,
                'is_active' => true,
            ]);

            $user->load(['role', 'userPermissions']);

            // Log the activity
            $roleName = $user->role ? $user->role->name : 'No role';
            ActivityLogService::logUserActivity(
                'Created new user',
                "Created user account for {$user->name} ({$user->email}) with role: {$roleName}",
                $user
            );

            return response()->json([
                'success' => true,
                'data' => $user,
                'message' => 'User created successfully'
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified user
     */
    public function show(string $id): JsonResponse
    {
        try {
            $user = User::with('role')->findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => $user,
                'message' => 'User retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }
    }

    /**
     * Update the specified user
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email,' . $id,
                'password' => 'nullable|string|min:6',
                'username' => 'nullable|string|max:255',
                'accountType' => 'required|in:admin,employee',
                'position' => 'nullable|string|max:255',
                'department' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:50',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Get role based on accountType
            $roleName = $request->accountType === 'admin' ? 'admin' : 'employee';
            $role = Role::where('name', $roleName)->first();

            $updateData = [
                'name' => $request->name,
                'email' => $request->email,
                'role_id' => $role ? $role->id : null,
                'employee_id' => $request->username,
                'position' => $request->position,
                'department' => $request->department,
                'phone' => $request->phone,
            ];

            // Only update password if provided
            if ($request->password) {
                $updateData['password'] = Hash::make($request->password);
            }

            // Store old values for logging
            $oldValues = $user->toArray();
            
            $user->update($updateData);
            $user->load(['role', 'userPermissions']);

            // Log the activity
            ActivityLogService::logUserActivity(
                'Updated user',
                "Updated user account for {$user->name} ({$user->email})",
                $user,
                $oldValues,
                $user->toArray()
            );

            return response()->json([
                'success' => true,
                'data' => $user,
                'message' => 'User updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified user
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            
            // Log the activity before deletion
            ActivityLogService::logUserActivity(
                'Deleted user',
                "Deleted user account for {$user->name} ({$user->email})",
                $user
            );
            
            $user->delete();

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user permissions (custom or role-based)
     */
    public function getPermissions(string $id): JsonResponse
    {
        try {
            $user = User::with(['role', 'userPermissions'])->findOrFail($id);
            
            $permissions = $user->getEffectivePermissions();
            $isCustom = $user->userPermissions && $user->userPermissions->use_custom_permissions;
            
            return response()->json([
                'success' => true,
                'data' => [
                    'permissions' => $permissions,
                    'is_custom' => $isCustom,
                    'role_permissions' => $user->role ? $user->role->permissions : []
                ],
                'message' => 'User permissions retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving user permissions: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Set custom permissions for a user
     */
    public function setPermissions(Request $request, string $id): JsonResponse
    {
        try {
            $user = User::with(['role', 'userPermissions'])->findOrFail($id);
            
            $validator = Validator::make($request->all(), [
                'permissions' => 'required|array',
                'use_custom' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $permissions = $request->permissions;
            $useCustom = $request->boolean('use_custom', true);

            if ($useCustom) {
                $user->enableCustomPermissions($permissions);
            } else {
                $user->disableCustomPermissions();
            }

            // Reload the user with updated permissions
            $user->load(['role', 'userPermissions']);

            // Log the activity
            ActivityLogService::logUserActivity(
                'Updated user permissions',
                "Updated permissions for {$user->name} ({$user->email}) - " . 
                ($useCustom ? 'Custom permissions enabled' : 'Reset to role permissions'),
                $user
            );

            return response()->json([
                'success' => true,
                'data' => $user, // Return the full user object instead of just permissions
                'message' => 'User permissions updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating user permissions: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reset user permissions to role defaults
     */
    public function resetPermissions(string $id): JsonResponse
    {
        try {
            $user = User::with(['role', 'userPermissions'])->findOrFail($id);
            
            $user->disableCustomPermissions();
            $user->load(['role', 'userPermissions']);

            // Log the activity
            ActivityLogService::logUserActivity(
                'Reset user permissions',
                "Reset permissions for {$user->name} ({$user->email}) to role defaults",
                $user
            );

            return response()->json([
                'success' => true,
                'data' => $user, // Return the full user object instead of just permissions
                'message' => 'User permissions reset to role defaults'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error resetting user permissions: ' . $e->getMessage()
            ], 500);
        }
    }
}
