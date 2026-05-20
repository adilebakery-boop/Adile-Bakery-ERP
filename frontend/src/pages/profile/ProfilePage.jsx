import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import { getUser } from '../../utils/authUtils';
import authService from '../../services/authService';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
  }, []);

  const togglePassword = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError(t('profile.passwordMismatch'));
      return;
    }
    if (passwords.newPassword.length < 6) {
      setError(t('profile.passwordMinLength'));
      return;
    }
    setLoading(true);
    setError('');
    const res = await authService.changePassword({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    });
    setLoading(false);
    if (res.success) {
      setSuccess(t('profile.passwordChangedSuccess'));
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setError(res.message || t('profile.passwordChangeFailed'));
    }
  };

  return (
    <div>
      <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white mb-8">{t('profile.title')}</h1>

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 mb-8 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-[#001F3F] dark:text-white" />
          <h2 className="text-xl font-semibold text-[#001F3F] dark:text-white">{t('profile.accountOverview')}</h2>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-4 border-b border-[#E5E1D8] dark:border-[#2d2d4a]">
            <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[80px]">{t('profile.name')}</span>
            <span className="text-[#001F3F] dark:text-white font-medium">{user?.name || '-'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-4 border-b border-[#E5E1D8] dark:border-[#2d2d4a]">
            <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[80px]">{t('profile.username')}</span>
            <span className="text-[#001F3F] dark:text-white">{user?.username || '-'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 pb-4 border-b border-[#E5E1D8] dark:border-[#2d2d4a]">
            <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[80px]">{t('profile.branch')}</span>
            <span className="text-[#001F3F] dark:text-white">{user?.branchName || '-'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
            <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[80px]">{t('profile.role')}</span>
            <span className="px-3 py-1 bg-[#001F3F] text-white text-xs font-medium rounded-full inline-block w-fit">
              {user?.role || '-'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-5 h-5 text-[#001F3F] dark:text-white" />
          <h2 className="text-xl font-semibold text-[#001F3F] dark:text-white">{t('profile.changePassword')}</h2>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('profile.currentPassword')}</label>
            <div className="relative">
              <input type={showPasswords.current ? 'text' : 'password'} name="currentPassword" value={passwords.currentPassword} onChange={handlePasswordChange} className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white" placeholder={t('profile.currentPasswordPlaceholder')} required />
              <button type="button" onClick={() => togglePassword('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-[#001F3F] dark:hover:text-white">
                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('profile.newPassword')}</label>
            <div className="relative">
              <input type={showPasswords.new ? 'text' : 'password'} name="newPassword" value={passwords.newPassword} onChange={handlePasswordChange} className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white" placeholder={t('profile.newPasswordPlaceholder')} required />
              <button type="button" onClick={() => togglePassword('new')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-[#001F3F] dark:hover:text-white">
                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('profile.confirmNewPassword')}</label>
            <div className="relative">
              <input type={showPasswords.confirm ? 'text' : 'password'} name="confirmPassword" value={passwords.confirmPassword} onChange={handlePasswordChange} className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white" placeholder={t('profile.confirmPasswordPlaceholder')} required />
              <button type="button" onClick={() => togglePassword('confirm')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-[#001F3F] dark:hover:text-white">
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full sm:w-auto px-8 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70 flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('profile.updatePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}