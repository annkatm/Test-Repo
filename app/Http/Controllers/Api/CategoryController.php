<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    /**
     * Display a listing of the categories.
     */
    public function index(): JsonResponse
    {
        $categories = Category::all();
        return response()->json([
            'success' => true,
            'data' => $categories,
            'message' => 'Categories retrieved successfully'
        ]);
    }

    /**
     * Store a newly created category in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'name' => ['required', 'string', 'max:255', \Illuminate\Validation\Rule::unique('categories')->whereNull('deleted_at')],
                'description' => 'nullable|string',
                'image' => 'nullable|image|max:2048', // 2MB max
            ]);

            $category = new Category();
            $category->name = $request->name;
            $category->description = $request->description;

            // Handle image upload
            if ($request->hasFile('image') && $request->file('image')->isValid()) {
                $file = $request->file('image');
                $path = $file->store('categories', 'public');
                $category->image = $path;
            }

            $category->save();

            // Log the activity
            ActivityLogService::logSystemActivity(
                'Created category',
                "Created new category: {$category->name}"
            );

            return response()->json([
                'success' => true,
                'data' => $category,
                'message' => 'Category created successfully'
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified category.
     */
    public function show(Category $category): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $category,
            'message' => 'Category retrieved successfully'
        ]);
    }

    /**
     * Update the specified category in storage.
     */
    public function update(Request $request, Category $category): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:categories,name,' . $category->getKey(),
            'description' => 'nullable|string',
            'image' => 'nullable|image|max:2048', // 2MB max
        ]);

        if ($request->has('name')) {
            $category->name = $request->name;
        }
        
        if ($request->has('description')) {
            $category->description = $request->description;
        }

        // Handle image upload
        if ($request->hasFile('image') && $request->file('image')->isValid()) {
            // Delete old image if exists
            $category->deleteImage();
            
            $file = $request->file('image');
            $path = $file->store('categories', 'public');
            $category->image = $path;
        }

        $category->save();

        // Log the activity
        ActivityLogService::logSystemActivity(
            'Updated category',
            "Updated category: {$category->name}"
        );

        return response()->json([
            'success' => true,
            'data' => $category,
            'message' => 'Category updated successfully'
        ]);
    }

    /**
     * Remove the specified category from storage.
     */
    public function destroy(Category $category): JsonResponse
    {
        // Check if category has equipment
        if ($category->equipment()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category with associated equipment'
            ], 422);
        }

        // Delete image if exists
        $category->deleteImage();
        
        // Log the activity before deletion
        ActivityLogService::logSystemActivity(
            'Deleted category',
            "Deleted category: {$category->name}"
        );
        
        // Soft delete - allows restoration from Archive
        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully'
        ]);
    }
}
