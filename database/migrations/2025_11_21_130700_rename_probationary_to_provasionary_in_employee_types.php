<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('employee_types')->where('code', 2)->update(['name' => 'Provasionary']);
    }

    public function down(): void
    {
        DB::table('employee_types')->where('code', 2)->update(['name' => 'Probationary']);
    }
};
