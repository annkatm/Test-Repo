import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

// Password Strength Indicator Component
const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&.]/.test(password)) score++;
    return score;
  };

  const strength = getStrength(password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center space-x-2 mb-1">
        <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${strengthColors[strength - 1] || 'bg-white/30'}`}
            style={{ width: `${(strength / 5) * 100}%` }}
          />
        </div>
        <span className="text-xs text-white/80 font-medium">
          {strengthLabels[strength - 1] || 'Very Weak'}
        </span>
      </div>
    </div>
  );
};

const ResetPassword = () => {
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      token: params.get('token'),
      email: params.get('email'),
    };
  };
  const [params, setParams] = useState(getUrlParams());
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urlParams = getUrlParams();
    setParams(urlParams);
    
    if (!urlParams.token || !urlParams.email) {
      setErrors({ general: 'Invalid reset link. Please request a new password reset.' });
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]+$/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    if (!passwordConfirmation) {
      newErrors.passwordConfirmation = 'Password confirmation is required';
    } else if (password !== passwordConfirmation) {
      newErrors.passwordConfirmation = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        }
      }

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          token: params.token,
          email: params.email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        setErrors({ general: data.message || 'Failed to reset password' });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex justify-end items-center m-0 p-0"
      style={{
        backgroundImage: "url('/images/New BG.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-10 w-[420px] mr-[8%] mt-[5%] text-center shadow-2xl">
        {success ? (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 border border-green-400/30">
              <CheckCircle className="w-10 h-10 text-green-300" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Password Reset Successful!</h2>
            <p className="text-white/80 mb-6 text-sm">
              Your password has been reset successfully. You will be redirected to the login page shortly.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full h-14 rounded-full font-bold bg-[#1E437B] border-none text-base tracking-wider shadow-lg text-white cursor-pointer transition-colors hover:bg-[#15325d]"
            >
              GO TO LOGIN PAGE
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-center text-white mb-2 font-bold text-3xl">
                Reset Password
              </h2>
              <p className="text-center text-white/80 text-sm">
                Enter your new password below
              </p>
            </div>

            {errors.general && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-full p-3 mb-5 text-red-200 text-sm backdrop-blur-sm">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* New Password */}
              <div className="mb-5">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 rounded-full px-5 pr-12 border-none bg-[#f1f6ff] text-base shadow-md outline-none focus:shadow-lg disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600 hover:text-[#1E437B] bg-transparent border-none p-0 z-10"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={password} />
                {errors.password && (
                  <p className="text-red-200 text-sm mt-1 text-left">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-5">
                <div className="relative">
                  <input
                    type={showPasswordConfirmation ? 'text' : 'password'}
                    id="passwordConfirmation"
                    placeholder="Confirm New Password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="w-full h-14 rounded-full px-5 pr-12 border-none bg-[#f1f6ff] text-base shadow-md outline-none focus:shadow-lg disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600 hover:text-[#1E437B] bg-transparent border-none p-0 z-10"
                  >
                    {showPasswordConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.passwordConfirmation && (
                  <p className="text-red-200 text-sm mt-1 text-left">{errors.passwordConfirmation}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-full font-bold bg-[#1E437B] border-none text-base tracking-wider shadow-lg text-white cursor-pointer transition-colors hover:bg-[#15325d] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'RESETTING PASSWORD...' : 'RESET PASSWORD'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

