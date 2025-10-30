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
        // Add 'completed' to the status enum for transactions
        DB::statement("ALTER TABLE transactions MODIFY COLUMN status ENUM('pending', 'released', 'returned', 'completed', 'lost', 'damaged') NOT NULL");
        
        // Add verification fields
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('verified_by')->nullable()->after('received_by')->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable()->after('verified_by');
            $table->text('verification_notes')->nullable()->after('verified_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove verification fields
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['verified_by']);
            $table->dropColumn(['verified_by', 'verified_at', 'verification_notes']);
        });
        
        // Revert status enum back to original
        DB::statement("ALTER TABLE transactions MODIFY COLUMN status ENUM('pending', 'released', 'returned', 'lost', 'damaged') NOT NULL");
    }
};
