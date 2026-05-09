import { useState } from 'react';
import { User, Eye, EyeOff, Lock } from 'lucide-react';

export default function ProfilePage() {
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const user = {
    name: 'Admin User',
    email: 'admin@adile.com',
    role: 'Manager',
  };

  const togglePassword = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Password change:', passwords);
  };

  return (
    <div>
      <h1 className="text-[32px] font-bold text-[#001F3F] mb-8">Profile Settings</h1>

      {/* Account Overview Card */}
      <div className="bg-white rounded-[24px] p-6 mb-8 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-[#001F3F]" />
          <h2 className="text-xl font-semibold text-[#001F3F]">Account Overview</h2>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-4 border-b border-[#E5E1D8]">
            <span className="text-sm text-gray-500 min-w-[80px]">Name</span>
            <span className="text-[#001F3F] font-medium">{user.name}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-4 border-b border-[#E5E1D8]">
            <span className="text-sm text-gray-500 min-w-[80px]">Email</span>
            <span className="text-[#001F3F]">{user.email}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
            <span className="text-sm text-gray-500 min-w-[80px]">Role</span>
            <span className="px-3 py-1 bg-[#001F3F] text-white text-xs font-medium rounded-full inline-block w-fit">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-[24px] p-6 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-5 h-5 text-[#001F3F]" />
          <h2 className="text-xl font-semibold text-[#001F3F]">Change Password</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={passwords.currentPassword}
                onChange={handlePasswordChange}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => togglePassword('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001F3F]"
              >
                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={passwords.newPassword}
                onChange={handlePasswordChange}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => togglePassword('new')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001F3F]"
              >
                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => togglePassword('confirm')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#001F3F]"
              >
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}