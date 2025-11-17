import React, { useState } from 'react';

// Error Message Component
const ErrorMessage = ({ message }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-red-700 text-sm">
    {message}
  </div>
);

// Password Input Component
const PasswordInput = ({ value, onChange, onKeyPress, disabled, showPassword, onTogglePassword, error, onBlur }) => (
  <div className="relative mb-5">
    <input
      type={showPassword ? 'text' : 'password'}
      className={`w-full h-14 rounded-full px-5 border-none bg-[#f1f6ff] text-base shadow-md outline-none focus:shadow-lg disabled:opacity-60 ${error ? 'border-2 border-red-500 bg-red-50' : ''
        }`}
      id="password"
      name="password"
      placeholder="Password"
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      onBlur={onBlur}
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
    {error && (
      <p className="text-red-600 text-xs mt-1 ml-5">{error}</p>
    )}
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

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    if (name === 'email') {
      if (!value.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        newErrors.email = 'Please enter a valid email address';
      } else {
        delete newErrors.email;
      }
    }

    if (name === 'password') {
      if (!value) {
        newErrors.password = 'Password is required';
      } else if (value.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else {
        delete newErrors.password;
      }
    }

    setErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Validate form before submission
    const validation = validateForm();
    if (!validation.isValid) {
      // Focus on first error field
      if (validation.errors.email) {
        document.querySelector('input[name="email"]')?.focus();
      } else if (validation.errors.password) {
        document.querySelector('input[name="password"]')?.focus();
      }
      return;
    }

    setIsLoading(true);
    // Clear field errors but keep general errors if any
    setErrors(prev => ({ general: prev.general || null }));

    try {
      // Helper function to fetch fresh CSRF token
      const fetchCsrfToken = async () => {
        try {
          const tokenResponse = await fetch('/csrf-token', {
            credentials: 'same-origin',
            method: 'GET',
          });
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            const token = tokenData.csrf_token;
            // Update meta tag with fresh token
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            if (metaTag) {
              metaTag.setAttribute('content', token);
            }
            return token;
          }
        } catch (err) {
          console.error('Failed to fetch CSRF token:', err);
        }
        return null;
      };

      // Always fetch a fresh CSRF token to avoid expired token issues
      let csrfToken = await fetchCsrfToken();
      
      // Fallback to meta tag if fetch fails
      if (!csrfToken) {
        csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null;
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
          'Accept': 'application/json',
        },
        credentials: 'same-origin', // Include cookies for session authentication
        body: formData,
      });

      // Handle 419 CSRF token mismatch - retry with fresh token
      if (response.status === 419) {
        console.log('CSRF token expired, fetching fresh token and retrying...');
        // Fetch a fresh token and retry once
        csrfToken = await fetchCsrfToken();
        if (csrfToken) {
          // Update form data with new token
          formData.set('_token', csrfToken);
          
          const retryResponse = await fetch('/login', {
            method: 'POST',
            headers: {
              'X-CSRF-TOKEN': csrfToken,
              'Accept': 'application/json',
            },
            credentials: 'same-origin',
            body: formData,
          });

          // Process retry response
          if (retryResponse.redirected || retryResponse.status === 302) {
            console.log('Login successful - redirected to dashboard');
            window.location.href = retryResponse.url || '/dashboard';
            return;
          }

          // If still 419, show error
          if (retryResponse.status === 419) {
            setErrors({ general: 'Session expired. Please refresh the page and try again.' });
            return;
          }

          // Continue processing retry response
          const contentType = retryResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              const retryData = await retryResponse.json();
              if (retryResponse.ok && retryData.success) {
                if (retryData.user) {
                  localStorage.setItem('user', JSON.stringify(retryData.user));
                  window.dispatchEvent(new CustomEvent('userDataUpdated'));
                }
                onAuthSuccess();
                return;
              } else {
                const errorMessage = retryData.message || retryData.error || 'Wrong email or password. Please try again.';
                setErrors({ general: errorMessage });
                return;
              }
            } catch (parseError) {
              setErrors({ general: 'Wrong email or password. Please try again.' });
              return;
            }
          }
        } else {
          setErrors({ general: 'Session expired. Please refresh the page and try again.' });
          return;
        }
      }

      // Check if the response is a redirect (status 302) - means login was successful
      if (response.redirected || response.status === 302) {
        // Login was successful and we were redirected
        console.log('Login successful - redirected to dashboard');

        // Redirect to the actual redirected URL instead of hardcoding /dashboard
        window.location.href = response.url || '/dashboard';
        return;
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (parseError) {
          // If JSON parsing fails, treat as authentication error
          setErrors({ general: 'Wrong email or password. Please try again.' });
          return;
        }
      } else {
        // If not JSON, it's likely an HTML error page or validation error
        // Check for common error status codes
        if (response.status === 422 || response.status === 401 || response.status === 403) {
          setErrors({ general: 'Wrong email or password. Please try again.' });
          return;
        }

        // For other non-JSON responses, show generic error
        setErrors({ general: 'Wrong email or password. Please try again.' });
        return;
      }

      // Handle JSON response
      if (response.ok && data.success) {
        // Store user data in localStorage for frontend use
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          // Dispatch custom event to notify sidebar and other components
          window.dispatchEvent(new CustomEvent('userDataUpdated'));
        }

        onAuthSuccess();
      } else {
        // Show appropriate error message
        const errorMessage = data.message || data.error || 'Wrong email or password. Please try again.';
        setErrors({ general: errorMessage });
      }
    } catch (error) {
      console.error('Login error:', error);

      // Check if it's a JSON parse error (likely means server returned HTML error page)
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        setErrors({ general: 'Wrong email or password. Please try again.' });
      } else {
        setErrors({ general: 'Network error. Please check your connection and try again.' });
      }
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
            <div className="mb-5">
              <input
                type="email"
                className={`w-full h-14 rounded-full px-5 border-none bg-[#f1f6ff] text-base shadow-md outline-none focus:shadow-lg disabled:opacity-60 ${errors.email ? 'border-2 border-red-500 bg-red-50' : ''
                  }`}
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    validateField('email', e.target.value);
                  }
                  if (errors.general) {
                    setErrors(prev => ({ ...prev, general: null }));
                  }
                }}
                onBlur={(e) => validateField('email', e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                required
              />
              {errors.email && (
                <p className="text-red-600 text-xs mt-1 ml-5">{errors.email}</p>
              )}
            </div>

            <PasswordInput
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  validateField('password', e.target.value);
                }
                if (errors.general) {
                  setErrors(prev => ({ ...prev, general: null }));
                }
              }}
              onBlur={(e) => validateField('password', e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              showPassword={showPassword}
              onTogglePassword={togglePasswordVisibility}
              error={errors.password}
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
