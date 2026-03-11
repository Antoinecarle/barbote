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
    <div
      className="flex h-screen overflow-hidden antialiased"
      style={{ backgroundColor: '#F5F3EF', fontFamily: "'Satoshi', 'Inter', sans-serif", color: '#1A1714' }}
    >
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-all duration-300 ease-in-out shrink-0
          md:relative md:z-auto md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'md:w-16 w-64' : 'w-64'}
        `}
        style={{
          backgroundColor: '#FDFCFA',
          borderColor: '#E8E4DE',
          boxShadow: '2px 0 8px rgba(26,23,20,0.06)',
        }}
      >
        {/* Logo Area */}
        <div
          className={`flex items-center h-16 px-4 border-b transition-all duration-300 ease-in-out ${
            collapsed ? 'md:justify-center justify-between' : 'justify-between'
          }`}
          style={{ borderColor: '#E8E4DE' }}
        >
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap">
            <span className="text-2xl shrink-0">🍷</span>
            {!collapsed && (
              <div className="overflow-hidden">
                <span
                  className="block text-xl tracking-tight leading-tight"
                  style={{
                    fontFamily: "'Cabinet Grotesk', 'Satoshi', sans-serif",
                    fontWeight: 700,
                    color: '#1A1714',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Barbote
                </span>
                <span
                  className="block text-xs leading-tight"
                  style={{ color: '#9B9590', fontWeight: 400 }}
                >
                  Traçabilité Cuverie
                </span>
              </div>
            )}
          </Link>

          {/* Desktop collapse/expand toggle */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden md:flex items-center justify-center p-1.5 rounded-md transition-colors duration-200 focus:outline-none min-h-[44px] min-w-[44px]"
              style={{ color: '#9B9590' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#5C5550';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F0EDE8';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#9B9590';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
              title="Réduire la barre latérale"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden md:flex items-center justify-center p-1.5 rounded-md transition-colors duration-200 focus:outline-none min-h-[44px] min-w-[44px]"
              style={{ color: '#9B9590' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#5C5550';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F0EDE8';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#9B9590';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
              title="Développer la barre latérale"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Mobile close button — full 44x44 touch target */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none min-h-[44px] min-w-[44px]"
            style={{ color: '#9B9590' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#5C5550';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F0EDE8';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#9B9590';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
            title="Fermer le menu"
            aria-label="Fermer le menu"
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
                }`}
                style={{
                  backgroundColor: isActive ? '#FDF2F4' : 'transparent',
                  color: isActive ? '#8B1A2F' : '#5C5550',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#F0EDE8';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#1A1714';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#5C5550';
                  }
                }}
              >
                <Icon
                  size={18}
                  className="shrink-0 transition-colors duration-200"
                  style={{ color: isActive ? '#8B1A2F' : '#9B9590' }}
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
        <div className="p-3 space-y-1" style={{ borderTop: '1px solid #E8E4DE' }}>
          {/* User profile */}
          {user && (
            <div
              className={`flex items-center gap-3 px-2 py-2 rounded-md mb-1 ${
                collapsed ? 'md:justify-center' : ''
              }`}
              title={collapsed ? `${user.name} — ${user.role}` : undefined}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#FDF2F4', border: '1px solid #F3C5CE' }}
              >
                <User size={14} style={{ color: '#8B1A2F' }} />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p
                    className="text-xs truncate"
                    style={{ fontWeight: 600, color: '#1A1714' }}
                  >
                    {user.name}
                  </p>
                  <p
                    className="text-xs capitalize truncate"
                    style={{ color: '#9B9590' }}
                  >
                    {user.role}
                  </p>
                </div>
              )}
              {collapsed && (
                <div className="min-w-0 md:hidden">
                  <p
                    className="text-xs truncate"
                    style={{ fontWeight: 600, color: '#1A1714' }}
                  >
                    {user.name}
                  </p>
                  <p
                    className="text-xs capitalize truncate"
                    style={{ color: '#9B9590' }}
                  >
                    {user.role}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Déconnexion' : undefined}
            className={`group flex items-center gap-3 w-full px-3 py-2 min-h-[44px] rounded-md text-sm font-medium transition-colors duration-200 ${
              collapsed ? 'md:justify-center' : ''
            }`}
            style={{ color: '#9B9590' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEF2F2';
              (e.currentTarget as HTMLButtonElement).style.color = '#DC2626';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#9B9590';
            }}
          >
            <LogOut
              size={18}
              className="shrink-0 transition-colors duration-200"
            />
            {!collapsed && <span>Déconnexion</span>}
            {collapsed && <span className="md:hidden">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Top Header */}
        <header
          className="h-16 border-b flex items-center px-4 md:px-6 shrink-0 gap-3"
          style={{ backgroundColor: '#FDFCFA', borderColor: '#E8E4DE' }}
        >
          {/* Mobile hamburger button — full 44x44 touch target */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none min-h-[44px] min-w-[44px]"
            style={{ color: '#9B9590' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#5C5550';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F0EDE8';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#9B9590';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
            title="Ouvrir le menu"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm min-w-0 overflow-hidden" style={{ color: '#9B9590' }}>
            <span className="shrink-0">/</span>
            {navItems.find((item) => item.path === location.pathname) && (
              <span className="truncate" style={{ fontWeight: 500, color: '#1A1714' }}>
                {navItems.find((item) => item.path === location.pathname)?.label}
              </span>
            )}
          </div>
        </header>

        {/* Page Content — px-4 on mobile, px-6 on md+ */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ backgroundColor: '#F5F3EF' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
