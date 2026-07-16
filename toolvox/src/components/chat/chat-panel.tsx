"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { MessageSquare, Plus, Trash2, PanelLeftClose, PanelLeft } from "lucide-react";
import { Message } from "./message";
import { ChatInput } from "./chat-input";
import { DEMOS, type DemoId } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import {
  saveChat,
  saveMessage,
  getMessagesByChat,
  getChatsByDemo,
  deleteChat,
  type StoredChat,
} from "@/lib/storage";

interface ChatPanelProps {
  demoId: string;
  systemPrompt: string;
}

export function ChatPanel({ demoId, systemPrompt }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatId] = useState(() => `${demoId}-${Date.now()}`);
  const [chatHistory, setChatHistory] = useState<StoredChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedModel, setSelectedModel] = useState("tencent/hy3:free");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const demo = DEMOS.find((d) => d.id === (demoId as DemoId));
  const suggestions = demo?.suggestions ?? [];

  const { messages, sendMessage, status, setMessages } = useChat({
    id: activeChatId || chatId,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    async function load() {
      try {
        const history = await getChatsByDemo(demoId);
        setChatHistory(history.sort((a, b) => b.updatedAt - a.updatedAt));
      } catch {}
      setIsLoaded(true);
    }
    load();
  }, [demoId]);

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [messages, status]);

  const persistMessages = useCallback(
    async (chatIdParam: string, msgs: any[]) => {
      try {
        for (const msg of msgs) {
          await saveMessage({
            id: msg.id,
            chatId: chatIdParam,
            role: msg.role,
            content: typeof msg.content === "string" ? msg.content : "",
            parts: msg.parts,
            createdAt: Date.now(),
          });
        }
      } catch {}
    },
    []
  );

  const handleSend = async (message: string) => {
    const currentChatId = activeChatId || chatId;
    setMobileSidebarOpen(false);
    setSendError(null);

    const isDark = document.documentElement.classList.contains("dark");
    const themeState = isDark ? "oscuro" : "claro";
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "no definido";
    const fontFamily = getComputedStyle(document.documentElement).fontFamily || "no definido";
    const fontSize = getComputedStyle(document.documentElement).fontSize || "16px";
    const finalPrompt = systemPrompt
      .replace(/__THEME_STATE__/g, themeState)
      .replace(/__ACCENT_COLOR__/g, accentColor)
      .replace(/__FONT_FAMILY__/g, fontFamily)
      .replace(/__FONT_SIZE__/g, fontSize);

    if (!activeChatId) {
      const chat: StoredChat = {
        id: chatId,
        demoId,
        title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveChat(chat);
      setActiveChatId(chatId);
      setChatHistory((prev) => [chat, ...prev]);
    }

    try {
      await sendMessage(
        { text: message },
        { body: { systemPrompt: finalPrompt, chatId: currentChatId, model: selectedModel } }
      );
    } catch (err) {
      setSendError("Error al conectar con la IA. Verifica tu conexión y API key.");
    }
  };

  useEffect(() => {
    if (messages.length > 0 && activeChatId) {
      persistMessages(activeChatId, messages);
    }
  }, [messages, activeChatId, persistMessages]);

  const loadChat = async (chat: StoredChat) => {
    setActiveChatId(chat.id);
    setMobileSidebarOpen(false);
    try {
      const storedMessages = await getMessagesByChat(chat.id);
      const uiMessages = storedMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        parts: m.parts,
      }));
      setMessages(uiMessages as any);
    } catch {
      setMessages([]);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setMobileSidebarOpen(false);
  };

  const handleDeleteChat = async (chat: StoredChat) => {
    try {
      await deleteChat(chat.id);
      setChatHistory((prev) => prev.filter((c) => c.id !== chat.id));
      if (activeChatId === chat.id) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch {}
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva conversación
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        {chatHistory.map((chat) => (
          <div
            key={chat.id}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs cursor-pointer transition-colors",
              activeChatId === chat.id
                ? "bg-primary/10 text-foreground border border-primary/20"
                : "hover:bg-muted text-muted-foreground"
            )}
            onClick={() => loadChat(chat)}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate flex-1">{chat.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteChat(chat);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity shrink-0"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {chatHistory.length === 0 && (
          <p className="text-center text-[11px] text-muted-foreground/50 py-4">
            Sin conversaciones
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card/50 transition-all duration-300 shrink-0",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        )}
      >
        {sidebarOpen && sidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="w-72 bg-card border-r border-border h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile sidebar toggle */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-muted-foreground truncate">
            {chatHistory.find((c) => c.id === activeChatId)?.title || "Nueva conversación"}
          </span>
        </div>

        {/* Desktop sidebar toggle */}
        <div className="hidden md:flex items-center px-3 py-1.5 border-b border-border">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-4 min-h-full">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                  <span className="text-2xl">💬</span>
                </div>
                <h2 className="text-xl font-semibold mb-2">¡Hola! Soy ToolVox</h2>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Escribe lo que necesites y generaré componentes interactivos
                  en tiempo real.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="rounded-full border bg-muted/50 px-3 py-1.5 text-xs hover:bg-muted hover:border-primary/50 transition-all text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            {status === "submitted" && (
              <div className="flex gap-3 animate-fade-in">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="bg-muted rounded-xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-typing-dot" style={{ animationDelay: "0s" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-typing-dot" style={{ animationDelay: "0.16s" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-typing-dot" style={{ animationDelay: "0.32s" }} />
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
            {sendError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive mx-4 mb-2">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>{sendError}</span>
                <button onClick={() => setSendError(null)} className="ml-auto underline hover:no-underline">OK</button>
              </div>
            )}
          </div>
        </div>
        <ChatInput onSubmit={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
}
