import React, { useState, useRef, useEffect } from 'react';
import { Chat, Message, Episode } from '../types';
import TypingMessage from './TypingMessage';
import ConfirmModal from './ConfirmModal';

interface ChatInterfaceProps {
  chat: Chat | null;
  onSendMessage: (message: string) => Promise<void>;
  loading: boolean;
  onLoadAndAnswer: (audioUrl: string, episodeTitle: string, originalQuestion: string, messageIndex: number) => Promise<void>;
  loadingEpisodeForIndex: number | null;
  onUpdateChatTitle: (chatId: string, title: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
  pendingResponse?: string;
  showTypingAnimation?: boolean;
  onTypingComplete?: () => void;
}

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M13.5 7.5L1.5 1.5l2.25 6L1.5 13.5l12-6Z" fill="currentColor" />
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M9.25 1.625a1.148 1.148 0 0 1 1.625 1.625L3.75 10.375 1.625 10.916l.541-2.125L9.25 1.625Z"
      stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M1.625 3.25h9.75M4.875 3.25V2.167a.542.542 0 0 1 .542-.542h2.166a.542.542 0 0 1 .542.542V3.25M10.833 3.25l-.541 6.633a1.083 1.083 0 0 1-1.084 1.009H3.792A1.083 1.083 0 0 1 2.708 9.883L2.167 3.25"
      stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2.167 6.5l3.25 3.25 5.416-6.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M9.75 3.25 3.25 9.75M3.25 3.25l6.5 6.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);

const EmptyState = ({ podcastTitle }: { podcastTitle?: string }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    padding: 48,
  }}>
    <div style={{
      fontFamily: 'var(--font-display)',
      fontSize: 72,
      fontWeight: 900,
      fontStyle: 'italic',
      color: 'var(--bg-elevated)',
      lineHeight: 1,
      marginBottom: 24,
      userSelect: 'none',
    }}>
      "
    </div>
    <h3 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 20,
      fontWeight: 700,
      fontStyle: 'italic',
      color: 'var(--text-primary)',
      margin: '0 0 10px',
    }}>
      {podcastTitle ? `Listening to "${podcastTitle}"` : 'Begin your inquiry'}
    </h3>
    <p style={{
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontStyle: 'italic',
      color: 'var(--text-secondary)',
      lineHeight: 1.7,
      margin: 0,
      maxWidth: 340,
    }}>
      Ask about episodes, key moments, guest names, or anything discussed in this podcast.
    </p>
  </div>
);

const ThinkingBubble = ({ processingEpisode }: { processingEpisode: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-medium)',
      borderRadius: 'var(--radius-lg)',
      padding: '12px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="thinking-dot"
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--accent)',
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontStyle: 'italic',
        color: 'var(--text-secondary)',
      }}>
        {processingEpisode ? 'Processing episode…' : 'Reading the transcript…'}
      </span>
    </div>
  </div>
);

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chat,
  onSendMessage,
  loading,
  onLoadAndAnswer,
  loadingEpisodeForIndex,
  onUpdateChatTitle,
  onDeleteChat,
  pendingResponse,
  showTypingAnimation,
  onTypingComplete,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLoadSuccess, setShowLoadSuccess] = useState(false);
  const prevLoadingRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.all_messages, showTypingAnimation, loading]);

  useEffect(() => {
    if (chat) setEditTitle(chat.title);
  }, [chat]);

  // Show success toast when episode loading completes
  useEffect(() => {
    if (prevLoadingRef.current !== null && loadingEpisodeForIndex === null) {
      setShowLoadSuccess(true);
      const timer = setTimeout(() => setShowLoadSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
    prevLoadingRef.current = loadingEpisodeForIndex;
  }, [loadingEpisodeForIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !loading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleTitleEdit = async () => {
    if (chat && editTitle.trim() && editTitle !== chat.title) {
      await onUpdateChatTitle(chat.id, editTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleEdit();
    else if (e.key === 'Escape') { setEditTitle(chat?.title || ''); setIsEditingTitle(false); }
  };

  const handleDeleteChat = () => {
    if (chat) setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    if (chat) await onDeleteChat(chat.id);
  };

  const renderMessage = (message: Message, index: number) => {
    if (message.type === 'question') {
      return (
        <div key={index} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-page)',
              padding: '12px 18px',
              borderRadius: 'var(--radius-lg)',
              fontFamily: 'var(--font-body)',
              fontSize: 14.5,
              lineHeight: 1.65,
              fontWeight: 500,
            }}>
              {message.content}
            </div>
          </div>
        </div>
      );
    }

    if (message.type === 'answer') {
      // Episode card with Load button
      if (message.needsLoad && message.episodeData) {
        const ep = message.episodeData;
        const isLoadingThis = loadingEpisodeForIndex === index;

        return (
          <div key={index} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 20, height: 20, background: 'var(--text-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="0.5" y="3.5" width="1.5" height="3" rx="0.75" fill="#faf6ef" />
                  <rect x="3" y="2" width="1.5" height="6" rx="0.75" fill="#faf6ef" />
                  <rect x="5.5" y="0.5" width="1.5" height="9" rx="0.75" fill="#faf6ef" />
                  <rect x="8" y="2.5" width="1.5" height="5" rx="0.75" fill="#faf6ef" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Frequency</span>
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', maxWidth: 560 }}>
              {/* Metadata answer */}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--text-primary)', lineHeight: 1.8, margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>
                {message.content}
              </p>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border-medium)', marginBottom: 14 }} />

              {/* Episode info */}
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                Episode
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, fontStyle: 'italic', color: 'var(--text-primary)', margin: '0 0 12px' }}>
                {ep.title}
              </p>

              {/* Load button or progress bar */}
              {isLoadingThis ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Transcribing episode…
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 5, background: 'var(--bg-card)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: 'var(--accent)',
                      borderRadius: 3,
                      animation: 'loadBar 20s cubic-bezier(0.1,0.4,0.8,1) forwards',
                    }} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontStyle: 'italic', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                    This may take a few minutes depending on episode length.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => onLoadAndAnswer(ep.audio_url, ep.title, message.originalQuestion || '', index)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 16px',
                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--text-primary)';
                    e.currentTarget.style.color = 'var(--bg-page)';
                    e.currentTarget.style.borderColor = 'var(--text-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                  }}
                >
                  Load for deeper answer →
                </button>
              )}
            </div>
          </div>
        );
      }

      if (message.isSearch && typeof message.content === 'object' && message.content?.title) {
        const episode = message.content;
        return (
          <div key={index} style={{ marginBottom: 20 }}>
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-medium)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              maxWidth: 520,
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--accent)',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                Episode Found
              </div>
              <h4 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 700,
                fontStyle: 'italic',
                color: 'var(--text-primary)',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}>
                {episode.title}
              </h4>
              {episode.summary && (
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  margin: '0 0 12px',
                }}>
                  {episode.summary}
                </p>
              )}
              <a
                href={episode.audio_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--accent-border)',
                  paddingBottom: 2,
                }}
              >
                Open Audio →
              </a>
            </div>
          </div>
        );
      }

      let displayContent = '';
      if (typeof message.content === 'string') displayContent = message.content;
      else if (message.content?.answer) displayContent = message.content.answer;
      else if (message.content) displayContent = JSON.stringify(message.content, null, 2);
      else displayContent = 'No content available';

      return (
        <div key={index} style={{ marginBottom: 20 }}>
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
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontStyle: 'italic',
              color: 'var(--text-muted)',
            }}>
              — {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
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
              {displayContent}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!chat) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
        flexDirection: 'column',
        gap: 12,
        textAlign: 'center',
        padding: 40,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 52,
          fontWeight: 900,
          fontStyle: 'italic',
          color: 'var(--bg-elevated)',
          lineHeight: 1,
          marginBottom: 8,
          userSelect: 'none',
        }}>
          "
        </div>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontStyle: 'italic',
          color: 'var(--text-secondary)',
          margin: 0,
        }}>
          Select a conversation or start a new one.
        </p>
      </div>
    );
  }

  const hasPodcastSelected = !!(chat.podcast_title && chat.feed_url);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-page)',
      overflow: 'hidden',
    }}>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete conversation?"
        message="This will permanently remove the chat and all its messages. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Success toast */}
      {showLoadSuccess && (
        <div style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 500,
          background: 'var(--text-primary)',
          color: 'var(--bg-page)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          animation: 'toastIn 0.25s ease-out',
        }}>
          <style>{`
            @keyframes toastIn {
              from { opacity: 0; transform: translateY(10px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
            <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Episode loaded
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--border-medium)',
        padding: '16px 32px',
        background: 'var(--bg-page)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditingTitle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={handleTitleKeyPress}
                onBlur={handleTitleEdit}
                autoFocus
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '2px solid var(--accent)',
                  outline: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  color: 'var(--text-primary)',
                  padding: '4px 0',
                  borderRadius: 0,
                }}
              />
              <button onClick={handleTitleEdit} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}>
                <CheckIcon />
              </button>
              <button onClick={() => { setEditTitle(chat.title); setIsEditingTitle(false); }} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <XIcon />
              </button>
            </div>
          ) : (
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 700,
                fontStyle: 'italic',
                color: 'var(--text-primary)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {chat.title}
              </h1>
              {chat.podcast_title && (
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: 'var(--accent)',
                  margin: '2px 0 0',
                }}>
                  {chat.podcast_title}
                </p>
              )}
            </div>
          )}
        </div>

        {!isEditingTitle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 16 }}>
            <button
              onClick={() => setIsEditingTitle(true)}
              title="Rename"
              style={{
                padding: 7,
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-medium)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              <EditIcon />
            </button>
            <button
              onClick={handleDeleteChat}
              title="Delete"
              style={{
                padding: 7,
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 40px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {!hasPodcastSelected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0 }}>
              No podcast selected for this conversation yet.
            </p>
          </div>
        ) : (
          <>
            {chat.all_messages.length === 0 ? (
              <div style={{ flex: 1 }}>
                <EmptyState podcastTitle={chat.podcast_title} />
              </div>
            ) : (
              <div className="animate-fade-in">
                {chat.all_messages.map(renderMessage)}
              </div>
            )}

            {showTypingAnimation && pendingResponse && (
              <TypingMessage text={pendingResponse} onComplete={onTypingComplete} speed={20} />
            )}
            {loading && !showTypingAnimation && (
              <ThinkingBubble processingEpisode={false} />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {hasPodcastSelected && (
        <div style={{
          padding: '16px 32px 22px',
          borderTop: '1px solid var(--border-medium)',
          background: 'var(--bg-page)',
          flexShrink: 0,
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              borderBottom: `2px solid ${inputFocused ? 'var(--accent)' : 'var(--border-strong)'}`,
              paddingBottom: 10,
              transition: 'border-color 0.2s',
            }}>
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={`Ask about ${chat.podcast_title || 'this podcast'}…`}
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  fontStyle: 'italic',
                  color: 'var(--text-primary)',
                  padding: 0,
                  opacity: loading ? 0.5 : 1,
                }}
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                style={{
                  padding: '8px 16px',
                  background: loading || !inputValue.trim() ? 'transparent' : 'var(--text-primary)',
                  color: loading || !inputValue.trim() ? 'var(--text-muted)' : 'var(--bg-page)',
                  border: `1px solid ${loading || !inputValue.trim() ? 'var(--border-medium)' : 'var(--text-primary)'}`,
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  if (!loading && inputValue.trim()) {
                    e.currentTarget.style.background = 'var(--accent)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }
                }}
                onMouseLeave={e => {
                  if (!loading && inputValue.trim()) {
                    e.currentTarget.style.background = 'var(--text-primary)';
                    e.currentTarget.style.borderColor = 'var(--text-primary)';
                  }
                }}
              >
                Send
                <SendIcon />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
