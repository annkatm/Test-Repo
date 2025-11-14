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
        // Update the return_condition enum to include has_defect and lost options
        DB::statement("ALTER TABLE transactions MODIFY COLUMN return_condition ENUM('good_condition', 'damaged', 'has_defect', 'lost') NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum values
        DB::statement("ALTER TABLE transactions MODIFY COLUMN return_condition ENUM('good_condition', 'brand_new', 'damaged') NULL");
    }
};
