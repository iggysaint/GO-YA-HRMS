import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ChatChannelWithDetails,
  ChatMessageWithSender,
  ChatMemberInfo,
  Role,
} from '../types';
import { StatusPill } from '../components/StatusPill';
import {
  MessageSquare,
  Plus,
  Search,
  Send,
  Users,
  User,
  Hash,
  X,
  Check,
  Shield,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

interface ChatPageProps {
  initialChannelId?: string | null;
}

export const ChatPage: React.FC<ChatPageProps> = ({ initialChannelId }) => {
  const { authFetch, user, organization, subscribeToRealtime } = useAuth();

  const [channels, setChannels] = useState<ChatChannelWithDetails[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(initialChannelId || null);
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<ChatMemberInfo[]>([]);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New Chat Modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'1on1' | 'group'>('1on1');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [selectedMemberIdsForGroup, setSelectedMemberIdsForGroup] = useState<string[]>([]);
  const [showChannelInfo, setShowChannelInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch workspace channels
  const fetchChannels = async () => {
    try {
      const res = await authFetch('/api/chat/channels');
      if (res.ok) {
        const data = await res.json();
        const chList: ChatChannelWithDetails[] = data.channels || [];
        setChannels(chList);

        // If no channel is selected and we have channels, select the first one
        if (!selectedChannelId && chList.length > 0) {
          setSelectedChannelId(chList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Fetch workspace members for new 1:1 and group chats
  const fetchWorkspaceMembers = async () => {
    try {
      const res = await authFetch('/api/chat/workspace-members');
      if (res.ok) {
        const data = await res.json();
        setWorkspaceMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch workspace members:', err);
    }
  };

  // Fetch messages for active channel
  const fetchMessages = async (channelId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await authFetch(`/api/chat/channels/${channelId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchWorkspaceMembers();
  }, [organization?.id]);

  useEffect(() => {
    if (selectedChannelId) {
      fetchMessages(selectedChannelId);
    } else {
      setMessages([]);
    }
  }, [selectedChannelId]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription for live messages and new channels
  useEffect(() => {
    const unsubscribe = subscribeToRealtime((payload) => {
      if (payload.event === 'chat_message_created') {
        const { channel_id, message } = payload.data || {};
        if (channel_id && message) {
          // If message belongs to active channel, append live
          if (channel_id === selectedChannelId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === message.id)) return prev;
              return [...prev, message];
            });
          }

          // Update channels list last_message and sort by most recent activity
          setChannels((prev) => {
            const updated = prev.map((ch) => {
              if (ch.id === channel_id) {
                return { ...ch, last_message: message };
              }
              return ch;
            });
            return updated.sort((a, b) => {
              const timeA = new Date(a.last_message?.created_at || a.created_at).getTime();
              const timeB = new Date(b.last_message?.created_at || b.created_at).getTime();
              return timeB - timeA;
            });
          });
        }
      }

      if (payload.event === 'chat_channel_created') {
        fetchChannels();
      }
    });

    return unsubscribe;
  }, [subscribeToRealtime, selectedChannelId]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedChannelId || !inputText.trim() || isSending) return;

    const content = inputText.trim();
    setIsSending(true);

    try {
      const res = await authFetch(`/api/chat/channels/${selectedChannelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        // Optimistically add if not already received via realtime
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setInputText('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Start 1:1 chat with a member
  const handleStartDirectMessage = async (targetUserId: string) => {
    try {
      const res = await authFetch('/api/chat/channels', {
        method: 'POST',
        body: JSON.stringify({
          is_group: false,
          member_ids: [targetUserId],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const targetChannel: ChatChannelWithDetails = data.channel;
        setIsNewChatModalOpen(false);

        // Update channels and select target
        setChannels((prev) => {
          if (!prev.some((c) => c.id === targetChannel.id)) {
            return [targetChannel, ...prev];
          }
          return prev;
        });
        setSelectedChannelId(targetChannel.id);
      }
    } catch (err) {
      console.error('Failed to start 1:1 chat:', err);
    }
  };

  // Create a new group channel
  const handleCreateGroupChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim() || selectedMemberIdsForGroup.length === 0) return;

    try {
      const res = await authFetch('/api/chat/channels', {
        method: 'POST',
        body: JSON.stringify({
          is_group: true,
          name: groupNameInput.trim(),
          member_ids: selectedMemberIdsForGroup,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const targetChannel: ChatChannelWithDetails = data.channel;
        setIsNewChatModalOpen(false);
        setGroupNameInput('');
        setSelectedMemberIdsForGroup([]);

        setChannels((prev) => [targetChannel, ...prev]);
        setSelectedChannelId(targetChannel.id);
      }
    } catch (err) {
      console.error('Failed to create group channel:', err);
    }
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  // Filter channels based on search query
  const filteredChannels = channels.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesName = c.display_name.toLowerCase().includes(q);
    const matchesLastMsg = c.last_message?.content.toLowerCase().includes(q);
    const matchesMember = c.members.some((m) => m.name.toLowerCase().includes(q));
    return matchesName || matchesLastMsg || matchesMember;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeActivity = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div id="internal-chat-page" className="flex h-full w-full overflow-hidden bg-[var(--bg-primary)]">
      {/* ========================================================================= */}
      {/* Left Column: Channel List */}
      {/* ========================================================================= */}
      <div className="w-80 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[var(--text-primary)]">Internal Chat</h1>
              <p className="text-[11px] text-[var(--text-muted)]">
                {channels.length} {channels.length === 1 ? 'channel' : 'channels'}
              </p>
            </div>
          </div>
          <button
            id="open-new-chat-modal-btn"
            onClick={() => {
              setModalTab('1on1');
              setIsNewChatModalOpen(true);
            }}
            className="p-1.5 rounded-md bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center gap-1 text-xs font-medium px-2.5"
            title="Start new chat"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Search Channels */}
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
            <input
              id="chat-search-input"
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]/50">
          {isLoadingChannels ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Loading conversations...
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-40 mb-2" />
              <p className="text-xs font-medium text-[var(--text-primary)]">No conversations found</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Start a 1:1 message or create a group channel.
              </p>
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="mt-3 px-3 py-1.5 rounded-md text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium cursor-pointer transition-colors"
              >
                + New Chat
              </button>
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isSelected = channel.id === selectedChannelId;
              const otherMember = !channel.is_group
                ? channel.members.find((m) => m.user_id !== user?.id) || channel.members[0]
                : null;
              const lastMsgTime = formatRelativeActivity(
                channel.last_message?.created_at || channel.created_at
              );

              return (
                <div
                  key={channel.id}
                  id={`channel-item-${channel.id}`}
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={`p-3 transition-colors cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-[var(--bg-active)] border-l-2 border-[var(--accent-primary)]'
                      : 'hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {/* Channel Avatar */}
                  <div className="relative shrink-0">
                    {channel.is_group ? (
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/20">
                        <Hash className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-xs border border-blue-500/20">
                        {getInitials(channel.display_name)}
                      </div>
                    )}
                  </div>

                  {/* Channel Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {channel.display_name}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                        {lastMsgTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      {channel.is_group ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                          <Users className="w-2.5 h-2.5" />
                          {channel.members.length}
                        </span>
                      ) : otherMember ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] capitalize">
                          {otherMember.role.replace('_', ' ')}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {channel.last_message ? (
                        channel.last_message.content
                      ) : (
                        <span className="italic text-[var(--text-muted)]">No messages yet</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Right Column: Message Thread & Input */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
        {selectedChannel ? (
          <>
            {/* Thread Header */}
            <div className="p-3.5 px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                {selectedChannel.is_group ? (
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                    <Hash className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-xs">
                    {getInitials(selectedChannel.display_name)}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {selectedChannel.display_name}
                    </h2>
                    {selectedChannel.is_group ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 font-medium">
                        Group Channel
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-medium">
                        1:1 Direct Message
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {selectedChannel.is_group
                      ? `${selectedChannel.members.length} members: ${selectedChannel.members.map((m) => m.name).join(', ')}`
                      : `Internal communication • All workspace roles permitted`}
                  </p>
                </div>
              </div>

              <button
                id="toggle-channel-info-btn"
                onClick={() => setShowChannelInfo(!showChannelInfo)}
                className={`p-1.5 rounded-md border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showChannelInfo
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
                title="Channel participants"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">{selectedChannel.members.length} Members</span>
              </button>
            </div>

            {/* Main Stage: Messages & Optional Info Drawer */}
            <div className="flex-1 flex overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Conversation welcome banner */}
                <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center max-w-lg mx-auto mb-6">
                  <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                    {selectedChannel.is_group ? <Hash className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {selectedChannel.is_group
                      ? `Welcome to #${selectedChannel.display_name}`
                      : `Conversation with ${selectedChannel.display_name}`}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {selectedChannel.is_group
                      ? `This is the start of the ${selectedChannel.display_name} channel.`
                      : `This is the start of your direct messaging thread.`}
                  </p>
                </div>

                {isLoadingMessages ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10 text-xs text-[var(--text-muted)]">
                    No messages yet. Send a message to get started!
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwnMessage = msg.sender_id === user?.id;

                    return (
                      <div
                        key={msg.id}
                        id={`chat-message-${msg.id}`}
                        className={`flex gap-3 max-w-2xl ${isOwnMessage ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        {/* Sender Avatar */}
                        <div className="shrink-0 pt-0.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              isOwnMessage
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-[var(--text-primary)]'
                            }`}
                          >
                            {getInitials(msg.sender_name || 'User')}
                          </div>
                        </div>

                        {/* Bubble */}
                        <div className={`flex-1 min-w-0 ${isOwnMessage ? 'text-right' : ''}`}>
                          <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                              {msg.sender_name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] capitalize">
                              {msg.sender_role ? msg.sender_role.replace('_', ' ') : 'Member'}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {formatMessageTime(msg.created_at)}
                            </span>
                          </div>

                          <div
                            className={`inline-block p-3 rounded-xl text-xs leading-relaxed text-left whitespace-pre-wrap break-words ${
                              isOwnMessage
                                ? 'bg-[var(--accent-primary)] text-white shadow-2xs'
                                : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-2xs'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Members Info Panel (Collapsible) */}
              {showChannelInfo && (
                <div className="w-64 border-l border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      Channel Members
                    </h4>
                    <button
                      onClick={() => setShowChannelInfo(false)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto flex-1">
                    {selectedChannel.members.map((member) => (
                      <div key={member.user_id} className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-[var(--bg-hover)]">
                        <div className="w-7 h-7 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center font-semibold text-[10px] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                          {getInitials(member.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                            {member.name}
                            {member.user_id === user?.id && ' (You)'}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] capitalize">
                            {member.role.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                    Created {new Date(selectedChannel.created_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Message Input Stage */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    id="chat-message-input"
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Message ${selectedChannel.display_name}... (Press Enter to send)`}
                    className="w-full px-4 py-2.5 text-xs rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-none max-h-32"
                  />
                </div>
                <button
                  id="chat-send-btn"
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="px-4 py-2.5 rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-all font-medium text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-4 shadow-sm">
              <MessageSquare className="w-8 h-8 opacity-60" />
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Select a conversation</h2>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1 mb-6">
              Choose a direct message or group channel from the left sidebar, or start a new conversation with your team.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setModalTab('1on1');
                  setIsNewChatModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
              >
                + Direct Message (1:1)
              </button>
              <button
                onClick={() => {
                  setModalTab('group');
                  setIsNewChatModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-medium cursor-pointer transition-colors shadow-xs"
              >
                + Group Channel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* New Chat Modal: 1:1 or Group Creation */}
      {/* ========================================================================= */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">New Conversation</h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Internal team communication across all workspace roles
                </p>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1 gap-1">
              <button
                onClick={() => setModalTab('1on1')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTab === '1on1'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-2xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>1:1 Direct Message</span>
              </button>
              <button
                onClick={() => setModalTab('group')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTab === 'group'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-2xs font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Group Channel</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {modalTab === '1on1' ? (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-muted)] mb-3">
                    Select any workspace member to start or open a direct conversation:
                  </p>
                  <div className="divide-y divide-[var(--border-subtle)]/50 border border-[var(--border-subtle)] rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                    {workspaceMembers.map((member) => {
                      const isSelf = member.user_id === user?.id;
                      return (
                        <div
                          key={member.user_id}
                          onClick={() => {
                            if (!isSelf) handleStartDirectMessage(member.user_id);
                          }}
                          className={`p-3 flex items-center justify-between transition-colors ${
                            isSelf
                              ? 'opacity-60 bg-[var(--bg-subtle)] cursor-not-allowed'
                              : 'hover:bg-[var(--bg-hover)] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold text-xs shrink-0">
                              {getInitials(member.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                                {member.name} {isSelf && '(You)'}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)] truncate">{member.email}</p>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] capitalize shrink-0">
                            {member.role.replace('_', ' ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateGroupChannel} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      Channel Name
                    </label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
                      <input
                        id="new-group-name-input"
                        type="text"
                        required
                        placeholder="e.g. People Operations & Recruiting"
                        value={groupNameInput}
                        onChange={(e) => setGroupNameInput(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      Add Workspace Members ({selectedMemberIdsForGroup.length} selected)
                    </label>
                    <div className="border border-[var(--border-subtle)] rounded-lg divide-y divide-[var(--border-subtle)]/50 max-h-56 overflow-y-auto">
                      {workspaceMembers.map((member) => {
                        const isSelf = member.user_id === user?.id;
                        const isSelected = isSelf || selectedMemberIdsForGroup.includes(member.user_id);

                        return (
                          <div
                            key={member.user_id}
                            onClick={() => {
                              if (isSelf) return;
                              setSelectedMemberIdsForGroup((prev) =>
                                prev.includes(member.user_id)
                                  ? prev.filter((id) => id !== member.user_id)
                                  : [...prev, member.user_id]
                              );
                            }}
                            className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                                    : 'border-[var(--border-subtle)]'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-medium text-[var(--text-primary)] block truncate">
                                  {member.name} {isSelf && '(Creator/You)'}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] capitalize">
                                  {member.role.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNewChatModalOpen(false)}
                      className="px-3 py-1.5 rounded-md text-xs border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="submit-create-group-btn"
                      type="submit"
                      disabled={!groupNameInput.trim()}
                      className="px-3 py-1.5 rounded-md text-xs bg-[var(--accent-primary)] text-white font-medium hover:opacity-90 cursor-pointer disabled:opacity-50"
                    >
                      Create Channel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
