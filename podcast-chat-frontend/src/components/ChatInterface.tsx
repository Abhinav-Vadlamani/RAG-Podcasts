// components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Play, Edit2, Trash2, Check, X } from 'lucide-react';
import { Chat, Message, Episode } from '../types';
import TypingMessage from './TypingMessage';

interface ChatInterfaceProps {
  chat: Chat | null;
  onSendMessage: (message: string) => Promise<void>;
  loading: boolean;
  processingEpisode: boolean;
  onProcessEpisode: (episode: Episode) => Promise<void>;
  onUpdateChatTitle: (chatId: string, title: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
  pendingResponse?: string;
  showTypingAnimation?: boolean;
  onTypingComplete?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chat,
  onSendMessage,
  loading,
  processingEpisode,
  onProcessEpisode,
  onUpdateChatTitle,
  onDeleteChat,
  pendingResponse,
  showTypingAnimation,
  onTypingComplete,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.all_messages, showTypingAnimation]);

  useEffect(() => {
    if (chat) {
      setEditTitle(chat.title);
    }
  }, [chat]);

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
    if (e.key === 'Enter') {
      handleTitleEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(chat?.title || '');
      setIsEditingTitle(false);
    }
  };

  const handleDeleteChat = async () => {
    if (chat && window.confirm('Are you sure you want to delete this chat?')) {
      await onDeleteChat(chat.id);
    }
  };

  const handleTypingComplete = () => {
    if (onTypingComplete) {
      onTypingComplete();
    }
  };

  const renderMessage = (message: Message, index: number) => {
    if (message.type === 'question') {
      return (
        <div key={index} className="flex justify-end mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-3xl rounded-tr-lg max-w-xs lg:max-w-lg shadow-lg">
            <div className="text-[15px] font-medium leading-relaxed">{message.content}</div>
          </div>
        </div>
      );
    }

    if (message.type === 'answer') {
      // Check if this is a search result with episode data
      if (message.isSearch && typeof message.content === 'object' && message.content.title) {
        const episode = message.content;
        return (
          <div key={index} className="flex justify-start mb-6">
            <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 px-6 py-5 rounded-3xl rounded-tl-lg max-w-xs lg:max-w-lg shadow-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <div className="text-[16px] font-bold text-gray-800">Found Episode</div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-[13px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Title</div>
                  <div className="text-[15px] text-gray-900 font-medium leading-relaxed">{episode.title}</div>
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Audio URL</div>
                  <a 
                    href={episode.audio_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[14px] text-blue-600 hover:text-blue-800 hover:underline break-all font-medium transition-colors"
                  >
                    {episode.audio_url}
                  </a>
                </div>
                {episode.summary && (
                  <div>
                    <div className="text-[13px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Summary</div>
                    <div className="text-[15px] text-gray-700 leading-relaxed">{episode.summary}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Regular answer - improved styling
      let displayContent = '';
      
      if (typeof message.content === 'string') {
        displayContent = message.content;
      } else if (message.content && typeof message.content === 'object') {
        if (message.content.answer) {
          displayContent = message.content.answer;
        } else {
          displayContent = JSON.stringify(message.content, null, 2);
        }
      } else {
        displayContent = 'No content available';
      }

      return (
        <div key={index} className="flex justify-start mb-6">
          <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 px-6 py-5 rounded-3xl rounded-tl-lg max-w-xs lg:max-w-3xl shadow-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {displayContent}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <h2 className="text-xl font-medium mb-2">No chat selected</h2>
          <p>Create a new chat or select an existing one to start chatting.</p>
        </div>
      </div>
    );
  }

  const hasPodcastSelected = chat.podcast_title && chat.feed_url;

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={handleTitleKeyPress}
                  onBlur={handleTitleEdit}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleTitleEdit}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => {
                    setEditTitle(chat?.title || '');
                    setIsEditingTitle(false);
                  }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <h1 className="font-semibold text-gray-900">{chat.title}</h1>
                {chat.podcast_title && (
                  <p className="text-sm text-gray-600">{chat.podcast_title}</p>
                )}
              </div>
            )}
          </div>
          
          {!isEditingTitle && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                title="Edit title"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={handleDeleteChat}
                className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Delete chat"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasPodcastSelected ? (
          <div className="text-center text-gray-500 mt-8">
            <p>This chat doesn't have a podcast selected yet.</p>
            <p className="text-sm mt-1">Please select a podcast to start chatting.</p>
          </div>
        ) : (
          <>
            {chat.all_messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p>Start a conversation about {chat.podcast_title}!</p>
                <p className="text-sm mt-1">Ask questions about episodes or search for specific content.</p>
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-400 mb-2">Debug: {chat.all_messages.length} messages</div>
                {chat.all_messages.map(renderMessage)}
              </>
            )}

            {/* Show typing animation */}
            {showTypingAnimation && pendingResponse && (
              <TypingMessage 
                text={pendingResponse} 
                onComplete={handleTypingComplete}
                speed={20}
              />
            )}
            
            {loading && !showTypingAnimation && (
              <div className="flex justify-start mb-6">
                <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 px-6 py-5 rounded-3xl rounded-tl-lg shadow-lg border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                    <span className="text-gray-700 font-medium text-[15px]">
                      {processingEpisode ? 'Processing episode content...' : 'Thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {hasPodcastSelected && (
        <div className="border-t border-gray-200 px-4 py-4 bg-white">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about the podcast..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;