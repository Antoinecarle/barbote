import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, streamApi } from '../lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MessageSquare,
  Plus,
  Send,
  Search,
  FileText,
  Download,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Database,
  Filter,
  FileDown,
  Table2,
  Wine,
  Clock,
  BookOpen,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string;
  last_message_at: string | null;
  message_count?: number;
  context_type?: string;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: DataCitation[];
}

interface DataCitation {
  type: 'lot' | 'analyse' | 'mouvement' | 'operation';
  label: string;
  ref: string;
}

interface RecentSynthesis {
  id: string;
  title: string;
  created_at: string;
}

// ─── Quick Questions ──────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  { text: 'Quels lots ont un SO₂ libre < 20 mg/L ?', icon: '🔬', tag: 'analyses' },
  { text: 'Volume total vin rouge actif ?', icon: '🍷', tag: 'lots' },
  { text: 'Opérations planifiées cette semaine ?', icon: '📅', tag: 'operations' },
  { text: 'Rapport de synthèse cave', icon: '📊', tag: 'synthese' },
  { text: 'Historique mouvements lot X', icon: '📦', tag: 'mouvements' },
];

const CONTEXT_FILTERS = [
  { key: 'all', label: 'Tout', icon: <Sparkles size={12} /> },
  { key: 'lots', label: 'Lots', icon: <Wine size={12} /> },
  { key: 'analyses', label: 'Analyses', icon: <Database size={12} /> },
  { key: 'mouvements', label: 'Mouvements', icon: <Table2 size={12} /> },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StreamingDot() {
  return (
    <span className="inline-flex gap-0.5 items-center ml-1">
      <span
        className="w-1.5 h-1.5 rounded-full bg-[#8B1A2F] animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-[#8B1A2F] animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-[#8B1A2F] animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </span>
  );
}

function CitationBadge({ citation }: { citation: DataCitation }) {
  const colorMap: Record<string, string> = {
    lot: 'bg-[#FDF2F4] text-[#8B1A2F] border-[#F3C5CE]',
    analyse: 'bg-blue-50 text-blue-700 border-blue-200',
    mouvement: 'bg-amber-50 text-amber-700 border-amber-200',
    operation: 'bg-green-50 text-green-700 border-green-200',
  };
  const cls = colorMap[citation.type] || 'bg-gray-100 text-[#5C5550] border-[#E8E4DE]';
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {citation.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIChat() {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeContextFilter, setActiveContextFilter] = useState('all');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Queries ──

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => api<Conversation[]>('/ai/conversations'),
    refetchInterval: 5000,
  });

  const { data: convMessages } = useQuery<any[]>({
    queryKey: ['messages', activeConvId],
    queryFn: () => api<any[]>(`/ai/conversations/${activeConvId}/messages`),
    enabled: !!activeConvId,
  });

  // Map API messages → local Message type
  useEffect(() => {
    if (convMessages) {
      setMessages(
        convMessages.map((m) => ({
          role: m.role,
          content: m.content,
          id: m.id,
          citations: m.citations,
        }))
      );
    }
  }, [convMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Actions ──

  const createConversation = useCallback(async (initialMessage?: string) => {
    const result = await api<Conversation>('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({
        title: initialMessage
          ? initialMessage.slice(0, 60)
          : 'Nouvelle conversation',
        context_type: activeContextFilter === 'all' ? 'general' : activeContextFilter,
      }),
    });
    setActiveConvId(result.id);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    return result.id;
  }, [activeContextFilter, queryClient]);

  const sendMessage = useCallback(async (overrideMsg?: string) => {
    const userMsg = (overrideMsg ?? input).trim();
    if (!userMsg || streaming) return;

    let convId = activeConvId;
    if (!convId) {
      convId = await createConversation(userMsg);
    }

    if (!overrideMsg) setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      let fullContent = '';
      for await (const chunk of streamApi('/ai/chat', {
        conversation_id: convId,
        message: userMsg,
        context: { filter: activeContextFilter },
      })) {
        fullContent += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullContent };
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Erreur : ' + (err instanceof Error ? err.message : 'Erreur IA'),
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', convId] });
    }
  }, [input, streaming, activeConvId, activeContextFilter, createConversation, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Quick question handler ──
  const handleQuickQuestion = async (question: string) => {
    if (streaming) return;
    if (!activeConvId) {
      // Create conversation then send
      const convId = await createConversation(question);
      setActiveConvId(convId);
      // Wait for state to settle
      setTimeout(() => sendMessage(question), 50);
    } else {
      sendMessage(question);
    }
  };

  // ── Export synthesis ──
  const exportSynthesis = async () => {
    if (!activeConvId) return;
    setExportingId(activeConvId);
    try {
      const result = await api<{ content: string; filename?: string }>(
        `/ai/conversations/${activeConvId}/synthesis`,
        { method: 'POST' }
      );
      const blob = new Blob([result.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || `synthese-${activeConvId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — synthesis not available
    } finally {
      setExportingId(null);
    }
  };

  // ── Filtered conversations ──
  const filteredConversations = conversations.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Recent syntheses (last 3 from conversations with summary) ──
  const recentSyntheses: RecentSynthesis[] = conversations
    .filter((c) => c.message_count && c.message_count > 2)
    .slice(0, 3)
    .map((c) => ({
      id: c.id,
      title: c.title,
      created_at: c.last_message_at || '',
    }));

  // ── Active conversation title ──
  const activeConv = conversations.find((c) => c.id === activeConvId);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#F5F3EF] gap-0 overflow-hidden">

      {/* ── LEFT COLUMN: Conversation list (w-72) ──────────────────────────── */}
      <aside className="w-72 bg-[#FDFCFA] border-r border-[#E8E4DE] flex flex-col shrink-0">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-[#EDE9E3]">
          <button
            onClick={() => createConversation()}
            className="btn-primary w-full justify-center text-sm"
          >
            <Plus size={16} />
            Nouvelle conversation
          </button>

          {/* Search */}
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9590]" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-8 text-sm py-1.5"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2">
          {filteredConversations.length === 0 && (
            <p className="text-xs text-[#9B9590] text-center py-6 px-4">
              {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}
            </p>
          )}
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => { setActiveConvId(conv.id); setMessages([]); }}
              className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${
                activeConvId === conv.id
                  ? 'bg-[#FDF2F4] border-[#8B1A2F]'
                  : 'border-transparent hover:bg-[#F5F3EF]'
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare
                  size={14}
                  className={`mt-0.5 shrink-0 ${
                    activeConvId === conv.id ? 'text-[#8B1A2F]' : 'text-[#9B9590]'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-medium truncate ${
                      activeConvId === conv.id ? 'text-[#8B1A2F]' : 'text-[#1A1714]'
                    }`}
                  >
                    {conv.title || 'Conversation'}
                  </p>
                  <p className="text-xs text-[#9B9590] mt-0.5">
                    {conv.last_message_at
                      ? new Date(conv.last_message_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : 'Nouveau'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Recent syntheses section */}
        {recentSyntheses.length > 0 && (
          <div className="border-t border-[#EDE9E3] px-4 py-3">
            <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide mb-2">
              Synthèses récentes
            </p>
            <div className="space-y-1.5">
              {recentSyntheses.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F3EF] cursor-pointer group"
                  onClick={() => { setActiveConvId(s.id); setMessages([]); }}
                >
                  <BookOpen size={13} className="text-[#9B9590] shrink-0" />
                  <span className="text-xs text-[#5C5550] truncate flex-1">{s.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveConvId(s.id); exportSynthesis(); }}
                    className="opacity-0 group-hover:opacity-100 text-[#9B9590] hover:text-[#8B1A2F] transition-all"
                    title="Exporter"
                  >
                    <Download size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── CENTER COLUMN: Chat area ──────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Conversation header */}
        {activeConvId && (
          <div className="bg-[#FDFCFA] border-b border-[#E8E4DE] px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <MessageSquare size={16} className="text-[#8B1A2F]" />
              <span className="text-sm font-semibold text-[#1A1714] truncate max-w-xs">
                {activeConv?.title || 'Conversation'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Context filter pills */}
              <div className="flex items-center gap-1.5 bg-[#F5F3EF] border border-[#E8E4DE] rounded-lg px-2 py-1">
                <Filter size={12} className="text-[#9B9590]" />
                {CONTEXT_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setActiveContextFilter(f.key)}
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-colors ${
                      activeContextFilter === f.key
                        ? 'bg-[#8B1A2F] text-white'
                        : 'text-[#5C5550] hover:text-[#1A1714] hover:bg-[#EDE9E3]'
                    }`}
                  >
                    {f.icon}
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setRightPanelOpen((v) => !v)}
                className="btn-ghost text-xs py-1.5 px-2"
              >
                {rightPanelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                Compilation
              </button>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
            <div className="w-20 h-20 rounded-full bg-[#FDF2F4] border-2 border-[#F3C5CE] flex items-center justify-center mb-6">
              <span className="text-4xl">🍷</span>
            </div>
            <h2
              className="text-2xl font-semibold text-[#1A1714] mb-2"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Assistant Oenologue IA
            </h2>
            <p className="text-sm text-[#5C5550] text-center max-w-md mb-8">
              Posez des questions sur votre cave, obtenez des recommandations pour les assemblages,
              consultez les analyses et l'historique de vos lots.
            </p>

            {/* Context filter pills */}
            <div className="flex items-center gap-2 mb-8">
              <span className="text-xs text-[#9B9590]">Contexte :</span>
              {CONTEXT_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveContextFilter(f.key)}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
                    activeContextFilter === f.key
                      ? 'bg-[#8B1A2F] text-white border-[#8B1A2F]'
                      : 'bg-[#FDFCFA] text-[#5C5550] border-[#E8E4DE] hover:border-[#8B1A2F] hover:text-[#8B1A2F]'
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Quick question pills */}
            <div className="w-full max-w-xl space-y-2">
              <p className="text-xs font-semibold text-[#9B9590] uppercase tracking-wide text-center mb-3">
                Questions rapides
              </p>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(q.text)}
                    className="w-full text-left flex items-center gap-3 bg-[#FDFCFA] border border-[#E8E4DE] hover:border-[#8B1A2F] hover:bg-[#FDF2F4] rounded-xl px-4 py-3 transition-all group"
                  >
                    <span className="text-xl shrink-0">{q.icon}</span>
                    <span className="text-sm text-[#5C5550] group-hover:text-[#8B1A2F] transition-colors">
                      {q.text}
                    </span>
                    <ChevronRight size={14} className="ml-auto text-[#9B9590] group-hover:text-[#8B1A2F] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── Messages area ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Empty conversation state */}
              {messages.length === 0 && !streaming && (
                <div className="flex flex-col items-center py-8">
                  <Sparkles size={28} className="text-[#8B1A2F] opacity-40 mb-3" />
                  <p className="text-sm text-[#9B9590] mb-6">Posez une question sur votre cave</p>
                  <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
                    {QUICK_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q.text); textareaRef.current?.focus(); }}
                        className="text-left flex items-center gap-3 bg-[#FDFCFA] border border-[#E8E4DE] hover:border-[#8B1A2F] hover:bg-[#FDF2F4] rounded-lg px-3 py-2.5 transition-all group"
                      >
                        <span className="text-base">{q.icon}</span>
                        <span className="text-xs text-[#5C5550] group-hover:text-[#8B1A2F] transition-colors">
                          {q.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                      msg.role === 'user'
                        ? 'bg-[#8B1A2F] text-white text-xs'
                        : 'bg-[#FDF2F4] border border-[#F3C5CE] text-base'
                    }`}
                  >
                    {msg.role === 'user' ? 'V' : '🍷'}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-[#8B1A2F] text-white rounded-tr-sm'
                          : 'bg-white border border-[#E8E4DE] text-[#1A1714] rounded-tl-sm'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none text-[#1A1714] [&_table]:w-full [&_table]:text-xs [&_th]:bg-[#F5F3EF] [&_th]:text-[#5C5550] [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_table]:border [&_table]:border-[#E8E4DE] [&_table]:rounded-lg [&_tr]:border-b [&_tr]:border-[#EDE9E3] [&_code]:bg-[#F5F3EF] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-[#F5F3EF] [&_pre]:border [&_pre]:border-[#E8E4DE] [&_pre]:rounded-lg [&_pre]:p-3">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content ||
                              (streaming && i === messages.length - 1 ? '' : '')}
                          </ReactMarkdown>
                          {streaming && i === messages.length - 1 && !msg.content && (
                            <StreamingDot />
                          )}
                          {streaming && i === messages.length - 1 && msg.content && (
                            <StreamingDot />
                          )}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      )}
                    </div>

                    {/* Data citations below assistant message */}
                    {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-1">
                        <span className="text-xs text-[#9B9590] mr-1">Sources :</span>
                        {msg.citations.map((c, ci) => (
                          <CitationBadge key={ci} citation={c} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input area ── */}
            <div className="bg-[#FDFCFA] border-t border-[#E8E4DE] px-6 py-4 shrink-0">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    className="input resize-none pr-4 text-sm leading-relaxed"
                    rows={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Posez une question sur votre cave... (Entrée pour envoyer, Maj+Entrée pour sauter une ligne)"
                    disabled={streaming}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || streaming}
                    className="btn-primary px-3 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Envoyer"
                  >
                    {streaming ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                  </button>
                  <button
                    onClick={exportSynthesis}
                    disabled={!activeConvId || exportingId === activeConvId}
                    className="btn-secondary px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Exporter la synthèse"
                  >
                    <FileDown size={15} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#9B9590] mt-2">
                Maj+Entrée pour sauter une ligne &nbsp;·&nbsp; Contexte actif :{' '}
                <span className="font-medium text-[#8B1A2F]">
                  {CONTEXT_FILTERS.find((f) => f.key === activeContextFilter)?.label}
                </span>
              </p>
            </div>
          </>
        )}
      </main>

      {/* ── RIGHT COLUMN: Compilation panel (w-64 collapsible) ─────────────── */}
      {rightPanelOpen && (
        <aside className="w-64 bg-[#FDFCFA] border-l border-[#E8E4DE] flex flex-col shrink-0">
          {/* Panel header */}
          <div className="px-4 pt-4 pb-3 border-b border-[#EDE9E3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-[#8B1A2F]" />
              <span className="text-sm font-semibold text-[#1A1714]">Compilation</span>
            </div>
            <button
              onClick={() => setRightPanelOpen(false)}
              className="text-[#9B9590] hover:text-[#1A1714] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Synthesis actions */}
          <div className="px-4 py-4 border-b border-[#EDE9E3] space-y-2">
            <button
              onClick={exportSynthesis}
              disabled={!activeConvId || exportingId === activeConvId}
              className="btn-primary w-full justify-center text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exportingId === activeConvId ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              Générer synthèse
            </button>

            <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide pt-1">
              Exporter
            </p>
            <div className="space-y-1.5">
              <button
                onClick={exportSynthesis}
                disabled={!activeConvId}
                className="btn-secondary w-full justify-start text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileDown size={14} className="text-red-500" />
                Exporter PDF
              </button>
              <button
                disabled={!activeConvId}
                onClick={() => {/* CSV export stub */}}
                className="btn-secondary w-full justify-start text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Table2 size={14} className="text-green-600" />
                Exporter CSV
              </button>
              <button
                disabled={!activeConvId}
                onClick={() => {/* Excel export stub */}}
                className="btn-secondary w-full justify-start text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={14} className="text-blue-600" />
                Exporter Excel
              </button>
            </div>
          </div>

          {/* Active context */}
          <div className="px-4 py-4 border-b border-[#EDE9E3]">
            <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide mb-3">
              Contexte actif
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-[#FDF2F4] border border-[#F3C5CE] rounded-lg px-3 py-2">
                <Wine size={13} className="text-[#8B1A2F] shrink-0" />
                <span className="text-xs text-[#8B1A2F] font-medium">
                  {activeContextFilter === 'all'
                    ? 'Tous les lots'
                    : activeContextFilter === 'lots'
                    ? 'Lots actifs'
                    : activeContextFilter === 'analyses'
                    ? 'Analyses en cours'
                    : 'Mouvements récents'}
                </span>
              </div>
              {activeConv && (
                <div className="flex items-center gap-2 bg-[#F5F3EF] border border-[#E8E4DE] rounded-lg px-3 py-2">
                  <Clock size={13} className="text-[#9B9590] shrink-0" />
                  <span className="text-xs text-[#5C5550]">
                    {activeConv.last_message_at
                      ? new Date(activeConv.last_message_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Nouveau'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Data sources cited */}
          <div className="px-4 py-4 flex-1 overflow-y-auto">
            <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide mb-3">
              Sources citées
            </p>
            {messages.some((m) => m.citations && m.citations.length > 0) ? (
              <div className="space-y-1.5">
                {Array.from(
                  new Map(
                    messages
                      .flatMap((m) => m.citations || [])
                      .map((c) => [c.ref, c])
                  ).values()
                ).map((c, ci) => (
                  <div
                    key={ci}
                    className="flex items-center gap-2 p-2 bg-[#F5F3EF] rounded-lg border border-[#EDE9E3]"
                  >
                    <Database size={12} className="text-[#9B9590] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#1A1714] truncate">{c.label}</p>
                      <p className="text-xs text-[#9B9590] truncate">{c.ref}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Database size={24} className="text-[#E8E4DE] mx-auto mb-2" />
                <p className="text-xs text-[#9B9590]">
                  Les sources de données apparaîtront ici lors des réponses
                </p>
              </div>
            )}
          </div>

          {/* Quick context filters */}
          <div className="px-4 py-4 border-t border-[#EDE9E3]">
            <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide mb-2">
              Filtres rapides
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CONTEXT_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveContextFilter(f.key)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                    activeContextFilter === f.key
                      ? 'bg-[#8B1A2F] text-white border-[#8B1A2F]'
                      : 'bg-[#FDFCFA] text-[#5C5550] border-[#E8E4DE] hover:border-[#8B1A2F] hover:text-[#8B1A2F]'
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
