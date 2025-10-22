<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use App\Models\Category;

class Equipment extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'name',
        'brand',
        'model',
        'specifications',
        'serial_number',
        'asset_tag',
        'status',
        'condition',
        'purchase_price',
        'purchase_date',
        'warranty_expiry',
        'notes',
        'location',
        'category_id',
        'item_image',
        'receipt_image',
    ];

    protected $casts = [
        'purchase_price' => 'decimal:2',
        'purchase_date' => 'date',
        'warranty_expiry' => 'date',
    ];

    protected $appends = [
        'item_image_url',
        'receipt_image_url',
    ];

    // Relationships
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(Request::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    // Accessors
    public function getItemImageUrlAttribute(): ?string
    {
        if (!$this->item_image) {
            return null;
        }
        return Storage::url($this->item_image);
    }

    public function getReceiptImageUrlAttribute(): ?string
    {
        if (!$this->receipt_image) {
            return null;
        }
        return Storage::url($this->receipt_image);
    }

    // Helper methods for file management
    public function deleteImages(): void
    {
        if ($this->item_image && Storage::exists($this->item_image)) {
            Storage::delete($this->item_image);
        }
        if ($this->receipt_image && Storage::exists($this->receipt_image)) {
            Storage::delete($this->receipt_image);
        }
    }

    // Scopes
    public function scopeAvailable($query): mixed
    {
        return $query->where('status', 'available');
    }

    public function scopeBorrowed($query): mixed
    {
        return $query->where('status', 'borrowed');
    }

    public function scopeIssued($query): mixed
    {
        return $query->where('status', 'issued');
    }

    public function scopeByCategory($query, $categoryId): mixed
    {
        return $query->where('category_id', $categoryId);
    }

    // Additional Accessors
    public function getFullNameAttribute(): string
    {
        return "{$this->brand} {$this->name} {$this->model}";
    }

    public function getIsAvailableAttribute(): bool
    {
        return $this->status === 'available';
    }
}
