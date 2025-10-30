<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>iREPLY - View Approved</title>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <script>window.APP_BASE_URL = "{{ url('/') }}";</script>
</head>
<body class="antialiased">
    <div id="viewapproved-root"></div>
    <script>
      setTimeout(() => {
        try {
          if (window.React && window.ReactDOM && window.ViewApproved) {
            const root = ReactDOM.createRoot(document.getElementById('viewapproved-root'));
            root.render(React.createElement(window.ViewApproved));
          }
        } catch (e) {
          console.error('Error rendering ViewApproved:', e);
        }
      }, 200);
    </script>
</body>
</html>