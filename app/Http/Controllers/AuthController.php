<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use App\Models\User;
use App\Models\Role;

class AuthController extends Controller
{
    public function showLoginForm()
    {
        return view('welcome');
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|min:6',
        ]);

        if ($validator->fails()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            return back()->withErrors($validator)->withInput();
        }

        $credentials = $request->only('email', 'password');

        // Find user by email
        $user = User::where('email', $credentials['email'])->first();

        if (!$user) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid email or password'
                ], 401);
            }
            return back()->withErrors(['email' => 'Invalid email or password'])->withInput();
        }

        // Check if user is active
        if (!$user->is_active) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Account is deactivated'
                ], 401);
            }
            return back()->withErrors(['email' => 'Account is deactivated'])->withInput();
        }

        // Verify password
        if (!Hash::check($credentials['password'], $user->password)) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid email or password'
                ], 401);
            }
            return back()->withErrors(['email' => 'Invalid email or password'])->withInput();
        }

        // Login the user
        Auth::login($user);
        
        // Commit the session to ensure it's stored
        session()->save();

        // Get user role information
        $role = $user->role;
        
        // Determine redirect route based on role
        $redirectRoute = $this->getRedirectRouteForRole($role);
        
        if ($request->expectsJson()) {
            // For JSON requests, we need to ensure the session cookie is properly set
            // by using a different approach - return a redirect response that sets the cookie
            // and then redirect back to the frontend with the user data
            
            // Store user data in session temporarily
            session(['login_user_data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $role ? $role->name : null,
                'role_display' => $role ? $role->display_name : null,
                'permissions' => $role ? $role->permissions : null,
                'is_active' => $user->is_active
            ]]);
            
            // Return a redirect response that will set the session cookie
            return redirect()->route($redirectRoute)->with('login_success', true);
        }

        return redirect()->route($redirectRoute);
    }

    /**
     * Determine the redirect route based on user role
     */
    private function getRedirectRouteForRole($role)
    {
        if (!$role) {
            return 'dashboard'; // Default fallback
        }

        // Check role name
        switch ($role->name) {
            case 'employee':
                return 'employee.dashboard';
            case 'super_admin':
            case 'admin':
                return 'dashboard';
            default:
                return 'dashboard';
        }
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        
        return redirect('/');
    }

    public function checkAuth()
    {
        if (Auth::check()) {
            $user = Auth::user();
            // Eager-load relations to expose permissions correctly
            $user->load(['role', 'userPermissions']);
            $role = $user->role;
            $userPerm = $user->userPermissions;
            // Resolve linked employee id based on user fields; create if missing for employee role
            $linkedEmployeeId = null;
            try {
                $linkedEmployee = \Illuminate\Support\Facades\DB::table('employees')
                    ->when($user->employee_id, function ($q) use ($user) {
                        return $q->where('employee_id', $user->employee_id);
                    })
                    ->orWhere(function ($q) use ($user) {
                        $q->whereNotNull('email')->where('email', $user->email);
                    })
                    ->first();

                if (!$linkedEmployee && $user->role && $user->role->name === 'employee') {
                    // Auto-provision a basic employee record for employee users
                    $nameParts = preg_split('/\s+/', trim((string) $user->name));
                    $firstName = $nameParts[0] ?? '';
                    $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';
                    $generatedEmpCode = $user->employee_id ?: ('EMP' . time());

                    $id = \Illuminate\Support\Facades\DB::table('employees')->insertGetId([
                        'employee_id' => $generatedEmpCode,
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'email' => $user->email,
                        'employee_type' => 'Regular',
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $linkedEmployee = \Illuminate\Support\Facades\DB::table('employees')->where('id', $id)->first();
                }

                $linkedEmployeeId = $linkedEmployee ? $linkedEmployee->id : null;
            } catch (\Throwable $e) {
                // ignore resolution errors, keep null
            }
            
            return response()->json([
                'authenticated' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $role ? $role->name : null,
                    'role_display' => $role ? $role->display_name : null,
                    // Keep role permissions field for backward-compat
                    'permissions' => $role ? $role->permissions : null,
                    // NEW: include user custom permissions so the frontend can prefer them
                    'user_permissions' => $userPerm ? [
                        'use_custom_permissions' => (bool) $userPerm->use_custom_permissions,
                        'permissions' => $userPerm->permissions ?? [],
                    ] : null,
                    'is_active' => $user->is_active,
                    // Surface linkage so Employee pages can resolve quickly
                    'employee_code' => $user->employee_id,
                    'linked_employee_id' => $linkedEmployeeId,
                    'avatar_url' => $user->avatar ? asset('storage/' . $user->avatar) : null,
                ]
            ]);
        }

        return response()->json(['authenticated' => false]);
    }
    
    public function getLoginData()
    {
        if (Auth::check()) {
            $user = Auth::user();
            $user->load(['role', 'userPermissions']);
            $role = $user->role;
            $userPerm = $user->userPermissions;
            
            // Determine redirect route based on role
            $redirectRoute = $this->getRedirectRouteForRole($role);
            
            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $role ? $role->name : null,
                    'role_display' => $role ? $role->display_name : null,
                    'permissions' => $role ? $role->permissions : null,
                    'user_permissions' => $userPerm ? [
                        'use_custom_permissions' => (bool) $userPerm->use_custom_permissions,
                        'permissions' => $userPerm->permissions ?? [],
                    ] : null,
                    'is_active' => $user->is_active,
                    'avatar_url' => $user->avatar ? asset('storage/' . $user->avatar) : null,
                ],
                'redirect' => route($redirectRoute)
            ]);
        }
        
        return response()->json(['success' => false, 'message' => 'Not authenticated']);
    }

    /**
     * Send password reset link to user's email
     */
    public function forgotPassword(Request $request)
    {
        // Rate limiting: max 5 attempts per email per hour
        $key = 'password_reset_' . $request->ip() . '_' . $request->email;
        $attempts = cache()->get($key, 0);
        
        if ($attempts >= 5) {
            return response()->json([
                'success' => false,
                'message' => 'Too many password reset attempts. Please try again later.'
            ], 429);
        }

        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        // Always return success to prevent email enumeration
        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'If that email address exists in our system, we will send you a password reset link.'
            ]);
        }

        // Generate reset token
        $token = Str::random(64);
        
        // Store token in database (use created_at as timestamp)
        DB::table('password_resets')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($token),
                'created_at' => Carbon::now()
            ]
        );

        // Send email
        try {
            Mail::send('emails.password-reset', [
                'token' => $token,
                'email' => $user->email,
                'url' => url("/reset-password?token={$token}&email=" . urlencode($user->email))
            ], function ($m) use ($user) {
                $m->to($user->email)
                  ->subject('Reset Your Password');
            });

            // Increment rate limiting counter
            cache()->put($key, $attempts + 1, 3600); // 1 hour

            // Log successful password reset request
            \Log::info('Password reset email sent successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'If that email address exists in our system, we will send you a password reset link.'
            ]);
        } catch (\Exception $e) {
            // Increment rate limiting counter even on failure
            cache()->put($key, $attempts + 1, 3600);
            
            \Log::error('Failed to send forgot password email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'ip' => $request->ip(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to send reset email. Please try again later.'
            ], 500);
        }
    }

    /**
     * Reset user's password using token
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => [
                'required',
                'min:8',
                'confirmed',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]+$/',
            ],
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Find the password reset record
        $reset = DB::table('password_resets')
            ->where('email', $request->email)
            ->first();

        if (!$reset) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired reset token.'
            ], 400);
        }

        // Check if token is valid (not older than 1 hour)
        if (Carbon::parse($reset->created_at)->addHour()->isPast()) {
            DB::table('password_resets')->where('email', $request->email)->delete();
            return response()->json([
                'success' => false,
                'message' => 'This password reset link has expired. Please request a new one.'
            ], 400);
        }

        // Verify token
        if (!Hash::check($request->token, $reset->token)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid reset token.'
            ], 400);
        }

        // Find user and update password
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.'
            ], 404);
        }

        // Update password
        $user->password = Hash::make($request->password);
        $user->save();

        // Delete the reset token
        DB::table('password_resets')->where('email', $request->email)->delete();

        // Log successful password reset
        \Log::info('Password reset completed successfully', [
            'user_id' => $user->id,
            'email' => $user->email,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'reset_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Your password has been reset successfully. You can now login with your new password.'
        ]);
    }
}