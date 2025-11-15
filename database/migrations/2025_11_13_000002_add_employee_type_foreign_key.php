<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Add the employee_type_id column if it doesn't exist
            if (!Schema::hasColumn('employees', 'employee_type_id')) {
                $table->unsignedBigInteger('employee_type_id')->nullable()->after('phone');
            }
            
            // Add the foreign key constraint
            $table->foreign('employee_type_id')
                  ->references('id')
                  ->on('employee_types')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['employee_type_id']);
            $table->dropColumn('employee_type_id');
        });
    }
};
