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
        DB::statement("ALTER TABLE employees MODIFY COLUMN employee_type ENUM('End of Service','Independent Contractor','New hire','Probationary','Regular','Resigned','Separated','Terminated') NOT NULL DEFAULT 'End of Service'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE employees MODIFY COLUMN employee_type ENUM('End of Service','Independent Contractor','Probationary','Regular','Resigned','Separated','Terminated') NOT NULL DEFAULT 'End of Service'");
    }
};
