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
        // Add 'completed' to the status enum for requests table
        DB::statement("ALTER TABLE requests MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'fulfilled', 'completed') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'completed' from the status enum
        DB::statement("ALTER TABLE requests MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'fulfilled') DEFAULT 'pending'");
    }
};
