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
        Schema::table('equipment', function (Blueprint $table) {
            // No longer needed as the constraint is added in the equipment table creation
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Since up() does nothing (foreign key is defined in equipment table creation),
        // down() should also do nothing to avoid conflicts
        // The foreign key will be dropped when the equipment table is dropped
    }
};
