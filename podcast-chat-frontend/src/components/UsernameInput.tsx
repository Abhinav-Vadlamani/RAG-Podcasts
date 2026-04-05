import React, { useState } from 'react';
import { apiService } from '../services/api';

interface UsernameInputProps {
  onUsernameSubmit: (username: string) => void;
}

const UsernameInput: React.FC<UsernameInputProps> = ({ onUsernameSubmit }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const res = await apiService.login(username.trim(), password);
        onUsernameSubmit(res.username);
      } else {
        await apiService.register(username.trim(), password);
        const res = await apiService.login(username.trim(), password);
        onUsernameSubmit(res.username);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'stretch',
    }}>
      {/* Left column */}
      <div style={{
        width: '42%',
        background: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          bottom: -40,
          left: -20,
          fontFamily: 'var(--font-display)',
          fontSize: 340,
          fontWeight: 900,
          color: 'rgba(255,255,255,0.04)',
          lineHeight: 1,
          userSelect: 'none',
          letterSpacing: '-0.05em',
        }}>
          F
        </div>

        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.2em',
            color: 'rgba(250,246,239,0.45)',
            textTransform: 'uppercase',
            marginBottom: 40,
          }}>
            Vol. I — 2026
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 58,
            fontWeight: 900,
            fontStyle: 'italic',
            color: '#faf6ef',
            margin: 0,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            The Podcast<br />
            <span style={{ color: 'var(--accent)', fontStyle: 'normal' }}>
              Reader
            </span>
          </h1>

          <div style={{
            width: 48,
            height: 3,
            background: 'var(--accent)',
            margin: '28px 0',
            borderRadius: 2,
          }} />

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontStyle: 'italic',
            color: 'rgba(250,246,239,0.55)',
            lineHeight: 1.75,
            margin: 0,
            maxWidth: 280,
          }}>
            "Ask anything. Get answers grounded in what was actually said."
          </p>
        </div>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          color: 'rgba(250,246,239,0.28)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          RAG-Powered Intelligence
        </div>
      </div>

      {/* Right column */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 64px',
      }}>
        <div className="animate-fade-up" style={{ width: '100%', maxWidth: 360 }}>
          {/* Section label */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 32,
          }}>
            <div style={{ height: 1, width: 32, background: 'var(--border-strong)' }} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </span>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 8px',
            lineHeight: 1.15,
          }}>
            {mode === 'login' ? 'Enter your username' : 'Create an account'}
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontStyle: 'italic',
            color: 'var(--text-secondary)',
            margin: '0 0 36px',
            lineHeight: 1.65,
          }}>
            {mode === 'login'
              ? 'Welcome back. Sign in to access your archive.'
              : 'Start building your podcast archive.'}
          </p>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <label style={{
              display: 'block',
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.14em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. alex"
              required
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${focusedField === 'username' ? 'var(--accent)' : 'var(--border-strong)'}`,
                outline: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 17,
                color: 'var(--text-primary)',
                padding: '8px 0',
                marginBottom: 28,
                transition: 'border-color 0.2s',
                borderRadius: 0,
                opacity: loading ? 0.6 : 1,
              }}
            />

            {/* Password */}
            <label style={{
              display: 'block',
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.14em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="••••••••"
              required
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${focusedField === 'password' ? 'var(--accent)' : 'var(--border-strong)'}`,
                outline: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 17,
                color: 'var(--text-primary)',
                padding: '8px 0',
                marginBottom: 32,
                transition: 'border-color 0.2s',
                borderRadius: 0,
                opacity: loading ? 0.6 : 1,
              }}
            />

            {/* Error */}
            {error && (
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontStyle: 'italic',
                color: 'var(--accent)',
                marginBottom: 20,
                padding: '10px 14px',
                background: 'rgba(140,50,68,0.07)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius-md)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                background: loading ? 'var(--bg-elevated)' : 'var(--text-primary)',
                color: loading ? 'var(--text-muted)' : 'var(--bg-page)',
                border: 'none',
                padding: '14px 0',
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                borderRadius: 'var(--radius-sm)',
                transition: 'background 0.2s',
                marginBottom: 20,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--accent)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--text-primary)'; }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          {/* Toggle mode */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontStyle: 'italic',
            color: 'var(--text-muted)',
            margin: 0,
            textAlign: 'center',
          }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontStyle: 'italic',
                color: 'var(--accent)',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UsernameInput;
