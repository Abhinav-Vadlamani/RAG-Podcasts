// services/api.ts
import { Chat, PodcastQueryResponse, QueryResponse } from '../types';

const API_BASE_URL = 'http://127.0.0.1:5002/api';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get all chats for a user
  async getChats(username: string): Promise<Chat[]> {
    return this.request<Chat[]>(`/chats?username=${encodeURIComponent(username)}`, {
      method: 'GET',
    });
  }

  // Create a new chat
  async createChat(title: string, username: string): Promise<Chat> {
    return this.request<Chat>('/chats', {
      method: 'POST',
      body: JSON.stringify({ title, username }),
    });
  }

  // Get a specific chat
  async getChat(chatId: string): Promise<Chat> {
    return this.request<Chat>(`/chats/${chatId}`);
  }

  // Query for podcasts
  async queryPodcasts(query: string, chatId: string): Promise<PodcastQueryResponse> {
    return this.request<PodcastQueryResponse>('/chats/query-podcast', {
      method: 'POST',
      body: JSON.stringify({ query, chat_id: chatId }),
    });
  }

  // Process selected podcast
  async processPodcast(
    feedUrl: string,
    chatId: string,
    podcastTitle: string
  ): Promise<{ status: string }> {
    return this.request<{ status: string }>('/chats/process-podcast', {
      method: 'POST',
      body: JSON.stringify({
        feed_url: feedUrl,
        chat_id: chatId,
        podcast_title: podcastTitle,
      }),
    });
  }

  // Process episode
  async processEpisode(
    audioUrl: string,
    chatId: string,
    episodeTitle: string
  ): Promise<any> {
    return this.request<any>('/chats/process-episode', {
      method: 'POST',
      body: JSON.stringify({
        audio_url: audioUrl,
        chat_id: chatId,
        episode_title: episodeTitle,
      }),
    });
  }

  // Send query
  async sendQuery(question: string, chatId: string): Promise<QueryResponse> {
    return this.request<QueryResponse>('/query', {
      method: 'POST',
      body: JSON.stringify({ question, chat_id: chatId }),
    });
  }

  // Delete chat
  async deleteChat(chatId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/chats/${chatId}`, {
      method: 'DELETE',
    });
  }

  // Update chat title
  async updateChatTitle(chatId: string, title: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/chats/${chatId}`, {
      method: 'PATCH',
      body: JSON.stringify({ update_title: true, title }),
    });
  }
}

export const apiService = new ApiService();