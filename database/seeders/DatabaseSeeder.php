<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesSeeder::class,        // First, create roles
            AdminUsersSeeder::class,   // Create admin and employee users
            EmployeeTypesSeeder::class, // Employee types
            CategoriesSeeder::class,   // Categories for equipment
            EmployeesSeeder::class,    // Employees
            EquipmentSeeder::class,    // Equipment with categories
            RequestsSeeder::class,     // Requests from employees
            TransactionsSeeder::class, // Finally, transactions
        ]);
    }
}

