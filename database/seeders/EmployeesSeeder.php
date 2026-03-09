<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class EmployeesSeeder extends Seeder
{
    public function run()
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('employees')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        DB::table('employees')->insert([
            [
                'employee_id' => 'EMP001',
                'first_name' => 'John',
                'last_name' => 'Doe',
                'email' => 'john.doe@example.com',
                // 'employee_type' => 'Regular',
                'employee_type_id' => 2, // NOTE: this is a temporary solution for seed error
                'department' => 'Operations',
                'phone' => '09171234567',
                'status' => 'active',
                'hire_date' => '2020-01-15',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
                /********************************/
                'position' => 'Manager', // NOTE: this is a temporary solution for seed error
            ],
            [
                'employee_id' => 'EMP002',
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'email' => 'jane.smith@example.com',
                // 'employee_type' => 'Regular',
                'employee_type_id' => 2, // NOTE: this is a temporary solution for seed error
                'department' => 'IT',
                'phone' => '09179876543',
                'status' => 'active',
                'hire_date' => '2021-06-10',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
                /*********************/
                'position' => 'Software Engineer', // NOTE: this is a temporary solution for seed error
            ],
        ]);
    }
}
