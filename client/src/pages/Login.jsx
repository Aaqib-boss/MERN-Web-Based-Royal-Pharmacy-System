import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { Sun, Moon, Loader2, KeyRound, Mail, Lock, Eye, EyeOff, User, Phone, MapPin } from 'lucide-react';
import Logo from '../components/Logo';

const Login = () => {
  const { login, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Reset token from URL query
  const resetToken = searchParams.get('token');

  // Form states - Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Toggle states
  const [isForgot, setIsForgot] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // Form states - Forgot Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);

  // Form states - Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form states - Create Account (Registration)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');

  useEffect(() => {
    // If already logged in, redirect to return page
    if (user) {
      navigate('/return');
    }
  }, [user, navigate]);

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Successfully logged in!');
      navigate('/return');
    } else {
      toast.error(result.message);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.warning('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success(data.message || 'Recovery link and OTP sent to your email!');
      setIsOtpSent(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sending recovery link');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password Submit (Verifies OTP + resets password)
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      toast.warning('Please fill in all fields');
      return;
    }
    if (otp.length !== 6) {
      toast.error('OTP verification code must be exactly 6 digits');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length !== 6) {
      toast.error('Password must be exactly 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        token: resetToken || undefined,
        email: forgotEmail || undefined,
        otp,
        password: newPassword,
      });
      toast.success(data.message || 'Password reset successfully! Please login.');
      setIsForgot(false);
      setIsOtpSent(false);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password. OTP may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register (Create Account) Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!firstName || !lastName || !regEmail || !regPhone || !regAddress || !regPassword) {
      toast.warning('Please fill in all fields');
      return;
    }

    if (regPhone.length !== 10) {
      toast.error('Contact number must be exactly 10 digits');
      return;
    }

    if (regPassword.length !== 6) {
      toast.error('Password must be exactly 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: `${firstName} ${lastName}`,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        address: regAddress,
      });
      toast.success('Account created successfully! Please login.');
      setIsRegister(false);
      // Auto-populate login email
      setEmail(regEmail);
      // Reset registration form
      setFirstName('');
      setLastName('');
      setRegEmail('');
      setRegPhone('');
      setRegAddress('');
      setRegPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative transition-colors duration-350 bg-cover bg-center"
      style={{ backgroundImage: "url('/pharmacy_bg.png')" }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-[3px] z-0"></div>

      {/* Top Navbar */}
      <header className="absolute top-0 left-0 w-full z-10 bg-slate-900/10 dark:bg-black/15 py-4 px-6 md:px-12 flex justify-between items-center border-b border-white/5 backdrop-blur-md">
        <Logo variant="horizontal" iconSize="sm" lightText={true} />
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-xl bg-white/15 border border-white/20 text-white hover:bg-white/30 transition-all duration-200"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-white" />}
        </button>
      </header>

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 z-10 mt-16 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Header */}
        <div className="mb-8">
          <Logo variant="vertical" iconSize="lg" lightText={true} />
        </div>

        {/* 1. RESET PASSWORD VIEW (WITH OTP VERIFICATION) */}
        {resetToken || isOtpSent ? (
          <form onSubmit={handleResetSubmit} className="space-y-5">
            <h2 className="text-xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">
              Reset Your Password
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-6 leading-relaxed">
              Enter the OTP verification code sent to your email and your new 6-character password below.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                OTP Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200"
                />
                <KeyRound className="w-4.5 h-4.5 absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Exactly 6 characters"
                  maxLength={6}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200"
                />
                <Lock className="w-4.5 h-4.5 absolute left-3 top-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-655"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm 6 characters"
                  maxLength={6}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200"
                />
                <Lock className="w-4.5 h-4.5 absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-primary to-primary-emerald text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] hover:shadow-primary/20 transition-all duration-150 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <KeyRound className="w-5 h-5 mr-2" />}
              Reset Password
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgot(false);
                  setIsOtpSent(false);
                  setOtp('');
                  setNewPassword('');
                  setConfirmPassword('');
                  navigate('/login');
                }}
                className="text-sm text-primary dark:text-primary-emerald font-semibold hover:opacity-85 transition-opacity no-underline hover:no-underline focus:no-underline active:no-underline focus:outline-none"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : isForgot ? (
          /* 2. FORGOT PASSWORD VIEW (EMAIL INPUT) */
          <form onSubmit={handleForgotSubmit} className="space-y-5">
            <h2 className="text-xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">
              Forgot Password?
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-6 leading-relaxed">
              Enter your registered email address and we'll send a recovery link and OTP verification code to your email address.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200"
                />
                <Mail className="w-4.5 h-4.5 absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-primary to-primary-emerald text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] hover:shadow-primary/20 transition-all duration-150 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Mail className="w-5 h-5 mr-2" />}
              Send Recovery Link
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsForgot(false)}
                className="text-sm text-primary dark:text-primary-emerald font-semibold hover:opacity-85 transition-opacity no-underline hover:no-underline focus:no-underline active:no-underline focus:outline-none"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : isRegister ? (
          /* 3. CREATE ACCOUNT (REGISTRATION) VIEW */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-slate-800 dark:text-slate-200 mb-2">
              Create Account
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                />
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Contact Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0774563201"
                  maxLength={10}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                />
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="e.g. 123 Wellness Ave, NY"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                />
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Exactly 6 characters"
                  maxLength={6}
                  className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                />
                <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-655"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 bg-gradient-to-r from-primary to-primary-emerald text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] hover:shadow-primary/20 transition-all duration-150 disabled:opacity-50 text-sm mt-2"
            >
              {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin mr-2" /> : <KeyRound className="w-4.5 h-4.5 mr-2" />}
              Create Account
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="text-xs text-primary dark:text-primary-emerald font-semibold hover:opacity-85 transition-opacity no-underline hover:no-underline focus:no-underline active:no-underline focus:outline-none"
              >
                Already have an account? Login
              </button>
            </div>
          </form>
        ) : (
          /* 4. STANDARD LOGIN VIEW */
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-405 focus-glow transition-all duration-200"
                />
                <Mail className="w-4.5 h-4.5 absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgot(true)}
                  className="text-xs text-primary dark:text-primary-emerald font-semibold hover:opacity-80 active:scale-95 transition-all no-underline hover:no-underline focus:no-underline active:no-underline focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 characters"
                  maxLength={6}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200"
                />
                <Lock className="w-4.5 h-4.5 absolute left-3 top-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember_me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary dark:focus:ring-primary-emerald focus:ring-2 dark:bg-darkBg-card dark:border-emerald-950/40"
              />
              <label htmlFor="remember_me" className="ml-2.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                Remember Me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-primary to-primary-emerald text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] hover:shadow-primary/20 transition-all duration-150 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <KeyRound className="w-5 h-5 mr-2" />}
              Access System
            </button>

            {/* Create Account Option */}
            <div className="text-center pt-2 border-t border-slate-200 dark:border-emerald-950/10 mt-4">
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-xs text-primary dark:text-primary-emerald font-bold hover:opacity-80 active:scale-95 transition-all no-underline hover:no-underline focus:no-underline active:no-underline focus:outline-none"
              >
                Don't have an account? Create Account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
