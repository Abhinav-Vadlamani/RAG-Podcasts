import React, { useState, useEffect } from 'react';

interface TypingMessageProps {
  text: string;
  onComplete?: () => void;
  speed?: number;
}

const TypingMessage: React.FC<TypingMessageProps> = ({ text, onComplete, speed = 30 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;
    let currentIndex = 0;
    setDisplayedText('');
    setIsComplete(false);

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        setTimeout(() => onComplete?.(), 500);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Byline */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        <div style={{
          width: 20,
          height: 20,
          background: 'var(--text-primary)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="0.5" y="3.5" width="1.5" height="3" rx="0.75" fill="#faf6ef" />
            <rect x="3"   y="2"   width="1.5" height="6" rx="0.75" fill="#faf6ef" />
            <rect x="5.5" y="0.5" width="1.5" height="9" rx="0.75" fill="#faf6ef" />
            <rect x="8"   y="2.5" width="1.5" height="5" rx="0.75" fill="#faf6ef" />
          </svg>
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}>
          Frequency
        </span>
      </div>

      {/* Body */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        maxWidth: 680,
      }}>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14.5,
          color: 'var(--text-primary)',
          lineHeight: 1.8,
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}>
          {displayedText}
          {!isComplete && (
            <span style={{
              display: 'inline-block',
              width: 1.5,
              height: 15,
              background: 'var(--accent)',
              marginLeft: 2,
              verticalAlign: 'middle',
              borderRadius: 1,
              animation: 'blink 0.9s ease infinite',
            }} />
          )}
        </p>
      </div>
    </div>
  );
};

export default TypingMessage;
