<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Aggregated overview for reports page.
     */
    public function overview(Request $request): JsonResponse
    {
        try {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');
            $search = $request->query('search');

            // Base requests query with optional filters
            $requestsQuery = DB::table('requests')
                ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id');

            if ($startDate && $endDate) {
                $requestsQuery->whereBetween('requests.created_at', [$startDate, $endDate]);
            }

            if ($search) {
                $requestsQuery->where(function ($q) use ($search) {
                    $q->where('employees.first_name', 'like', "%{$search}%")
                        ->orWhere('employees.last_name', 'like', "%{$search}%")
                        ->orWhere(DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, ''))"), 'like', "%{$search}%")
                        ->orWhere('equipment.name', 'like', "%{$search}%")
                        ->orWhere('equipment.brand', 'like', "%{$search}%")
                        ->orWhere('equipment.model', 'like', "%{$search}%");
                });
            }

            // Summary metrics
            $summary = [
                'total_items' => DB::table('equipment')->count(),
                'available_stock' => DB::table('equipment')->where('status', 'available')->count(),
                'currently_using' => (int) DB::table('transactions')
                    ->where('status', 'released')
                    ->selectRaw('COUNT(DISTINCT employee_id) as count')
                    ->value('count') ?? 0,
            ];

            // Requests per department
            $byDepartment = (clone $requestsQuery)
                ->selectRaw('COALESCE(employees.department, "Unknown") as department, COUNT(*) as requests')
                ->groupBy('employees.department')
                ->orderByDesc('requests')
                ->limit(12)
                ->get();

            // Item distribution by category
            $byCategory = (clone $requestsQuery)
                ->selectRaw('COALESCE(categories.name, "Uncategorized") as category, COUNT(*) as count')
                ->groupBy('categories.name')
                ->orderByDesc('count')
                ->limit(12)
                ->get();

            // Monthly trend (requests vs fulfilled)
            $monthlyRequests = (clone $requestsQuery)
                ->selectRaw("DATE_FORMAT(requests.created_at, '%Y-%m') as month, COUNT(*) as requests")
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            $fulfilledQuery = DB::table('requests')
                ->when($startDate && $endDate, function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('requests.created_at', [$startDate, $endDate]);
                })
                ->where('requests.status', 'fulfilled');

            if ($search) {
                $fulfilledQuery
                    ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                    ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                    ->where(function ($q) use ($search) {
                        $q->where('employees.first_name', 'like', "%{$search}%")
                            ->orWhere('employees.last_name', 'like', "%{$search}%")
                            ->orWhere(DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, ''))"), 'like', "%{$search}%")
                            ->orWhere('equipment.name', 'like', "%{$search}%");
                    });
            }

            $monthlyFulfilled = $fulfilledQuery
                ->selectRaw("DATE_FORMAT(requests.created_at, '%Y-%m') as month, COUNT(*) as completed")
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            // Merge monthly into one structure keyed by month
            $trend = [];
            foreach ($monthlyRequests as $r) {
                $trend[$r->month] = ['month' => $r->month, 'requests' => (int) $r->requests, 'completed' => 0];
            }
            foreach ($monthlyFulfilled as $c) {
                if (!isset($trend[$c->month])) {
                    $trend[$c->month] = ['month' => $c->month, 'requests' => 0, 'completed' => 0];
                }
                $trend[$c->month]['completed'] = (int) $c->completed;
            }

            // Top borrowed items (count all transactions regardless of status to show borrowing activity)
            $topBorrowed = DB::table('equipment')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->leftJoin('transactions', 'equipment.id', '=', 'transactions.equipment_id')
                ->select([
                    'equipment.name as item',
                    'equipment.brand',
                    DB::raw('COALESCE(categories.name, "Uncategorized") as category'),
                    DB::raw('COUNT(transactions.id) as borrowed_count')
                ])
                ->whereNotNull('transactions.id')
                ->groupBy('equipment.id', 'equipment.name', 'equipment.brand', 'categories.name')
                ->having('borrowed_count', '>', 0)
                ->orderByDesc('borrowed_count')
                ->limit(10)
                ->get();

            // Most expensive equipment - group by brand+item name and get max price for each
            $expensiveEquipment = DB::table('equipment')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->select([
                    'equipment.name as item',
                    'equipment.brand',
                    DB::raw('MAX(equipment.purchase_price) as value'),
                    DB::raw('COUNT(equipment.id) as count'),
                    DB::raw('COALESCE(categories.name, "Uncategorized") as category')
                ])
                ->whereNotNull('equipment.purchase_price')
                ->where('equipment.purchase_price', '>', 0)
                ->groupBy('equipment.brand', 'equipment.name', 'categories.name')
                ->orderByDesc('value')
                ->limit(50)
                ->get();

            // Return compliance (employees with their borrow/return stats)
            $returnCompliance = DB::table('employees')
                ->leftJoin('transactions', 'employees.id', '=', 'transactions.employee_id')
                ->select([
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as user"),
                    DB::raw('COUNT(transactions.id) as borrowed'),
                    DB::raw('SUM(CASE WHEN transactions.return_date IS NOT NULL THEN 1 ELSE 0 END) as returned'),
                    DB::raw('SUM(CASE WHEN transactions.return_date IS NOT NULL AND transactions.return_date > transactions.expected_return_date THEN 1 ELSE 0 END) as late'),
                    DB::raw('ROUND(AVG(CASE WHEN transactions.return_date IS NOT NULL AND transactions.return_date > transactions.expected_return_date THEN DATEDIFF(transactions.return_date, transactions.expected_return_date) ELSE 0 END), 0) as avgDelayDays')
                ])
                ->whereNotNull('transactions.id')
                ->groupBy('employees.id', 'employees.first_name', 'employees.last_name')
                ->having('borrowed', '>', 0)
                ->orderByDesc('borrowed')
                ->limit(10)
                ->get();

            // Recent transactions table
            $transactions = DB::table('transactions')
                ->leftJoin('employees', 'transactions.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('requests', 'transactions.request_id', '=', 'requests.id')
                ->leftJoin('users as approver', 'requests.approved_by', '=', 'approver.id')
                ->when($startDate && $endDate, function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('transactions.created_at', [$startDate, $endDate]);
                })
                ->when($search, function ($q) use ($search) {
                    $q->where(function ($inner) use ($search) {
                        $inner->where('employees.first_name', 'like', "%{$search}%")
                            ->orWhere('employees.last_name', 'like', "%{$search}%")
                            ->orWhere(DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, ''))"), 'like', "%{$search}%")
                            ->orWhere('equipment.name', 'like', "%{$search}%");
                    });
                })
                ->select([
                    DB::raw("DATE_FORMAT(transactions.created_at, '%Y-%m-%d') as date"),
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as employee"),
                    DB::raw("COALESCE(equipment.name, '') as item"),
                    DB::raw("COALESCE(transactions.status, '') as status"),
                    DB::raw('1 as qty'),
                    DB::raw("COALESCE(approver.name, '-') as approvedBy"),
                ])
                ->orderByDesc('transactions.created_at')
                ->limit(100)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'department' => $byDepartment,
                    'categories' => $byCategory,
                    'trend' => array_values($trend),
                    'transactions' => $transactions,
                    'topBorrowed' => $topBorrowed,
                    'expensiveEquipment' => $expensiveEquipment,
                    'returnCompliance' => $returnCompliance,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error generating reports: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export overview transactions as CSV based on current filters
     */
    public function exportCsv(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $search = $request->query('search');

        $filename = 'reports-' . now()->format('Ymd_His') . '.csv';
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-store, no-cache',
        ];

        $callback = function () use ($startDate, $endDate, $search) {
            $handle = fopen('php://output', 'w');
            // UTF-8 BOM for Excel compatibility
            fprintf($handle, "\xEF\xBB\xBF");

            // ========== SUMMARY SECTION ==========
            fputcsv($handle, ['=== SUMMARY ===']);
            $summary = [
                'Total Items' => DB::table('equipment')->count(),
                'Available Stock' => DB::table('equipment')->where('status', 'available')->count(),
                'Total Currently Using Equipment' => (int) DB::table('transactions')
                    ->where('status', 'released')
                    ->selectRaw('COUNT(DISTINCT employee_id) as count')
                    ->value('count') ?? 0,
            ];
            foreach ($summary as $label => $value) {
                fputcsv($handle, [$label, $value]);
            }
            fputcsv($handle, []); // Empty row

            // ========== TOP BORROWED ITEMS SECTION ==========
            fputcsv($handle, ['=== TOP BORROWED ITEMS ===']);
            fputcsv($handle, ['Item', 'Brand', 'Category', 'Borrowed Count']);
            
            $topBorrowed = DB::table('equipment')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->leftJoin('transactions', 'equipment.id', '=', 'transactions.equipment_id')
                ->select([
                    'equipment.name as item',
                    'equipment.brand',
                    DB::raw('COALESCE(categories.name, "Uncategorized") as category'),
                    DB::raw('COUNT(transactions.id) as borrowed_count')
                ])
                ->whereNotNull('transactions.id')
                ->groupBy('equipment.id', 'equipment.name', 'equipment.brand', 'categories.name')
                ->having('borrowed_count', '>', 0)
                ->orderByDesc('borrowed_count')
                ->limit(10)
                ->get();

            foreach ($topBorrowed as $item) {
                fputcsv($handle, [
                    $item->item,
                    $item->brand ?? '',
                    $item->category,
                    $item->borrowed_count
                ]);
            }
            fputcsv($handle, []); // Empty row

            // ========== MOST EXPENSIVE EQUIPMENT SECTION ==========
            fputcsv($handle, ['=== MOST EXPENSIVE EQUIPMENT ===']);
            fputcsv($handle, ['Item', 'Brand', 'Category', 'Price (₱)', 'Quantity']);
            
            $expensiveEquipment = DB::table('equipment')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id')
                ->select([
                    'equipment.name as item',
                    'equipment.brand',
                    DB::raw('MAX(equipment.purchase_price) as value'),
                    DB::raw('COUNT(equipment.id) as count'),
                    DB::raw('COALESCE(categories.name, "Uncategorized") as category')
                ])
                ->whereNotNull('equipment.purchase_price')
                ->where('equipment.purchase_price', '>', 0)
                ->groupBy('equipment.brand', 'equipment.name', 'categories.name')
                ->orderByDesc('value')
                ->limit(50)
                ->get();

            foreach ($expensiveEquipment as $item) {
                fputcsv($handle, [
                    $item->item,
                    $item->brand ?? '',
                    $item->category,
                    number_format($item->value, 2),
                    $item->count
                ]);
            }
            fputcsv($handle, []); // Empty row

            // ========== RETURN COMPLIANCE SECTION ==========
            fputcsv($handle, ['=== RETURN COMPLIANCE ===']);
            fputcsv($handle, ['Employee', 'Total Borrowed', 'Returned', 'Late Returns', 'Avg Delay Days']);
            
            $returnCompliance = DB::table('employees')
                ->leftJoin('transactions', 'employees.id', '=', 'transactions.employee_id')
                ->select([
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as user"),
                    DB::raw('COUNT(transactions.id) as borrowed'),
                    DB::raw('SUM(CASE WHEN transactions.return_date IS NOT NULL THEN 1 ELSE 0 END) as returned'),
                    DB::raw('SUM(CASE WHEN transactions.return_date IS NOT NULL AND transactions.return_date > transactions.expected_return_date THEN 1 ELSE 0 END) as late'),
                    DB::raw('ROUND(AVG(CASE WHEN transactions.return_date IS NOT NULL AND transactions.return_date > transactions.expected_return_date THEN DATEDIFF(transactions.return_date, transactions.expected_return_date) ELSE 0 END), 0) as avgDelayDays')
                ])
                ->whereNotNull('transactions.id')
                ->groupBy('employees.id', 'employees.first_name', 'employees.last_name')
                ->having('borrowed', '>', 0)
                ->orderByDesc('borrowed')
                ->limit(10)
                ->get();

            foreach ($returnCompliance as $compliance) {
                fputcsv($handle, [
                    $compliance->user,
                    $compliance->borrowed,
                    $compliance->returned,
                    $compliance->late,
                    $compliance->avgDelayDays ?? 0
                ]);
            }
            fputcsv($handle, []); // Empty row

            // ========== REQUESTS BY DEPARTMENT SECTION ==========
            fputcsv($handle, ['=== REQUESTS BY DEPARTMENT ===']);
            fputcsv($handle, ['Department', 'Request Count']);
            
            $requestsQuery = DB::table('requests')
                ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                ->leftJoin('categories', 'equipment.category_id', '=', 'categories.id');

            if ($startDate && $endDate) {
                $requestsQuery->whereBetween('requests.created_at', [$startDate, $endDate]);
            }

            if ($search) {
                $requestsQuery->where(function ($q) use ($search) {
                    $q->where('employees.first_name', 'like', "%{$search}%")
                        ->orWhere('employees.last_name', 'like', "%{$search}%")
                        ->orWhere(DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, ''))"), 'like', "%{$search}%")
                        ->orWhere('equipment.name', 'like', "%{$search}%")
                        ->orWhere('equipment.brand', 'like', "%{$search}%")
                        ->orWhere('equipment.model', 'like', "%{$search}%");
                });
            }

            $byDepartment = (clone $requestsQuery)
                ->selectRaw('COALESCE(employees.department, "Unknown") as department, COUNT(*) as requests')
                ->groupBy('employees.department')
                ->orderByDesc('requests')
                ->limit(12)
                ->get();

            foreach ($byDepartment as $dept) {
                fputcsv($handle, [$dept->department, $dept->requests]);
            }
            fputcsv($handle, []); // Empty row

            // ========== REQUESTS BY CATEGORY SECTION ==========
            fputcsv($handle, ['=== REQUESTS BY CATEGORY ===']);
            fputcsv($handle, ['Category', 'Request Count']);
            
            $byCategory = (clone $requestsQuery)
                ->selectRaw('COALESCE(categories.name, "Uncategorized") as category, COUNT(*) as count')
                ->groupBy('categories.name')
                ->orderByDesc('count')
                ->limit(12)
                ->get();

            foreach ($byCategory as $cat) {
                fputcsv($handle, [$cat->category, $cat->count]);
            }
            fputcsv($handle, []); // Empty row

            // ========== MONTHLY TREND SECTION ==========
            fputcsv($handle, ['=== MONTHLY TREND ===']);
            fputcsv($handle, ['Month', 'Total Requests', 'Fulfilled Requests']);
            
            $monthlyRequests = (clone $requestsQuery)
                ->selectRaw("DATE_FORMAT(requests.created_at, '%Y-%m') as month, COUNT(*) as requests")
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            $fulfilledQuery = DB::table('requests')
                ->when($startDate && $endDate, function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('requests.created_at', [$startDate, $endDate]);
                })
                ->where('requests.status', 'fulfilled');

            if ($search) {
                $fulfilledQuery
                    ->leftJoin('employees', 'requests.employee_id', '=', 'employees.id')
                    ->leftJoin('equipment', 'requests.equipment_id', '=', 'equipment.id')
                    ->where(function ($q) use ($search) {
                        $q->where('employees.first_name', 'like', "%{$search}%")
                            ->orWhere('employees.last_name', 'like', "%{$search}%")
                            ->orWhere(DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, ''))"), 'like', "%{$search}%")
                            ->orWhere('equipment.name', 'like', "%{$search}%");
                    });
            }

            $monthlyFulfilled = $fulfilledQuery
                ->selectRaw("DATE_FORMAT(requests.created_at, '%Y-%m') as month, COUNT(*) as completed")
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            // Merge monthly data
            $trend = [];
            foreach ($monthlyRequests as $r) {
                $trend[$r->month] = ['month' => $r->month, 'requests' => (int) $r->requests, 'completed' => 0];
            }
            foreach ($monthlyFulfilled as $c) {
                if (!isset($trend[$c->month])) {
                    $trend[$c->month] = ['month' => $c->month, 'requests' => 0, 'completed' => 0];
                }
                $trend[$c->month]['completed'] = (int) $c->completed;
            }

            foreach ($trend as $monthData) {
                fputcsv($handle, [
                    $monthData['month'],
                    $monthData['requests'],
                    $monthData['completed']
                ]);
            }
            fputcsv($handle, []); // Empty row

            // ========== TRANSACTIONS SECTION ==========
            fputcsv($handle, ['=== TRANSACTIONS ===']);
            fputcsv($handle, ['Date', 'Employee', 'Item', 'Type', 'Status', 'Qty', 'Approved By']);

            $query = DB::table('transactions')
                ->leftJoin('employees', 'transactions.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('requests', 'transactions.request_id', '=', 'requests.id')
                ->leftJoin('users as approver', 'requests.approved_by', '=', 'approver.id')
                ->when($startDate && $endDate, function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('transactions.created_at', [$startDate, $endDate]);
                })
                ->when($search, function ($q) use ($search) {
                    $q->where(function ($inner) use ($search) {
                        $inner->where('employees.first_name', 'like', "%{$search}%")
                            ->orWhere('employees.last_name', 'like', "%{$search}%")
                            ->orWhere(DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, ''))"), 'like', "%{$search}%")
                            ->orWhere('equipment.name', 'like', "%{$search}%");
                    });
                })
                ->select([
                    DB::raw("DATE_FORMAT(transactions.created_at, '%Y-%m-%d %H:%i:%s') as date"),
                    DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as employee"),
                    DB::raw("COALESCE(equipment.name, '') as item"),
                    DB::raw("CASE 
                        WHEN transactions.status = 'released' THEN 'Borrowed'
                        WHEN transactions.status = 'returned' THEN 'Returned'
                        WHEN transactions.status = 'pending' THEN 'Pending'
                        ELSE 'Issued'
                    END as transaction_type"),
                    DB::raw("COALESCE(transactions.status, '') as status"),
                    DB::raw('1 as qty'),
                    DB::raw("COALESCE(approver.name, '-') as approvedBy"),
                ])
                ->orderByDesc('transactions.created_at');

            $query->chunk(500, function ($rows) use ($handle) {
                foreach ($rows as $row) {
                    fputcsv($handle, [
                        $row->date,
                        $row->employee,
                        $row->item,
                        $row->transaction_type,
                        $row->status,
                        $row->qty,
                        $row->approvedBy,
                    ]);
                }
            });

            fclose($handle);
        };

        // Log the activity
        ActivityLogService::logSystemActivity(
            'Exported reports',
            "Exported reports to CSV file: {$filename}"
        );

        return response()->stream($callback, 200, $headers);
    }
}