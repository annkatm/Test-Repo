Real-time notifications setup (Laravel Echo + Pusher)

This project includes example backend events and frontend Echo wiring to enable real-time notifications when requests are created/updated.

Steps to enable real-time notifications:

1. Install frontend packages

PowerShell:

```
npm install
```

(ensure `laravel-echo` and `pusher-js` are listed in package.json — they were added.)

2. Setup broadcasting in .env (example using Pusher)

```
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=your-id
PUSHER_APP_KEY=your-key
PUSHER_APP_SECRET=your-secret
PUSHER_APP_CLUSTER=mt1
```

3. Configure `config/broadcasting.php` if you use a different driver (laravel-websockets is an option).

4. Ensure you have Laravel Echo and Pusher client configured. This project includes `resources/js/echo.js` which initializes Echo if `window.Laravel.pusherKey` is provided or via env vars.

5. Protect private channels: broadcasting authentication endpoint is `/broadcasting/auth` and requires session-authenticated requests. Ensure your frontend sends the CSRF token in headers (the echo.js file already sets the X-CSRF-TOKEN header when available).

6. Compile assets:

```
npm run build
```

7. Start WebSocket server (if using laravel-websockets) or ensure Pusher app is active.

Notes and testing
- The backend dispatches `App\Events\RequestCreated` and `App\Events\RequestUpdated` events to the private channel `user.history.{employeeId}`.
- The frontend subscribes to `user.history.{employeeId}` and will append incoming events to the history and increment the history notification badge.
- If you prefer broadcasting by user id instead of employee id, adjust both event broadcastOn() channel and frontend subscription.
