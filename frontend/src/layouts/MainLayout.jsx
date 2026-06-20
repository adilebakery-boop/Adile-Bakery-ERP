import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Factory, Package, FileText, ShoppingBag, Store, Users, LogOut, Menu, X, Globe, User, Sun, Moon, Trash2, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import authService from '../services/authService';
import { getUserRole, getUser } from '../utils/authUtils';
import { getPagesForRole, PAGES } from '../utils/permissions';
import { queryClient } from '../providers/QueryProvider';

export default function MainLayout() {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [themeKey, setThemeKey] = useState(0);
  const navigate = useNavigate();
  const userRole = getUserRole();
  const user = getUser();

  // Initialize dark mode on mount
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Force re-render
    setThemeKey(prev => prev + 1);
  };
  
  const allowedPages = getPagesForRole(userRole);
  const transfersEnabled = import.meta.env.VITE_FEATURE_TRANSFERS === 'true';

  const allNavItems = [
    { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, page: PAGES.DASHBOARD },
    { path: '/production', labelKey: 'nav.production', icon: Factory, page: PAGES.PRODUCTION },
    { path: '/remaining', labelKey: 'nav.remaining', icon: Package, page: PAGES.REMAINING },
    { path: '/reports', labelKey: 'nav.reports', icon: FileText, page: PAGES.REPORTS },
    { path: '/waste', labelKey: 'nav.waste', icon: Trash2, page: PAGES.WASTE },
    { path: '/products', labelKey: 'nav.products', icon: ShoppingBag, page: PAGES.PRODUCTS },
    { path: '/branches', labelKey: 'nav.branches', icon: Store, page: PAGES.BRANCHES },
    { path: '/users', labelKey: 'nav.users', icon: Users, page: PAGES.USERS },
    { path: '/transfers', labelKey: 'nav.transfers', icon: ArrowLeftRight, page: PAGES.TRANSFERS },
    { path: '/profile', labelKey: 'nav.profile', icon: User, page: PAGES.PROFILE },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.page === PAGES.TRANSFERS && !transfersEnabled) return false;
    return allowedPages.includes(item.page);
  });

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'am', label: 'AM' },
  ];

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const handleLogout = async () => {
    queryClient.clear();
    await authService.logout();
    navigate('/login');
  };

  const getUserDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.username) return user.username;
    return 'User';
  };

  const getUserInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    return 'U';
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-white dark:bg-[#12262A]">
      <div className="h-16 flex items-center justify-center border-b border-[#E5E1D8] dark:border-[#1E3A3F] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#4CB094] rounded-lg flex items-center justify-center">
            <span className="text-lg">🥐</span>
          </div>
          <span className="text-lg font-bold text-[#024A5B] dark:text-white">Adile Bakery</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-[#4CB094] text-[#002830]' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F]'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
      
      {/* Language Toggle - pushed to bottom with mt-auto */}
      <div className="mt-auto mb-5 px-4 shrink-0">
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="w-full py-2 px-3 bg-transparent border border-[#E5E1D8] dark:border-[#1E3A3F] text-[#024A5B] dark:text-gray-300 rounded-full flex items-center justify-center gap-2 transition-colors hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F]"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="font-medium text-xs">{languages.find(l => l.code === language)?.label}</span>
          </button>
          {langMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#12262A] rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] overflow-hidden">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    localStorage.setItem('language', lang.code);
                    i18n.changeLanguage(lang.code);
                    setLangMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] transition-colors ${
                    language === lang.code ? 'text-[#024A5B] dark:text-white font-medium' : 'text-gray-600 dark:text-gray-500'
                  }`}
                >
                  {lang.code === 'en' ? 'English' : 'አማርኛ'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Logout */}
      <div className="p-4 border-t border-[#E5E1D8] dark:border-[#1E3A3F] shrink-0">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-[#024A5B]/70 dark:text-gray-500 hover:text-[#024A5B] dark:hover:text-white hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] rounded-xl transition-colors flex items-center gap-3"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{t('logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#DFEDE2] flex">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden`}>
        {sidebarOpen && (
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#12262A] border-r border-[#E5E1D8] dark:border-[#1E3A3F]">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#024A5B] dark:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        )}
      </div>

      {/* Desktop Sidebar - Fixed/Sticky */}
      <aside className="hidden lg:block w-72 bg-white dark:bg-[#12262A] border-r border-[#E5E1D8] dark:border-[#1E3A3F] sticky top-0 h-screen overflow-hidden">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-[#12262A] border-b border-[#E5E1D8] dark:border-[#1E3A3F] flex items-center justify-between px-6 lg:px-8 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-[#024A5B] dark:text-white hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] px-3 py-2 rounded-lg transition-colors"
            >
              <span className="text-sm text-gray-600 dark:text-gray-300">{getUserDisplayName()}</span>
              <div className="w-8 h-8 bg-[#4CB094] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">{getUserInitial()}</span>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-[#DFEDE2] dark:bg-[#1a1410]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}