<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Equipment;
use App\Models\Transaction;
use App\Models\Employee;
use App\Models\Category;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function getStats()
    {
        try {
            $totalEquipment = Equipment::count();
            $availableStock = Equipment::where('status', 'available')->count();
            $currentHolders = Transaction::where('status', 'released')
                ->distinct('employee_id')
                ->count('employee_id');

            return response()->json([
                'success' => true,
                'data' => [
                    'total_equipment' => $totalEquipment,
                    'available_stock' => $availableStock,
                    'current_holders' => $currentHolders,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dashboard counts
     */
    public function getCounts()
    {
        try {
            $equipmentCount = Equipment::count();
            $employeeCount = Employee::count();
            $categoryCount = Category::count();
            $transactionCount = Transaction::count();

            return response()->json([
                'success' => true,
                'data' => [
                    'equipment' => $equipmentCount,
                    'employees' => $employeeCount,
                    'categories' => $categoryCount,
                    'transactions' => $transactionCount,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard counts',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
