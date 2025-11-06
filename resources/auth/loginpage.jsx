import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const LoginPage = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

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
      let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null;
      
      if (!csrfToken) {
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

      const formData = new FormData();
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('_token', csrfToken);

      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: formData,
      });

      if (response.redirected || response.status === 302) {
        console.log('Login successful - redirected to dashboard');
        window.location.href = response.url || '/dashboard';
        return;
      }
      
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
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
    e.preventDefault();
    
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
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setResetSuccess(true);
      } else {
        setModalError(data.message || 'Failed to send reset link');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setModalError('Network error. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-end bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/New BG.jpg')" }}
    >
      {/* Login Box */}
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-10 w-full max-w-md mr-[8%] mt-[5%] text-center">
        {/* Error Message */}
        {errors.general && (
          <div className="bg-red-100/10 border border-red-300/30 rounded-xl p-3 mb-5 text-red-600 text-sm">
            {errors.general}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Email Input */}
          <input
            type="text"
            name="email"
            placeholder="User ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            required
            className="w-full h-14 rounded-full px-5 mb-5 border-none bg-[#f1f6ff] text-base shadow-md outline-none focus:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
          />
          
          {/* Password Input */}
          <div className="relative mb-5">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              required
              className="w-full h-14 rounded-full px-5 pr-12 border-none bg-[#f1f6ff] text-base shadow-md outline-none focus:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-5 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600 hover:text-[#1E437B] bg-transparent border-none p-0 z-10 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right mt-2.5 mb-5">
            <a 
              onClick={openForgotPasswordModal}
              className="text-[#1E437B] no-underline text-sm font-medium cursor-pointer hover:underline"
            >
              Forgot Password?
            </a>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 rounded-full font-bold bg-[#1E437B] border-none text-base tracking-wider shadow-lg text-white cursor-pointer transition-colors hover:bg-[#15325d] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[1000] flex justify-center items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeForgotPasswordModal();
            }
          }}
        >
          <div className="bg-white rounded-3xl p-10 w-[90%] max-w-[550px] shadow-2xl relative">
            {!resetSuccess ? (
              <>
                <h2 className="text-center text-gray-800 mb-8 font-semibold text-3xl">
                  Forgot Password
                </h2>
                
                <form onSubmit={handleForgotPassword}>
                  <label 
                    htmlFor="reset-email"
                    className="block text-gray-800 font-semibold mb-2.5 text-base text-left"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="reset-email"
                    placeholder="Enter your email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full p-4 px-5 rounded-xl border border-gray-300 text-base mb-5 box-border font-sans placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5b4cff]"
                    disabled={modalLoading}
                  />
                  
                  {modalError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-red-700 text-sm">
                      {modalError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={modalLoading}
                    className="w-full py-3 px-5 rounded-xl font-bold text-base border-none cursor-pointer transition-all bg-[#5b4cff] text-white hover:bg-[#4a3dd6] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {modalLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
                
                <div className="text-center mt-4">
                  <button
                    onClick={closeForgotPasswordModal}
                    className="text-[#5b4cff] no-underline text-base cursor-pointer hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-center text-gray-800 mb-4 font-semibold text-2xl">
                    Check Your Email
                  </h2>
                  <p className="text-gray-600 text-base">
                    We've sent a password reset link to <span className="font-semibold">{forgotEmail}</span>
                  </p>
                </div>
                
                <button
                  onClick={closeForgotPasswordModal}
                  className="w-full py-3 px-5 rounded-xl font-bold text-base border-none cursor-pointer transition-all bg-[#5b4cff] text-white hover:bg-[#4a3dd6]"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
