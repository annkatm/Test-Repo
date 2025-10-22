<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityLogService
{
    /**
     * Log an activity
     */
    public static function log(
        string $action,
        string $description,
        ?Model $model = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null
    ): ActivityLog {
        $user = Auth::user();
        $request = $request ?? request();

        return ActivityLog::create([
            'user_id' => $user ? $user->id : null,
            'action' => $action,
            'description' => $description,
            'model_type' => $model ? get_class($model) : null,
            'model_id' => $model ? $model->id : null,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }

    /**
     * Log equipment-related activities
     */
    public static function logEquipmentActivity(
        string $action,
        string $description,
        ?Model $equipment = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): ActivityLog {
        return self::log($action, $description, $equipment, $oldValues, $newValues);
    }

    /**
     * Log request-related activities
     */
    public static function logRequestActivity(
        string $action,
        string $description,
        ?Model $request = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): ActivityLog {
        return self::log($action, $description, $request, $oldValues, $newValues);
    }

    /**
     * Log transaction-related activities
     */
    public static function logTransactionActivity(
        string $action,
        string $description,
        ?Model $transaction = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): ActivityLog {
        return self::log($action, $description, $transaction, $oldValues, $newValues);
    }

    /**
     * Log user-related activities
     */
    public static function logUserActivity(
        string $action,
        string $description,
        ?Model $user = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): ActivityLog {
        return self::log($action, $description, $user, $oldValues, $newValues);
    }

    /**
     * Log system activities (no specific model)
     */
    public static function logSystemActivity(
        string $action,
        string $description
    ): ActivityLog {
        return self::log($action, $description);
    }

    /**
     * Get activity logs with pagination and filtering
     */
    public static function getActivityLogs(
        ?int $userId = null,
        ?string $modelType = null,
        ?int $modelId = null,
        ?int $days = null,
        int $perPage = 15,
        ?string $type = null
    ) {
        $query = ActivityLog::with('user')
            ->orderBy('created_at', 'desc');

        if ($userId) {
            $query->forUser($userId);
        }

        if ($modelType) {
            $query->forModel($modelType, $modelId);
        }

        if ($days) {
            $query->recent($days);
        }

        // Add type filtering
        if ($type && $type !== 'all') {
            $query->forType($type);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get activity logs for API response
     */
    public static function getActivityLogsForApi(
        ?int $userId = null,
        ?string $modelType = null,
        ?int $modelId = null,
        ?int $days = null,
        int $perPage = 15,
        ?string $type = null
    ) {
        $logs = self::getActivityLogs($userId, $modelType, $modelId, $days, $perPage, $type);

        return [
            'success' => true,
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ];
    }
}
