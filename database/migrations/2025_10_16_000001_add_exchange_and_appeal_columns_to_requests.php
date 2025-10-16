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
        Schema::table('requests', function (Blueprint $table) {
            // Add columns for exchange requests
            $table->unsignedBigInteger('original_transaction_id')->nullable()->after('equipment_id');
            $table->string('evidence_file')->nullable()->after('reason');
            
            // Add columns for appeals
            $table->text('appeal_reason')->nullable()->after('rejection_reason');
            $table->timestamp('appeal_date')->nullable()->after('appeal_reason');
            
            // Add foreign key for original transaction
            $table->foreign('original_transaction_id')
                  ->references('id')
                  ->on('transactions')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requests', function (Blueprint $table) {
            $table->dropForeign(['original_transaction_id']);
            $table->dropColumn([
                'original_transaction_id',
                'evidence_file',
                'appeal_reason',
                'appeal_date'
            ]);
        });
    }
};
