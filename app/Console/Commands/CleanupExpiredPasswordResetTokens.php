<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CleanupExpiredPasswordResetTokens extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'password-reset:cleanup {--hours=24 : Number of hours after which tokens should be considered expired}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up expired password reset tokens from the database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $hours = $this->option('hours');
        $cutoffTime = Carbon::now()->subHours($hours);
        
        $deletedCount = DB::table('password_resets')
            ->where('created_at', '<', $cutoffTime)
            ->delete();
        
        $this->info("Cleaned up {$deletedCount} expired password reset tokens older than {$hours} hours.");
        
        // Log the cleanup action
        \Log::info('Password reset tokens cleanup completed', [
            'deleted_count' => $deletedCount,
            'cutoff_hours' => $hours,
            'cutoff_time' => $cutoffTime
        ]);
        
        return Command::SUCCESS;
    }
}