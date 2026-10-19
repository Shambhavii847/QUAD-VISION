import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../services/authContext';
import { ChatMessage } from '../../types';
import {
  sendChatMessage,
  getStoredChatHistory,
  saveStoredChatHistory,
  clearStoredChatHistory,
  getAIProviderStatus,
} from '../../services/ai/aiService';
import { ChatMessageRenderer } from './ChatMessageRenderer';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  ShieldCheck,
  Building2,
  Info,
  ChevronRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface AIAssistantChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistantChatModal: React.FC<AIAssistantChatModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showProviderInfo, setShowProviderInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const providerStatus = getAIProviderStatus();
  const campus = currentUser?.branch_id || currentUser?.campus_id || 'Institutional';

  // Load chat history or initialize welcome message
  useEffect(() => {
    if (!currentUser) return;
    const stored = getStoredChatHistory(currentUser.id);
    if (stored.length > 0) {
      setMessages(stored);
    } else {
      // Seed friendly welcome message
      const welcomeMsg: ChatMessage = {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `👋 Hello **${currentUser.name}**! I am **CourseTracker AI**, your academic copilot.

I am connected directly to your authorized campus records for **${campus}**. I can analyze syllabus progression, calculate remaining hours before exams, identify pending session logs, suggest recovery plans, and recommend topics for revision.

Select a question below or ask anything about your academic schedule!`,
        timestamp: new Date().toISOString(),
        metadata: {
          generatedBy: 'academic_engine',
          suggestedActions: getRoleSuggestedQuestions(currentUser.role),
        },
      };
      setMessages([welcomeMsg]);
      saveStoredChatHistory(currentUser.id, [welcomeMsg]);
    }
  }, [currentUser]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  function getRoleSuggestedQuestions(role: string): string[] {
    switch (role) {
      case 'student':
        return [
          'What topics should I revise today?',
          'What opportunities are open for my batch?',
          'How many syllabus hours remain before exams?',
          'Upcoming exams and syllabus coverage',
        ];
      case 'faculty':
        return [
          'Which subjects are falling behind this semester?',
          'Suggest a recovery plan for this subject',
          'Which faculty session logs are pending?',
          'How many syllabus hours remain?',
        ];
      case 'campus_manager':
        return [
          `Which subjects are falling behind across ${campus}?`,
          'Identify upcoming exam readiness risks',
          'Show missing faculty session logs',
          'Suggest a recovery plan for delayed subjects',
        ];
      case 'admin':
        return [
          'Compare syllabus progress across all branches',
          'Which subjects are falling behind institutional standards?',
          'Review pending administrative logs and escalation counts',
        ];
      default:
        return ['How many syllabus hours remain?', 'Upcoming exams and syllabus coverage'];
    }
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputValue('');
    setLoading(true);

    try {
      const response = await sendChatMessage(text, currentUser, nextMessages);
      const updated = [...nextMessages, response];
      setMessages(updated);
      saveStoredChatHistory(currentUser.id, updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while generating a response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    clearStoredChatHistory(currentUser.id);
    const welcomeMsg: ChatMessage = {
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: `Conversation refreshed. How may I assist you with your academic schedule today, **${currentUser.name}**?`,
      timestamp: new Date().toISOString(),
      metadata: {
        generatedBy: 'academic_engine',
        suggestedActions: getRoleSuggestedQuestions(currentUser.role),
      },
    };
    setMessages([welcomeMsg]);
    saveStoredChatHistory(currentUser.id, [welcomeMsg]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CourseTracker AI Assistant"
      className="fixed z-50 transition-all duration-300 ease-out
        inset-x-3 bottom-3 top-16 sm:inset-auto sm:bottom-20 sm:right-6 sm:w-[440px] sm:h-[620px] sm:max-h-[calc(100vh-6.5rem)]
        flex flex-col bg-[#FAF7F0] border border-[#E8DFC9] rounded-3xl shadow-[0_16px_48px_rgba(28,25,23,0.18)] overflow-hidden"
    >
      {/* 1. Header */}
      <header className="px-4 py-3.5 bg-[#1C1917] text-white flex items-center justify-between shrink-0 border-b border-black/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#F9DF7B] to-[#FBE69B] text-[#1C1917] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 text-[#1C1917]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold tracking-tight text-white truncate">
                CourseTracker AI
              </h2>
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/10 text-[#FBE69B] font-mono font-medium">
                v1.0
              </span>
            </div>
            <div className="text-[10px] text-[#A8A29E] truncate flex items-center gap-1 mt-0.5">
              <span className="capitalize">{currentUser.role.replace('_', ' ')}</span>
              <span>•</span>
              <span className="truncate">{campus}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleResetChat}
            className="p-1.5 rounded-lg text-[#A8A29E] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Start New Conversation"
            aria-label="Start New Conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A8A29E] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Assistant"
            aria-label="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Provider & Security Status Bar */}
      <div className="px-3 py-1.5 bg-[#F4EFE6] border-b border-[#E8DFC9] flex items-center justify-between text-[10px] text-[#78716C] shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="font-medium text-[#44403C]">
            {providerStatus.isConfigured
              ? `${providerStatus.providerName} (${providerStatus.modelName})`
              : 'Institutional Academic Engine'}
          </span>
          <span className="text-[#A8A29E]">•</span>
          <span className="text-[#57534E] font-medium">{campus} Isolated</span>
        </div>

        <button
          type="button"
          onClick={() => setShowProviderInfo(!showProviderInfo)}
          className="text-[#78716C] hover:text-[#1C1917] p-0.5 transition-colors cursor-pointer"
          title="Provider Info"
        >
          <Info className="w-3 h-3" />
        </button>
      </div>

      {/* Optional Provider Info Popover */}
      {showProviderInfo && (
        <div className="p-3 bg-white border-b border-[#E8DFC9] text-xs text-[#57534E] leading-relaxed shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[#1C1917] text-[11px] uppercase tracking-wider">
              AI Security & Engine Status
            </span>
            <button
              onClick={() => setShowProviderInfo(false)}
              className="text-[#A8A29E] hover:text-[#1C1917] text-xs cursor-pointer"
            >
              ×
            </button>
          </div>
          <p className="text-[11px] text-[#78716C]">
            {providerStatus.notice ||
              'Operating with active LLM and strict server-side CourseTracker permission filtering. Read-only permissions enforced.'}
          </p>
          <div className="mt-2 text-[10px] text-[#557B2F] font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Campus Boundary Isolation: ACTIVE</span>
          </div>
        </div>
      )}

      {/* 3. Message Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
            >
              {/* Sender Name & Role */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#78716C]">
                {isUser ? (
                  <>
                    <span>You</span>
                    <span className="text-[#D6D3D1]">•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-[#1C1917]">CourseTracker AI</span>
                    <span className="text-[#D6D3D1]">•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs break-words max-w-[92%] sm:max-w-[88%] ${
                  isUser
                    ? 'bg-[#1C1917] text-white rounded-tr-xs'
                    : 'bg-white text-[#1C1917] border border-[#E8DFC9] rounded-tl-xs shadow-[0_2px_8px_rgba(28,25,23,0.03)]'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div>
                    <ChatMessageRenderer content={msg.content} />

                    {/* Citations & Engine Tag */}
                    {msg.metadata && (
                      <div className="mt-3 pt-2.5 border-t border-[#F2ECE1] flex flex-wrap items-center gap-1.5 text-[10px] text-[#78716C]">
                        <span className="px-1.5 py-0.5 rounded-md bg-[#FAF7F0] border border-[#E8DFC9] font-mono text-[9px] text-[#57534E]">
                          {msg.metadata.generatedBy === 'ai_provider' ? 'AI Generated' : 'Local Verified'}
                        </span>
                        {msg.metadata.citations?.map((c, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded-md bg-[#EEF7EF] border border-[#C8E8CD] text-[#2D451B] text-[9px]"
                          >
                            ✓ {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Suggested Follow-up Actions */}
              {!isUser && msg.metadata?.suggestedActions && msg.metadata.suggestedActions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-1 max-w-full">
                  {msg.metadata.suggestedActions.map((action, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={loading}
                      onClick={() => handleSendMessage(action)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-[#E8DFC9] hover:border-[#1C1917] hover:bg-[#FAF7F0] text-[11px] font-medium text-[#1C1917] shadow-2xs transition-all cursor-pointer disabled:opacity-50 text-left"
                    >
                      <ChevronRight className="w-3 h-3 text-[#B08800] shrink-0" />
                      <span>{action}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-start max-w-full">
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#78716C]">
              <span className="font-semibold text-[#1C1917]">CourseTracker AI</span>
              <span className="text-[#D6D3D1]">•</span>
              <span>Thinking...</span>
            </div>
            <div className="bg-white border border-[#E8DFC9] rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1C1917] animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1C1917] animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1C1917] animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-[#78716C] ml-1.5">Consulting authorized syllabus records...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-[#FDF2F4] border border-[#F8CAD4] text-[#701A4A] text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSendMessage()}
              className="text-[11px] font-semibold underline shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Input Area */}
      <footer className="p-3 bg-white border-t border-[#E8DFC9] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex flex-col"
        >
          <div className="relative">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask CourseTracker AI as ${currentUser.role}...`}
              disabled={loading}
              className="w-full pl-3.5 pr-11 py-2 rounded-2xl border border-[#E8DFC9] bg-[#FAF7F0]/40 focus:bg-white text-xs font-medium text-[#1C1917] placeholder-[#A8A29E] focus:outline-hidden focus:ring-2 focus:ring-[#1C1917]/10 focus:border-[#1C1917]/40 transition-all resize-none shadow-2xs disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="absolute right-2 bottom-3 w-7 h-7 rounded-xl bg-[#1C1917] text-white flex items-center justify-center hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              title="Send Message"
              aria-label="Send Message"
            >
              <Send className="w-3.5 h-3.5 text-[#FBE69B]" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-[#A8A29E]">
            <span>Press <strong>Enter ↵</strong> to send • <strong>Shift+Enter</strong> for newline</span>
            <span className="hidden sm:inline font-medium text-[#78716C]">Read-only assistance</span>
          </div>
        </form>
      </footer>
    </div>
  );
};
