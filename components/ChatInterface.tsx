
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/90 backdrop-blur-3xl border-l border-red-900/40 w-screen md:w-80 lg:w-96 shrink-0 relative z-20 overflow-hidden">
      <div className="p-5 border-b border-red-900/40 flex items-center gap-3 bg-black/40">
        <div className="p-2.5 rounded-xl bg-red-900/30 text-red-500 border border-red-700/50 shadow-[0_0_15px_rgba(153,27,27,0.2)]">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-sm font-black text-white tracking-[0.2em] uppercase">Whiro Oracle</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-black">Connected to Deep Mana</span>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth">
        {messages.length === 0 && (
          <div className="text-center py-16 px-6">
            <p className="text-xs text-white/30 font-black uppercase tracking-[0.3em] italic">"I am Whiro. Reveal your collection so I may judge its mana."</p>
          </div>
        )}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[90%] rounded-2xl p-4 text-sm font-medium leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-red-800 text-white rounded-tr-none shadow-xl border border-red-600' 
                : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/10 shadow-inner'
            }`}>
              <div className={`flex items-center gap-2 mb-1.5 text-[9px] font-black uppercase tracking-[0.2em] ${
                msg.role === 'user' ? 'text-white/60' : 'text-red-500'
              }`}>
                {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                {msg.role === 'user' ? 'Keeper' : 'Whiro'}
              </div>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 border-t border-red-900/40 bg-black/60 backdrop-blur-md">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Command the Oracle..."
            className="w-full bg-black/80 border border-red-900/60 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-red-500 transition-all pr-14 text-white placeholder:text-white/20 font-bold"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-red-800 hover:bg-red-600 disabled:opacity-30 text-white rounded-xl transition-all border border-red-500 shadow-lg"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
