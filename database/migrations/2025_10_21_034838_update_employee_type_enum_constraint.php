<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Change employee_type from ENUM to VARCHAR to be more flexible
        DB::statement("ALTER TABLE employees MODIFY COLUMN employee_type VARCHAR(50) DEFAULT 'Regular'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original ENUM values
        DB::statement("ALTER TABLE employees MODIFY COLUMN employee_type ENUM(
            'End of Service',
            'Independent Contractor', 
            'Probationary',
            'Regular',
            'Resigned',
            'Separated',
            'Terminated'
        ) DEFAULT 'End of Service'");
    }
};