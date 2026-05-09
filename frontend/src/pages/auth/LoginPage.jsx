import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import authService from '../../services/authService';

export default function LoginPage() {
  const [role, setRole] = useState('manager');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await authService.login({
      username,
      password,
      role: role.toUpperCase(),
    });

    setIsLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80")' }}>
        <div className="w-full bg-black/40 flex items-center justify-center">
          <div className="text-white text-center p-8">
            <h2 className="text-3xl font-bold mb-2">Adile Bakery</h2>
            <p className="text-white/90">Management System</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 bg-[#F9F7F2]">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-[#001F3F] rounded-[16px] flex items-center justify-center">
              <span className="text-4xl">🥐</span>
            </div>
          </div>

          {/* Role Toggle */}
          <div className="flex bg-[#F9F7F2] rounded-[50px] p-1 mb-8">
            <button
              type="button"
              onClick={() => setRole('manager')}
              className={`flex-1 py-3 px-4 rounded-[40px] text-sm font-medium transition-all ${
                role === 'manager' ? 'bg-white text-[#001F3F] shadow-sm' : 'text-gray-500'
              }`}
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => setRole('staff')}
              className={`flex-1 py-3 px-4 rounded-[40px] text-sm font-medium transition-all ${
                role === 'staff' ? 'bg-white text-[#001F3F] shadow-sm' : 'text-gray-500'
              }`}
            >
              Staff
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username / የተጠቃሚ ስም
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
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
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
                  placeholder="Enter password"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#001F3F] focus:ring-[#001F3F]" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-[#001F3F] hover:underline">Forgot password?</a>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#001F3F] text-white py-4 rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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