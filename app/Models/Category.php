<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Category extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'image',
    ];

    // Accessor for image URL
    public function getImageUrlAttribute()
    {
        if ($this->image) {
            return Storage::url($this->image);
        }
        
        // Return default category image if no image is set
        return asset('images/default-category.png');
    }

    // Check if category has an image
    public function hasImage()
    {
        return !empty($this->image) && Storage::exists($this->image);
    }

    // Delete old image when updating
    public function deleteImage()
    {
        if ($this->hasImage()) {
            Storage::delete($this->image);
        }
    }

    public function equipment()
    {
        return $this->hasMany(Equipment::class);
    }

    public function getTotalStockAttribute()
    {
        return $this->equipment->sum(function($equipment) {
            return $equipment->stocks->count();
        });
    }

    public function getAvailableStockAttribute()
    {
        return $this->equipment->sum(function($equipment) {
            return $equipment->stocks->where('status', 'Available')->count();
        });
    }
}