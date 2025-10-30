<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Add Stocks</title>
  @viteReactRefresh
  @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
  <div id="addstocks-root"></div>
  <script>
    setTimeout(() => {
      if (window.React && window.ReactDOM && window.AddStocks) {
        const root = ReactDOM.createRoot(document.getElementById('addstocks-root'));
        root.render(React.createElement(window.AddStocks));
      }
    }, 100);
  </script>
</body>
</html>



