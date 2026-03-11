import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/auth';

interface LoginProps {
  onLoginSuccess?: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('admin@barbote.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      if (onLoginSuccess) onLoginSuccess();
      else navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login('admin@barbote.local', 'admin123');
      if (onLoginSuccess) onLoginSuccess();
      else navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion démo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-dark)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍷</div>
          <h1 className="text-3xl font-bold text-[#f5e6ea]">Barbote</h1>
          <p className="text-[#c4a0aa] mt-1">Plateforme de traçabilité cuverie</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-[#f5e6ea] mb-6">Connexion</h2>

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@barbote.local"
                required
              />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-[#3a1a22]" />
              <span className="text-xs text-[#c4a0aa]">ou</span>
              <div className="flex-1 h-px bg-[#3a1a22]" />
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-3 rounded-lg border border-[#8b3a4a]/60 text-[#f5b8c4] text-sm font-medium hover:bg-[#8b3a4a]/20 hover:border-[#8b3a4a] transition-all duration-200 flex items-center justify-center gap-2"
            >
              🍷 Accès démo — sans mot de passe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
