<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'transaction_number',
        'user_id',
        'employee_id',
        'equipment_id',
        'request_id',
        'status',
        'request_mode',
        'release_condition',
        'release_date',
        'released_by',
        'return_condition',
        'return_date',
        'expected_return_date',
        'received_by',
        'release_notes',
        'return_notes'
    ];

    protected $casts = [
        'release_date' => 'date',
        'return_date' => 'date',
        'expected_return_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relationships
    public function request(): BelongsTo
    {
        return $this->belongsTo(Request::class);
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function releasedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeReleased($query)
    {
        return $query->where('status', 'released');
    }

    public function scopeReturned($query)
    {
        return $query->where('status', 'returned');
    }

    public function scopeLost($query)
    {
        return $query->where('status', 'lost');
    }

    public function scopeDamaged($query)
    {
        return $query->where('status', 'damaged');
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    // Accessors
    public function getIsPendingAttribute(): bool
    {
        return $this->status === 'pending';
    }

    public function getIsReleasedAttribute(): bool
    {
        return $this->status === 'released';
    }

    public function getIsReturnedAttribute(): bool
    {
        return $this->status === 'returned';
    }

    public function getIsLostAttribute(): bool
    {
        return $this->status === 'lost';
    }

    public function getIsDamagedAttribute(): bool
    {
        return $this->status === 'damaged';
    }

    public function getDurationAttribute()
    {
        if ($this->release_date && $this->return_date) {
            $start = \Carbon\Carbon::parse($this->release_date);
            $end = \Carbon\Carbon::parse($this->return_date);
            return $start->diffInDays($end);
        }
        return null;
    }
}
