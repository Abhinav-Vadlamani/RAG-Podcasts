// App.tsx
import React, { useState, useEffect } from 'react';
import UsernameInput from './components/UsernameInput';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import PodcastQueryModal from './components/PodcastQueryModal';
import RateLimitModal from './components/RateLimitModal';
import { apiService } from './services/api';
import { Chat, Podcast } from './types';

function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalPodcasts, setModalPodcasts] = useState<Podcast[]>([]);
  const [showPodcastResults, setShowPodcastResults] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<string>('');
  const [showTypingAnimation, setShowTypingAnimation] = useState(false);
  const [loadingEpisodeForIndex, setLoadingEpisodeForIndex] = useState<number | null>(null);
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);

  const handleError = (error: unknown) => {
    if (error && typeof error === 'object' && 'isRateLimit' in error) {
      setShowRateLimitModal(true);
    }
  };

  // Load chats when username is set
  useEffect(() => {
    if (username) {
      loadChats();
    }
  }, [username]);

  // Load selected chat details
  useEffect(() => {
    if (selectedChatId) {
      console.log('Loading selected chat:', selectedChatId);
      loadSelectedChat();
    }
  }, [selectedChatId]);

  // Debug selected chat changes
  useEffect(() => {
    console.log('Selected chat updated:', selectedChat);
  }, [selectedChat]);

  const loadChats = async () => {
    if (!username) return;
    
    try {
      const chatList = await apiService.getChats();
      setChats(chatList);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const loadSelectedChat = async () => {
    if (!selectedChatId) return;

    try {
      const chat = await apiService.getChat(selectedChatId);
      console.log('Loaded chat:', chat);
      console.log('Chat messages:', chat.all_messages);
      setSelectedChat(chat);
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const handleUsernameSubmit = (newUsername: string) => {
    setUsername(newUsername);
  };

  const handleNewChat = async () => {
    if (!username) return;

    console.log('Creating new chat for username:', username);
    try {
      const newChat = await apiService.createChat(`Untitled${Date.now()}`, username);
      console.log('New chat created:', newChat);
      setChats(prev => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
      setPendingChatId(newChat.id);
      setShowPodcastModal(true);
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Failed to create chat: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handlePodcastQuery = async (query: string) => {
    if (!pendingChatId) return;

    setModalLoading(true);
    setModalError(null);

    try {
      const response = await apiService.queryPodcasts(query, pendingChatId!);
      const podcasts: Podcast[] = [];
      
      // Extract non-null podcasts
      for (let i = 1; i <= 5; i++) {
        const podcast = response[`podcast ${i}` as keyof typeof response] as Podcast | null;
        if (podcast) {
          podcasts.push(podcast);
        }
      }

      setModalPodcasts(podcasts);
      setShowPodcastResults(true);
    } catch (error) {
      handleError(error);
      setModalError(error instanceof Error ? error.message : 'Failed to search podcasts');
    } finally {
      setModalLoading(false);
    }
  };

  const handlePodcastSelect = async (podcast: Podcast) => {
    if (!pendingChatId) return;

    console.log('Processing podcast:', podcast);
    console.log('Pending chat ID:', pendingChatId);

    setModalLoading(true);
    setModalError(null);

    try {
      const result = await apiService.processPodcast(
        podcast.feedUrl,
        pendingChatId,
        podcast.collectionName
      );
      
      console.log('Process podcast result:', result);

      // Update chat title to podcast name
      await apiService.updateChatTitle(pendingChatId, podcast.collectionName);

      // Close modal and refresh chats
      setShowPodcastModal(false);
      setShowPodcastResults(false);
      setModalPodcasts([]);
      setPendingChatId(null);
      
      console.log('Refreshing chats and selected chat...');
      await loadChats();
      await loadSelectedChat();
      console.log('Refresh complete');
    } catch (error) {
      console.error('Failed to process podcast:', error);
      setModalError(error instanceof Error ? error.message : 'Failed to process podcast');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedChatId) return;
    setChatLoading(true);
    try {
      await apiService.sendQuery(message, selectedChatId);
      await loadSelectedChat();
    } catch (error) {
      console.error('Failed to send message:', error);
      handleError(error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleLoadAndAnswer = async (
    audioUrl: string,
    episodeTitle: string,
    originalQuestion: string,
    messageIndex: number
  ) => {
    if (!selectedChatId) return;
    setLoadingEpisodeForIndex(messageIndex);
    try {
      await apiService.loadAndAnswer(audioUrl, selectedChatId, episodeTitle, originalQuestion);
      await loadSelectedChat();
    } catch (error) {
      console.error('Failed to load and answer:', error);
      handleError(error);
    } finally {
      setLoadingEpisodeForIndex(null);
    }
  };


  const handleUpdateChatTitle = async (chatId: string, title: string) => {
    try {
      await apiService.updateChatTitle(chatId, title);
      await loadChats();
      await loadSelectedChat();
    } catch (error) {
      console.error('Failed to update chat title:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    console.log('=== DELETE CHAT CALLED ===');
    console.log('Deleting chat ID:', chatId);
    
    try {
      await apiService.deleteChat(chatId);
      console.log('✅ Chat deleted successfully');
      
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('❌ Failed to delete chat:', error);
    }
  };

  const handleTypingComplete = async () => {
    setShowTypingAnimation(false);
    setPendingResponse('');
    // Refresh chat to show the final stored message
    await loadSelectedChat();
  };

  const handleModalClose = () => {
    setShowPodcastModal(false);
    setShowPodcastResults(false);
    setModalPodcasts([]);
    setModalError(null);
    setPendingChatId(null);
  };

  const handleModalBack = () => {
    setShowPodcastResults(false);
    setModalPodcasts([]);
    setModalError(null);
  };

  if (!username) {
    return <UsernameInput onUsernameSubmit={handleUsernameSubmit} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)' }}>
      <Sidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleUpdateChatTitle}
      />
      
      <ChatInterface
        chat={selectedChat}
        onSendMessage={handleSendMessage}
        loading={chatLoading}
        onLoadAndAnswer={handleLoadAndAnswer}
        loadingEpisodeForIndex={loadingEpisodeForIndex}
        onUpdateChatTitle={handleUpdateChatTitle}
        onDeleteChat={handleDeleteChat}
        pendingResponse={pendingResponse}
        showTypingAnimation={showTypingAnimation}
        onTypingComplete={handleTypingComplete}
      />

      <RateLimitModal
        isOpen={showRateLimitModal}
        onClose={() => setShowRateLimitModal(false)}
      />

      <PodcastQueryModal
        isOpen={showPodcastModal}
        onClose={handleModalClose}
        onQuery={handlePodcastQuery}
        onPodcastSelect={handlePodcastSelect}
        podcasts={modalPodcasts}
        loading={modalLoading}
        error={modalError}
        showResults={showPodcastResults}
        onBack={handleModalBack}
      />
    </div>
  );
}

export default App;