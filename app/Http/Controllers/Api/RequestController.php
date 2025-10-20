<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogService;
use App\Events\RequestCreated;
use App\Events\RequestUpdated;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RequestController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // First, let's check if the tables exist and have data
            $requestsCount = DB::table('requests')->count();
            $employeesCount = DB::table('employees')->count();
            $equipmentCount = DB::table('equipment')->count();
            
            // Simple query first to test
            $query = DB::table('requests')
                ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->leftJoin('users as approver', 'requests.approved_by', '=', 'approver.id')
                ->select(
                    'requests.*',
                    DB::raw("COALESCE(employees.first_name, '') as first_name"),
                    DB::raw("COALESCE(employees.last_name, '') as last_name"),
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.employee_type, '') as position"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model"),
                    DB::raw("COALESCE(categories.name, '') as category_name"),
                    DB::raw("COALESCE(approver.name, '') as approved_by_name")
                )
                ->orderBy('requests.created_at', 'desc');

        // Filter by status
        if ($request->has('status')) {
                $query->where('requests.status', $request->status);
            }

            // Filter by employee
            if ($request->has('employee_id')) {
                $query->where('requests.employee_id', $request->employee_id);
        }

        // Filter by equipment
        if ($request->has('equipment_id')) {
                $query->where('requests.equipment_id', $request->equipment_id);
        }
        
        // Filter by equipment type (e.g., laptop)
        if ($request->has('equipment_type')) {
            $equipmentType = $request->equipment_type;
            $query->where('categories.name', 'like', '%' . $equipmentType . '%');
        }

        // Filter by request type
        if ($request->has('request_type')) {
                $query->where('requests.request_type', $request->request_type);
        }

        // Filter by request mode
        if ($request->has('request_mode')) {
                $query->where('requests.request_mode', $request->request_mode);
            }

            $requests = $query->get();

        return response()->json([
            'success' => true,
            'data' => $requests,
            'count' => $requests->count(),
            'debug' => [
                'requests_count' => $requestsCount,
                'employees_count' => $employeesCount,
                'equipment_count' => $equipmentCount
            ],
            'message' => 'Requests retrieved successfully'
        ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching requests: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'equipment_id' => 'required|exists:equipment,id',
                'request_type' => 'required|in:new_assignment,replacement,additional',
                'request_mode' => 'required|in:on_site,work_from_home',
                'reason' => 'nullable|string',
                'expected_start_date' => 'nullable|date|after_or_equal:today',
                'expected_end_date' => 'nullable|date|after:expected_start_date',
            ]);

            // Check if equipment is available
            $equipment = DB::table('equipment')->where('id', $validated['equipment_id'])->first();
            if (!$equipment || $equipment->status !== 'available') {
                return response()->json([
                    'success' => false,
                    'message' => 'Equipment is not available for request'
                ], 422);
            }

            // Check if employee already has a pending request for this equipment
            $existingRequest = DB::table('requests')
                ->where('employee_id', $validated['employee_id'])
                                              ->where('equipment_id', $validated['equipment_id'])
                                              ->where('status', 'pending')
                                              ->exists();

            if ($existingRequest) {
                // Instead of failing, return the existing pending request to keep UX smooth
                $existing = DB::table('requests')
                    ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                    ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                    ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                    ->where('requests.employee_id', $validated['employee_id'])
                    ->where('requests.equipment_id', $validated['equipment_id'])
                    ->where('requests.status', 'pending')
                    ->select(
                        'requests.*',
                        DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                        DB::raw("COALESCE(employees.employee_type, '') as position"),
                        DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                        DB::raw("COALESCE(equipment.brand, '') as brand"),
                        DB::raw("COALESCE(equipment.model, '') as model"),
                        DB::raw("COALESCE(categories.name, '') as category_name")
                    )
                    ->first();

                return response()->json([
                    'success' => true,
                    'data' => $existing,
                    'message' => 'A pending request for this equipment already exists. Returning existing record.'
                ]);
            }

            // Generate request number
            $requestNumber = 'REQ-' . str_pad(DB::table('requests')->count() + 1, 6, '0', STR_PAD_LEFT);

            $requestData = [
                'request_number' => $requestNumber,
                'employee_id' => $validated['employee_id'],
                'equipment_id' => $validated['equipment_id'],
                // Attach the requesting user (from session) so UI can trace who requested
                'user_id' => Auth::id(),
                'request_type' => $validated['request_type'],
                'request_mode' => $validated['request_mode'],
                'reason' => $validated['reason'] ?? null,
                'requested_date' => now()->toDateString(),
                'expected_start_date' => $validated['expected_start_date'] ?? null,
                'expected_end_date' => $validated['expected_end_date'] ?? null,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $requestId = DB::table('requests')->insertGetId($requestData);

            // Fetch the created request with related data
            $createdRequest = DB::table('requests')
                ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('requests.id', $requestId)
                ->select(
                    'requests.*',
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.employee_type, '') as position"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model"),
                    DB::raw("COALESCE(categories.name, '') as category_name")
                )
                ->first();

            // Log the activity without requiring a Model instance
            ActivityLogService::logSystemActivity(
                'Created a new request',
                "Created request #{$requestNumber} for {$createdRequest->equipment_name}"
            );

            // Broadcast event for real-time updates (best-effort)
            try {
                event(new RequestCreated((array) $createdRequest));
            } catch (\Exception $_) {
                // ignore broadcasting failures
            }

            return response()->json([
                'success' => true,
                'data' => $createdRequest,
                'message' => 'Request created successfully'
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $request = DB::table('requests')
                ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->leftJoin('users as approver', 'requests.approved_by', '=', 'approver.id')
                ->where('requests.id', $id)
                ->select(
                    'requests.*',
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.employee_type, '') as position"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model"),
                    DB::raw("COALESCE(categories.name, '') as category_name"),
                    DB::raw("COALESCE(approver.name, '') as approved_by_name")
                )
                ->first();

            if (!$request) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found'
                ], 404);
            }

        return response()->json([
            'success' => true,
                'data' => $request,
            'message' => 'Request retrieved successfully'
        ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $existingRequest = DB::table('requests')->where('id', $id)->first();
            
            if (!$existingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found'
                ], 404);
            }

            // Only allow updates to pending requests
            if ($existingRequest->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending requests can be updated'
                ], 422);
            }

            $validated = $request->validate([
                'request_type' => 'sometimes|required|in:new_assignment,replacement,additional',
                'request_mode' => 'sometimes|required|in:on_site,work_from_home',
                'reason' => 'nullable|string',
                'expected_start_date' => 'nullable|date|after_or_equal:today',
                'expected_end_date' => 'nullable|date|after:expected_start_date',
            ]);

            $validated['updated_at'] = now();
            DB::table('requests')->where('id', $id)->update($validated);

            // Fetch updated request with related data
            $updatedRequest = DB::table('requests')
                ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->where('requests.id', $id)
                ->select(
                    'requests.*',
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.employee_type, '') as position"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model"),
                    DB::raw("COALESCE(categories.name, '') as category_name")
                )
                ->first();

            return response()->json([
                'success' => true,
                'data' => $updatedRequest,
                'message' => 'Request updated successfully'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $request = DB::table('requests')->where('id', $id)->first();
            
            if (!$request) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found'
                ], 404);
            }

        // Only allow deletion of pending requests
            if ($request->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending requests can be deleted'
            ], 422);
        }

            $request = Request::find($id);
            if ($request) {
                $request->delete(); // This will now soft delete due to SoftDeletes trait
            }

        return response()->json([
            'success' => true,
            'message' => 'Request deleted successfully'
        ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve a request
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        try {
            $equipmentRequest = DB::table('requests')->where('id', $id)->first();
            
            if (!$equipmentRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found'
                ], 404);
            }

            if ($equipmentRequest->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending requests can be approved'
                ], 422);
            }

            $validated = $request->validate([
                'approval_notes' => 'nullable|string',
            ]);

            DB::transaction(function () use ($equipmentRequest, $validated, $id) {
                // Update request status
                DB::table('requests')->where('id', $id)->update([
                    'status' => 'approved',
                    'approved_by' => 1, // Default admin user, you may want to get this from auth
                    'approved_at' => now(),
                    'approval_notes' => $validated['approval_notes'] ?? null,
                    'updated_at' => now(),
                ]);

                // Update equipment status
                DB::table('equipment')->where('id', $equipmentRequest->equipment_id)->update([
                    'status' => 'in_use',
                    'updated_at' => now(),
                ]);

                // Create transaction record
                $transactionNumber = 'TXN-' . str_pad(DB::table('transactions')->count() + 1, 6, '0', STR_PAD_LEFT);
                
                DB::table('transactions')->insert([
                    'transaction_number' => $transactionNumber,
                    'user_id' => 1, // Default admin user
                    'employee_id' => $equipmentRequest->employee_id,
                    'equipment_id' => $equipmentRequest->equipment_id,
                    'request_id' => $id,
                    'status' => 'pending', // Will be changed to 'released' when equipment is actually released
                    'request_mode' => $equipmentRequest->request_mode,
                    'expected_return_date' => $equipmentRequest->expected_end_date,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

            // Log the activity (model argument expects Eloquent Model; use system log here)
            ActivityLogService::logSystemActivity(
                'Approved request',
                "Approved request #{$equipmentRequest->request_number}"
            );

            // Fetch updated request with related data
            $updatedRequest = DB::table('requests')
                ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->leftJoin('users as approver', 'requests.approved_by', '=', 'approver.id')
                ->where('requests.id', $id)
                ->select(
                    'requests.*',
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.employee_type, '') as position"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model"),
                    DB::raw("COALESCE(categories.name, '') as category_name"),
                    DB::raw("COALESCE(approver.name, '') as approved_by_name")
                )
                ->first();

            // Broadcast update event
            try {
                event(new RequestUpdated((array) $updatedRequest));
            } catch (\Exception $_) {}

            return response()->json([
                'success' => true,
                'data' => $updatedRequest,
                'message' => 'Request approved successfully'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error approving request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a request
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        try {
            $equipmentRequest = DB::table('requests')->where('id', $id)->first();
            
            if (!$equipmentRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found'
                ], 404);
            }

            if ($equipmentRequest->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending requests can be rejected'
                ], 422);
            }

            $validated = $request->validate([
                'rejection_reason' => 'required|string',
            ]);

            DB::table('requests')->where('id', $id)->update([
                'status' => 'rejected',
                'approved_by' => 1, // Default admin user, you may want to get this from auth
                'approved_at' => now(),
                'rejection_reason' => $validated['rejection_reason'],
                'updated_at' => now(),
            ]);

            // Fetch updated request with related data
            $updatedRequest = DB::table('requests')
                ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->leftJoin('users as approver', 'requests.approved_by', '=', 'approver.id')
                ->where('requests.id', $id)
                ->select(
                    'requests.*',
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.employee_type, '') as position"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model"),
                    DB::raw("COALESCE(categories.name, '') as category_name"),
                    DB::raw("COALESCE(approver.name, '') as approved_by_name")
                )
                ->first();

            // Broadcast update event
            try {
                event(new RequestUpdated((array) $updatedRequest));
            } catch (\Exception $_) {}

            return response()->json([
                'success' => true,
                'data' => $updatedRequest,
                'message' => 'Request rejected successfully'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error rejecting request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Fulfill the specified request.
     */
    public function fulfill(Request $request, string $id): JsonResponse
    {
        try {
            $equipmentRequest = DB::table('requests')->where('id', $id)->first();

            if (!$equipmentRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'Request not found'
                ], 404);
            }

            if ($equipmentRequest->status !== 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only approved requests can be fulfilled'
                ], 422);
            }

            DB::transaction(function () use ($equipmentRequest, $id) {
                // Update request status
                DB::table('requests')->where('id', $id)->update([
                    'status' => 'fulfilled',
                    'updated_at' => now(),
                ]);

                // Ensure equipment status is in_use
                DB::table('equipment')->where('id', $equipmentRequest->equipment_id)->update([
                    'status' => 'in_use',
                    'updated_at' => now(),
                ]);

                // Update transaction status if exists
                DB::table('transactions')->where('request_id', $id)->update([
                    'status' => 'released', // Equipment has been released to employee
                    'release_date' => now(),
                    'updated_at' => now(),
                ]);
            });

            // Log the activity
            ActivityLogService::logSystemActivity(
                'Fulfilled request',
                "Fulfilled request #{$equipmentRequest->request_number}"
            );

            // Fetch updated request with related data
            $updatedRequest = DB::table('requests')
                ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->leftJoin('users as approver', 'requests.approved_by', '=', 'approver.id')
                ->where('requests.id', $id)
                ->select(
                    'requests.*',
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as full_name"),
                    DB::raw("COALESCE(employees.employee_type, '') as position"),
                    DB::raw("COALESCE(equipment.name, '') as equipment_name"),
                    DB::raw("COALESCE(equipment.brand, '') as brand"),
                    DB::raw("COALESCE(equipment.model, '') as model"),
                    DB::raw("COALESCE(categories.name, '') as category_name"),
                    DB::raw("COALESCE(approver.name, '') as approved_by_name")
                )
                ->first();

            return response()->json([
                'success' => true,
                'data' => $updatedRequest,
                'message' => 'Request fulfilled successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fulfilling request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get request statistics
     */
    public function statistics(): JsonResponse
    {
        try {
        $stats = [
                'total' => DB::table('requests')->count(),
                'pending' => DB::table('requests')->where('status', 'pending')->count(),
                'approved' => DB::table('requests')->where('status', 'approved')->count(),
                'rejected' => DB::table('requests')->where('status', 'rejected')->count(),
                'fulfilled' => DB::table('requests')->where('status', 'fulfilled')->count(),
                'by_type' => DB::table('requests')
                    ->selectRaw('request_type, COUNT(*) as count')
                                        ->groupBy('request_type')
                                        ->pluck('count', 'request_type'),
                'by_mode' => DB::table('requests')
                    ->selectRaw('request_mode, COUNT(*) as count')
                                        ->groupBy('request_mode')
                                        ->pluck('count', 'request_mode'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
            'message' => 'Request statistics retrieved successfully'
        ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching request statistics: ' . $e->getMessage()
            ], 500);
        }
    }
}
