import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wine,
  Package,
  ArrowLeftRight,
  FlaskConical,
  Beaker,
  GitMerge,
  MessageSquare,
  Wrench,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Menu,
  X,
} from 'lucide-react';
import { logout, getCurrentUser } from '../lib/auth';

// TypeScript Interfaces
interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface LayoutProps {
  children: React.ReactNode;
}

// Navigation items
const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
  { icon: Wine, label: 'Lots de vin', path: '/lots' },
  { icon: Package, label: 'Contenants', path: '/containers' },
  { icon: ArrowLeftRight, label: 'Mouvements', path: '/movements' },
  { icon: FlaskConical, label: 'Analyses', path: '/analyses' },
  { icon: Beaker, label: 'Opérations', path: '/operations' },
  { icon: GitMerge, label: 'Assemblage IA', path: '/assemblage' },
  { icon: MessageSquare, label: 'Assistant IA', path: '/ai-chat' },
  { icon: Wrench, label: 'Maintenance', path: '/maintenance' },
  { icon: Activity, label: 'Activité', path: '/activity' },
];

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans antialiased text-gray-800">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out shrink-0
          md:relative md:z-auto md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'md:w-16 w-64' : 'w-64'}
        `}
      >
        {/* Logo Area */}
        <div
          className={`flex items-center h-16 px-4 border-b border-gray-200 transition-all duration-300 ease-in-out ${
            collapsed ? 'md:justify-center justify-between' : 'justify-between'
          }`}
        >
          <Link to="/" className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="text-2xl shrink-0">🍷</span>
            {!collapsed && (
              <div className="overflow-hidden">
                <span className="block text-lg font-semibold text-gray-900 tracking-tight leading-tight">
                  Barbote
                </span>
                <span className="block text-xs text-gray-500 leading-tight">
                  Traçabilité Cuverie
                </span>
              </div>
            )}
          </Link>

          {/* Desktop collapse/expand toggle */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden md:flex p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#8B1A2F] focus:ring-offset-1"
              title="Réduire la barre latérale"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden md:flex p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#8B1A2F] focus:ring-offset-1"
              title="Développer la barre latérale"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#8B1A2F] focus:ring-offset-1"
            title="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                title={collapsed ? label : undefined}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-md text-sm font-medium transition-colors duration-200 ${
                  collapsed ? 'md:justify-center' : ''
                } ${
                  isActive
                    ? 'bg-wine-light text-wine-red'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 transition-colors duration-200 ${
                    isActive
                      ? 'text-wine-red'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                {!collapsed && (
                  <span className="truncate">{label}</span>
                )}
                {collapsed && (
                  <span className="truncate md:hidden">{label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-200 p-3 space-y-1">
          {/* User profile */}
          {user && (
            <div
              className={`flex items-center gap-3 px-2 py-2 rounded-md mb-1 ${
                collapsed ? 'md:justify-center' : ''
              }`}
              title={collapsed ? `${user.name} — ${user.role}` : undefined}
            >
              <div className="w-7 h-7 rounded-full bg-wine-light border border-[#F3C5CE] flex items-center justify-center shrink-0">
                <User size={14} className="text-wine-red" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize truncate">{user.role}</p>
                </div>
              )}
              {collapsed && (
                <div className="min-w-0 md:hidden">
                  <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize truncate">{user.role}</p>
                </div>
              )}
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Déconnexion' : undefined}
            className={`group flex items-center gap-3 w-full px-3 py-2 min-h-[44px] rounded-md text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 ${
              collapsed ? 'md:justify-center' : ''
            }`}
          >
            <LogOut
              size={18}
              className="shrink-0 text-gray-400 group-hover:text-red-500 transition-colors duration-200"
            />
            {!collapsed && <span>Déconnexion</span>}
            {collapsed && <span className="md:hidden">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 shrink-0 gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#8B1A2F] focus:ring-offset-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-400">/</span>
            {navItems.find((item) => item.path === location.pathname) && (
              <span className="font-medium text-gray-900">
                {navItems.find((item) => item.path === location.pathname)?.label}
              </span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
