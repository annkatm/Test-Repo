<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>@yield('title', 'iREPLY')</title>
    
    @if (file_exists(public_path('build/manifest.json')))
        @php
            $manifest = json_decode(file_get_contents(public_path('build/manifest.json')), true);
        @endphp
        @if (isset($manifest['resources/css/app.css']))
            <link rel="stylesheet" href="{{ asset('build/' . $manifest['resources/css/app.css']['file']) }}">
        @endif
        @if (isset($manifest['resources/js/app.js']))
            @foreach ($manifest['resources/js/app.js']['css'] ?? [] as $css)
                <link rel="stylesheet" href="{{ asset('build/' . $css) }}">
            @endforeach
        @endif
    @endif
    
    @yield('styles')
</head>
<body>
    @yield('content')
    
    @if (file_exists(public_path('build/manifest.json')))
        @php
            $manifest = json_decode(file_get_contents(public_path('build/manifest.json')), true);
        @endphp
        @if (isset($manifest['resources/js/app.js']))
            <script type="module" src="{{ asset('build/' . $manifest['resources/js/app.js']['file']) }}"></script>
        @endif
    @endif
    
    @yield('scripts')
</body>
</html>
