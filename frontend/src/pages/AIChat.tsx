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
  X,
  History,
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

type MobileView = 'chat' | 'history' | 'compilation';

// ─── Quick Questions ──────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  { text: 'Quels lots ont un SO\u2082 libre < 20\u00a0mg/L\u00a0?', icon: '🔬', tag: 'analyses' },
  { text: 'Volume total vin rouge actif\u00a0?', icon: '🍷', tag: 'lots' },
  { text: 'Opérations planifiées cette semaine\u00a0?', icon: '📅', tag: 'operations' },
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

// ─── Conversation List Panel ──────────────────────────────────────────────────

interface ConversationListProps {
  conversations: Conversation[];
  activeConvId: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  recentSyntheses: RecentSynthesis[];
  onSelectConv: (id: string) => void;
  onNewConversation: () => void;
  onExportSynthesis: (id: string) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

function ConversationList({
  conversations,
  activeConvId,
  searchQuery,
  setSearchQuery,
  recentSyntheses,
  onSelectConv,
  onNewConversation,
  onExportSynthesis,
  onClose,
  showCloseButton,
}: ConversationListProps) {
  const filtered = conversations.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#FDFCFA]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#EDE9E3]">
        {showCloseButton && (
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-sm font-semibold text-[#1A1714]"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Conversations
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9B9590] hover:text-[#1A1714] hover:bg-[#F5F3EF] transition-colors"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <button
          onClick={onNewConversation}
          className="btn-primary w-full justify-center text-sm min-h-[44px]"
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
        {filtered.length === 0 && (
          <p className="text-xs text-[#9B9590] text-center py-6 px-4">
            {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}
          </p>
        )}
        {filtered.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConv(conv.id)}
            className={`w-full text-left px-4 py-3 transition-colors border-l-2 min-h-[56px] ${
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
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F3EF] cursor-pointer group min-h-[44px]"
                onClick={() => onSelectConv(s.id)}
              >
                <BookOpen size={13} className="text-[#9B9590] shrink-0" />
                <span className="text-xs text-[#5C5550] truncate flex-1">{s.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onExportSynthesis(s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-[#9B9590] hover:text-[#8B1A2F] transition-all p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  title="Exporter"
                >
                  <Download size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compilation Panel ────────────────────────────────────────────────────────

interface CompilationPanelProps {
  activeConvId: string | null;
  activeConv: Conversation | undefined;
  activeContextFilter: string;
  setActiveContextFilter: (key: string) => void;
  messages: Message[];
  exportingId: string | null;
  onExportSynthesis: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

function CompilationPanel({
  activeConvId,
  activeConv,
  activeContextFilter,
  setActiveContextFilter,
  messages,
  exportingId,
  onExportSynthesis,
  onClose,
  showCloseButton,
}: CompilationPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[#FDFCFA]">
      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#EDE9E3] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-[#8B1A2F]" />
          <span className="text-sm font-semibold text-[#1A1714]">Compilation</span>
        </div>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9B9590] hover:text-[#1A1714] hover:bg-[#F5F3EF] transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        )}
        {!showCloseButton && (
          <button
            onClick={onClose}
            className="text-[#9B9590] hover:text-[#1A1714] transition-colors p-1"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Synthesis actions */}
      <div className="px-4 py-4 border-b border-[#EDE9E3] space-y-2">
        <button
          onClick={onExportSynthesis}
          disabled={!activeConvId || exportingId === activeConvId}
          className="btn-primary w-full justify-center text-sm disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
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
            onClick={onExportSynthesis}
            disabled={!activeConvId}
            className="btn-secondary w-full justify-start text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            <FileDown size={14} className="text-red-500" />
            Exporter PDF
          </button>
          <button
            disabled={!activeConvId}
            onClick={() => {/* CSV export stub */}}
            className="btn-secondary w-full justify-start text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Table2 size={14} className="text-green-600" />
            Exporter CSV
          </button>
          <button
            disabled={!activeConvId}
            onClick={() => {/* Excel export stub */}}
            className="btn-secondary w-full justify-start text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
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
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors font-medium min-h-[32px] ${
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
    </div>
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

  // Responsive state
  const [mobileView, setMobileView] = useState<MobileView>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false); // tablet drawer

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
          content: 'Erreur\u00a0: ' + (err instanceof Error ? err.message : 'Erreur IA'),
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
      const convId = await createConversation(question);
      setActiveConvId(convId);
      setTimeout(() => sendMessage(question), 50);
    } else {
      sendMessage(question);
    }
  };

  // ── Export synthesis ──
  const exportSynthesis = async (convId?: string) => {
    const targetId = convId || activeConvId;
    if (!targetId) return;
    setExportingId(targetId);
    try {
      const result = await api<{ content: string; filename?: string }>(
        `/ai/conversations/${targetId}/synthesis`,
        { method: 'POST' }
      );
      const blob = new Blob([result.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || `synthese-${targetId}.md`;
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

  // ── Handle conversation selection (mobile-aware) ──
  const handleSelectConv = (id: string) => {
    setActiveConvId(id);
    setMessages([]);
    setSidebarOpen(false);
    setMobileView('chat');
  };

  const handleNewConversation = async () => {
    await createConversation();
    setSidebarOpen(false);
    setMobileView('chat');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Chat area (shared across all breakpoints) ──
  const chatArea = (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

      {/* Conversation header */}
      <div className="bg-[#FDFCFA] border-b border-[#E8E4DE] px-3 sm:px-6 py-3 flex items-center justify-between shrink-0 min-h-[56px]">
        {/* Mobile: back button + title OR new chat button */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile back arrow when conversation is active */}
          {activeConvId && (
            <button
              onClick={() => setMobileView('history')}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg text-[#9B9590] hover:text-[#1A1714] hover:bg-[#F5F3EF] transition-colors shrink-0 -ml-1"
              aria-label="Retour aux conversations"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Tablet: sidebar toggle */}
          {activeConvId && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="hidden sm:flex lg:hidden w-10 h-10 items-center justify-center rounded-lg text-[#9B9590] hover:text-[#1A1714] hover:bg-[#F5F3EF] transition-colors shrink-0"
              aria-label="Ouvrir les conversations"
            >
              <History size={16} />
            </button>
          )}

          {activeConvId ? (
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare size={16} className="text-[#8B1A2F] shrink-0 hidden sm:block" />
              <span className="text-sm font-semibold text-[#1A1714] truncate">
                {activeConv?.title || 'Conversation'}
              </span>
            </div>
          ) : (
            <span
              className="text-sm font-semibold text-[#1A1714]"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Assistant IA
            </span>
          )}
        </div>

        {/* Right side header controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mobile: new conversation button */}
          {!activeConvId && (
            <button
              onClick={handleNewConversation}
              className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-[#8B1A2F] text-white hover:bg-[#6F1526] transition-colors"
              aria-label="Nouvelle conversation"
            >
              <Plus size={16} />
            </button>
          )}

          {/* Context filter pills — hidden on mobile when conversation active, shown inline on md+ */}
          {activeConvId && (
            <div className="hidden md:flex items-center gap-1.5 bg-[#F5F3EF] border border-[#E8E4DE] rounded-lg px-2 py-1">
              <Filter size={12} className="text-[#9B9590]" />
              {CONTEXT_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveContextFilter(f.key)}
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-colors min-h-[28px] ${
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
          )}

          {/* Compilation toggle — desktop only */}
          {activeConvId && (
            <button
              onClick={() => setRightPanelOpen((v) => !v)}
              className="hidden lg:flex btn-ghost text-xs py-1.5 px-2 items-center gap-1"
            >
              {rightPanelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              Compilation
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!activeConvId ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8 sm:py-12 overflow-y-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FDF2F4] border-2 border-[#F3C5CE] flex items-center justify-center mb-4 sm:mb-6">
            <span className="text-3xl sm:text-4xl">🍷</span>
          </div>
          <h2
            className="text-xl sm:text-2xl font-semibold text-[#1A1714] mb-2 text-center"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Assistant Oenologue IA
          </h2>
          <p className="text-sm text-[#5C5550] text-center max-w-md mb-6 sm:mb-8 px-2">
            Posez des questions sur votre cave, obtenez des recommandations pour les assemblages,
            consultez les analyses et l'historique de vos lots.
          </p>

          {/* Context filter pills — horizontal scroll on mobile */}
          <div className="flex items-center gap-2 mb-6 sm:mb-8 w-full max-w-xl overflow-x-auto pb-1">
            <span className="text-xs text-[#9B9590] shrink-0">Contexte\u00a0:</span>
            <div className="flex gap-2 flex-nowrap">
              {CONTEXT_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveContextFilter(f.key)}
                  className={`flex items-center gap-1 text-xs px-3 py-2 rounded-full border transition-colors font-medium shrink-0 min-h-[36px] ${
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
                  className="w-full text-left flex items-center gap-3 bg-[#FDFCFA] border border-[#E8E4DE] hover:border-[#8B1A2F] hover:bg-[#FDF2F4] rounded-xl px-4 py-3 transition-all group min-h-[52px]"
                  style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
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
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">

            {/* Context filter pills on mobile (below header) */}
            <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <Filter size={11} className="text-[#9B9590] shrink-0" />
              {CONTEXT_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveContextFilter(f.key)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border transition-colors font-medium shrink-0 min-h-[32px] ${
                    activeContextFilter === f.key
                      ? 'bg-[#8B1A2F] text-white border-[#8B1A2F]'
                      : 'bg-[#FDFCFA] text-[#5C5550] border-[#E8E4DE]'
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>

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
                      className="text-left flex items-center gap-3 bg-[#FDFCFA] border border-[#E8E4DE] hover:border-[#8B1A2F] hover:bg-[#FDF2F4] rounded-lg px-3 py-2.5 transition-all group min-h-[48px]"
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
                className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
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
                <div className={`max-w-[85%] sm:max-w-[75%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div
                    className={`rounded-2xl px-3 sm:px-4 py-3 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-[#8B1A2F] text-white rounded-tr-sm'
                        : 'bg-white border border-[#E8E4DE] text-[#1A1714] rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none text-[#1A1714] [&_table]:w-full [&_table]:text-xs [&_th]:bg-[#F5F3EF] [&_th]:text-[#5C5550] [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_table]:border [&_table]:border-[#E8E4DE] [&_table]:rounded-lg [&_tr]:border-b [&_tr]:border-[#EDE9E3] [&_code]:bg-[#F5F3EF] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-[#F5F3EF] [&_pre]:border [&_pre]:border-[#E8E4DE] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto">
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
                      <span className="text-xs text-[#9B9590] mr-1">Sources\u00a0:</span>
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
          <div className="bg-[#FDFCFA] border-t border-[#E8E4DE] px-3 sm:px-6 py-3 sm:py-4 shrink-0">
            <div className="flex gap-2 sm:gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  className="input resize-none pr-4 text-sm leading-relaxed w-full"
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez une question… (Entrée pour envoyer)"
                  disabled={streaming}
                  style={{ minHeight: '44px' }}
                />
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || streaming}
                  className="btn-primary w-11 h-11 p-0 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="Envoyer"
                >
                  {streaming ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
                <button
                  onClick={() => exportSynthesis()}
                  disabled={!activeConvId || exportingId === activeConvId}
                  className="btn-secondary w-11 h-11 p-0 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="Exporter la synthèse"
                >
                  <FileDown size={15} />
                </button>
              </div>
            </div>
            <p className="text-xs text-[#9B9590] mt-2 hidden sm:block">
              Maj+Entrée pour sauter une ligne&nbsp;·&nbsp;Contexte actif&nbsp;:{' '}
              <span className="font-medium text-[#8B1A2F]">
                {CONTEXT_FILTERS.find((f) => f.key === activeContextFilter)?.label}
              </span>
            </p>
          </div>
        </>
      )}
    </main>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT (< 640px) — full-screen panels with bottom tab bar
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="sm:hidden flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>

        {/* Mobile view content */}
        <div className="flex-1 overflow-hidden">
          {/* Chat view */}
          {mobileView === 'chat' && (
            <div className="flex flex-col h-full bg-[#F5F3EF]">
              {chatArea}
            </div>
          )}

          {/* History view */}
          {mobileView === 'history' && (
            <div className="flex flex-col h-full bg-[#FDFCFA]">
              <ConversationList
                conversations={filteredConversations}
                activeConvId={activeConvId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                recentSyntheses={recentSyntheses}
                onSelectConv={handleSelectConv}
                onNewConversation={handleNewConversation}
                onExportSynthesis={(id) => exportSynthesis(id)}
              />
            </div>
          )}

          {/* Compilation view */}
          {mobileView === 'compilation' && (
            <div className="flex flex-col h-full bg-[#FDFCFA] overflow-y-auto">
              <CompilationPanel
                activeConvId={activeConvId}
                activeConv={activeConv}
                activeContextFilter={activeContextFilter}
                setActiveContextFilter={setActiveContextFilter}
                messages={messages}
                exportingId={exportingId}
                onExportSynthesis={() => exportSynthesis()}
                onClose={() => setMobileView('chat')}
                showCloseButton={true}
              />
            </div>
          )}
        </div>

        {/* Mobile bottom tab bar */}
        <nav
          className="bg-[#FDFCFA] border-t border-[#E8E4DE] flex items-stretch shrink-0"
          style={{ boxShadow: '0 -1px 3px rgba(26,23,20,0.08), 0 -4px 12px rgba(26,23,20,0.05)' }}
        >
          {[
            { key: 'chat' as MobileView, icon: MessageSquare, label: 'Chat' },
            { key: 'history' as MobileView, icon: History, label: 'Historique' },
            { key: 'compilation' as MobileView, icon: FileText, label: 'Compilation' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setMobileView(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors min-h-[56px] ${
                mobileView === key
                  ? 'text-[#8B1A2F]'
                  : 'text-[#9B9590] hover:text-[#5C5550]'
              }`}
            >
              <Icon size={18} />
              <span className="text-xs font-medium">{label}</span>
              {mobileView === key && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-[#8B1A2F] rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TABLET LAYOUT (640px - 1024px) — drawer sidebar + full-width chat
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden sm:flex lg:hidden flex-col" style={{ height: 'calc(100vh - 80px)' }}>

        {/* Tablet: drawer backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-[rgba(26,23,20,0.4)] backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Tablet: slide-in sidebar drawer */}
        <div
          className={`fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#FDFCFA] border-r border-[#E8E4DE] transition-transform duration-300 ease-in-out flex flex-col`}
          style={{
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            boxShadow: sidebarOpen ? '4px 0 24px rgba(26,23,20,0.12), 4px 0 48px rgba(26,23,20,0.08)' : 'none',
          }}
        >
          <ConversationList
            conversations={filteredConversations}
            activeConvId={activeConvId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            recentSyntheses={recentSyntheses}
            onSelectConv={handleSelectConv}
            onNewConversation={handleNewConversation}
            onExportSynthesis={(id) => exportSynthesis(id)}
            onClose={() => setSidebarOpen(false)}
            showCloseButton={true}
          />
        </div>

        {/* Tablet chat area (full width) */}
        <div className="flex flex-col flex-1 overflow-hidden bg-[#F5F3EF]">
          {chatArea}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT (>= 1024px) — full 3-column layout
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex gap-0 overflow-hidden bg-[#F5F3EF]"
        style={{ height: 'calc(100vh - 80px)' }}
      >
        {/* ── LEFT COLUMN: Conversation list (w-64) ── */}
        <aside className="w-64 bg-[#FDFCFA] border-r border-[#E8E4DE] flex flex-col shrink-0">
          <ConversationList
            conversations={filteredConversations}
            activeConvId={activeConvId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            recentSyntheses={recentSyntheses}
            onSelectConv={handleSelectConv}
            onNewConversation={handleNewConversation}
            onExportSynthesis={(id) => exportSynthesis(id)}
          />
        </aside>

        {/* ── CENTER COLUMN: Chat area ── */}
        {chatArea}

        {/* ── RIGHT COLUMN: Compilation panel (w-64 collapsible) ── */}
        {rightPanelOpen && (
          <aside className="w-64 bg-[#FDFCFA] border-l border-[#E8E4DE] flex flex-col shrink-0">
            <CompilationPanel
              activeConvId={activeConvId}
              activeConv={activeConv}
              activeContextFilter={activeContextFilter}
              setActiveContextFilter={setActiveContextFilter}
              messages={messages}
              exportingId={exportingId}
              onExportSynthesis={() => exportSynthesis()}
              onClose={() => setRightPanelOpen(false)}
              showCloseButton={false}
            />
          </aside>
        )}
      </div>
    </>
  );
}
