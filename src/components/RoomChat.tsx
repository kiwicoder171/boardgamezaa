'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/game';
import { MessageSquare, Send, X } from 'lucide-react';
import { soundFX } from '@/lib/sounds';

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
      {/* Floating Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-950/60 transition transform hover:scale-105 flex items-center justify-center border border-indigo-400/40"
        title="Open Room Chat"
      >
        <MessageSquare className="w-6 h-6" />
        {messages.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-slate-900" />
        )}
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-3xl shadow-2xl flex flex-col h-[460px] animate-in fade-in slide-in-from-bottom-6">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-white">Room Chat</h3>
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-10">
                No messages yet. Say hi!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentPlayerId;
                const isSystem = msg.isSystem;

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center my-1">
                      <span className="text-[11px] bg-slate-800/80 text-slate-400 px-2.5 py-1 rounded-full border border-slate-800">
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
                      <span className="text-[10px] text-slate-400 mb-0.5 ml-1 font-semibold">
                        {msg.senderName}
                      </span>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              placeholder="Send message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
