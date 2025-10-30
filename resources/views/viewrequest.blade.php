<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>iREPLY - View Request</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <script>window.APP_BASE_URL = "{{ url('/') }}";</script>
</head>
<body class="antialiased">
    <div id="viewrequest-root"></div>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            if (window.ViewRequest && window.initReact) {
                window.initReact('viewrequest-root', window.ViewRequest);
            } else {
                console.error('Required components not found:', {
                    ViewRequest: !!window.ViewRequest,
                    initReact: !!window.initReact
                });
            }
        });
    </script>
</body>
</html>


