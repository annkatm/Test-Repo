<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\Category;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;

class EquipmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Equipment::with(['category']);

            // Filter by status (validate allowed values)
            if ($request->has('status')) {
                $status = (string) $request->input('status');
                $allowedStatus = ['available', 'borrowed', 'issued', 'reserved'];
                if (in_array($status, $allowedStatus, true)) {
                    $query->where('status', $status);
                }
            }

            // Filter by category (only if numeric and non-empty)
            if ($request->has('category_id')) {
                $categoryId = $request->input('category_id');
                if ($categoryId !== null && $categoryId !== '' && is_numeric($categoryId)) {
                    $query->where('category_id', (int) $categoryId);
                }
            }

            // Exclude product-only records when units_only=1 (must have serial numbers)
            if ($request->boolean('units_only')) {
                $query->whereNotNull('serial_number')
                      ->where('serial_number', '!=', '');
            }

            // Search by name, brand, or model
            if ($request->has('search')) {
                $search = (string) $request->input('search', '');
                if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('brand', 'like', "%{$search}%")
                      ->orWhere('model', 'like', "%{$search}%")
                      ->orWhere('serial_number', 'like', "%{$search}%")
                      ->orWhere('asset_tag', 'like', "%{$search}%");
                });
                }
            }

            // Sort (sanitize inputs)
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $allowedSort = ['created_at', 'brand', 'name', 'status', 'purchase_price', 'category_id', 'model', 'serial_number'];
            if (!in_array($sortBy, $allowedSort, true)) {
                $sortBy = 'created_at';
            }
            $sortOrder = strtolower((string) $sortOrder) === 'asc' ? 'asc' : 'desc';
            $query->orderBy($sortBy, $sortOrder);

            // Paginate
            $perPage = (int) $request->get('per_page', 10);
            if ($perPage <= 0) { $perPage = 10; }
            if ($perPage > 1000) { $perPage = 1000; }
            $equipment = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $equipment,
                'message' => 'Equipment retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching equipment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            if ($request->has('category') && !$request->has('category_id')) {
                $request->merge(['category_id' => $request->input('category')]);
            }
            if ($request->has('price')) {
                $normalizedPrice = preg_replace('/[^\d.]/', '', (string) $request->input('price'));
                $request->merge(['price' => $normalizedPrice]);
            }
            $validated = $request->validate([
                'category_id' => 'required|exists:categories,id',
                'serial_number' => 'nullable|string|unique:equipment',
                'brand' => 'required|string',
                'supplier' => 'required|string',
                'description' => 'required|string',
                'price' => 'nullable|numeric',
                'item_image' => 'nullable|image|max:5120', // 5MB max
                'receipt_image' => 'nullable|image|max:5120', // 5MB max
            ]);

            $itemImagePath = null;
            $receiptImagePath = null;

            // Ensure directories exist
            if (!Storage::disk('public')->exists('equipment/items')) {
                Storage::disk('public')->makeDirectory('equipment/items');
            }
            if (!Storage::disk('public')->exists('equipment/receipts')) {
                Storage::disk('public')->makeDirectory('equipment/receipts');
            }

            if ($request->hasFile('item_image')) {
                $itemImagePath = $request->file('item_image')->store('equipment/items', 'public');
            }

            if ($request->hasFile('receipt_image')) {
                $receiptImagePath = $request->file('receipt_image')->store('equipment/receipts', 'public');
            }

            $equipment = Equipment::create([
                'name' => $request->brand, // Using brand as name
                'brand' => $request->brand,
                'serial_number' => $request->serial_number,
                'specifications' => $request->description,
                'status' => 'available',
                'condition' => 'excellent',
                'purchase_price' => $request->price,
                'location' => $request->supplier,
                'item_image' => $itemImagePath,
                'receipt_image' => $receiptImagePath,
                'purchase_date' => now(),
                'category_id' => $request->category_id,
            ]);

            $equipment->load('category');

            // Log the activity
            ActivityLogService::logEquipmentActivity(
                'Added new equipment',
                "Added {$equipment->brand} ({$equipment->serial_number}) to inventory",
                $equipment
            );

            return response()->json([
                'success' => true,
                'message' => 'Equipment added successfully',
                'data' => $equipment
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            // Clean up any uploaded files if the database operation fails
            if (isset($itemImagePath)) {
                Storage::disk('public')->delete($itemImagePath);
            }
            if (isset($receiptImagePath)) {
                Storage::disk('public')->delete($receiptImagePath);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error adding equipment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $equipment = Equipment::with(['category', 'requests.user', 'transactions.user'])
                             ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $equipment,
            'message' => 'Equipment retrieved successfully'
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $equipment = Equipment::findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'brand' => 'sometimes|required|string|max:255',
                'model' => 'nullable|string|max:255',
                'specifications' => 'nullable|string',
                'serial_number' => 'nullable|string|max:255|unique:equipment,serial_number,' . $id,
                'asset_tag' => 'nullable|string|max:255|unique:equipment,asset_tag,' . $id,
                'status' => 'sometimes|required|in:available,borrowed,issued',
                'condition' => 'sometimes|required|in:excellent,good,fair,poor',
                'purchase_price' => 'nullable|numeric|min:0',
                'purchase_date' => 'nullable|date',
                'warranty_expiry' => 'nullable|date|after:purchase_date',
                'notes' => 'nullable|string',
                'location' => 'nullable|string|max:255',
                'category_id' => 'nullable|exists:categories,id',
                'item_image' => 'nullable|image|max:5120',
                'receipt_image' => 'nullable|image|max:5120',
            ]);

            // Handle file uploads and remove old files if present
            if ($request->hasFile('item_image')) {
                if ($equipment->item_image) {
                    Storage::disk('public')->delete($equipment->item_image);
                }
                $validated['item_image'] = $request->file('item_image')->store('equipment/item_images', 'public');
            }

            if ($request->hasFile('receipt_image')) {
                if ($equipment->receipt_image) {
                    Storage::disk('public')->delete($equipment->receipt_image);
                }
                $validated['receipt_image'] = $request->file('receipt_image')->store('equipment/receipt_images', 'public');
            }

            // Store old values for logging
            $oldValues = $equipment->toArray();
            
            $equipment->update($validated);
            $equipment->load('category');

            // Log the activity
            ActivityLogService::logEquipmentActivity(
                'Updated equipment',
                "Updated {$equipment->brand} ({$equipment->serial_number})",
                $equipment,
                $oldValues,
                $equipment->toArray()
            );

            return response()->json([
                'success' => true,
                'data' => $equipment,
                'message' => 'Equipment updated successfully'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $equipment = Equipment::findOrFail($id);

        // Check if equipment has active transactions
        if ($equipment->transactions()->where('status', 'active')->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete equipment with active transactions'
            ], 422);
        }

        // Log the activity before deletion
        ActivityLogService::logEquipmentActivity(
            'Deleted equipment',
            "Deleted {$equipment->brand} ({$equipment->serial_number}) from inventory",
            $equipment
        );

        $equipment->delete(); // This will now soft delete due to SoftDeletes trait

        return response()->json([
            'success' => true,
            'message' => 'Equipment deleted successfully'
        ]);
    }

    /**
     * Add stock for existing equipment
     */
    public function addStock(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'equipment_id' => 'required|exists:equipment,id',
                'serial_numbers' => 'required|string',
                'receipt_image' => 'nullable|image|max:5120', // 5MB max
            ]);

            $equipment = Equipment::findOrFail($request->equipment_id);
            $serialNumbers = json_decode($request->serial_numbers, true);

            if (!is_array($serialNumbers) || empty($serialNumbers)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Serial numbers must be provided as an array'
                ], 422);
            }

            $receiptImagePath = null;

            // Handle receipt image upload
            if ($request->hasFile('receipt_image')) {
                if (!Storage::disk('public')->exists('equipment/receipts')) {
                    Storage::disk('public')->makeDirectory('equipment/receipts');
                }
                $receiptImagePath = $request->file('receipt_image')->store('equipment/receipts', 'public');
            }

            $createdEquipment = [];

            // Create new equipment entries for each serial number
            foreach ($serialNumbers as $serialNumber) {
                if (empty(trim($serialNumber))) {
                    continue; // Skip empty serial numbers
                }

                // Check if serial number already exists
                if (Equipment::where('serial_number', $serialNumber)->exists()) {
                    continue; // Skip duplicate serial numbers
                }

                $newEquipment = Equipment::create([
                    'name' => $equipment->name,
                    'brand' => $equipment->brand,
                    'model' => $equipment->model,
                    'serial_number' => $serialNumber,
                    'specifications' => $equipment->specifications,
                    'status' => 'available',
                    'condition' => 'excellent',
                    'purchase_price' => $equipment->purchase_price,
                    'location' => $equipment->location,
                    'item_image' => $equipment->item_image,
                    'receipt_image' => $receiptImagePath,
                    'purchase_date' => now(),
                    'category_id' => $equipment->category_id,
                ]);

                $createdEquipment[] = $newEquipment;

                // Log the activity
                ActivityLogService::logEquipmentActivity(
                    'Added stock',
                    "Added stock for {$equipment->brand} with serial number {$serialNumber}",
                    $newEquipment
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Stock added successfully',
                'data' => [
                    'created_count' => count($createdEquipment),
                    'equipment' => $createdEquipment
                ]
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error adding stock: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark equipment as repaired and make it available
     */
    public function markAsRepaired(Request $request, string $id): JsonResponse
    {
        try {
            $equipment = Equipment::findOrFail($id);

            $validated = $request->validate([
                'repair_notes' => 'nullable|string|max:1000',
                'condition' => 'required|in:excellent,good,fair'
            ]);

            // Store old values for logging
            $oldStatus = $equipment->status;
            $oldCondition = $equipment->condition;

            // Update equipment to available status with new condition
            $equipment->update([
                'status' => 'available',
                'condition' => $validated['condition'],
                'notes' => $equipment->notes 
                    ? $equipment->notes . "\n\n[Repaired on " . now()->format('Y-m-d') . "] " . ($validated['repair_notes'] ?? 'Equipment repaired and returned to service')
                    : "[Repaired on " . now()->format('Y-m-d') . "] " . ($validated['repair_notes'] ?? 'Equipment repaired and returned to service')
            ]);

            // Log the activity
            ActivityLogService::logEquipmentActivity(
                'Equipment Repaired',
                "Equipment repaired and made available: {$equipment->brand} ({$equipment->serial_number}) - Condition: {$validated['condition']}" . 
                ($validated['repair_notes'] ? " | Notes: {$validated['repair_notes']}" : ''),
                $equipment,
                ['status' => $oldStatus, 'condition' => $oldCondition],
                ['status' => 'available', 'condition' => $validated['condition']]
            );

            return response()->json([
                'success' => true,
                'data' => $equipment,
                'message' => 'Equipment marked as repaired and is now available'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error marking equipment as repaired: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get equipment statistics
     */
    public function statistics(): JsonResponse
    {
        try {
            $stats = [
                'total' => Equipment::count(),
                'available' => Equipment::where('status', 'available')->count(),
                'borrowed' => Equipment::where('status', 'borrowed')->count(),
                'issued' => Equipment::where('status', 'issued')->count(),
                'by_condition' => Equipment::selectRaw('condition, COUNT(*) as count')
                                      ->groupBy('condition')
                                      ->pluck('count', 'condition'),
                'by_category' => Equipment::with('category')
                                     ->selectRaw('category_id, COUNT(*) as count')
                                     ->groupBy('category_id')
                                     ->get()
                                     ->mapWithKeys(function ($item) {
                                         return [$item->category->name ?? 'Uncategorized' => $item->count];
                                     })
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Equipment statistics retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving statistics: ' . $e->getMessage()
            ], 500);
        }
    }
}
