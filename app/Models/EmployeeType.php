<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmployeeType extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
    ];

    protected $hidden = [
        'deleted_at',
    ];

    /**
     * Get all employees with this type.
     */
    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
