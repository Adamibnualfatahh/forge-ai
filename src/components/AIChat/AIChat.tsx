import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Trash2, Zap, RefreshCw, ArrowRight } from "lucide-react";
import { Profile, ChatMessage } from "../../types";

interface AIChatProps {
  activeProfile: Profile;
  chatHistory: ChatMessage[];
  isSendingChat: boolean;
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
}

export default function AIChat({ 
  activeProfile, 
  chatHistory, 
  isSendingChat, 
  onSendMessage, 
  onClearChat 
}: AIChatProps) {
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isSendingChat]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput("");
  };

  const chatPrompts = [
    "Bagaimana cara squats yang benar?",
    "Menu protein murah meriah penambah otot",
    "Tips rampingkan perut buncit dalam sebulan",
    "Mending surplus kalori atau deficit kalori saat ideal?"
  ];

  const renderFormattedMessage = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    let insideList = false;
    let listItems: React.ReactNode[] = [];
    const elements: React.ReactNode[] = [];

    const formatInline = (str: string) => {
      const parts = str.split(/\*\*([^*]+)\*\*/g);
      return parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="text-[#c3f400] font-black">{part}</strong>;
        }
        const codeParts = part.split(/`([^`]+)`/g);
        return codeParts.map((subPart, j) => {
          if (j % 2 === 1) {
            return (
              <code key={j} className="font-mono bg-zinc-950 px-1.5 py-0.5 border border-zinc-850 rounded text-xs text-[#a6e6ff] select-all">
                {subPart}
              </code>
            );
          }
          return subPart;
        });
      });
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed);

      if (isBullet) {
        if (!insideList) {
          insideList = true;
          listItems = [];
        }
        const content = trimmed.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
        listItems.push(
          <li key={index} className="ml-4 list-disc pl-1 mb-1 text-zinc-300">
            {formatInline(content)}
          </li>
        );
      } else {
        if (insideList) {
          elements.push(
            <ul key={`list-${index}`} className="my-2 space-y-1 list-inside">
              {listItems}
            </ul>
          );
          insideList = false;
          listItems = [];
        }

        if (trimmed === '') {
          elements.push(<div key={`spacer-${index}`} className="h-2" />);
        } else {
          elements.push(
            <p key={index} className="leading-relaxed mb-1 text-zinc-300">
              {formatInline(line)}
            </p>
          );
        }
      }
    });

    if (insideList) {
      elements.push(
        <ul key="list-last" className="my-2 space-y-1 list-inside">
          {listItems}
        </ul>
      );
    }
    return elements;
  };

  return (
    <motion.div 
      key="chat"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="flex-1 flex flex-col min-h-[450px] relative"
    >
      <div className="bg-[#121212] rounded-t-2xl border border-zinc-800 border-b-0 p-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-[#c3f400] animate-pulse"></div>
          <span className="font-display font-bold text-sm text-white tracking-tight">Chat Trainer</span>
        </div>
        <button onClick={onClearChat} aria-label="Hapus semua chat" className="text-[12px] font-medium text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1">
          <Trash2 className="w-3 h-3" /> Clear
        </button>
      </div>

      {/* Chat Thread Panel */}
      <div className="flex-1 bg-[#201f1f]/50 border border-zinc-850 overflow-y-auto p-4 space-y-4 no-scrollbar flex flex-col">
        <div className="text-center text-[12px] text-zinc-600 my-2">Hari ini</div>

        {/* Default Greeting Message block */}
        <div className="flex justify-start w-full gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#c2f400] flex-shrink-0 flex items-center justify-center text-black">
            <Zap className="w-4 h-4 fill-black" />
          </div>
          <div className="max-w-[85%] bg-zinc-900 border border-zinc-800 text-[#e5e2e1] font-sans text-sm rounded-2xl rounded-tl-sm p-4 leading-relaxed relative ai-glow">
            Halo, <strong>{activeProfile.name}!</strong>
            Ada yang bisa dibantu soal program latihan, nutrisi, atau teknik gerakan hari ini?
          </div>
        </div>

        {/* Chat items maps */}
        {chatHistory.map((msg) => (
          <div 
            key={msg.id || Math.random().toString()} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} w-full gap-2.5`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[#a6e6ff] flex-shrink-0 flex items-center justify-center text-zinc-900">
                <Zap className="w-4 h-4 fill-zinc-900" />
              </div>
            )}
            <div 
              className={`max-w-[85%] text-sm rounded-2xl p-4 leading-relaxed relative ${
                msg.sender === 'user' 
                  ? "bg-zinc-800 text-white border border-zinc-700 rounded-tr-sm self-end"
                  : "bg-zinc-900 border border-zinc-800 text-[#e5e2e1] rounded-tl-sm ai-glow"
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="absolute top-0 left-0 w-full h-[1px] bg-[#c3f400]/20 rounded-t-2xl"></div>
              )}
              
              {renderFormattedMessage(msg.message)}
            </div>
          </div>
        ))}
        
        {isSendingChat && (
          <div className="flex justify-start w-full gap-2.5 items-center">
            <div className="w-7 h-7 rounded-full bg-[#a6e6ff] flex-shrink-0 flex items-center justify-center text-zinc-900 animate-spin">
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-sans text-zinc-500 italic">Mengetik...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* CHAT INPUT AND KEYWORDS SUGGESTIONS CHIPS FOOTER */}
      <div className="bg-[#121212] border border-zinc-800 p-4 rounded-b-2xl space-y-4 shrink-0">
        
        {/* Suggestions triggers chips */}
        {chatHistory.length === 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[12px] text-zinc-500 uppercase tracking-wider font-bold block">Topik Populer:</span>
            <div className="flex flex-wrap gap-2">
              {chatPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-[#201f1f] text-xs font-medium text-zinc-300 hover:text-[#c3f400] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input action field */}
        <div className="flex items-center gap-2 bg-[#131313] rounded-xl border border-zinc-800 p-1.5 focus-within:border-[#c3f400] transition-all">
          <input 
            type="text"
            placeholder="Tanya Trainer AI..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="w-full bg-transparent border-none text-white font-sans text-sm outline-none px-3 h-10 placeholder-zinc-500 focus:outline-none focus:ring-0"
          />
          <button 
            onClick={handleSend}
            disabled={isSendingChat || !chatInput.trim()}
            className="bg-[#c3f400] hover:bg-[#abd600] text-black h-10 w-10 shrink-0 rounded-lg flex items-center justify-center scale-down active:scale-95 transition-transform disabled:opacity-50 shadow-[0_0_12px_rgba(195,244,0,0.2)]"
          >
            <ArrowRight className="w-5 h-5 font-black" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
