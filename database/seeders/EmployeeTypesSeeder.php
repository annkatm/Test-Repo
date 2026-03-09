<?php

/** NOTE: this is a temporary solution for seed error */

namespace Database\Seeders;

use App\Models\EmployeeType;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EmployeeTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //
        // add regular employee type
        EmployeeType::create([
            'name' => 'Regular Employee',
            'code' => 2,
        ]);

        // add admin employee type
        EmployeeType::create([
            'name' => 'Admin Employee',
            'code' => 1,
        ]);
    }
}
