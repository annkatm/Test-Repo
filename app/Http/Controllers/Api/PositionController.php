<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Position;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PositionController extends Controller
{
    /**
     * Display a listing of the positions.
     */
    public function index(): JsonResponse
    {
        $positions = Position::all();
        return response()->json([
            'success' => true,
            'data' => $positions,
            'message' => 'Positions retrieved successfully'
        ]);
    }

    /**
     * Store a newly created position in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255|unique:position,name',
            ]);

            $position = new Position();
            $position->name = $request->name;
            $position->save();

            // Log the activity
            ActivityLogService::logSystemActivity(
                'Created position',
                "Created new position: {$position->name}"
            );

            return response()->json([
                'success' => true,
                'data' => $position,
                'message' => 'Position created successfully'
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
     * Display the specified position.
     */
    public function show(Position $position): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $position,
            'message' => 'Position retrieved successfully'
        ]);
    }

    /**
     * Update the specified position in storage.
     */
    public function update(Request $request, Position $position): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255|unique:position,name,' . $position->id,
            ]);

            $position->name = $request->name;
            $position->save();

            // Log the activity
            ActivityLogService::logSystemActivity(
                'Updated position',
                "Updated position: {$position->name}"
            );

            return response()->json([
                'success' => true,
                'data' => $position,
                'message' => 'Position updated successfully'
            ]);
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
     * Remove the specified position from storage.
     */
    public function destroy(Position $position): JsonResponse
    {
        try {
            // Log the activity before deletion
            ActivityLogService::logSystemActivity(
                'Deleted position',
                "Deleted position: {$position->name}"
            );
            
            $position->delete(); // This will soft delete due to SoftDeletes trait

            return response()->json([
                'success' => true,
                'message' => 'Position deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete position',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
