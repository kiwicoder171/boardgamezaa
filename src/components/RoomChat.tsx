'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/game';
import { MessageSquare, Send } from 'lucide-react';
import { soundFX } from '@/lib/sounds';
import { GameDrawerSheet } from '@/components/ui/GameDrawerSheet';

interface RoomChatProps {
  messages: ChatMessage[];
  currentPlayerId: string;
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function RoomChat({
  messages,
  currentPlayerId,
  onSendMessage,
  isOpen,
  onToggle,
}: RoomChatProps) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    soundFX.playClick();
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <>
      {/* Floating Toggle Pill */}
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#281b12] to-[#1a110a] hover:from-[#382416] hover:to-[#24170e] text-[#fde68a] shadow-2xl shadow-black/90 transition-all transform hover:scale-105 flex items-center gap-2.5 border-2 border-[#dc5000]/50 btn-tactile"
        title="Open Table Chat & Action Log"
        aria-label="Open Table Chat"
      >
        <MessageSquare className="w-5 h-5 text-[#dc5000]" />
        <span className="font-mono text-xs font-black tracking-wide text-[#ffedd7]">Table Talk</span>
        {messages.length > 0 && !isOpen && (
          <span className="ml-0.5 px-2 py-0.5 text-[10px] bg-[#dc5000] text-white font-black rounded-full shadow">
            {messages.length}
          </span>
        )}
      </button>

      {/* Slide-out Sheet Drawer */}
      <GameDrawerSheet
        isOpen={isOpen}
        onClose={onToggle}
        title="Table Talk & Match Log"
        icon={<MessageSquare className="w-5 h-5" />}
        description="Live multiplayer table discussion and system notifications"
        side="right"
        footer={
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Type message to table..."
              maxLength={280}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#0a0705] border border-[#382416] rounded-xl px-3.5 py-2 text-xs text-[#ffedd7] placeholder-[#84847e] focus:outline-none focus:border-[#f59e0b]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="btn-tactile px-3.5 py-2 bg-gradient-to-r from-[#dc5000] to-[#ea580c] hover:from-[#ea580c] hover:to-[#dc5000] text-white font-black rounded-xl text-xs flex items-center gap-1 shadow-md disabled:opacity-40 border border-[#f97316]/50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        }
      >
        <div ref={scrollRef} className="space-y-3 pr-1">
          {messages.length === 0 ? (
            <div className="text-center text-xs text-[#84847e] py-16 flex flex-col items-center gap-2">
              <span className="text-3xl">☕</span>
              <span>No messages yet. Greet your fellow players!</span>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentPlayerId;
              const isSystem = msg.isSystem;

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="text-[10px] font-mono bg-black/50 text-[#fde68a] px-3 py-1 rounded-full border border-[#dc5000]/30 inline-block shadow-inner">
                      📢 {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {!isMe && (
                    <span className="text-[10px] text-[#cdcdc9] mb-1 ml-1 font-bold">
                      {msg.senderName}
                    </span>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-[#dc5000] to-[#ea580c] text-white font-medium rounded-tr-none shadow-[#dc5000]/30 border border-[#f97316]/40'
                        : 'bg-[#1e140d] text-[#ffedd7] border border-[#382416] rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </GameDrawerSheet>
    </>
  );
}
