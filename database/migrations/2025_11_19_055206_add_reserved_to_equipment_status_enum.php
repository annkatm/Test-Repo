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
        // Add 'reserved' to the equipment status ENUM
        DB::statement("ALTER TABLE equipment MODIFY COLUMN status ENUM('available', 'borrowed', 'issued', 'reserved') DEFAULT 'available'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to the previous enum values without 'reserved'
        DB::statement("ALTER TABLE equipment MODIFY COLUMN status ENUM('available', 'borrowed', 'issued') DEFAULT 'available'");
    }
};
