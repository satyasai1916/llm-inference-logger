"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Conversation } from "@/types";
import { useRouter } from "next/navigation";

type ProviderMap = Record<string, { label: string; models: string[] }>;

export default function HomePage() {
  const router = useRouter();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderMap>({});
  const [showModal, setShowModal] = useState(false);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.providers.list().then((available) => {
      setProviders(available);
      const first = Object.keys(available)[0];
      if (first) {
        setProvider(first);
        setModel(available[first].models[0]);
      }
    }).catch(() => {});
  }, []);

  // Fix 4 — Refresh list on window focus
  useEffect(() => {
    const load = () => {
      api.conversations.list().then((r) => {
        setConvs(r.items);
        setLoading(false);
      }).catch(() => setLoading(false));
    };
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  // Fix 6 — Close modal on Escape key
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowModal(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showModal]);

  // Fix 3 — Close modal on successful create
  const handleCreate = async () => {
    setCreating(true);
    try {
      const conv = await api.conversations.create({ provider, model });
      setShowModal(false);
      router.push(`/chat/${conv.id}`);
    } finally {
      setCreating(false);
    }
  };

  // Fix 2 — Delete confirmation with optimistic removal and rollback
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    const prev = convs;
    setConvs((c) => c.filter((x) => x.id !== id));
    try {
      await api.conversations.delete(id);
    } catch {
      setConvs(prev); // rollback on failure
    }
  };

  const statusColor = (s: string) => {
    if (s === "active") return "bg-green-500/20 text-green-400";
    if (s === "cancelled") return "bg-red-500/20 text-red-400";
    return "bg-slate-500/20 text-slate-400";
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <button
          onClick={() => setShowModal(true)}
          disabled={Object.keys(providers).length === 0}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
        >
          + New Chat
        </button>
      </div>

      {/* Fix 1 — Loading skeleton instead of plain text */}
      {loading ? (
        <ul className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <li key={i} className="h-[72px] rounded-xl bg-[#1a1d27] border border-[#2a2d3a] animate-pulse" />
          ))}
        </ul>
      ) : convs.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-4xl mb-4">💬</p>
          <p>No conversations yet. Start one!</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {convs.map((c) => (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className="flex items-center gap-3 p-4 rounded-xl bg-[#1a1d27] border border-[#2a2d3a] hover:border-indigo-500/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.title ?? "Untitled conversation"}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.provider} · {c.model} · {new Date(c.updated_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>
                  {c.status}
                </span>
                {/* Fix 5 — aria-label on delete button */}
                <button
                  onClick={(e) => handleDelete(c.id, e)}
                  aria-label="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all text-xs px-2"
                >
                  ✕
                </button>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="font-bold text-lg mb-4">New Conversation</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    setModel(providers[e.target.value].models[0]);
                  }}
                  className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm"
                >
                  {Object.entries(providers).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm"
                >
                  {(providers[provider]?.models ?? []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-[#2a2d3a] rounded-lg py-2 text-sm hover:bg-[#2a2d3a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !provider || !model}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {creating ? "Creating..." : "Start Chat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
