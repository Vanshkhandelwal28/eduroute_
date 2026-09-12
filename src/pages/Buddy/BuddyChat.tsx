import { useState, useRef, useEffect } from 'react';
import { Send, Plus, Settings2, Trash2, Edit2, ChevronLeft, MessageCircle } from 'lucide-react';
import { getAuthUser } from '../../utils/rbacAuth';
import axios from 'axios';

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function BuddyChat() {
  const user = getAuthUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  }, [currentConversation]);

  const loadConversations = async () => {
    try {
      const response = await axios.get(`${apiUrl}/buddy/conversations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setConversations(response.data.data || []);
    } catch (error) {
      console.error('Failed to load conversations', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await axios.get(`${apiUrl}/buddy/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setMessages(response.data.data || []);
    } catch (error) {
      console.error('Failed to load messages', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await axios.post(
        `${apiUrl}/buddy/conversations`,
        { title: 'New Conversation' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      const newConv = response.data.data;
      setConversations([newConv, ...conversations]);
      setCurrentConversation(newConv);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentConversation) return;

    setLoading(true);
    const userMessage = input;
    setInput('');

    try {
      // Optimistically add user message
      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        conversationId: currentConversation.id,
        role: 'user',
        content: userMessage,
        createdAt: new Date().toISOString(),
      };
      setMessages([...messages, tempUserMsg]);

      // Send to API
      const response = await axios.post(
        `${apiUrl}/buddy/conversations/${currentConversation.id}/messages`,
        { message: userMessage },
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );

      const aiMessage = response.data.data;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        tempUserMsg,
        aiMessage,
      ]);

      // Update conversation title if it's the first message
      if (messages.length === 0) {
        const titleSuggestion = userMessage.substring(0, 50);
        updateConversationTitle(currentConversation.id, titleSuggestion);
      }
    } catch (error) {
      console.error('Failed to send message', error);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    } finally {
      setLoading(false);
    }
  };

  const updateConversationTitle = async (id: string, newTitle: string) => {
    try {
      await axios.patch(
        `${apiUrl}/buddy/conversations?id=${id}`,
        { title: newTitle },
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
      if (currentConversation?.id === id) {
        setCurrentConversation({ ...currentConversation, title: newTitle });
      }
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update conversation', error);
    }
  };

  const deleteConversation = async (id: string) => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await axios.delete(`${apiUrl}/buddy/conversations?id=${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation', error);
    }
  };

  const renderMarkdown = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|_[^_]+_|\n)/g);
    return (
      <span className="whitespace-pre-wrap">
        {parts.map((part, i) => {
          if (part.startsWith('```')) return <code key={i} className="bg-slate-900 text-orange-300 px-2 py-1 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
          if (part.startsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
          if (part.startsWith('_')) return <em key={i} className="italic">{part.slice(1, -1)}</em>;
          if (part === '\n') return <br key={i} />;
          return part;
        })}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 bg-slate-100 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-slate-300 dark:border-slate-700">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            <Plus size={18} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 rounded-lg cursor-pointer transition group ${
                currentConversation?.id === conv.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              onClick={() => setCurrentConversation(conv)}
            >
              <div className="flex items-start gap-2 justify-between">
                <div className="flex-1 truncate">
                  {editingId === conv.id ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') updateConversationTitle(conv.id, editingTitle);
                      }}
                      className="w-full px-2 py-1 rounded text-sm bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                  )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(conv.id);
                      setEditingTitle(conv.title);
                    }}
                    className="p-1 hover:bg-slate-300 dark:hover:bg-slate-600 rounded"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="p-1 hover:bg-red-500 hover:text-white rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <ChevronLeft size={20} className={sidebarOpen ? '' : 'rotate-180'} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageCircle size={20} className="text-purple-600" />
                {currentConversation?.title || 'Buddy AI Mentor'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">DSA • Backend • Career Guidance</p>
            </div>
          </div>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <Settings2 size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentConversation ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Start a new conversation</p>
                <p className="text-sm mt-2">Click "New Chat" to begin chatting with your AI mentor</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-500 dark:text-slate-400 max-w-md">
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Welcome to Buddy AI Mentor
                </h2>
                <p className="mb-4">
                  Ask me anything about:
                </p>
                <ul className="text-sm space-y-2 mb-6">
                  <li>📚 Data Structures & Algorithms (DSA)</li>
                  <li>🔧 Backend Development & Go</li>
                  <li>💼 Career guidance & internships</li>
                  <li>📄 Resume & interview prep</li>
                  <li>🚀 GSoC preparation</li>
                  <li>🎯 Project guidance</li>
                </ul>
                <p className="text-xs text-slate-400">Type your first message below to get started</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="text-sm leading-relaxed">{renderMarkdown(msg.content)}</div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {currentConversation && (
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask Buddy anything..."
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-600"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
