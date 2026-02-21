
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';


interface Message {
  role: 'user' | 'ai';
  text: string;
}

const HRAssistant: React.FC<{ user: User }> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: `Hi ${user.name.split(' ')[0]}! I'm NexusAI. How can I assist you with your HR needs today?` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const context = `User Name: ${user.name}, Role: ${user.role}, Dept: ${user.department}, EmployeeID: ${user.employeeId}`;

  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen ? (
        <div className="bg-white w-80 sm:w-96 h-[500px] rounded-[2rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 bg-primary-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <i className="fas fa-robot"></i>
              </div>
              <div>
                <h4 className="font-bold text-sm">NexusAI</h4>
                <p className="text-[10px] text-primary-100 uppercase font-black">Online Assistant</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-primary-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 text-xs font-medium"
              />
              <button type="submit" className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 transition-colors">
                <i className="fas fa-paper-plane text-xs"></i>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all group relative"
        >
          <div className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-20"></div>
          <i className="fas fa-robot relative z-10 group-hover:rotate-12 transition-transform"></i>
        </button>
      )}
    </div>
  );
};

export default HRAssistant;