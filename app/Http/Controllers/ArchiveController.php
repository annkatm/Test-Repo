<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Add deleted_at column to equipment
        Schema::table('equipment', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Add deleted_at column to requests
        Schema::table('requests', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Add deleted_at column to transactions
        Schema::table('transactions', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('requests', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};