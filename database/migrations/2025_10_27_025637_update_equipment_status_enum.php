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
        // Update existing 'in_use' status to 'available' since we're removing that enum value
        DB::table('equipment')->where('status', 'in_use')->update(['status' => 'available']);
        
        // Update existing 'maintenance' and 'retired' statuses if they exist
        DB::table('equipment')->whereIn('status', ['maintenance', 'retired'])->update(['status' => 'available']);
        
        // Change the status enum values to match what the application expects
        DB::statement("ALTER TABLE equipment MODIFY COLUMN status ENUM('available', 'borrowed', 'issued') DEFAULT 'available'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to the previous enum values if needed
        DB::statement("ALTER TABLE equipment MODIFY COLUMN status ENUM('available', 'in_use', 'maintenance', 'retired') DEFAULT 'available'");
    }
};
