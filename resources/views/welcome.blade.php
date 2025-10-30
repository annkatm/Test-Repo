<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>iREPLY - Login</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  @vite(['resources/css/app.css', 'resources/js/app.js'])
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    #login-root {
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="login-root">
    <!-- React will render the LoginPage component here -->
    <div style="min-height: 100vh; display: flex; justify-content: center; align-items: center;">
      <div style="text-align: center; color: #666;">
        <div style="width: 50px; height: 50px; border: 3px solid #f3f3f3; border-top: 3px solid #1E437B; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
        <p>Loading...</p>
      </div>
    </div>
  </div>
  <style>
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</body>
</html>
