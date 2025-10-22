import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const LoginPage = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

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
    setModalStep(1);
  };

  const closeForgotPasswordModal = () => {
    setShowModal(false);
    setForgotUsername('');
    setForgotMessage('');
    setModalStep(1);
  };

  const goToStep2 = () => {
    setModalStep(2);
  };

  const goToStep1 = () => {
    setModalStep(1);
  };

  const sendForgotPasswordMessage = () => {
    if (!forgotMessage.trim()) {
      alert('Please write your concern.');
      return;
    }
    // Here you can add API call to send the message
    alert('Your message has been sent! We will contact you soon.');
    closeForgotPasswordModal();
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
            {/* Step 1: Username */}
            {modalStep === 1 && (
              <div>
                <h2 className="text-center text-gray-800 mb-8 font-semibold text-3xl">
                  Forgot Password
                </h2>
                <label 
                  htmlFor="username"
                  className="block text-gray-800 font-semibold mb-2.5 text-base text-left"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  placeholder="Enter your username"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  className="w-full p-4 px-5 rounded-xl border border-gray-300 text-base mb-5 box-border font-sans placeholder:text-gray-400"
                />
                <button 
                  onClick={goToStep2}
                  className="w-full py-3 px-5 rounded-xl font-bold text-base border-none cursor-pointer transition-all bg-[#5b4cff] text-white mb-4 hover:bg-[#4a3dd6]"
                >
                  Send Inquiry
                </button>
                <div className="text-center mt-4">
                  <a 
                    onClick={goToStep2}
                    className="text-[#5b4cff] no-underline text-base cursor-pointer hover:underline"
                  >
                    Other Concern?
                  </a>
                </div>
              </div>
            )}

            {/* Step 2: Message */}
            {modalStep === 2 && (
              <div>
                <h2 className="text-center text-gray-800 mb-8 font-semibold text-3xl">
                  Forgot Password
                </h2>
                <label 
                  htmlFor="message"
                  className="block text-gray-800 font-semibold mb-2.5 text-base text-left"
                >
                  Your Message
                </label>
                <textarea
                  id="message"
                  placeholder="Write your concern here..."
                  value={forgotMessage}
                  onChange={(e) => setForgotMessage(e.target.value)}
                  className="w-full p-4 px-5 rounded-xl border border-gray-300 text-base mb-5 box-border font-sans min-h-[120px] resize-y placeholder:text-gray-400"
                />
                <div className="flex gap-4 mt-5">
                  <button 
                    onClick={goToStep1}
                    className="py-3 px-6 rounded-xl font-bold text-base border border-gray-300 cursor-pointer transition-all bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-400"
                  >
                    Back
                  </button>
                  <button
                    onClick={sendForgotPasswordMessage}
                    className="flex-1 py-3 px-5 rounded-xl font-bold text-base border-none cursor-pointer transition-all bg-[#5b4cff] text-white hover:bg-[#4a3dd6]"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;