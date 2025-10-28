<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Mail;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\RequestController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\AuthController;

Route::get('/user', function (Request $request) {
    return $request->user();
});

// Password reset API routes
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

// Employee routes
Route::get('/employees', [EmployeeController::class, 'index']);
Route::get('/employees/current-holders', [EmployeeController::class, 'currentHolders']);
Route::get('/employees/pending-requests', [EmployeeController::class, 'pendingRequests']);
Route::get('/employees/verify-returns', [EmployeeController::class, 'verifyReturns']);
Route::get('/employees/available-users', [EmployeeController::class, 'getAvailableUsers']);
Route::post('/employees', [EmployeeController::class, 'store']);
Route::get('/employees/{id}', [EmployeeController::class, 'show']);
Route::put('/employees/{id}', [EmployeeController::class, 'update']);
Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
Route::post('/employees/{id}/connect-user', [EmployeeController::class, 'connectUser']);
Route::post('/employees/{id}/disconnect-user', [EmployeeController::class, 'disconnectUser']);

// Request routes
Route::get('/requests', [RequestController::class, 'index']);
Route::post('/requests', [RequestController::class, 'store']);
Route::get('/requests/{id}', [RequestController::class, 'show']);
Route::put('/requests/{id}', [RequestController::class, 'update']);
Route::delete('/requests/{id}', [RequestController::class, 'destroy']);
Route::post('/requests/{id}/approve', [RequestController::class, 'approve']);
Route::post('/requests/{id}/reject', [RequestController::class, 'reject']);
Route::post('/requests/{id}/fulfill', [RequestController::class, 'fulfill']);
Route::get('/requests/statistics', [RequestController::class, 'statistics']);

// Transaction routes
Route::get('/transactions/dashboard', [TransactionController::class, 'dashboard']);
Route::get('/transactions/stats', [TransactionController::class, 'stats']);
Route::get('/transactions/borrowed', [TransactionController::class, 'borrowed']);
Route::get('/transactions/overdue', [TransactionController::class, 'overdue']);
Route::get('/transactions/approved', [TransactionController::class, 'approved']);
Route::get('/transactions/history', [TransactionController::class, 'history']);
Route::get('/transactions', [TransactionController::class, 'index']);
Route::post('/transactions', [TransactionController::class, 'store']);
Route::get('/transactions/{id}', [TransactionController::class, 'show']);
Route::put('/transactions/{id}', [TransactionController::class, 'update']);
Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);
Route::post('/transactions/{id}/release', [TransactionController::class, 'release']);
Route::post('/transactions/{id}/return', [TransactionController::class, 'returnTransaction']);
Route::post('/transactions/{id}/exchange', [TransactionController::class, 'exchange']);
Route::post('/transactions/{id}/cancel', [TransactionController::class, 'cancel']);
Route::post('/transactions/{id}/appeal', [TransactionController::class, 'appeal']);
Route::get('/transactions/{id}/print', [TransactionController::class, 'print']);

// Equipment API routes
Route::apiResource('/equipment', EquipmentController::class);
Route::post('/equipment/add-stock', [EquipmentController::class, 'addStock']);

// Category API routes
use App\Http\Controllers\Api\CategoryController;
Route::apiResource('categories', CategoryController::class);

// Position API routes
use App\Http\Controllers\Api\PositionController;
Route::apiResource('positions', PositionController::class);

// Department API routes
use App\Http\Controllers\Api\DepartmentController;
Route::apiResource('departments', DepartmentController::class);

// Client API routes
use App\Http\Controllers\Api\ClientController;
Route::apiResource('clients', ClientController::class);

// Employee Type API routes
use App\Http\Controllers\Api\EmployeeTypeController;
Route::apiResource('employee-types', EmployeeTypeController::class);

// User management API routes
use App\Http\Controllers\Api\UserController;
Route::apiResource('users', UserController::class);

// User permissions API routes
Route::get('/users/{id}/permissions', [UserController::class, 'getPermissions']);
Route::post('/users/{id}/permissions', [UserController::class, 'setPermissions']);
Route::post('/users/{id}/permissions/reset', [UserController::class, 'resetPermissions']);

// Profile management API routes (use web session auth)
use App\Http\Controllers\ProfileController;
Route::middleware(['web','auth'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::post('/profile/change-password', [ProfileController::class, 'changePassword']);
});

// Activity Logs API routes moved to web.php to use session authentication

// Role management API routes
// Role management routes moved to web.php to use session auth

// Reports
Route::get('/reports/overview', [ReportController::class, 'overview']);
Route::get('/reports/export', [ReportController::class, 'exportCsv']);
