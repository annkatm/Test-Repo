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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_image')->nullable(); // Employee profile image path
            $table->string('employee_id')->unique(); // Employee ID number
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('position'); // Job title/position
            $table->string('department')->nullable();
            $table->string('phone')->nullable();
            $table->enum('status', ['active', 'inactive', 'terminated'])->default('active');
            $table->date('hire_date')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index(['status', 'department']);
            $table->index('employee_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
