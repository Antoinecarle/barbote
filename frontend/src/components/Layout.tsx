import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wine, Package, ArrowLeftRight,
  FlaskConical, MessageSquare, Settings, LogOut,
  ChevronLeft, ChevronRight, Wrench, Activity,
  Beaker, GitMerge, Bell, User
} from 'lucide-react';
import { logout, getCurrentUser } from '../lib/auth';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/lots', icon: Wine, label: 'Lots de vin' },
  { path: '/containers', icon: Package, label: 'Contenants' },
  { path: '/movements', icon: ArrowLeftRight, label: 'Mouvements' },
  { path: '/analyses', icon: FlaskConical, label: 'Analyses' },
  { path: '/operations', icon: Beaker, label: 'Opérations' },
  { path: '/assemblage', icon: GitMerge, label: 'Assemblage IA' },
  { path: '/ai-chat', icon: MessageSquare, label: 'Assistant IA' },
  { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
  { path: '/activity', icon: Activity, label: 'Activité' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-dark)' }}>
      {/* Sidebar */}
      <aside
        className={`flex flex-col transition-all duration-300 border-r border-[#3d1f2a] ${
          collapsed ? 'w-16' : 'w-64'
        }`}
        style={{ background: 'var(--bg-sidebar)' }}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 p-4 border-b border-[#3d1f2a] ${collapsed ? 'justify-center' : ''}`}>
          <span className="text-2xl">🍷</span>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-[#f5e6ea] text-lg leading-tight">Barbote</h1>
              <p className="text-xs text-[#c4a0aa]">Traçabilité Cuverie</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`${isActive ? 'nav-item-active' : 'nav-item-inactive'} ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User & Collapse */}
        <div className="border-t border-[#3d1f2a] p-2 space-y-1">
          {!collapsed && user && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-bordeaux-700 flex items-center justify-center">
                  <User size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#f5e6ea] truncate">{user.name}</p>
                  <p className="text-xs text-[#c4a0aa] capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`nav-item-inactive w-full ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Déconnexion' : undefined}
          >
            <LogOut size={18} className="shrink-0 text-red-400" />
            {!collapsed && <span className="text-red-400">Déconnexion</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`nav-item-inactive w-full ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Réduire</span></>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
