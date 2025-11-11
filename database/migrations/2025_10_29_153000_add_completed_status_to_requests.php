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
        // Normalize any unexpected statuses to a safe value before altering the ENUM
        DB::statement("UPDATE requests SET status = 'fulfilled' WHERE status NOT IN ('pending','approved','rejected','fulfilled','completed') OR status IS NULL");

        // Add 'completed' to the status enum for requests table
        DB::statement("ALTER TABLE requests MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'fulfilled', 'completed') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Convert 'completed' statuses back to a supported value before shrinking the ENUM
        DB::statement("UPDATE requests SET status = 'fulfilled' WHERE status = 'completed'");

        // Remove 'completed' from the status enum
        DB::statement("ALTER TABLE requests MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'fulfilled') DEFAULT 'pending'");
    }
};
