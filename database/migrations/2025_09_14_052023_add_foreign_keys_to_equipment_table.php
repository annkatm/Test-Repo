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
        Schema::table('equipment', function (Blueprint $table) {
            // Drop FK only if it exists (handles environments where it was never added)
            try {
                $table->dropForeign(['category_id']);
            } catch (\Throwable $e) {
                // Ignore if constraint doesn't exist
            }
        });
    }
};
