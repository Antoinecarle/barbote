import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, streamApi } from '../lib/api';
import { MessageSquare, Plus, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AIChat() {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{role: string; content: string; id?: string}>>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api<any[]>('/ai/conversations'),
    refetchInterval: 5000
  });

  const { data: convMessages } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: () => api<any[]>(`/ai/conversations/${activeConvId}/messages`),
    enabled: !!activeConvId,
  });

  useEffect(() => {
    if (convMessages) {
      setMessages(convMessages.map(m => ({ role: m.role, content: m.content, id: m.id })));
    }
  }, [convMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createConversation = async () => {
    const result = await api<any>('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nouvelle conversation', context_type: 'general' })
    });
    setActiveConvId(result.id);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConvId || streaming) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);

    // Add empty assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      let fullContent = '';
      for await (const chunk of streamApi('/ai/chat', {
        conversation_id: activeConvId,
        message: userMsg,
        context: {}
      })) {
        fullContent += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullContent };
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: '❌ Erreur: ' + (err instanceof Error ? err.message : 'Erreur IA') };
        return updated;
      });
    } finally {
      setStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const QUICK_QUESTIONS = [
    'Quels lots ont un SO₂ libre inférieur à 20 mg/L ?',
    'Quel est le volume total de vin rouge actif en cave ?',
    'Quelles opérations sont planifiées cette semaine ?',
    'Génère un rapport de synthèse de la cave',
  ];

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 animate-fade-in">
      {/* Conversations list */}
      <div className="w-64 flex flex-col gap-2">
        <button onClick={createConversation} className="btn-primary w-full justify-center">
          <Plus size={16} /> Nouvelle conversation
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {(conversations as any[]).map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                activeConvId === conv.id
                  ? 'bg-bordeaux-900/50 border border-bordeaux-700/50'
                  : 'hover:bg-[#2a1520]'
              }`}
            >
              <p className="text-xs font-medium text-[#f5e6ea] truncate">{conv.title || 'Conversation'}</p>
              <p className="text-xs text-[#c4a0aa] mt-0.5">
                {conv.last_message_at
                  ? new Date(conv.last_message_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  : 'Nouveau'
                }
              </p>
            </button>
          ))}
          {(conversations as any[]).length === 0 && (
            <p className="text-xs text-[#c4a0aa] text-center py-4">Aucune conversation</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col card p-0 overflow-hidden">
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-6xl mb-4">🍷</div>
            <h2 className="text-xl font-bold text-[#f5e6ea] mb-2">Assistant Oenologue IA</h2>
            <p className="text-[#c4a0aa] text-sm mb-6 max-w-md">
              Posez des questions sur votre cave, obtenez des recommandations pour les assemblages, consultez les analyses et l'historique
            </p>

            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              <p className="text-xs text-[#c4a0aa] mb-1">Questions rapides</p>
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={async () => {
                    await createConversation();
                  }}
                  className="text-left text-sm bg-[#12090c] border border-[#2a1520] hover:border-bordeaux-700 rounded-lg p-3 text-[#c4a0aa] hover:text-[#f5e6ea] transition-all"
                >
                  {q}
                </button>
              ))}
            </div>

            <button onClick={createConversation} className="btn-primary mt-4">
              <Plus size={16} /> Démarrer une conversation
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles size={32} className="mx-auto mb-3 text-purple-400" />
                  <p className="text-[#c4a0aa] text-sm">Posez une question sur votre cave</p>
                  <div className="grid grid-cols-1 gap-2 mt-4 max-w-md mx-auto">
                    {QUICK_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                        className="text-left text-sm bg-[#12090c] border border-[#2a1520] hover:border-bordeaux-700 rounded-lg p-2.5 text-[#c4a0aa] hover:text-[#f5e6ea] transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm ${
                    msg.role === 'user' ? 'bg-bordeaux-700' : 'bg-purple-900'
                  }`}>
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-bordeaux-800 text-[#f5e6ea]'
                      : 'bg-[#12090c] border border-[#2a1520] text-[#f5e6ea]'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none text-[#f5e6ea]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || (streaming && i === messages.length - 1 ? '▊' : '')}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#2a1520] p-4">
              <div className="flex gap-3">
                <textarea
                  ref={textareaRef}
                  className="input flex-1 resize-none"
                  rows={2}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez une question sur votre cave... (Entrée pour envoyer)"
                  disabled={streaming}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                  className="btn-primary self-end px-4"
                >
                  {streaming ? <span className="animate-spin text-sm">⏳</span> : <Send size={16} />}
                </button>
              </div>
              <p className="text-xs text-[#c4a0aa] mt-1">Maj+Entrée pour sauter une ligne</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
