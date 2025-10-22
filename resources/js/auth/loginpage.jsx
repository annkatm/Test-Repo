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
  step, 
  username, 
  message, 
  onUsernameChange, 
  onMessageChange, 
  onGoToStep1, 
  onGoToStep2, 
  onSendMessage 
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
      <div className="bg-white rounded-3xl p-10 w-[90%] max-w-[550px] shadow-2xl">
        {step === 1 ? (
          <div>
            <h2 className="text-center text-gray-800 mb-8 font-semibold text-3xl">Forgot Password</h2>
            <label htmlFor="username" className="block text-gray-800 font-semibold mb-2.5 text-base text-left">
              Username
            </label>
            <input
              type="text"
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={onUsernameChange}
              className="w-full p-4 rounded-xl border border-gray-300 text-base mb-5 box-border font-sans"
            />
            <button 
              className="w-full py-3 px-5 rounded-xl font-bold text-[15px] border-none cursor-pointer transition-all bg-[#5b4cff] text-white mb-4 hover:bg-[#4a3dd6]"
              onClick={onGoToStep2}
            >
              Send Inquiry
            </button>
            <div className="text-center mt-4">
              <a onClick={onGoToStep2} className="text-[#5b4cff] no-underline text-[15px] cursor-pointer hover:underline">
                Other Concern?
              </a>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-center text-gray-800 mb-8 font-semibold text-3xl">Forgot Password</h2>
            <label htmlFor="message" className="block text-gray-800 font-semibold mb-2.5 text-base text-left">
              Your Message
            </label>
            <textarea
              id="message"
              placeholder="Write your concern here..."
              value={message}
              onChange={onMessageChange}
              className="w-full p-4 rounded-xl border border-gray-300 text-base mb-5 box-border font-sans min-h-[120px] resize-y"
            />
            <div className="flex gap-4 mt-5">
              <button 
                className="bg-white text-gray-800 w-auto py-3 px-6 rounded-xl font-bold text-[15px] border border-gray-300 cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-400"
                onClick={onGoToStep1}
              >
                Back
              </button>
              <button
                className="flex-1 py-3 px-5 rounded-xl font-bold text-[15px] border-none cursor-pointer transition-all bg-[#5b4cff] text-white hover:bg-[#4a3dd6]"
                onClick={onSendMessage}
              >
                Send Message
              </button>
            </div>
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
        step={modalStep}
        username={forgotUsername}
        message={forgotMessage}
        onUsernameChange={(e) => setForgotUsername(e.target.value)}
        onMessageChange={(e) => setForgotMessage(e.target.value)}
        onGoToStep1={goToStep1}
        onGoToStep2={goToStep2}
        onSendMessage={sendForgotPasswordMessage}
      />
    </>
  );
};

export default LoginPage;
