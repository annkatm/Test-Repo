<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activity Logs</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="antialiased">
    <div id="activitylogs-root"></div>
    <script>
        setTimeout(() => {
            if (window.React && window.ReactDOM && window.ActivityLogs) {
                const root = window.ReactDOM.createRoot(document.getElementById('activitylogs-root'));
                root.render(window.React.createElement(window.ActivityLogs));
            } else {
                document.getElementById('activitylogs-root').innerHTML = '<div class="p-6">Failed to load page.</div>'
            }
        }, 0);
    </script>
</body>
</html>
