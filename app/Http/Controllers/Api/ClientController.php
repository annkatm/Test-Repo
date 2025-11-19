<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(): JsonResponse
    {
        $clients = Client::all();
        return response()->json([
            'success' => true,
            'data' => $clients,
            'message' => 'Clients retrieved successfully'
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255|unique:clients,name',
            ]);

            $client = Client::create(['name' => $request->name]);

            ActivityLogService::logSystemActivity(
                'Created client',
                "Created new client: {$client->name}"
            );

            return response()->json([
                'success' => true,
                'data' => $client,
                'message' => 'Client created successfully'
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

    public function show(Client $client): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $client,
            'message' => 'Client retrieved successfully'
        ]);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255|unique:clients,name,' . $client->id,
            ]);

            $client->update(['name' => $request->name]);

            ActivityLogService::logSystemActivity(
                'Updated client',
                "Updated client: {$client->name}"
            );

            return response()->json([
                'success' => true,
                'data' => $client,
                'message' => 'Client updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Client $client): JsonResponse
    {
        try {
            ActivityLogService::logSystemActivity(
                'Deleted client',
                "Deleted client: {$client->name}"
            );
            
            $client->forceDelete(); // Permanent delete

            return response()->json([
                'success' => true,
                'message' => 'Client deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete client',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
