import React, { useState } from 'react';

const LoginPage = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      // Get CSRF token from meta tag or fetch from server
      let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null;
      
      if (!csrfToken) {
        // Fetch CSRF token from server
        const tokenResponse = await fetch('/csrf-token', {
          credentials: 'same-origin'
        });
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          csrfToken = tokenData.csrf_token;
        } else {
          throw new Error('Failed to get CSRF token');
        }
      }

      if (!csrfToken) {
        throw new Error('CSRF token is required');
      }

      // Create form data instead of JSON
      const formData = new FormData();
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('_token', csrfToken);

      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin', // Include cookies for session authentication
        body: formData,
      });

      // Check if the response is a redirect (status 302)
      if (response.redirected || response.status === 302) {
        // Login was successful and we were redirected
        console.log('Login successful - redirected to dashboard');
        console.log('Cookies after login:', document.cookie);
        
        // Check if session cookie is now available
        const sessionCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('laravel-session='));
        console.log('Session cookie after login:', sessionCookie || 'NOT FOUND');
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
        return;
      }
      
      // If it's a JSON response, handle it normally
      const data = await response.json();
      
      // Debug: Log the response
      console.log('Login response:', data);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Cookies after login:', document.cookie);

      if (data.success) {
        // Store user data in localStorage for frontend use
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Debug: Check if session cookie is now available
        const sessionCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('laravel-session='));
        console.log('Session cookie after login:', sessionCookie || 'NOT FOUND');
        
        onAuthSuccess();
      } else {
        setErrors({ general: data.message || 'Login failed. Please try again.' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    // In a real app, you might navigate to a signup page
    // For now, just simulate successful auth
    onAuthSuccess();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${
                  errors.email 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${
                  errors.password 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleSubmit}
            className="w-full mt-8 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 font-semibold"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition duration-200"
                onClick={handleSignUp}
                disabled={isLoading}
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;