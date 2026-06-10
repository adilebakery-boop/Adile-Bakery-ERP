import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import authService from '../../services/authService';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  const [wasLockedOut, setWasLockedOut] = useState(false);
  const lockoutTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => clearInterval(lockoutTimerRef.current);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await authService.login({
      username,
      password,
    });

    setIsLoading(false);

    if (result.success) {
      setWasLockedOut(false);
      setLockoutCountdown(0);
      navigate('/dashboard');
    } else if (result.message && result.message.includes('Too many login attempts')) {
      setLockoutCountdown(60);
      setWasLockedOut(true);
      setError('');
      clearInterval(lockoutTimerRef.current);
      lockoutTimerRef.current = setInterval(() => {
        setLockoutCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(lockoutTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Hero Image */}
      <div className="hidden md:flex md:w-1/3 bg-cover bg-center bg-[#DFEDE2]" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80")' }}>
        <div className="w-full bg-black/40 flex items-center justify-center">
          <div className="text-white text-center p-8">
            <h2 className="text-3xl font-bold mb-2">Adile Bakery</h2>
            <p className="text-white/90">Management System</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 bg-[#DFEDE2]">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-[#4CB094] rounded-[16px] flex items-center justify-center">
              <span className="text-4xl">🥐</span>
            </div>
          </div>

          {/* Error Message */}
          {(error || lockoutCountdown > 0 || wasLockedOut) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {lockoutCountdown > 0
                ? `Too many login attempts. Try again in ${Math.floor(lockoutCountdown / 60)}:${String(lockoutCountdown % 60).padStart(2, '0')}`
                : wasLockedOut && lockoutCountdown === 0
                  ? 'You can try again now'
                  : error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username / የተጠቃሚ ስም
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
                  placeholder="Enter username"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password / የሚስጥር ቁስል
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
                  placeholder="Enter password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#024A5B] focus:ring-[#024A5B]" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-[#024A5B] hover:underline">Forgot password?</Link>
            </div>
            <button
              type="submit"
              disabled={isLoading || lockoutCountdown > 0}
              className="w-full bg-[#4CB094] text-[#002830] py-4 rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}