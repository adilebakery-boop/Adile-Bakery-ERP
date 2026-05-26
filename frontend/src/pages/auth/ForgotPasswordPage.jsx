import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { safeCall } from '../../utils/normalizeApiResponse';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(300);
  const resendTimerRef = useRef(null);
  const otpExpiryRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => navigate('/login'), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, navigate]);

  useEffect(() => {
    if (step === 2) {
      setResendCooldown(60);
      resendTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(resendTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(resendTimerRef.current);
    }
    return () => clearInterval(resendTimerRef.current);
  }, [step]);

  useEffect(() => {
    if (step === 2) {
      setOtpExpiry(300);
      otpExpiryRef.current = setInterval(() => {
        setOtpExpiry((prev) => {
          if (prev <= 1) {
            clearInterval(otpExpiryRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(otpExpiryRef.current);
    }
    return () => clearInterval(otpExpiryRef.current);
  }, [step]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await safeCall(api.post('/auth/forgot-password', { email }));
    setIsLoading(false);
    if (result.success) {
      setStep(2);
    } else {
      setError(result.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await safeCall(api.post('/auth/verify-otp', { email, otp }));
    setIsLoading(false);
    if (result.success) {
      setStep(3);
    } else {
      setError(result.message || 'Invalid OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setResendSuccess('');
    setIsLoading(true);
    const result = await safeCall(api.post('/auth/forgot-password', { email }));
    setIsLoading(false);
    if (result.success) {
      setResendSuccess('A new OTP has been sent');
      setOtp('');
      setOtpExpiry(300);
      clearInterval(otpExpiryRef.current);
      otpExpiryRef.current = setInterval(() => {
        setOtpExpiry((prev) => {
          if (prev <= 1) {
            clearInterval(otpExpiryRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setResendCooldown(60);
      resendTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(resendTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError(result.message || 'Failed to resend OTP. Please try again.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const result = await safeCall(api.post('/auth/reset-password', { email, otp, newPassword }));
    setIsLoading(false);
    if (result.success) {
      setSuccessMessage('Password reset successfully! Redirecting to login...');
    } else {
      setError(result.message || 'Failed to reset password. Please try again.');
    }
  };

  const stepIndicator = (current) => (
    <div className="text-center mb-8">
      <span className="text-sm font-medium text-gray-400">Step {current} of 3</span>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80")' }}>
        <div className="w-full bg-black/40 flex items-center justify-center">
          <div className="text-white text-center p-8">
            <h2 className="text-3xl font-bold mb-2">Adile Bakery</h2>
            <p className="text-white/90">Management System</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 bg-[#F9F7F2]">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-[#001F3F] rounded-[16px] flex items-center justify-center">
              <span className="text-4xl">🥐</span>
            </div>
          </div>

          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {successMessage}
            </div>
          )}

          {!successMessage && (
            <>
              {stepIndicator(step)}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {step === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
                        placeholder="Enter your email"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#001F3F] text-white py-4 rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        Send OTP
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <div className="text-center">
                    <Link to="/login" className="text-sm text-[#001F3F] hover:underline">Back to Login</Link>
                  </div>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    A 6-digit OTP has been sent to {email}
                  </div>
                  <div className={`text-center text-sm font-medium ${otpExpiry === 0 ? 'text-red-600' : otpExpiry <= 60 ? 'text-red-500' : 'text-gray-500'}`}>
                    {otpExpiry > 0
                      ? `OTP expires in ${Math.floor(otpExpiry / 60)}:${String(otpExpiry % 60).padStart(2, '0')}`
                      : 'OTP has expired. Please request a new one.'}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OTP Code</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full px-4 py-4 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm text-center text-2xl font-bold tracking-[0.5em]"
                        placeholder="000000"
                        maxLength={6}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  {resendSuccess && (
                    <div className="text-sm text-green-600 text-center">{resendSuccess}</div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isLoading}
                      className="text-sm text-[#001F3F] hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || otp.length !== 6}
                      className="flex-1 bg-[#001F3F] text-white py-4 rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify OTP
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm text-[#001F3F] hover:underline inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back to email
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
                        placeholder="Enter new password"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
                        placeholder="Confirm new password"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#001F3F] text-white py-4 rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-sm text-[#001F3F] hover:underline inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back to OTP
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
