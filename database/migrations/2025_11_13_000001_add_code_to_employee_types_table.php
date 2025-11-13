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
        // Add the code column with unique constraint
        Schema::table('employee_types', function (Blueprint $table) {
            $table->unsignedTinyInteger('code')->unique()->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_types', function (Blueprint $table) {
            $table->dropColumn('code');
        });
    }
};
