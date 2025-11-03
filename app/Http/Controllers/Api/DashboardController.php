<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get comprehensive dashboard statistics
     */
    public function getStats()
    {
        try {
            // Count items currently borrowed/issued from multiple sources for accuracy
            
            // Method 1: Count from employee issued_item field
            $itemsFromEmployees = DB::table('employees')
                ->whereNotNull('issued_item')
                ->where('issued_item', '!=', '')
                ->where('issued_item', '!=', '[]')
                ->whereNull('deleted_at')
                ->get()
                ->sum(function ($employee) {
                    try {
                        $issuedItems = json_decode($employee->issued_item, true);
                        return is_array($issuedItems) ? count($issuedItems) : 0;
                    } catch (\Exception $e) {
                        return 0;
                    }
                });

            // Method 2: Count from equipment status
            $equipmentIssued = DB::table('equipment')
                ->where('status', 'issued')
                ->whereNull('deleted_at')
                ->count();

            // Method 3: Count from active transactions
            $activeTransactions = DB::table('transactions')
                ->whereIn('status', ['released', 'borrowed', 'active'])
                ->whereNull('deleted_at')
                ->count();

            // Use the highest count as most accurate
            $currentlyBorrowed = max($itemsFromEmployees, $equipmentIssued, $activeTransactions);

            // Equipment statistics
            $totalEquipment = DB::table('equipment')
                ->whereNull('deleted_at')
                ->count();

            $availableEquipment = DB::table('equipment')
                ->where('status', 'available')
                ->whereNull('deleted_at')
                ->count();

            $issuedEquipment = DB::table('equipment')
                ->where('status', 'issued')
                ->whereNull('deleted_at')
                ->count();

            // Employee statistics
            $totalEmployees = DB::table('employees')
                ->whereNull('deleted_at')
                ->count();

            $employeesWithItems = DB::table('employees')
                ->whereNotNull('issued_item')
                ->where('issued_item', '!=', '')
                ->where('issued_item', '!=', '[]')
                ->whereNull('deleted_at')
                ->count();

            // Request statistics
            $pendingRequests = DB::table('requests')
                ->where('status', 'pending')
                ->whereNull('deleted_at')
                ->count();

            $approvedRequests = DB::table('requests')
                ->where('status', 'approved')
                ->whereNull('deleted_at')
                ->count();

            $deniedRequests = DB::table('requests')
                ->where('status', 'denied')
                ->whereNull('deleted_at')
                ->count();

            // Category breakdown
            $categoryStats = DB::table('categories')
                ->leftJoin('equipment', 'categories.id', '=', 'equipment.category_id')
                ->select(
                    'categories.id',
                    'categories.name',
                    DB::raw('COUNT(equipment.id) as total_equipment'),
                    DB::raw('SUM(CASE WHEN equipment.status = "available" THEN 1 ELSE 0 END) as available_count'),
                    DB::raw('SUM(CASE WHEN equipment.status = "issued" THEN 1 ELSE 0 END) as issued_count')
                )
                ->whereNull('categories.deleted_at')
                ->whereNull('equipment.deleted_at')
                ->groupBy('categories.id', 'categories.name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    // Main dashboard counts
                    'items_currently_borrowed' => $currentlyBorrowed,
                    'total_equipment' => $totalEquipment,
                    'available_equipment' => $availableEquipment,
                    'issued_equipment' => $issuedEquipment,
                    
                    // Employee counts
                    'total_employees' => $totalEmployees,
                    'employees_with_items' => $employeesWithItems,
                    
                    // Request counts
                    'pending_requests' => $pendingRequests,
                    'approved_requests' => $approvedRequests,
                    'denied_requests' => $deniedRequests,
                    
                    // Detailed breakdown
                    'breakdown' => [
                        'items_from_employees' => $itemsFromEmployees,
                        'equipment_marked_issued' => $equipmentIssued,
                        'active_transactions' => $activeTransactions,
                    ],
                    
                    // Category statistics
                    'categories' => $categoryStats,
                    
                    // Metadata
                    'last_updated' => now()->toISOString(),
                    'calculation_method' => 'max_of_three_sources'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching dashboard statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get real-time counts for specific metrics
     */
    public function getCounts(Request $request)
    {
        try {
            $metrics = $request->get('metrics', ['borrowed', 'available', 'total']);
            $result = [];

            if (in_array('borrowed', $metrics)) {
                // Count currently borrowed items
                $itemsFromEmployees = DB::table('employees')
                    ->whereNotNull('issued_item')
                    ->where('issued_item', '!=', '')
                    ->where('issued_item', '!=', '[]')
                    ->whereNull('deleted_at')
                    ->get()
                    ->sum(function ($employee) {
                        try {
                            $issuedItems = json_decode($employee->issued_item, true);
                            return is_array($issuedItems) ? count($issuedItems) : 0;
                        } catch (\Exception $e) {
                            return 0;
                        }
                    });

                $equipmentIssued = DB::table('equipment')
                    ->where('status', 'issued')
                    ->whereNull('deleted_at')
                    ->count();

                $result['borrowed'] = max($itemsFromEmployees, $equipmentIssued);
            }

            if (in_array('available', $metrics)) {
                $result['available'] = DB::table('equipment')
                    ->where('status', 'available')
                    ->whereNull('deleted_at')
                    ->count();
            }

            if (in_array('total', $metrics)) {
                $result['total'] = DB::table('equipment')
                    ->whereNull('deleted_at')
                    ->count();
            }

            if (in_array('employees_with_items', $metrics)) {
                $result['employees_with_items'] = DB::table('employees')
                    ->whereNotNull('issued_item')
                    ->where('issued_item', '!=', '')
                    ->where('issued_item', '!=', '[]')
                    ->whereNull('deleted_at')
                    ->count();
            }

            return response()->json([
                'success' => true,
                'data' => $result,
                'timestamp' => now()->toISOString()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching counts: ' . $e->getMessage()
            ], 500);
        }
    }
}