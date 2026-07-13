import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chatService';
import { ChatConversation, ChatMessage } from '../types';
import Sidebar from '../components/Sidebar';
import { 
  Bot, 
  Send, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  HelpCircle, 
  Sparkles, 
  ChevronRight,
  ClipboardCheck,
  Compass
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const AIAssistant: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const prefill = searchParams.get('q') || '';

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('welcome');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Suggested Questions
  const suggestedQuestions = [
    'What is PM Kisan Samman Nidhi?',
    'How do I check my eligibility for schemes?',
    'What documents do I need?',
    'Tell me about Ayushman Bharat',
    'Show me scholarship schemes'
  ];

  // Load Chats on Mount
  useEffect(() => {
    const loadChats = async () => {
      const chats = await chatService.getConversations();
      setConversations(chats);
      if (chats.length > 0) {
        setActiveConvId(chats[0].id);
      }
    };
    loadChats();
  }, []);

  // Handle URL Prefill
  useEffect(() => {
    if (prefill && conversations.length > 0) {
      handleSend(prefill);
    }
  }, [prefill, conversations.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, isTyping]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    let currentConvId = activeConvId;
    let updatedConvs = [...conversations];
    let currentConv = updatedConvs.find(c => c.id === currentConvId);

    // Create new conversation if none exists or welcome is cleared
    if (!currentConv || currentConv.id === 'welcome' && currentConv.messages.length === 1 && currentConv.messages[0].id === 'init-msg') {
      const newId = Math.random().toString(36).substring(7);
      currentConvId = newId;
      currentConv = {
        id: newId,
        title: textToSend.substring(0, 30) + (textToSend.length > 30 ? '...' : ''),
        messages: [],
        lastUpdated: new Date().toISOString()
      };
      updatedConvs = [currentConv, ...updatedConvs.filter(c => c.id !== 'welcome')];
      setActiveConvId(newId);
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    currentConv.messages.push(userMsg);
    currentConv.lastUpdated = new Date().toISOString();
    setConversations(updatedConvs);
    setInputText('');
    setIsTyping(true);

    try {
      // Get AI answer
      const reply = await chatService.sendMessage(textToSend, currentConvId);
      currentConv.messages.push(reply);
      currentConv.lastUpdated = new Date().toISOString();
      
      // Update sidebar title if it's the first actual question
      if (currentConv.messages.filter(m => m.sender === 'user').length === 1) {
        currentConv.title = textToSend.substring(0, 30) + (textToSend.length > 30 ? '...' : '');
      }

      setConversations([...updatedConvs]);
      await chatService.saveConversations(updatedConvs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    const newId = Math.random().toString(36).substring(7);
    const newConv: ChatConversation = {
      id: newId,
      title: `Conversation ${conversations.length + 1}`,
      messages: [
        {
          id: Math.random().toString(36).substring(7),
          sender: 'ai',
          text: `Hello! I am **SetuAI**. How can I help you check eligibility or learn about government benefits today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      lastUpdated: new Date().toISOString()
    };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveConvId(newId);
    chatService.saveConversations(updated);
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear your conversation history?')) {
      const welcomeChat: ChatConversation = {
        id: 'welcome',
        title: 'Introduction to SetuAI',
        messages: [
          {
            id: 'init-msg',
            sender: 'ai',
            text: `Hello! I am **SetuAI**, your intelligent government schemes guide. How can I assist you today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      setConversations([welcomeChat]);
      setActiveConvId('welcome');
      localStorage.setItem('schemesetu_chats', JSON.stringify([welcomeChat]));
    }
  };

  const handleDeleteConversation = (id: string) => {
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    chatService.saveConversations(updated);

    if (activeConvId === id) {
      if (updated.length > 0) {
        setActiveConvId(updated[0].id);
      } else {
        const welcomeChat: ChatConversation = {
          id: 'welcome',
          title: 'Introduction to SetuAI',
          messages: [
            {
              id: 'init-msg',
              sender: 'ai',
              text: `Hello! I am **SetuAI**, your intelligent government schemes guide. How can I assist you today?`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ],
          lastUpdated: new Date().toISOString()
        };
        setConversations([welcomeChat]);
        setActiveConvId('welcome');
        chatService.saveConversations([welcomeChat]);
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Custom basic Markdown formatter
  const parseMarkdown = (text: string) => {
    // Bold matching
    let formatted = text.split('**').map((chunk, i) => {
      if (i % 2 === 1) return <strong key={`b-${i}`} className="font-extrabold text-primary dark:text-white">{chunk}</strong>;
      return chunk;
    });

    // Links matching `[title](url)`
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    // Convert formatted array back to HTML nodes or perform simple inline parsing
    // To do it cleanly, let's format line-by-line:
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Check for bullet lists
      const isBullet = line.trim().startsWith('- ');
      const isHeader = line.trim().startsWith('### ');
      let content = line;

      if (isBullet) content = line.trim().substring(2);
      if (isHeader) content = line.trim().substring(4);

      // Perform link replacement
      const matches = [...content.matchAll(linkRegex)];
      let nodes: React.ReactNode[] = [];
      let lastIndex = 0;

      if (matches.length > 0) {
        matches.forEach((match, matchIdx) => {
          const index = match.index || 0;
          // Add plain text before match
          if (index > lastIndex) {
            nodes.push(content.substring(lastIndex, index));
          }
          // Add link
          const linkTitle = match[1];
          const linkUrl = match[2];
          
          if (linkUrl.startsWith('/')) {
            nodes.push(
              <Link key={`link-${matchIdx}`} to={linkUrl} className="text-secondary dark:text-sky-400 font-bold hover:underline">
                {linkTitle}
              </Link>
            );
          } else {
            nodes.push(
              <a key={`link-${matchIdx}`} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-secondary dark:text-sky-400 font-bold hover:underline inline-flex items-center gap-0.5">
                {linkTitle}
              </a>
            );
          }
          lastIndex = index + match[0].length;
        });

        if (lastIndex < content.length) {
          nodes.push(content.substring(lastIndex));
        }
      } else {
        // Just bold check
        const boldChunks = content.split('**');
        nodes = boldChunks.map((chunk, chunkIdx) => {
          if (chunkIdx % 2 === 1) return <strong key={chunkIdx} className="font-extrabold text-primary dark:text-white">{chunk}</strong>;
          return chunk;
        });
      }

      if (isBullet) {
        return (
          <li key={lineIdx} className="list-disc list-inside leading-relaxed text-xs md:text-sm pl-2">
            {nodes}
          </li>
        );
      }

      if (isHeader) {
        return (
          <h4 key={lineIdx} className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pt-2">
            {nodes}
          </h4>
        );
      }

      return (
        <p key={lineIdx} className="leading-relaxed text-xs md:text-sm min-h-[1rem]">
          {nodes}
        </p>
      );
    });
  };

  return (
    <div className="flex-grow flex h-[calc(100vh-4rem)] overflow-hidden bg-background dark:bg-zinc-950 transition-colors">
      {isAuthenticated && <Sidebar activePage="assistant" />}
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Conversations History */}
        <aside className="hidden md:flex flex-col w-72 border-r border-outline-variant dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900 shrink-0 p-4 justify-between transition-colors">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary dark:bg-zinc-800 text-white rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-sm font-extrabold text-primary dark:text-white">SetuAI</h2>
              <p className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-bold uppercase tracking-wider">Scheme Assistant</p>
            </div>
          </div>

          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            {t('newConversation')}
          </button>

          <div className="space-y-1.5 overflow-y-auto max-h-[50vh] custom-scrollbar pr-1">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-550 mb-2">History</h3>
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={cn(
                  "w-full rounded-lg text-xs font-semibold transition-colors flex items-center justify-between group relative border",
                  activeConvId === conv.id
                    ? "bg-white dark:bg-zinc-800 text-secondary dark:text-sky-400 font-bold border-outline-variant dark:border-zinc-700"
                    : "text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-high dark:hover:bg-zinc-800/50 border-transparent"
                )}
              >
                <button
                  onClick={() => setActiveConvId(conv.id)}
                  className="flex-grow text-left px-3 py-2.5 truncate focus:outline-none cursor-pointer"
                >
                  {conv.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  className="p-1 mr-1 text-on-surface-variant hover:text-error dark:text-zinc-500 dark:hover:text-red-400 rounded hover:bg-surface-container-high dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none cursor-pointer"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Clear Actions */}
        <button
          onClick={handleClearChat}
          className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-700 focus:outline-none py-2 px-3 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          {t('clearChat')}
        </button>
      </aside>

      {/* Main Chat Panel */}
      <div className="flex-grow flex flex-col justify-between max-w-4xl mx-auto w-full relative">
        
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar pb-24">
          <AnimatePresence>
            {activeConv && activeConv.messages.map(msg => {
              const isAI = msg.sender === 'ai';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3 md:gap-4 max-w-[85%]",
                    isAI ? "mr-auto" : "ml-auto flex-row-reverse"
                  )}
                >
                  {/* Avatar Icon */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm font-bold text-xs select-none",
                    isAI 
                      ? "bg-primary text-white border-primary dark:bg-zinc-850 dark:border-zinc-700" 
                      : "bg-secondary text-white border-secondary"
                  )}>
                    {isAI ? <Bot className="w-4 h-4" /> : 'U'}
                  </div>

                  {/* Message Bubble */}
                  <div className="space-y-1">
                    <div className={cn(
                      "rounded-2xl p-4 shadow-sm text-xs md:text-sm leading-relaxed border space-y-2",
                      isAI 
                        ? "bg-white dark:bg-zinc-900 border-outline-variant dark:border-zinc-800 text-on-surface dark:text-zinc-200" 
                        : "bg-secondary text-white border-secondary dark:bg-sky-600 dark:border-sky-600"
                    )}>
                      {isAI ? parseMarkdown(msg.text) : <p>{msg.text}</p>}
                    </div>
                    
                    {/* Message Meta Info (Time + Copy) */}
                    <div className={cn(
                      "flex items-center gap-2 text-[10px] text-on-surface-variant dark:text-zinc-500 font-semibold px-1",
                      isAI ? "justify-start" : "justify-end"
                    )}>
                      <span>{msg.timestamp}</span>
                      {isAI && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="hover:text-secondary dark:hover:text-sky-400 p-0.5 focus:outline-none transition-colors"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 md:gap-4 mr-auto max-w-[80%]"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white border border-primary dark:bg-zinc-850 dark:border-zinc-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-2xl p-4 shadow-sm text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 italic">
                  {t('typing')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent dark:from-zinc-950 dark:via-zinc-950/95">
          <div className="max-w-2xl mx-auto space-y-2">
            
            {/* Action Bar Input Box */}
            <div className="flex items-center bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-outline-variant dark:border-zinc-800 p-1.5 focus-within:border-secondary dark:focus-within:border-sky-500 transition-all">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
                disabled={isTyping}
                placeholder="Ask SetuAI about government schemes..."
                className="w-full border-none focus:outline-none focus:ring-0 bg-transparent px-4 py-2.5 font-body text-xs md:text-sm text-on-surface dark:text-white outline-none placeholder:text-on-surface-variant/60 dark:placeholder:text-zinc-550"
              />
              <button
                onClick={() => handleSend(inputText)}
                disabled={!inputText.trim() || isTyping}
                className="p-2.5 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all focus:outline-none"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-center text-on-surface-variant dark:text-zinc-550 leading-relaxed font-semibold">
              {t('aiDisclaimer')}
            </p>
          </div>
        </div>

      </div>

      {/* Right Column: Suggested Questions Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 border-l border-outline-variant dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900 shrink-0 p-4 transition-colors space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-550 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-secondary dark:text-sky-400" />
          Suggested Questions
        </h3>
        
        <div className="space-y-2 flex-grow overflow-y-auto custom-scrollbar">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isTyping}
              className="w-full text-left p-2.5 bg-white dark:bg-zinc-850 hover:bg-secondary/10 dark:hover:bg-sky-500/10 border border-outline-variant dark:border-zinc-800 hover:border-secondary dark:hover:border-sky-500 rounded-lg text-xs font-semibold text-on-surface dark:text-zinc-350 hover:text-secondary dark:hover:text-sky-400 transition-colors leading-relaxed shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Explore Links */}
        <div className="pt-4 border-t border-outline-variant dark:border-zinc-800 space-y-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-550">Resources</h3>
          
          <Link to="/search" className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-850 border border-outline-variant dark:border-zinc-800 rounded-lg text-xs text-secondary dark:text-sky-400 font-bold hover:bg-secondary/5 shadow-sm">
            <Compass className="w-4 h-4" />
            Browse Schemes
          </Link>
          <Link to="/eligibility" className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-850 border border-outline-variant dark:border-zinc-800 rounded-lg text-xs text-secondary dark:text-sky-400 font-bold hover:bg-secondary/5 shadow-sm">
            <ClipboardCheck className="w-4 h-4" />
            Eligibility Checker
          </Link>
        </div>
      </aside>

      </div>
    </div>
  );
};

export default AIAssistant;
