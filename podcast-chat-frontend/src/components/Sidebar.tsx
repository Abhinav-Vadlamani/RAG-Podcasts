import React, { useState, useRef, useEffect } from 'react';
import { Chat } from '../types';
import ConfirmModal from './ConfirmModal';

interface SidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => Promise<void>;
  onRenameChat: (chatId: string, title: string) => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  selectedChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onRenameChat,
}) => {
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [newChatHover, setNewChatHover] = useState(false);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingChatId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingChatId]);

  const startRename = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingChatId(chat.id);
    setRenameValue(chat.title);
  };

  const commitRename = async (chatId: string) => {
    if (renameValue.trim()) {
      await onRenameChat(chatId, renameValue.trim());
    }
    setRenamingChatId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === 'Enter') commitRename(chatId);
    else if (e.key === 'Escape') setRenamingChatId(null);
  };

  const handleDelete = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(chatId);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId) await onDeleteChat(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  return (
    <div style={{
      width: 264,
      minWidth: 264,
      height: '100vh',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-medium)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="Delete conversation?"
        message="This will permanently remove the chat and all its messages. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
      {/* Masthead */}
      <div style={{
        padding: '28px 24px 22px',
        borderBottom: '1px solid var(--border-medium)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          The Podcast Reader
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 900,
          fontStyle: 'italic',
          color: 'var(--text-primary)',
          lineHeight: 1.1,
          marginBottom: 20,
        }}>
          Your Archive
        </div>

        <button
          onClick={onNewChat}
          onMouseEnter={() => setNewChatHover(true)}
          onMouseLeave={() => setNewChatHover(false)}
          style={{
            width: '100%',
            background: newChatHover ? 'var(--accent)' : 'var(--text-primary)',
            color: 'var(--bg-page)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '9px 0',
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          + New Conversation
        </button>
      </div>

      {/* Column header */}
      {chats.length > 0 && (
        <div style={{
          padding: '14px 24px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}>
            Recent
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>
      )}

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {chats.length === 0 ? (
          <div style={{ padding: '32px 12px', textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              lineHeight: 1.65,
              margin: 0,
            }}>
              No conversations yet.<br />Start one above.
            </p>
          </div>
        ) : (
          chats.map(chat => {
            const isSelected = selectedChatId === chat.id;
            const isHovered = hoveredChatId === chat.id;
            const isRenaming = renamingChatId === chat.id;

            return (
              <div
                key={chat.id}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
                style={{
                  position: 'relative',
                  marginBottom: 1,
                }}
              >
                <button
                  onClick={() => !isRenaming && onChatSelect(chat.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: isSelected ? 'var(--bg-elevated)' : isHovered ? 'var(--bg-elevated)' : 'transparent',
                    border: 'none',
                    borderLeft: `3px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                    padding: isRenaming ? '8px 8px 8px 14px' : '10px 36px 10px 14px',
                    cursor: isRenaming ? 'default' : 'pointer',
                    transition: 'background 0.12s, border-color 0.12s',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                    display: 'block',
                  }}
                >
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => handleRenameKeyDown(e, chat.id)}
                      onBlur={() => commitRename(chat.id)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1.5px solid var(--accent)',
                        outline: 'none',
                        fontFamily: 'var(--font-display)',
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        padding: '2px 0',
                        borderRadius: 0,
                      }}
                    />
                  ) : (
                    <>
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 2,
                        transition: 'color 0.12s',
                      }}>
                        {chat.title}
                      </div>
                      {chat.podcast_title && (
                        <div style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 11,
                          fontStyle: 'italic',
                          color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: 2,
                          transition: 'color 0.12s',
                        }}>
                          {chat.podcast_title}
                        </div>
                      )}
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.04em',
                      }}>
                        {new Date(chat.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </>
                  )}
                </button>

                {/* Action buttons — visible on hover, hidden during rename */}
                {isHovered && !isRenaming && (
                  <div style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    gap: 2,
                  }}>
                    {/* Rename */}
                    <button
                      onClick={e => startRename(chat, e)}
                      title="Rename"
                      style={{
                        padding: 5,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M7.5 1.25a.875.875 0 0 1 1.25 1.25L3 8.25 1.25 8.75l.5-1.75L7.5 1.25Z"
                          stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={e => handleDelete(chat.id, e)}
                      title="Delete"
                      style={{
                        padding: 5,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M1.375 2.75h8.25M4.125 2.75V1.833a.458.458 0 0 1 .458-.458h1.834a.458.458 0 0 1 .458.458V2.75M9.167 2.75l-.459 5.5a.917.917 0 0 1-.916.917H3.208a.917.917 0 0 1-.916-.917L1.833 2.75"
                          stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 24px',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          color: 'var(--text-muted)',
          margin: 0,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          RAG-Powered Podcast Search
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
