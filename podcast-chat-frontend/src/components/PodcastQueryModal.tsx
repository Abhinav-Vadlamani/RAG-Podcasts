import React, { useState } from 'react';
import { Podcast } from '../types';

interface PodcastQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuery: (query: string) => Promise<void>;
  onPodcastSelect: (podcast: Podcast) => Promise<void>;
  podcasts: Podcast[];
  loading: boolean;
  error: string | null;
  showResults: boolean;
  onBack: () => void;
}

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M11 3 3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 11 5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpinnerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
  </svg>
);

const PodcastQueryModal: React.FC<PodcastQueryModalProps> = ({
  isOpen,
  onClose,
  onQuery,
  onPodcastSelect,
  podcasts,
  loading,
  error,
  showResults,
  onBack,
}) => {
  const [query, setQuery] = useState('');
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirming, setConfirming] = useState(false);

  React.useEffect(() => {
    if (!confirming) return;

    if (!loading) {
      setProgress(100);
      setTimeout(() => { setConfirming(false); setProgress(0); }, 600);
      return;
    }

    // Animate to 88% over ~18 seconds, then stall until loading finishes
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 88) { clearInterval(interval); return prev; }
        return prev + 0.5;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [confirming, loading]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onQuery(query.trim());
  };

  const handleBack = () => { setSelectedPodcast(null); onBack(); };
  const handleClose = () => { setSelectedPodcast(null); onClose(); };
  const handleConfirm = () => {
    if (selectedPodcast) {
      setConfirming(true);
      setProgress(0);
      onPodcastSelect(selectedPodcast);
    }
  };

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
        zIndex: 50,
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="animate-fade-up"
        style={{
          background: 'var(--bg-page)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 560,
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--border-medium)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {showResults && (
              <button
                onClick={handleBack}
                style={{
                  padding: 6,
                  background: 'transparent',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  marginRight: 4,
                }}
              >
                <BackIcon />
              </button>
            )}
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 800,
                fontStyle: 'italic',
                color: 'var(--text-primary)',
                margin: 0,
              }}>
                {showResults ? 'Choose a Podcast' : 'Find a Podcast'}
              </h2>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontStyle: 'italic',
                color: 'var(--text-muted)',
                margin: '3px 0 0',
              }}>
                {showResults
                  ? `${podcasts.length} result${podcasts.length !== 1 ? 's' : ''} in the catalog`
                  : 'Search by topic, host, or genre'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              padding: 7,
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-medium)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {!showResults ? (
            <form onSubmit={handleSubmit}>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                What are you looking for?
              </label>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="e.g. technology, true crime, economics…"
                required
                disabled={loading}
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${inputFocused ? 'var(--accent)' : 'var(--border-strong)'}`,
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: 17,
                  fontStyle: 'italic',
                  color: 'var(--text-primary)',
                  padding: '8px 0',
                  marginBottom: 28,
                  transition: 'border-color 0.2s',
                  borderRadius: 0,
                  opacity: loading ? 0.5 : 1,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? 'var(--bg-elevated)' : 'var(--text-primary)',
                  color: loading ? 'var(--text-muted)' : 'var(--bg-page)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '13px 0',
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--accent)'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--text-primary)'; }}
              >
                {loading ? <><SpinnerIcon /> Searching the Catalog…</> : 'Search Podcasts'}
              </button>
            </form>
          ) : (
            <div>
              {podcasts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0 }}>
                    No results found. Try a different query.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {podcasts.map((podcast, index) => {
                    const isSelected = selectedPodcast?.collectionId === podcast.collectionId;
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedPodcast(podcast)}
                        style={{
                          display: 'flex',
                          gap: 14,
                          alignItems: 'center',
                          padding: '14px 16px',
                          background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                          border: `1px solid ${isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                          borderLeft: `3px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'var(--bg-elevated)';
                            e.currentTarget.style.borderColor = 'var(--border-medium)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          }
                        }}
                      >
                        {podcast.artworkUrl600 ? (
                          <img
                            src={podcast.artworkUrl600}
                            alt={podcast.collectionName}
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 'var(--radius-sm)',
                              objectFit: 'cover',
                              flexShrink: 0,
                              border: '1px solid var(--border-subtle)',
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-display)',
                            fontSize: 20,
                            fontStyle: 'italic',
                            color: 'var(--text-muted)',
                          }}>
                            {podcast.collectionName[0]}
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 14,
                            fontWeight: 700,
                            fontStyle: 'italic',
                            color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                            margin: '0 0 2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            transition: 'color 0.12s',
                          }}>
                            {podcast.collectionName}
                          </h3>
                          <p style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            margin: '0 0 4px',
                          }}>
                            {podcast.artistName}
                          </p>
                          {podcast.summary && (
                            <p className="line-clamp-2" style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: 12,
                              fontStyle: 'italic',
                              color: 'var(--text-muted)',
                              margin: 0,
                              lineHeight: 1.5,
                            }}>
                              {podcast.summary}
                            </p>
                          )}
                        </div>

                        {isSelected && (
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: '#faf6ef',
                          }}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'rgba(140,50,68,0.07)',
              border: '1px solid var(--accent-border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontStyle: 'italic',
              color: 'var(--accent)',
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Confirm footer */}
        {showResults && selectedPodcast && (
          <div style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--border-medium)',
            flexShrink: 0,
          }}>
            {confirming ? (
              /* Progress bar */
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                  }}>
                    {progress < 100 ? 'Indexing episodes…' : 'Done'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--accent)',
                  }}>
                    {Math.round(progress)}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: 6,
                  background: 'var(--bg-elevated)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: progress < 100 ? 'var(--accent)' : '#22c55e',
                    borderRadius: 3,
                    transition: 'width 0.1s linear, background 0.3s',
                  }} />
                </div>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  fontStyle: 'italic',
                  color: 'var(--text-muted)',
                  margin: '8px 0 0',
                  textAlign: 'center',
                }}>
                  Fetching and embedding episode metadata — this may take a moment.
                </p>
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'var(--text-primary)',
                  color: 'var(--bg-page)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '13px 0',
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--text-primary)'; }}
              >
                Confirm — {selectedPodcast.collectionName}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PodcastQueryModal;
