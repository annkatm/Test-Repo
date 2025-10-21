<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    use SoftDeletes;
    
    protected $fillable = [
        'user_id',
        'employee_id',
        'employee_number',
        'first_name',
        'last_name',
        'email',
        'department',
        'position',
        'client',
        'phone',
        'address',
        'employee_type',
        'issued_item',
        'status',
        'hire_date',
    ];

    /**
     * Get the user associated with the employee.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all requests made by this employee.
     */
    public function requests(): HasMany
    {
        return $this->hasMany(Request::class);
    }

    /**
     * Get all transactions for this employee.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    /**
     * Get currently borrowed items (transactions with released status).
     */
    public function borrowedItems(): HasMany
    {
        return $this->hasMany(Transaction::class)->where('status', 'released');
    }

    /**
     * Get the full name of the employee.
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}