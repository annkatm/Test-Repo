<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private function dropForeignIfExists(string $table, string $column): void
    {
        $constraint = DB::table('information_schema.key_column_usage')
            ->select('CONSTRAINT_NAME')
            ->whereRaw('TABLE_SCHEMA = DATABASE()')
            ->where('TABLE_NAME', $table)
            ->where('COLUMN_NAME', $column)
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->first();

        if ($constraint && isset($constraint->CONSTRAINT_NAME)) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$constraint->CONSTRAINT_NAME}`");
        }
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop existing foreign key constraint if it exists
        $this->dropForeignIfExists('activity_logs', 'user_id');

        Schema::table('activity_logs', function (Blueprint $table) {
            // Make user_id nullable
            $table->unsignedBigInteger('user_id')->nullable()->change();

            // Re-add foreign key with null on delete
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // First update any null values to a default user_id (e.g., 1)
        DB::table('activity_logs')->whereNull('user_id')->update(['user_id' => 1]);

        // Drop modified foreign key if it exists
        $this->dropForeignIfExists('activity_logs', 'user_id');

        Schema::table('activity_logs', function (Blueprint $table) {
            // Revert user_id to not nullable after we've handled null values
            $table->unsignedBigInteger('user_id')->nullable(false)->change();

            // Restore cascading delete behavior
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }
};
