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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_number')->unique();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->foreignId('equipment_id')->constrained('equipment')->onDelete('cascade');
            $table->foreignId('request_id')->nullable()->constrained('requests')->nullOnDelete();

            // Transaction status and type
            $table->enum('status', ['pending', 'released', 'returned', 'lost', 'damaged']);
            $table->enum('request_mode', ['on_site', 'work_from_home'])->nullable();

            // Release information
            $table->enum('release_condition', ['good_condition', 'brand_new', 'damaged'])->nullable();
            $table->date('release_date')->nullable();
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();

            // Return information
            $table->enum('return_condition', ['good_condition', 'damaged', 'has_defect', 'lost'])->nullable();
            $table->date('return_date')->nullable();
            $table->date('expected_return_date')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();

            // Additional tracking
            $table->text('release_notes')->nullable();
            $table->text('return_notes')->nullable();
            $table->timestamps();

            // Indexes for better query performance
            $table->index(['employee_id', 'status']);
            $table->index(['equipment_id', 'status']);
            $table->index('release_date');
            $table->index('return_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
