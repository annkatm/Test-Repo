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
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of users grouped by role
     */
    public function index(): JsonResponse
    {
        try {
            // Get all users with their roles, permissions, and linked employee profile & type
            $users = User::with(['role', 'userPermissions', 'employee.employeeType'])->get();
            
            // Ensure each user has a normalized employee_type attribute for frontend
            $users->each(function ($user) {
                if ($user->employee && $user->employee->employeeType) {
                    // Expose the employee type name directly on the user payload
                    $user->employee_type = $user->employee->employeeType->name;
                } else {
                    $user->employee_type = null;
                }
            });
            
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
                'email' => ['required', 'email', Rule::unique('users')->whereNull('deleted_at')],
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

            // If this is an employee account, link to existing employee or create new one
            if ($roleName === 'employee') {
                // Get employee_type_id if employee_type is provided
                $employeeTypeId = null;
                if ($request->has('employee_type')) {
                    $employeeType = DB::table('employee_types')
                        ->where('name', $request->input('employee_type'))
                        ->whereNull('deleted_at')
                        ->first();
                    $employeeTypeId = $employeeType ? $employeeType->id : null;
                }
                
                // If no employee_type provided, try to get 'Regular' as default
                if (!$employeeTypeId) {
                    $regularType = DB::table('employee_types')
                        ->where('name', 'Regular')
                        ->whereNull('deleted_at')
                        ->first();
                    $employeeTypeId = $regularType ? $regularType->id : null;
                }
                
                // First, check if employee already exists by email
                $existingEmployee = DB::table('employees')->where('email', $request->email)->first();
                
                if ($existingEmployee) {
                    // Employee exists, just update the user_id link
                    $updateData = [
                        'user_id' => $user->id,
                        'updated_at' => now(),
                    ];
                    
                    // Only update employee_type_id if we have a value
                    if ($employeeTypeId) {
                        $updateData['employee_type_id'] = $employeeTypeId;
                    }
                    
                    DB::table('employees')
                        ->where('id', $existingEmployee->id)
                        ->update($updateData);
                } else {
                    // Employee doesn't exist, create new record
                    $nameParts = preg_split('/\s+/', trim((string) $request->name));
                    $firstName = $nameParts[0] ?? '';
                    $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';

                    $insertData = [
                        'user_id' => $user->id,
                        'employee_id' => $request->username ?: 'EMP' . time(),
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'email' => $request->email,
                        'position' => $request->position,
                        'department' => $request->department,
                        'phone' => $request->phone,
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    
                    // Only add employee_type_id if we have a value
                    if ($employeeTypeId) {
                        $insertData['employee_type_id'] = $employeeTypeId;
                    }
                    
                    DB::table('employees')->insert($insertData);
                }
            }

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
            
            // Check if email is being changed
            $emailChanged = $request->email !== $user->email;
            
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => [
                    'required', 
                    'email', 
                    Rule::unique('users')->ignore($user->id, 'id')->whereNull('deleted_at')
                ],
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
            
            // Double-check: If email changed, manually verify it doesn't exist
            if ($emailChanged) {
                $existingUser = User::where('email', $request->email)
                    ->where('id', '!=', $user->id)
                    ->whereNull('deleted_at')
                    ->first();
                    
                if ($existingUser) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validation failed',
                        'errors' => ['email' => ['The email has already been taken.']]
                    ], 422);
                }
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

            // Sync employee record when switching/keeping employee role
            if (($role && $role->name === 'employee') || (!$role && $user->role && $user->role->name === 'employee')) {
                // Get employee_type_id if employee_type is provided
                $employeeTypeId = null;
                if ($request->has('employee_type')) {
                    $employeeType = DB::table('employee_types')
                        ->where('name', $request->input('employee_type'))
                        ->whereNull('deleted_at')
                        ->first();
                    $employeeTypeId = $employeeType ? $employeeType->id : null;
                }
                
                // If no employee_type provided, try to get 'Regular' as default
                if (!$employeeTypeId) {
                    $regularType = DB::table('employee_types')
                        ->where('name', 'Regular')
                        ->whereNull('deleted_at')
                        ->first();
                    $employeeTypeId = $regularType ? $regularType->id : null;
                }
                
                // Check if employee already exists by email
                $existingEmployee = DB::table('employees')->where('email', $request->email)->first();
                
                if ($existingEmployee) {
                    // Employee exists, update the record and link user_id
                    $updateData = [
                        'user_id' => $user->id,
                        'position' => $request->position,
                        'department' => $request->department,
                        'phone' => $request->phone,
                        'updated_at' => now(),
                    ];
                    
                    // Only update employee_type_id if we have a value
                    if ($employeeTypeId) {
                        $updateData['employee_type_id'] = $employeeTypeId;
                    }
                    
                    DB::table('employees')
                        ->where('id', $existingEmployee->id)
                        ->update($updateData);
                } else {
                    // Employee doesn't exist, create new record
                    $nameParts = preg_split('/\s+/', trim((string) $request->name));
                    $firstName = $nameParts[0] ?? '';
                    $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';

                    $insertData = [
                        'user_id' => $user->id,
                        'employee_id' => $request->username ?: 'EMP' . time(),
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'email' => $request->email,
                        'position' => $request->position,
                        'department' => $request->department,
                        'phone' => $request->phone,
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    
                    // Only add employee_type_id if we have a value
                    if ($employeeTypeId) {
                        $insertData['employee_type_id'] = $employeeTypeId;
                    }
                    
                    DB::table('employees')->insert($insertData);
                }
            }

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
            
            // Soft delete - allows restoration from Archive
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
     * ✅ FIXED: Now returns the complete user object
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

            // ✅ CRITICAL FIX: Return the complete user object instead of just permissions
            return response()->json([
                'success' => true,

                'data' => $user, // Return the full user object instead of just permissions

                'data' => $user, // Now returns the full user object with all relationships
 
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
     * ✅ FIXED: Now returns the complete user object
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

            // ✅ CRITICAL FIX: Return the complete user object instead of just permissions
            return response()->json([
                'success' => true,
 
            'data' => $user, // Return the full user object instead of just permissions

                'data' => $user, // Now returns the full user object with all relationships

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