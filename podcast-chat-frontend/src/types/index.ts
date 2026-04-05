// types/index.ts
export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message?: Message;
  all_messages: Message[];
  episodes?: Episode[];
  podcast_title?: string;
  feed_url?: string;
  username: string;
}

export interface Message {
  type: 'question' | 'answer';
  content: string | any;
  timestamp: string;
  isSearch?: boolean;
  needsLoad?: boolean;
  episodeData?: { title: string; audio_url: string; summary: string };
  originalQuestion?: string;
  loadedEpisode?: string;
}

export interface Podcast {
  collectionId: string;
  collectionName: string;
  artistName: string;
  feedUrl: string;
  summary: string;
  artworkUrl600: string;
}

export interface Episode {
  title: string;
  audio_url: string;
  description?: string;
  pub_date?: string;
  summary?: string;
  id?: string;
}

export interface QueryResponse {
  type: 'search' | 'query';
  results: any;
}

export interface PodcastQueryResponse {
  status: string;
  'podcast 1'?: Podcast | null;
  'podcast 2'?: Podcast | null;
  'podcast 3'?: Podcast | null;
  'podcast 4'?: Podcast | null;
  'podcast 5'?: Podcast | null;
}