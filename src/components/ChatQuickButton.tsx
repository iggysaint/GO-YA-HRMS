import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppView } from '../types';
import { MessageSquare } from 'lucide-react';

interface ChatQuickButtonProps {
  onNavigate: (view: AppView) => void;
}

export const ChatQuickButton: React.FC<ChatQuickButtonProps> = ({ onNavigate }) => {
  const { authFetch, organization, subscribeToRealtime } = useAuth();
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Listen for realtime messages to show subtle indicator if not on chat page
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (payload.event === 'chat_message_created') {
        setHasNewMessage(true);
      }
    });
    return unsubscribe;
  }, [subscribeToRealtime]);

  const handleClick = () => {
    setHasNewMessage(false);
    onNavigate('chat');
  };

  return (
    <button
      id="topbar-chat-btn"
      onClick={handleClick}
      className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
      title="Internal Chat (1:1 & Groups)"
      aria-label="Internal Chat"
    >
      <MessageSquare className="w-4 h-4" />
      {hasNewMessage && (
        <span
          id="chat-activity-badge"
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent-primary)] ring-2 ring-[var(--bg-primary)] animate-pulse"
        />
      )}
    </button>
  );
};
