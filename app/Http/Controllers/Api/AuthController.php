<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login user
     */
    public function login(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email',
                'password' => 'required|string',
            ]);

            if (!Auth::attempt($validated)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid credentials'
                ], 401);
            }

            $user = Auth::user();
            $user->load(['role', 'userPermissions']);

            // Log the login activity
            ActivityLogService::logSystemActivity(
                'User login',
                "User {$user->name} ({$user->email}) logged in successfully"
            );

            // Create token
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user,
                    'token' => $token,
                ],
                'message' => 'Login successful'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }
    }

    /**
     * Register user (Admin only)
     */
    public function register(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'required|string|min:8|confirmed',
                'employee_id' => 'nullable|string|unique:users',
                'position' => 'nullable|string|max:255',
                'department' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:255',
                'role_id' => 'required|exists:roles,id',
            ]);

            $validated['password'] = Hash::make($validated['password']);

            $user = User::create($validated);
            $user->load(['role', 'userPermissions']);

            // Log the activity
            $roleName = $user->role ? $user->role->name : 'No role';
            ActivityLogService::logUserActivity(
                'Registered new user',
                "Registered new user account for {$user->name} ({$user->email}) with role: {$roleName}",
                $user
            );

            return response()->json([
                'success' => true,
                'data' => $user,
                'message' => 'User created successfully'
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }
    }

    /**
     * Logout user
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Log the logout activity
        ActivityLogService::logSystemActivity(
            'User logout',
            "User {$user->name} ({$user->email}) logged out"
        );
        
        $user->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout successful'
        ]);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load(['role', 'userPermissions']);
        // Attach a computed avatar_url for frontend convenience
        $user->avatar_url = $user->avatar ? asset('storage/' . $user->avatar) : null;

        return response()->json([
            'success' => true,
            'data' => $user,
            'message' => 'User retrieved successfully'
        ]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
                'employee_id' => 'nullable|string|unique:users,employee_id,' . $user->id,
                'position' => 'nullable|string|max:255',
                'department' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:255',
            ]);

            // Store old values for logging
            $oldValues = $user->toArray();
            
            $user->update($validated);
            $user->load(['role', 'userPermissions']);

            // Log the activity
            ActivityLogService::logUserActivity(
                'Updated profile',
                "Updated profile information for {$user->name} ({$user->email})",
                $user,
                $oldValues,
                $user->toArray()
            );

            return response()->json([
                'success' => true,
                'data' => $user,
                'message' => 'Profile updated successfully'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }
    }

    /**
     * Change password
     */
    public function changePassword(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $validated = $request->validate([
                'current_password' => 'required|string',
                'password' => 'required|string|min:8|confirmed',
            ]);

            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Current password is incorrect'
                ], 422);
            }

            $user->update([
                'password' => Hash::make($validated['password'])
            ]);

            // Log the activity
            ActivityLogService::logSystemActivity(
                'Password changed',
                "User {$user->name} ({$user->email}) changed their password"
            );

            return response()->json([
                'success' => true,
                'message' => 'Password changed successfully'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }
    }
}
