import React from 'react';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RateLimitModal: React.FC<RateLimitModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28, 23, 20, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-fade-up"
        style={{
          background: 'var(--bg-page)',
          border: '1px solid var(--border-medium)',
          borderTop: '3px solid var(--accent)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 440,
          padding: '32px 36px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Label */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'var(--accent)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          API Limit Reached
        </div>

        {/* Heading */}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 800,
          fontStyle: 'italic',
          color: 'var(--text-primary)',
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}>
          Too many requests
        </h2>

        {/* Body */}
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-secondary)',
          lineHeight: 1.75,
          margin: '0 0 8px',
        }}>
          Your OpenAI API key has hit its rate limit or quota. This is usually caused by exceeding your plan's usage limits.
        </p>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontStyle: 'italic',
          color: 'var(--text-secondary)',
          lineHeight: 1.75,
          margin: '0 0 28px',
        }}>
          Please check your usage and billing details on the OpenAI platform, then try again.
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-medium)', marginBottom: 24 }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="https://platform.openai.com/usage"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'block',
              textAlign: 'center',
              background: 'var(--text-primary)',
              color: 'var(--bg-page)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '11px 0',
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--text-primary)'; }}
          >
            View Usage →
          </a>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '11px 0',
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-medium)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateLimitModal;
