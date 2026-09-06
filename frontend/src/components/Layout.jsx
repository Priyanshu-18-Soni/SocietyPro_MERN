import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Building, 
  Users, 
  CreditCard, 
  Bell, 
  Menu, 
  X, 
  LogOut,
  User as UserIcon
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: Home,
      disabled: false,
      visible: true
    },
    {
      name: 'My Society',
      path: '/societies',
      icon: Building,
      disabled: false,
      visible: user?.role === 'SocietyOwner' || user?.role === 'Committee'
    },
    {
      name: 'Residents',
      path: '/residents',
      icon: Users,
      disabled: false,
      visible: user?.role === 'SocietyAdmin'
    },
    {
      name: 'Payments',
      path: '/payments',
      icon: CreditCard,
      disabled: false,
      visible: true
    },
    {
      name: 'Notices',
      path: '/notices',
      icon: Bell,
      disabled: true,
      badge: 'Coming Soon',
      visible: true
    }
  ];

  // Helper to format role names for the badge
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'SocietyOwner':
        return 'bg-amber-50 text-[#bca030] border-amber-200';
      case 'Committee':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SuperAdmin':
        return 'bg-red-50 text-error border-error/20';
      case 'SocietyAdmin':
        return 'bg-emerald-50 text-success border-success/20';
      case 'Resident':
        return 'bg-blue-50 text-info border-info/20';
      default:
        return 'bg-slate-50 text-slate border-border';
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-charcoal flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 bg-white border-b border-border z-30 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="flex items-center space-x-3">
          {/* Hamburger menu for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate hover:bg-slate-50 focus:outline-none"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary tracking-tight">SocietyPro</span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary-light/20">
              Portal
            </span>
          </Link>
        </div>

        {/* User Info & Sign Out */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 border-r border-border pr-4">
            <div className="w-9 h-9 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold shadow-inner">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-charcoal leading-tight">
                {user?.name || 'Administrator'}
              </p>
              <div className="mt-0.5">
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getRoleBadgeStyle(user?.role)}`}>
                  {user?.role || 'User'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 bg-white border border-border text-charcoal hover:bg-red-50 hover:text-error hover:border-error/30 font-medium px-4 py-2 text-sm rounded-lg transition-all duration-200 cursor-pointer shadow-sm active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar for Desktop */}
        <aside className="hidden lg:block w-64 bg-white border-r border-border p-6 fixed top-16 bottom-0 left-0 z-20 overflow-y-auto">
          <nav className="space-y-1.5">
            {navItems.filter(item => item.visible).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-4 py-3 text-slate/50 bg-slate-50/50 rounded-lg cursor-not-allowed border border-transparent select-none"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold bg-slate-200 text-slate px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border ${
                    isActive
                      ? 'bg-primary-subtle border-primary/10 text-primary font-semibold shadow-sm'
                      : 'border-transparent text-slate hover:bg-slate-50 hover:text-charcoal'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate/75'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Sidebar Overlay/Drawer for Mobile */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="lg:hidden fixed inset-0 bg-charcoal/40 backdrop-blur-xs z-40 transition-opacity duration-300"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <aside className="lg:hidden fixed top-16 bottom-0 left-0 w-64 bg-white border-r border-border p-6 z-50 overflow-y-auto flex flex-col justify-between shadow-xl animate-in slide-in-from-left duration-300">
              <nav className="space-y-1.5">
                {navItems.filter(item => item.visible).map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  if (item.disabled) {
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between px-4 py-3 text-slate/50 bg-slate-50/50 rounded-lg cursor-not-allowed border border-transparent select-none"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5" />
                          <span className="font-medium text-sm">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] font-semibold bg-slate-200 text-slate px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border ${
                        isActive
                          ? 'bg-primary-subtle border-primary/10 text-primary font-semibold'
                          : 'border-transparent text-slate hover:bg-slate-50 hover:text-charcoal'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate/75'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Sidebar Footer Profile Info */}
              <div className="pt-6 border-t border-border mt-6 sm:hidden">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-charcoal">{user?.name || 'User'}</p>
                    <p className="text-[10px] text-slate font-medium">{user?.role || 'Role'}</p>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 min-w-0 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
