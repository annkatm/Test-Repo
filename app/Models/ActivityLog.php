<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'description',
        'model_type',
        'model_id',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function model(): MorphTo
    {
        return $this->morphTo('model', 'model_type', 'model_id');
    }

    // Scopes
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForModel($query, $modelType, $modelId = null)
    {
        $query = $query->where('model_type', $modelType);
        if ($modelId) {
            $query->where('model_id', $modelId);
        }
        return $query;
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    public function scopeForType($query, $type)
    {
        $typeMapping = [
            'equipment' => 'App\\Models\\Equipment',
            'requests' => 'App\\Models\\Request',
            'transactions' => 'App\\Models\\Transaction',
            'employees' => 'App\\Models\\Employee',
            'users' => 'App\\Models\\User',
        ];

        // Direct model_type-based filtering when we know the model
        if (isset($typeMapping[$type])) {
            return $query->where('model_type', $typeMapping[$type]);
        }

        // Fallback to action-based categorization for items that don't map cleanly to a model
        // This keeps filters useful for sections like Reports, Role Management, Control Panel, etc.
        switch ($type) {
            case 'transaction':
                // Combine both Request and Transaction-related logs
                return $query->where(function ($q) {
                    $q->where('model_type', 'App\\Models\\Request')
                      ->orWhere('model_type', 'App\\Models\\Transaction')
                      ->orWhere('action', 'like', '%Transaction%')
                      ->orWhere('action', 'like', '%Request%')
                      ->orWhere('description', 'like', '%transaction%')
                      ->orWhere('description', 'like', '%request%');
                });
            case 'reports':
                return $query->where(function ($q) {
                    $q->where('action', 'like', '%Report%')
                      ->orWhere('description', 'like', '%report%');
                });
            case 'role_management':
                return $query->where(function ($q) {
                    $q->where('action', 'like', '%Role%')
                      ->orWhere('action', 'like', '%Permission%')
                      ->orWhere('description', 'like', '%role%')
                      ->orWhere('description', 'like', '%permission%')
                      ->orWhere('model_type', 'like', '%Role%')
                      ->orWhere('model_type', 'like', '%Permission%');
                });
            case 'control_panel':
                return $query->where(function ($q) {
                    $q->where('action', 'like', '%Control Panel%')
                      ->orWhere('action', 'like', '%Settings%')
                      ->orWhere('description', 'like', '%setting%')
                      ->orWhere('description', 'like', '%configuration%');
                });
            case 'inventory':
            case 'add_stocks':
                // Merge inventory and stock actions under Equipment umbrella
                return $query->where(function ($q) {
                    $q->where('model_type', 'App\\Models\\Equipment')
                      ->orWhere('action', 'like', '%Inventory%')
                      ->orWhere('action', 'like', '%Stock%')
                      ->orWhere('description', 'like', '%inventory%')
                      ->orWhere('description', 'like', '%stock%');
                });
            case 'activity_logs':
                return $query->where(function ($q) {
                    $q->where('action', 'like', '%Activity Log%')
                      ->orWhere('description', 'like', '%activity log%');
                });
            default:
                return $query;
        }
    }

    // Accessors
    public function getFormattedTimestampAttribute()
    {
        return $this->created_at->format('n/j/y, g:i:s A');
    }

    public function getActionWithUserAttribute()
    {
        return $this->user ? "{$this->user->name} {$this->action}" : $this->action;
    }
}
