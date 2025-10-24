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
                // The current schema has no quantity column; return zeros for now
                'low_stock' => 0,
                'out_of_stock' => 0,
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

            // Recent transactions table
            $transactions = DB::table('transactions')
                ->leftJoin('employees', 'transactions.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('users as approver', 'transactions.released_by', '=', 'approver.id')
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

            // Summary section
            $summary = [
                'Total Items' => DB::table('equipment')->count(),
                'Available Stock' => DB::table('equipment')->where('status', 'available')->count(),
                'Low Stock' => 0,
                'Out of Stock' => 0,
            ];
            fputcsv($handle, ['Summary']);
            foreach ($summary as $label => $value) {
                fputcsv($handle, [$label, $value]);
            }
            fputcsv($handle, []);

            // Header row
            fputcsv($handle, ['Date', 'Employee', 'Item', 'Status', 'Qty', 'Approved By']);

            $query = \Illuminate\Support\Facades\DB::table('transactions')
                ->leftJoin('employees', 'transactions.employee_id', '=', 'employees.id')
                ->leftJoin('equipment', 'transactions.equipment_id', '=', 'equipment.id')
                ->leftJoin('users as approver', 'transactions.released_by', '=', 'approver.id')
                ->when($startDate && $endDate, function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('transactions.created_at', [$startDate, $endDate]);
                })
                ->when($search, function ($q) use ($search) {
                    $q->where(function ($inner) use ($search) {
                        $inner->where('employees.first_name', 'like', "%{$search}%")
                            ->orWhere('employees.last_name', 'like', "%{$search}%")
                            ->orWhere(\Illuminate\Support\Facades\DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, ''))"), 'like', "%{$search}%")
                            ->orWhere('equipment.name', 'like', "%{$search}%");
                    });
                })
                ->select([
                    \Illuminate\Support\Facades\DB::raw("DATE_FORMAT(transactions.created_at, '%Y-%m-%d') as date"),
                    \Illuminate\Support\Facades\DB::raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as employee"),
                    \Illuminate\Support\Facades\DB::raw("COALESCE(equipment.name, '') as item"),
                    \Illuminate\Support\Facades\DB::raw("COALESCE(transactions.status, '') as status"),
                    \Illuminate\Support\Facades\DB::raw('1 as qty'),
                    \Illuminate\Support\Facades\DB::raw("COALESCE(approver.name, '-') as approvedBy"),
                ])
                ->orderByDesc('transactions.created_at');

            $query->chunk(500, function ($rows) use ($handle) {
                foreach ($rows as $row) {
                    fputcsv($handle, [
                        $row->date,
                        $row->employee,
                        $row->item,
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


