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
            // Add missing columns
            if (!Schema::hasColumn('employees', 'position')) {
                $table->string('position')->nullable()->after('employee_type');
            }
            if (!Schema::hasColumn('employees', 'client')) {
                $table->string('client')->nullable()->after('position');
            }
            if (!Schema::hasColumn('employees', 'address')) {
                $table->text('address')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('employees', 'issued_item')) {
                $table->text('issued_item')->nullable()->after('address');
            }
            if (!Schema::hasColumn('employees', 'employee_number')) {
                $table->string('employee_number')->nullable()->unique()->after('id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['position', 'client', 'address', 'issued_item', 'employee_number']);
        });
    }
};
