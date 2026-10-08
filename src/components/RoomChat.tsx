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
        className="fixed bottom-6 right-6 z-40 px-3.5 py-2.5 rounded-xl bg-[#141518] hover:bg-[#1a1c21] text-white shadow-xl transition-all flex items-center gap-2 border border-[#2a2c35] btn-tactile"
        title="Open Chat & Match Log"
        aria-label="Open Table Chat"
      >
        <MessageSquare className="w-4 h-4 text-zinc-400" />
        <span className="text-xs font-semibold text-white">Chat</span>
        {messages.length > 0 && !isOpen && (
          <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono bg-white text-zinc-950 font-bold rounded-full">
            {messages.length}
          </span>
        )}
      </button>

      {/* Slide-out Sheet Drawer */}
      <GameDrawerSheet
        isOpen={isOpen}
        onClose={onToggle}
        title="Chat & Match Log"
        icon={<MessageSquare className="w-4 h-4" />}
        description="Multiplayer table chat and game events"
        side="right"
        footer={
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Message table..."
              maxLength={280}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#18191e] border border-[#272930] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="btn-tactile px-3 py-1.5 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded-lg text-xs flex items-center gap-1 disabled:opacity-30 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        }
      >
        <div ref={scrollRef} className="space-y-3 pr-1">
          {messages.length === 0 ? (
            <div className="text-center text-xs text-zinc-500 py-16 flex flex-col items-center gap-1.5">
              <span>No messages yet.</span>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentPlayerId;
              const isSystem = msg.isSystem;

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="text-[10px] font-mono bg-[#18191e] text-zinc-400 px-2.5 py-1 rounded-md border border-[#222429] inline-block">
                      {msg.text}
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
                    <span className="text-[10px] text-zinc-500 mb-0.5 ml-1">
                      {msg.senderName}
                    </span>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                      isMe
                        ? 'bg-white text-zinc-950 font-medium'
                        : 'bg-[#18191e] text-zinc-200 border border-[#222429]'
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
