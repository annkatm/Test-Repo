import React, { useState } from 'react';

// Error Message Component
const ErrorMessage = ({ message }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-red-700 text-sm">
    {message}
  </div>
);

// Password Input Component
const PasswordInput = ({ value, onChange, onKeyPress, disabled, showPassword, onTogglePassword }) => (
  <div className="relative mb-5">
    <input
      type={showPassword ? 'text' : 'password'}
      className="w-full h-14 rounded-full px-5 border-none bg-[#f1f6ff] text-base shadow-md outline-none focus:shadow-lg disabled:opacity-60"
      id="password"
      name="password"
      placeholder="Password"
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      disabled={disabled}
      required
    />
    <button
      type="button"
      className="absolute right-5 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600 text-lg bg-transparent border-none p-0 hover:text-[#1E437B]"
      onClick={onTogglePassword}
    >
      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
    </button>
  </div>
);

// Forgot Password Modal Component
const ForgotPasswordModal = ({ 
  isOpen, 
  onClose, 
  email,
  onEmailChange,
  onSendReset,
  isLoading,
  error,
  success
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/60 z-[1000] ${isOpen ? 'flex' : 'hidden'} justify-center items-center`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-10 w-[90%] max-w-[550px] shadow-2xl border border-white/20">
        {!success ? (
          <>
            <h2 className="text-center text-white mb-4 font-bold text-3xl">Forgot Password</h2>
            <p className="text-center text-white/80 mb-6 text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <form onSubmit={onSendReset}>
              <input
                type="email"
                id="reset-email"
                placeholder="Enter your email address"
                value={email}
                onChange={onEmailChange}
                className="w-full h-14 rounded-full px-5 border-none bg-[#f1f6ff] text-base mb-5 shadow-md outline-none focus:shadow-lg disabled:opacity-60"
                disabled={isLoading}
                required
              />
              
              {error && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-full p-3 mb-5 text-red-200 text-sm backdrop-blur-sm">
                  {error}
                </div>
              )}

            <button 
                type="submit"
                className="w-full h-14 rounded-full font-bold bg-[#1E437B] border-none text-base tracking-wider shadow-lg text-white cursor-pointer transition-colors hover:bg-[#15325d] disabled:opacity-60 disabled:cursor-not-allowed mb-4"
                disabled={isLoading}
            >
                {isLoading ? 'SENDING...' : 'SEND RESET LINK'}
            </button>
            </form>
            
            <div className="text-center mt-4">
              <button onClick={onClose} className="text-white/80 no-underline text-sm cursor-pointer hover:text-white hover:underline">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 border border-green-400/30">
                <svg className="w-10 h-10 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-center text-white mb-4 font-bold text-2xl">
                Check Your Email
              </h2>
              <p className="text-white/80 text-sm mb-2">
                We've sent a password reset link to
              </p>
              <p className="text-white font-semibold mb-6">{email}</p>
            </div>
            
            <button
              onClick={onClose}
              className="w-full h-14 rounded-full font-bold bg-[#1E437B] border-none text-base tracking-wider shadow-lg text-white cursor-pointer transition-colors hover:bg-[#15325d]"
            >
              CLOSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const LoginPage = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

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
        
        // Redirect to the actual redirected URL instead of hardcoding /dashboard
        window.location.href = response.url || '/dashboard';
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const openForgotPasswordModal = (e) => {
    e.preventDefault();
    setShowModal(true);
    setResetSuccess(false);
    setModalError('');
    setForgotEmail('');
  };

  const closeForgotPasswordModal = () => {
    setShowModal(false);
    setForgotEmail('');
    setResetSuccess(false);
    setModalError('');
  };

  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    
    if (!forgotEmail.trim()) {
      setModalError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setModalError('Please enter a valid email address');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null;
      
      if (!csrfToken) {
        const tokenResponse = await fetch('/csrf-token', {
          credentials: 'same-origin'
        });
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          csrfToken = tokenData.csrf_token;
        }
      }

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setResetSuccess(true);
      } else {
        if (response.status === 429) {
          setModalError('Too many password reset attempts. Please wait before trying again.');
        } else {
          setModalError(data.message || 'Failed to send reset link');
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setModalError('Network error. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <div 
        className="min-h-screen flex justify-end items-center m-0 p-0"
        style={{
          backgroundImage: "url('/images/New BG.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="bg-white/10 rounded-3xl p-10 w-[420px] mr-[8%] mt-[5%] text-center">
          {errors.general && <ErrorMessage message={errors.general} />}

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <input
              type="text"
              className="w-full h-14 rounded-full px-5 mb-5 border-none bg-[#f1f6ff] text-base shadow-md outline-none focus:shadow-lg disabled:opacity-60"
              name="email"
              placeholder="User ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              required
            />
            
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              showPassword={showPassword}
              onTogglePassword={togglePasswordVisibility}
            />

            <button
              type="submit"
              className="w-full h-14 rounded-full font-bold bg-[#1E437B] border-none text-base tracking-wider shadow-lg text-white cursor-pointer transition-colors hover:bg-[#15325d] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>

            <div className="text-center mt-4">
              <a 
                onClick={openForgotPasswordModal}
                className="text-[#1E437B] no-underline text-sm font-medium cursor-pointer hover:underline"
              >
                Forgot Password?
              </a>
            </div>
          </form>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showModal}
        onClose={closeForgotPasswordModal}
        email={forgotEmail}
        onEmailChange={(e) => setForgotEmail(e.target.value)}
        onSendReset={handleForgotPassword}
        isLoading={modalLoading}
        error={modalError}
        success={resetSuccess}
      />
    </>
  );
};

export default LoginPage;
