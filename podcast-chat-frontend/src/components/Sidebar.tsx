// components/Sidebar.tsx
import React from 'react';
import { Chat } from '../types';
import { Plus } from 'lucide-react';

interface SidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  selectedChatId,
  onChatSelect,
  onNewChat,
}) => {
  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-4 text-gray-400 text-center">
            No chats yet. Create your first chat!
          </div>
        ) : (
          <div className="p-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onChatSelect(chat.id)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  selectedChatId === chat.id
                    ? 'bg-gray-700'
                    : 'hover:bg-gray-800'
                }`}
              >
                <div className="font-medium truncate">{chat.title}</div>
                {chat.podcast_title && (
                  <div className="text-sm text-gray-400 truncate">
                    {chat.podcast_title}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {new Date(chat.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;