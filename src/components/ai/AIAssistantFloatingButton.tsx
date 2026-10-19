import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import { Sparkles, MessageSquare, Bot } from 'lucide-react';
import { AIAssistantChatModal } from './AIAssistantChatModal';

export const AIAssistantFloatingButton: React.FC = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Never render on unauthenticated screens
  if (!currentUser) return null;

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close CourseTracker AI' : 'Open CourseTracker AI Assistant'}
          title="CourseTracker AI Assistant"
          className="group relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-[#1C1917] text-white shadow-[0_8px_24px_rgba(28,25,23,0.22)] hover:shadow-[0_12px_28px_rgba(28,25,23,0.3)] hover:scale-105 active:scale-95 transition-all duration-200 border border-white/10 cursor-pointer"
        >
          {/* Subtle pulsating amber ring */}
          <span className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#F9DF7B] to-[#FBE69B] opacity-30 group-hover:opacity-60 blur-xs transition-opacity -z-10" />

          {/* Icon */}
          <Sparkles className="w-5 h-5 text-[#FBE69B] transition-transform duration-300 group-hover:rotate-12" />

          {/* Quick role pill badge */}
          <span className="sr-only">Open CourseTracker AI Assistant</span>
        </button>
      </div>

      {/* Floating Chat Modal */}
      <AIAssistantChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
