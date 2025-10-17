<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Request extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'request_number',
        'employee_id',
        'equipment_id',
        'user_id',
        'request_type',
        'request_mode',
        'status',
        'reason',
        'requested_date',
        'expected_start_date',
        'expected_end_date',
        'approved_by',
        'approved_at',
        'approval_notes',
        'rejection_reason',
        'original_transaction_id',
        'evidence_file',
        'appeal_reason',
        'appeal_date',
    ];

    protected $casts = [
        'requested_date' => 'date',
        'expected_start_date' => 'date',
        'expected_end_date' => 'date',
        'approved_at' => 'datetime',
    ];

    // Relationships
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the user who submitted this request.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function transaction(): HasOne
    {
        return $this->hasOne(Transaction::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeFulfilled($query)
    {
        return $query->where('status', 'fulfilled');
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    // Accessors & Mutators
    public function getIsPendingAttribute()
    {
        return $this->status === 'pending';
    }

    public function getIsApprovedAttribute()
    {
        return $this->status === 'approved';
    }

    public function getIsRejectedAttribute()
    {
        return $this->status === 'rejected';
    }

    public function getIsFulfilledAttribute()
    {
        return $this->status === 'fulfilled';
    }

    public function getDurationAttribute()
    {
        if ($this->start_date && $this->end_date) {
            $start = \Carbon\Carbon::parse($this->start_date);
            $end = \Carbon\Carbon::parse($this->end_date);
            return $start->diffInDays($end);
        }
        return null;
    }
}
