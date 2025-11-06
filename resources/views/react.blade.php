<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>iREPLY</title>
  @viteReactRefresh
  @vite('resources/js/app.js') {{-- Your React entry --}}
</head>
<body>
  <div id="root"></div>
</body>
</html>
