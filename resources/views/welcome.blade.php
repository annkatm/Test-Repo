<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>iREPLY - Login</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      font-family: Arial, sans-serif;
      background: url("{{ asset('images/New BG.jpg') }}") no-repeat center center;
      background-size: cover;
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    .login-box {
      background: rgba(255, 255, 255, 0.1); /* very transparent */
      border-radius: 20px;
      padding: 40px 30px;
      width: 420px;
      margin-right: 8%;
      margin-top: 5%;
      text-align: center;
    }

    .login-box h4 {
      color: #555;
      margin-bottom: 20px;
      font-weight: 600;
    }

    .form-control {
      width: 100%;
      height: 55px;              /* fixed consistent height */
      border-radius: 50px;       /* pill shape */
      padding: 0 20px;
      margin-bottom: 20px;
      border: none;
      background: #f1f6ff;
      font-size: 16px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .btn-primary {
      width: 100%;
      height: 55px;              /* same height as input */
      border-radius: 50px;
      font-weight: bold;
      background-color: #1E437B;
      border: none;
      font-size: 16px;
      letter-spacing: 1px;
      box-shadow: 0 6px 10px rgba(0,0,0,0.25);
    }

    .btn-primary:hover {
      background-color: #15325d;
    }

    .form-check {
      margin-top: -5px;
      margin-bottom: 20px;
      text-align: left;
    }

    .form-check-label {
      font-size: 14px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="login-box">
    @if ($errors->any())
      <div class="alert alert-danger">
        @foreach ($errors->all() as $error)
          <div>{{ $error }}</div>
        @endforeach
      </div>
    @endif

    <form method="POST" action="{{ route('login.post') }}">
    @csrf
    <input type="text" class="form-control" name="email" placeholder="User ID" value="{{ old('email') }}" required>
    <input type="password" class="form-control" name="password" placeholder="Password" required>

    <button type="submit" class="btn btn-primary">SIGN IN</button>
    </form>
  </div>
</body>
</html>
