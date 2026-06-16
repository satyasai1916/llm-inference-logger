"use client";

import { use, useEffect, useRef, useState, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { streamChat } from "@/lib/sse";
import type { Conversation, Message } from "@/types";

function triggerDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.click();
}

// Memoised so the full list doesn't re-render on every streaming chunk
const MessageBubble = memo(function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: string;
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-sm"
            : "bg-[#1a1d27] border border-[#2a2d3a] text-slate-200 rounded-bl-sm"
        }`}
      >
        {content}
        {streaming && (
          <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
});

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params is a Promise in Client Components — unwrap with React's use()
  const { id } = use(params);
  const router = useRouter();

  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Tracks whether we're already scrolled near the bottom to avoid scroll fights
  const userScrolledUpRef = useRef(false);
  const streamingRef = useRef(false);
  // Fix 1: RAF ref to throttle streaming scroll DOM writes to once per frame
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    Promise.all([api.conversations.get(id), api.conversations.messages(id)])
      .then(([c, msgs]) => {
        setConv(c);
        setMessages(msgs);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Scroll to bottom when new committed messages arrive (not on every chunk)
  // Fix 2: Use "auto" instead of "smooth" to avoid 300ms animation fighting with streaming
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  // Fix 1: During streaming, throttle scroll DOM writes to one per animation frame
  useEffect(() => {
    if (streamingText && !userScrolledUpRef.current) {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
        scrollRafRef.current = null;
      });
    }
  }, [streamingText]);

  // Detect if user manually scrolled up during streaming so we stop forcing scroll
  // Fix 5: Proportional scroll threshold instead of hardcoded 80px
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!streamingRef.current) return;
    const el = e.currentTarget;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < Math.max(80, el.clientHeight * 0.15);
    userScrolledUpRef.current = !nearBottom;
  }, []);

  // Auto-resize textarea as content grows
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setError(null);
    setStreamingText("");
    setStreaming(true);
    streamingRef.current = true;
    userScrolledUpRef.current = false;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: id,
      role: "user",
      content: text,
      token_count: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    abortRef.current = new AbortController();
    let accumulated = "";

    try {
      await streamChat(
        id,
        text,
        (chunk) => {
          accumulated += chunk;
          setStreamingText(accumulated);
        },
        () => {
          const assistantMsg: Message = {
            id: crypto.randomUUID(),
            conversation_id: id,
            role: "assistant",
            content: accumulated,
            token_count: null,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setStreamingText("");
          setStreaming(false);
          streamingRef.current = false;
          userScrolledUpRef.current = false;
          abortRef.current = null;
        },
        // Fix 4: Persist any partial response that arrived before the error
        (msg) => {
          if (accumulated) {
            const partial: Message = {
              id: crypto.randomUUID(),
              conversation_id: id,
              role: "assistant",
              content: accumulated,
              token_count: null,
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, partial]);
          }
          setError(msg);
          setStreamingText("");
          setStreaming(false);
          streamingRef.current = false;
        },
        abortRef.current.signal
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError("Connection lost. Please try again.");
      }
      setStreamingText("");
      setStreaming(false);
      streamingRef.current = false;
    }
  };

  const handleCancel = async () => {
    abortRef.current?.abort();
    await api.conversations.update(id, { status: "cancelled" });
    setConv((prev) => prev ? { ...prev, status: "cancelled" } : prev);
    setStreaming(false);
    streamingRef.current = false;
    setStreamingText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-49px)]">
      {/* Header */}
      <div className="border-b border-[#2a2d3a] px-4 py-3 flex items-center gap-3 bg-[#1a1d27]">
        <button
          onClick={() => router.push("/")}
          className="text-slate-400 hover:text-white transition-colors text-sm"
        >
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{conv?.title ?? "Untitled conversation"}</p>
          <p className="text-xs text-slate-500">{conv?.provider} · {conv?.model}</p>
        </div>
        {conv?.status === "cancelled" && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
            cancelled
          </span>
        )}
        {/* Export buttons */}
        {messages.length > 0 && (
          <div className="flex gap-1">
            {/* Fix 6: aria-labels on icon buttons */}
            <button
              onClick={() => triggerDownload(api.conversations.exportUrl(id, "json"))}
              title="Export as JSON"
              aria-label="Export as JSON"
              className="text-slate-500 hover:text-indigo-400 transition-colors text-xs px-2 py-1 rounded border border-transparent hover:border-indigo-500/30"
            >
              JSON
            </button>
            <button
              onClick={() => triggerDownload(api.conversations.exportUrl(id, "txt"))}
              title="Export as text"
              aria-label="Export as plain text"
              className="text-slate-500 hover:text-indigo-400 transition-colors text-xs px-2 py-1 rounded border border-transparent hover:border-indigo-500/30"
            >
              TXT
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        onScroll={handleScroll}
      >
        {messages.length === 0 && !streaming && (
          <div className="text-center text-slate-500 py-20">
            <p className="text-3xl mb-3">✨</p>
            <p>Send a message to get started.</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {streamingText && (
          <MessageBubble role="assistant" content={streamingText} streaming />
        )}

        {/* Fix 3: TTFT "thinking" indicator — shown while streaming but before first token */}
        {streaming && streamingText === "" && (
          <div className="flex justify-start">
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1 items-center h-3.5">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#2a2d3a] px-4 py-3 bg-[#1a1d27]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Send a message… (Enter to send, Shift+Enter for newline)"
            disabled={streaming || conv?.status === "cancelled"}
            rows={1}
            className="flex-1 bg-[#0f1117] border border-[#2a2d3a] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm resize-none outline-none transition-colors disabled:opacity-40"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          {streaming ? (
            <button
              onClick={handleCancel}
              className="shrink-0 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || conv?.status === "cancelled"}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>
        {conv?.status === "cancelled" && (
          <p className="text-xs text-slate-500 mt-1.5">This conversation has been cancelled.</p>
        )}
      </div>
    </div>
  );
}
