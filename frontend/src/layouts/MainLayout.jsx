import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Factory, Package, FileText, ShoppingBag, Store, Users, LogOut, Menu, X, Globe } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/production', label: 'Production', icon: Factory },
  { path: '/remaining', label: 'Remaining', icon: Package },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/products', label: 'Products', icon: ShoppingBag },
  { path: '/branches', label: 'Branches', icon: Store },
  { path: '/users', label: 'Users', icon: Users },
];

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'am', label: 'AM' },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-[#E5E1D8] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#001F3F] rounded-lg flex items-center justify-center">
            <span className="text-lg">🥐</span>
          </div>
          <span className="text-lg font-bold text-[#001F3F]">Adile Bakery</span>
        </div>
      </div>
      <nav className="p-4 space-y-1 shrink-0">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-[#001F3F] text-white' 
                  : 'text-[#001F3F]/70 hover:bg-[#F9F7F2]'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      {/* Language Toggle - pushed to bottom with mt-auto */}
      <div className="mt-auto mb-5 px-4">
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="w-full py-2 px-3 bg-transparent border border-[#E5E1D8] text-[#001F3F] rounded-full flex items-center justify-center gap-2 transition-colors hover:bg-[#F9F7F2]"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="font-medium text-xs">{languages.find(l => l.code === language)?.label}</span>
          </button>
          {langMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] overflow-hidden">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setLangMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-[#F9F7F2] transition-colors ${
                    language === lang.code ? 'text-[#001F3F] font-medium' : 'text-gray-600'
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
      <div className="p-4 border-t border-[#E5E1D8] shrink-0">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-[#001F3F]/70 hover:text-[#001F3F] hover:bg-[#F9F7F2] rounded-xl transition-colors flex items-center gap-3"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden`}>
        {sidebarOpen && (
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-[#E5E1D8]">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#001F3F]/70"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        )}
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:static lg:block w-72 bg-white border-r border-[#E5E1D8]">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E5E1D8] flex items-center justify-between px-6 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-[#001F3F] hover:bg-[#F9F7F2] rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-gray-600">Admin</span>
            <div className="w-8 h-8 bg-[#001F3F] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">A</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}