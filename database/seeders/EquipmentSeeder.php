<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EquipmentSeeder extends Seeder
{
    public function run()
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('equipment')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        DB::table('equipment')->insert([
            [
                'name' => 'Laptop',
                'brand' => 'Lenovo',
                'model' => 'ThinkPad X1',
                'specifications' => 'Intel i7, 16GB RAM, 512GB SSD',
                'serial_number' => 'SN123456',
                'asset_tag' => 'AT-1001',
                'status' => 'available',
                'condition' => 'excellent',
                'purchase_price' => 1200.00,
                'purchase_date' => '2023-01-10',
                'warranty_expiry' => '2026-01-10',
                'notes' => 'Assigned to IT department',
                'location' => 'HQ Office',
                'category_id' => 1,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Projector',
                'brand' => 'Epson',
                'model' => 'EB-X41',
                'specifications' => '3600 lumens, XGA',
                'serial_number' => 'SN654321',
                'asset_tag' => 'AT-1002',
                'status' => 'borrowed',
                'condition' => 'good',
                'purchase_price' => 500.00,
                'purchase_date' => '2022-05-20',
                'warranty_expiry' => '2025-05-20',
                'notes' => 'Conference room',
                'location' => 'HQ Conference Room',
                'category_id' => 2,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ]);
    }
}
