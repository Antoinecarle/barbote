import { useState } from 'react';
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
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left panel — wine-red brand panel */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: '#8B1A2F' }}
      >
        {/* Subtle decorative dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Decorative large circle top-right */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-10"
          style={{ backgroundColor: '#ffffff' }}
        />
        {/* Decorative large circle bottom-left */}
        <div
          className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full opacity-10"
          style={{ backgroundColor: '#ffffff' }}
        />

        {/* Brand content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <span className="text-7xl mb-6 select-none" role="img" aria-label="Wine glass">
            🍷
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-3">Barbote</h1>
          <p className="text-lg font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Traçabilité Cuverie
          </p>
          <p className="mt-4 text-sm max-w-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Gérez vos cuvées, suivez vos lots et assurez la conformité de votre production vinicole.
          </p>
        </div>
      </div>

      {/* Right panel — pure white login form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12 sm:px-12">
        {/* Mobile logo (visible only on small screens) */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <span className="text-5xl mb-3" role="img" aria-label="Wine glass">
            🍷
          </span>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#8B1A2F' }}>
            Barbote
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Traçabilité Cuverie
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight" style={{ color: '#111827' }}>
              Connexion
            </h2>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              Accédez à votre cave
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div
              className="rounded-lg px-4 py-3 mb-5 flex items-start gap-2 text-sm"
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
              }}
              role="alert"
            >
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#374151' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@barbote.local"
                className="w-full rounded-lg px-3 py-2 text-sm shadow-sm transition-all duration-150 outline-none"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  color: '#111827',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid #8B1A2F';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,26,47,0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid #D1D5DB';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                }}
              />
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#374151' }}
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2 text-sm shadow-sm transition-all duration-150 outline-none"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  color: '#111827',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid #8B1A2F';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,26,47,0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid #D1D5DB';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                }}
              />
            </div>

            {/* Primary submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                backgroundColor: loading ? '#A0394E' : '#8B1A2F',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#6F1526';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#8B1A2F';
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Connexion en cours…
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              ou
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
          </div>

          {/* Demo access — outlined secondary button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              color: '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.borderColor = '#9CA3AF';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#D1D5DB';
              }
            }}
          >
            {loading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Chargement…
              </>
            ) : (
              <>
                <span role="img" aria-label="Wine glass">🍷</span>
                Accès démo
              </>
            )}
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-xs" style={{ color: '#9CA3AF' }}>
          &copy; {new Date().getFullYear()} Barbote — Traçabilité vinicole
        </p>
      </div>
    </div>
  );
}
