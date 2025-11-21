# Setup Guide

This guide covers the basic steps to get the project running locally.

**Prerequisites**
- PHP (compatible version for this Laravel app)
- Composer
- Node.js and npm
- MySQL (or configured DB server)

**Quick Setup (bash / WSL / MacOS / Linux)**

1. Install PHP dependencies
```
composer install
```

2. Install JS dependencies
```
npm install
```

3. Copy example environment file and edit values
```
cp .env.example .env
```

4. Update `.env` with your MAIL block (example values below):
```
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=ireplyad@gmail.com
MAIL_PASSWORD=cvzalpkptgtnwlcs
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=ireplyad@gmail.com
MAIL_FROM_NAME="${APP_NAME}"
```

5. Create storage symlink
```
php artisan storage:link
```

6. Generate application key
```
php artisan key:generate
```

7. Run database migrations
```
php artisan migrate
```

8. Seed admin users (example seeder)
```
php artisan db:seed --class=AdminUsersSeeder
```

9. Build frontend assets for production
```
npm run build
```

10. Serve the app locally (development)
```
php artisan serve
```

**PowerShell (Windows) notes**

- To copy the `.env` file in PowerShell use:
```
Copy-Item .env.example .env
```
- Everything else uses the same commands (run them from the project root in PowerShell):
```
composer install
npm install
php artisan storage:link
php artisan key:generate
php artisan migrate
php artisan db:seed --class=AdminUsersSeeder
npm run build
php artisan serve
```

**Notes & tips**
- If `php artisan storage:link` fails on Windows, run PowerShell as Administrator.
- Verify `.env` DB credentials match your local MySQL config (see `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).
- Keep sensitive credentials out of version control. Use `.env` and don't commit it.

If you want, I can also append a short `Setup` section to `README.md` that points to this `docs/SETUP_GUIDE.md` and includes the most-used commands.
