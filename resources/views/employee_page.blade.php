<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Employee Page</title>
  @viteReactRefresh
  @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
  <div id="employee-root"></div>
  <script>
    setTimeout(() => {
      if (window.React && window.ReactDOM && window.EmployeePage) {
        const root = ReactDOM.createRoot(document.getElementById('employee-root'));
        root.render(React.createElement(window.EmployeePage));
      }
    }, 100);
  </script>
</body>
</html>



