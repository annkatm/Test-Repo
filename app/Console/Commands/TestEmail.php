<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestEmail extends Command
{
    protected $signature = 'email:test {email}';
    protected $description = 'Test email configuration by sending a test email';

    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info('Sending test email to: ' . $email);
        
        try {
            Mail::raw('This is a test email from iREPLY system. If you receive this, your email configuration is working correctly!', function ($message) use ($email) {
                $message->to($email)
                    ->subject('Test Email - iREPLY System');
            });
            
            $this->info('✓ Email sent successfully!');
            $this->info('Check the inbox (and spam folder) of: ' . $email);
            
        } catch (\Exception $e) {
            $this->error('✗ Failed to send email!');
            $this->error('Error: ' . $e->getMessage());
            
            $this->newLine();
            $this->warn('Common issues:');
            $this->warn('1. Check your .env MAIL_* settings');
            $this->warn('2. If using Gmail, use App Password (not regular password)');
            $this->warn('3. Check MAIL_HOST and MAIL_PORT are correct');
            $this->warn('4. Verify MAIL_ENCRYPTION is set (tls or ssl)');
        }
        
        return 0;
    }
}
