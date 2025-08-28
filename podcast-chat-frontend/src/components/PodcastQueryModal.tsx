// components/PodcastQueryModal.tsx
import React, { useState } from 'react';
import { X, Search, ArrowLeft } from 'lucide-react';
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

  if (!isOpen) return null;

  console.log('Modal state:', { showResults, selectedPodcast, podcasts: podcasts.length, loading });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onQuery(query.trim());
    }
  };

  const handlePodcastClick = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
  };

  const handleConfirm = () => {
    if (selectedPodcast) {
      onPodcastSelect(selectedPodcast);
    }
  };

  const handleBack = () => {
    setSelectedPodcast(null);
    onBack();
  };

  const handleClose = () => {
    setSelectedPodcast(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {showResults ? 'Select a Podcast' : 'Search for Podcasts'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {!showResults ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What type of podcasts are you looking for?
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., technology, business, health..."
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search Podcasts'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft size={16} />
                Back to search
              </button>

              {podcasts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No podcasts found. Try a different search query.
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {podcasts.map((podcast, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedPodcast?.collectionId === podcast.collectionId
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handlePodcastClick(podcast)}
                      >
                        <div className="flex gap-3">
                          {podcast.artworkUrl600 && (
                            <img
                              src={podcast.artworkUrl600}
                              alt={podcast.collectionName}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {podcast.collectionName}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
                              by {podcast.artistName}
                            </p>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {podcast.summary}
                            </p>
                          </div>
                          {selectedPodcast?.collectionId === podcast.collectionId && (
                            <div className="flex-shrink-0 flex items-center">
                              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedPodcast && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {loading ? 'Processing...' : 'Confirm Selection'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PodcastQueryModal;