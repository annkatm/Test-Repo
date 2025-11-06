<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Client;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeType;
use App\Models\Equipment;
use App\Models\Position;
use App\Models\Request as EquipmentRequest;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;

class ArchiveController extends Controller
{
    public function index(Request $request)
    {
        $filterType = $request->get('type', 'all');
        $searchTerm = $request->get('search', '');
        
        $archivedItems = collect();
        
        // Get all archived items based on filter
        if ($filterType === 'all' || $filterType === 'equipment') {
            $equipmentQuery = Equipment::onlyTrashed()
                ->with('category')
                ->whereNotNull('deleted_at'); // Ensure only properly soft-deleted items
            
            if ($searchTerm) {
                $equipmentQuery->where(function($query) use ($searchTerm) {
                    $query->where('name', 'like', "%{$searchTerm}%")
                          ->orWhere('brand', 'like', "%{$searchTerm}%")
                          ->orWhere('model', 'like', "%{$searchTerm}%");
                });
            }
            
            $equipment = $equipmentQuery->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'equipment',
                        'name' => $item->name,
                        'brand' => $item->brand,
                        'model' => $item->model,
                        'category' => $item->category?->name,
                        'deleted_at' => $item->deleted_at,
                        'status' => $item->status,
                        'condition' => $item->condition,
                    ];
                });
            $archivedItems = $archivedItems->merge($equipment);
        }
        
        if ($filterType === 'all' || $filterType === 'requests') {
            $requestsQuery = EquipmentRequest::onlyTrashed()
                ->with(['employee', 'equipment', 'user'])
                ->whereNotNull('deleted_at'); // Ensure only properly soft-deleted items
            
            if ($searchTerm) {
                $requestsQuery->where(function($query) use ($searchTerm) {
                    $query->where('request_number', 'like', "%{$searchTerm}%")
                          ->orWhere('reason', 'like', "%{$searchTerm}%");
                });
            }
            
            $requests = $requestsQuery->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'request',
                        'name' => $item->request_number,
                        'employee' => $item->employee?->full_name,
                        'equipment' => $item->equipment?->name,
                        'reason' => $item->reason,
                        'deleted_at' => $item->deleted_at,
                        'status' => $item->status,
                    ];
                });
            $archivedItems = $archivedItems->merge($requests);
        }
        
        if ($filterType === 'all' || $filterType === 'transactions') {
            $transactionsQuery = Transaction::onlyTrashed()
                ->with(['employee', 'equipment', 'user'])
                ->whereNotNull('deleted_at'); // Ensure only properly soft-deleted items
            
            if ($searchTerm) {
                $transactionsQuery->where('transaction_number', 'like', "%{$searchTerm}%");
            }
            
            $transactions = $transactionsQuery->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'transaction',
                        'name' => $item->transaction_number,
                        'employee' => $item->employee?->full_name,
                        'equipment' => $item->equipment?->name,
                        'deleted_at' => $item->deleted_at,
                        'status' => $item->status,
                    ];
                });
            $archivedItems = $archivedItems->merge($transactions);
        }
        
        if ($filterType === 'all' || $filterType === 'employees') {
            $employeesQuery = Employee::onlyTrashed()
                ->whereNotNull('deleted_at'); // Ensure only properly soft-deleted items
            
            if ($searchTerm) {
                $employeesQuery->where(function($query) use ($searchTerm) {
                    $query->where('first_name', 'like', "%{$searchTerm}%")
                          ->orWhere('last_name', 'like', "%{$searchTerm}%")
                          ->orWhere('email', 'like', "%{$searchTerm}%");
                });
            }
            
            $employees = $employeesQuery->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'employee',
                        'name' => $item->full_name,
                        'email' => $item->email,
                        'department' => $item->department,
                        'position' => $item->position,
                        'deleted_at' => $item->deleted_at,
                    ];
                });
            $archivedItems = $archivedItems->merge($employees);
        }
        
        if ($filterType === 'all' || $filterType === 'users') {
            $usersQuery = User::onlyTrashed()
                ->with('role')
                ->whereNotNull('deleted_at'); // Ensure only properly soft-deleted items
            
            if ($searchTerm) {
                $usersQuery->where(function($query) use ($searchTerm) {
                    $query->where('name', 'like', "%{$searchTerm}%")
                          ->orWhere('email', 'like', "%{$searchTerm}%");
                });
            }
            
            $users = $usersQuery->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'user',
                        'name' => $item->name,
                        'email' => $item->email,
                        'role' => $item->role?->name,
                        'department' => $item->department,
                        'deleted_at' => $item->deleted_at,
                    ];
                });
            $archivedItems = $archivedItems->merge($users);
        }
        
        // Control Panel entities
        if ($filterType === 'all' || $filterType === 'categories') {
            $categoriesQuery = Category::onlyTrashed()
                ->whereNotNull('deleted_at');
            
            if ($searchTerm) {
                $categoriesQuery->where('name', 'like', "%{$searchTerm}%");
            }
            
            $categories = $categoriesQuery->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'category',
                        'name' => $item->name,
                        'deleted_at' => $item->deleted_at,
                    ];
                });
            $archivedItems = $archivedItems->merge($categories);
        }
        
        if ($filterType === 'all' || $filterType === 'positions') {
            $positionsQuery = Position::onlyTrashed()
                ->whereNotNull('deleted_at');
            
            if ($searchTerm) {
                $positionsQuery->where('name', 'like', "%{$searchTerm}%");
            }
            
            $positions = $positionsQuery->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'position',
                        'name' => $item->name,
                        'deleted_at' => $item->deleted_at,
                    ];
                });
            $archivedItems = $archivedItems->merge($positions);
        }
        
        if ($filterType === 'all' || $filterType === 'departments') {
            $departmentsQuery = Department::onlyTrashed()
                ->whereNotNull('deleted_at');
            
            if ($searchTerm) {
                $departmentsQuery->where('name', 'like', "%{$searchTerm}%");
            }
            
            $departments = $departmentsQuery->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'department',
                        'name' => $item->name,
                        'deleted_at' => $item->deleted_at,
                    ];
                });
            $archivedItems = $archivedItems->merge($departments);
        }
        
        if ($filterType === 'all' || $filterType === 'clients') {
            $clientsQuery = Client::onlyTrashed()
                ->whereNotNull('deleted_at');
            
            if ($searchTerm) {
                $clientsQuery->where('name', 'like', "%{$searchTerm}%");
            }
            
            $clients = $clientsQuery->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'client',
                        'name' => $item->name,
                        'deleted_at' => $item->deleted_at,
                    ];
                });
            $archivedItems = $archivedItems->merge($clients);
        }
        
        if ($filterType === 'all' || $filterType === 'employee-types') {
            $employeeTypesQuery = EmployeeType::onlyTrashed()
                ->whereNotNull('deleted_at');
            
            if ($searchTerm) {
                $employeeTypesQuery->where('name', 'like', "%{$searchTerm}%");
            }
            
            $employeeTypes = $employeeTypesQuery->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'type' => 'employee-type',
                        'name' => $item->name,
                        'deleted_at' => $item->deleted_at,
                    ];
                });
            $archivedItems = $archivedItems->merge($employeeTypes);
        }
        
        // Filter out items with invalid deleted_at timestamps (like 1970-01-01)
        $archivedItems = $archivedItems->filter(function($item) {
            return $item['deleted_at'] && 
                   $item['deleted_at'] !== '1970-01-01 00:00:00' && 
                   $item['deleted_at'] !== '1970-01-01' &&
                   strtotime($item['deleted_at']) > 0;
        });
        
        // Sort by deleted_at desc
        $archivedItems = $archivedItems->sortByDesc('deleted_at');
        
        if ($request->expectsJson()) {
            return response()->json([
                'items' => $archivedItems->values(),
                'total' => $archivedItems->count(),
                'filter' => $filterType,
                'search' => $searchTerm
            ]);
        }
 
        $itemsForView = $archivedItems->values()->toArray();
        $totalForView = $archivedItems->count();
        
        return view('archive', [
            'archivedItems' => $itemsForView,
            'filterType' => $filterType,
            'searchTerm' => $searchTerm,
            'total' => $totalForView,
        ]);
    }

    public function restore($type, $id)
    {
        $model = null;
        
        switch ($type) {
            case 'equipment':
                $model = Equipment::withTrashed()->find($id);
                break;
            case 'category':
            case 'categories':
                $model = Category::withTrashed()->find($id);
                break;
            case 'employee':
                $model = Employee::withTrashed()->find($id);
                break;
            case 'request':
            case 'requests':
                $model = EquipmentRequest::withTrashed()->find($id);
                break;
            case 'transaction':
            case 'transactions':
                $model = Transaction::withTrashed()->find($id);
                break;
            case 'user':
            case 'users':
                $model = User::withTrashed()->find($id);
                break;
            case 'position':
            case 'positions':
                $model = Position::withTrashed()->find($id);
                break;
            case 'department':
            case 'departments':
                $model = Department::withTrashed()->find($id);
                break;
            case 'client':
            case 'clients':
                $model = Client::withTrashed()->find($id);
                break;
            case 'employee-type':
            case 'employee-types':
                $model = EmployeeType::withTrashed()->find($id);
                break;
        }

        if ($model) {
            $model->restore();
            return response()->json(['success' => true, 'message' => 'Item restored successfully']);
        }

        return response()->json(['success' => false, 'message' => 'Item not found'], 404);
    }

    public function forceDelete($type, $id)
    {
        $model = null;
        
        switch ($type) {
            case 'equipment':
                $model = Equipment::withTrashed()->find($id);
                break;
            case 'category':
            case 'categories':
                $model = Category::withTrashed()->find($id);
                break;
            case 'employee':
                $model = Employee::withTrashed()->find($id);
                break;
            case 'request':
            case 'requests':
                $model = EquipmentRequest::withTrashed()->find($id);
                break;
            case 'transaction':
            case 'transactions':
                $model = Transaction::withTrashed()->find($id);
                break;
            case 'user':
            case 'users':
                $model = User::withTrashed()->find($id);
                break;
            case 'position':
            case 'positions':
                $model = Position::withTrashed()->find($id);
                break;
            case 'department':
            case 'departments':
                $model = Department::withTrashed()->find($id);
                break;
            case 'client':
            case 'clients':
                $model = Client::withTrashed()->find($id);
                break;
            case 'employee-type':
            case 'employee-types':
                $model = EmployeeType::withTrashed()->find($id);
                break;
        }

        if ($model) {
            $model->forceDelete();
            return response()->json(['success' => true, 'message' => 'Item permanently deleted']);
        }

        return response()->json(['success' => false, 'message' => 'Item not found'], 404);
    }

    public function bulkRestore(Request $request)
    {
        $itemIds = $request->input('itemIds', []);
        $restoredCount = 0;
        $errors = [];

        foreach ($itemIds as $itemData) {
            $type = $itemData['type'];
            $id = $itemData['id'];
            
            $model = null;
            
            switch ($type) {
                case 'equipment':
                    $model = Equipment::withTrashed()->find($id);
                    break;
                case 'category':
                    $model = Category::withTrashed()->find($id);
                    break;
                case 'employee':
                    $model = Employee::withTrashed()->find($id);
                    break;
                case 'request':
                    $model = EquipmentRequest::withTrashed()->find($id);
                    break;
                case 'transaction':
                    $model = Transaction::withTrashed()->find($id);
                    break;
                case 'user':
                    $model = User::withTrashed()->find($id);
                    break;
            }

            if ($model) {
                $model->restore();
                $restoredCount++;
            } else {
                $errors[] = "Item {$type} with ID {$id} not found";
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully restored {$restoredCount} items",
            'restored_count' => $restoredCount,
            'errors' => $errors
        ]);
    }

    public function bulkForceDelete(Request $request)
    {
        $itemIds = $request->input('itemIds', []);
        $deletedCount = 0;
        $errors = [];

        foreach ($itemIds as $itemData) {
            $type = $itemData['type'];
            $id = $itemData['id'];
            
            $model = null;
            
            switch ($type) {
                case 'equipment':
                    $model = Equipment::withTrashed()->find($id);
                    break;
                case 'category':
                    $model = Category::withTrashed()->find($id);
                    break;
                case 'employee':
                    $model = Employee::withTrashed()->find($id);
                    break;
                case 'request':
                    $model = EquipmentRequest::withTrashed()->find($id);
                    break;
                case 'transaction':
                    $model = Transaction::withTrashed()->find($id);
                    break;
                case 'user':
                    $model = User::withTrashed()->find($id);
                    break;
            }

            if ($model) {
                $model->forceDelete();
                $deletedCount++;
            } else {
                $errors[] = "Item {$type} with ID {$id} not found";
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully deleted {$deletedCount} items",
            'deleted_count' => $deletedCount,
            'errors' => $errors
        ]);
    }
}
