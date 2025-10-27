<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityLogController extends Controller
{
    /**
     * Get activity logs with optional filtering
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->get('user_id');
        $modelType = $request->get('model_type');
        $modelId = $request->get('model_id');
        $type = $request->get('type'); // New type filter
        $days = $request->get('days', 30);
        $perPage = $request->get('per_page', 15);

        // Validate per_page to prevent abuse
        $perPage = min(max($perPage, 1), 100);

        $result = ActivityLogService::getActivityLogsForApi(
            $userId,
            $modelType,
            $modelId,
            $days,
            $perPage,
            $type
        );

        return response()->json($result);
    }

    /**
     * Store a new activity log entry
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|string|max:255',
            'description' => 'required|string',
            'model_type' => 'nullable|string|max:255',
            'model_id' => 'nullable|integer',
            'old_values' => 'nullable|array',
            'new_values' => 'nullable|array',
        ]);

        // If model info provided, we won't try to resolve an actual model instance here
        // We just pass null for the model param and let values be stored as provided
        $log = \App\Services\ActivityLogService::log(
            $validated['action'],
            $validated['description'],
            null,
            $validated['old_values'] ?? null,
            $validated['new_values'] ?? null,
            $request
        );

        // Override the default model_type/id if provided explicitly in payload
        if (!empty($validated['model_type']) || !empty($validated['model_id'])) {
            $log->model_type = $validated['model_type'] ?? $log->model_type;
            $log->model_id = $validated['model_id'] ?? $log->model_id;
            $log->save();
            $log->load('user');
        }

        return response()->json([
            'success' => true,
            'data' => $log,
            'message' => 'Activity logged successfully',
        ], 201);
    }

    /**
     * Get activity logs for a specific user
     */
    public function forUser(Request $request, int $userId): JsonResponse
    {
        $days = $request->get('days', 30);
        $perPage = $request->get('per_page', 15);

        $result = ActivityLogService::getActivityLogsForApi(
            $userId,
            null,
            null,
            $days,
            $perPage
        );

        return response()->json($result);
    }

    /**
     * Get activity logs for a specific model
     */
    public function forModel(Request $request, string $modelType, ?int $modelId = null): JsonResponse
    {
        $days = $request->get('days', 30);
        $perPage = $request->get('per_page', 15);

        $result = ActivityLogService::getActivityLogsForApi(
            null,
            $modelType,
            $modelId,
            $days,
            $perPage
        );

        return response()->json($result);
    }

    /**
     * Get recent activity logs (last 7 days by default)
     */
    public function recent(Request $request): JsonResponse
    {
        $days = $request->get('days', 7);
        $perPage = $request->get('per_page', 15);

        $result = ActivityLogService::getActivityLogsForApi(
            null,
            null,
            null,
            $days,
            $perPage
        );

        return response()->json($result);
    }

    /**
     * Search activity logs
     */
    public function search(Request $request): JsonResponse
    {
        $query = $request->get('q');
        $perPage = $request->get('per_page', 15);

        if (empty($query)) {
            return response()->json([
                'success' => false,
                'message' => 'Search query is required'
            ], 400);
        }

        $logs = \App\Models\ActivityLog::with('user')
            ->where('action', 'like', "%{$query}%")
            ->orWhere('description', 'like', "%{$query}%")
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
