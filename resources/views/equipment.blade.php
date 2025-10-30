<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Equipment</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  @viteReactRefresh
  @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
  <div id="equipment-root"></div>
  <script>
    window.APP_BASE_URL = "{{ url('/') }}";
    document.addEventListener('DOMContentLoaded', () => {
      if (window.Equipment && window.initReact) {
        window.initReact('equipment-root', window.Equipment);
      } else {
        console.error('Required components not found:', {
          Equipment: !!window.Equipment,
          initReact: !!window.initReact
        });
      }
    });
  </script>
</body>
</html>


