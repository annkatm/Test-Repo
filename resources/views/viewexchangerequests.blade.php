<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>iREPLY - Exchange Requests</title>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <script>window.APP_BASE_URL = "{{ url('/') }}";</script>
</head>
<body class="antialiased">
    <div id="viewexchangerequests-root"></div>
    <script>
      setTimeout(() => {
        try {
          if (window.React && window.ReactDOM && window.ViewExchangeRequests) {
            const root = ReactDOM.createRoot(document.getElementById('viewexchangerequests-root'));
            root.render(React.createElement(window.ViewExchangeRequests));
          }
        } catch (e) {
          console.error('Error rendering ViewExchangeRequests:', e);
        }
      }, 200);
    </script>
</body>
</html>

