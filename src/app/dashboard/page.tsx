"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { MetricsSummary, LatencyPoint, ProviderStat, TokenPoint } from "@/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Window = "1h" | "24h" | "7d";

const WINDOWS: { label: string; value: Window }[] = [
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
];

export default function DashboardPage() {
  const [window, setWindow] = useState<Window>("24h");
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [latency, setLatency] = useState<LatencyPoint[]>([]);
  const [providers, setProviders] = useState<ProviderStat[]>([]);
  const [tokens, setTokens] = useState<TokenPoint[]>([]);
  // Separate refreshing flag so stale data stays visible while new data loads
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Abort controller ref to cancel in-flight fetches when window changes rapidly
  const fetchAbortRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async (w: Window) => {
    // Cancel any previous in-flight fetch batch
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = new AbortController();

    setRefreshing(true);
    try {
      const [s, l, p, t] = await Promise.all([
        api.metrics.summary(w),
        api.metrics.latencyOverTime(w),
        api.metrics.providerBreakdown(),
        api.metrics.tokensOverTime(w),
      ]);
      // Only apply results if this fetch wasn't superseded
      if (!fetchAbortRef.current.signal.aborted) {
        setSummary(s);
        setLatency(l);
        setProviders(p);
        setTokens(t);
        setFetchError(null);
      }
    } catch {
      // Keep stale data on failure — do not blank the UI
      setFetchError("Failed to load metrics. Retrying...");
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(window);
    const interval = setInterval(() => fetchAll(window), 30_000);
    return () => {
      clearInterval(interval);
      fetchAbortRef.current?.abort();
    };
  }, [window, fetchAll]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {refreshing && !initialLoading && (
            <span className="text-xs text-slate-500 animate-pulse">Refreshing…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindow(w.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                window === w.value
                  ? "bg-indigo-600 text-white"
                  : "bg-[#1a1d27] border border-[#2a2d3a] text-slate-400 hover:text-white"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center justify-between">
          <span>{fetchError}</span>
          <button onClick={() => setFetchError(null)} className="text-red-400 hover:text-red-300 ml-4">✕</button>
        </div>
      )}

      {/* Summary cards — show skeleton only on very first load, stale values after */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Total Requests"
          value={summary?.total_requests ?? "—"}
          loading={initialLoading}
        />
        <StatCard
          label="Avg Latency"
          value={summary ? `${summary.avg_latency_ms.toFixed(0)} ms` : "—"}
          loading={initialLoading}
        />
        <StatCard
          label="Error Rate"
          value={summary ? `${summary.error_rate_pct.toFixed(1)}%` : "—"}
          loading={initialLoading}
          warn={summary ? summary.error_rate_pct > 5 : false}
        />
        <StatCard
          label="Total Tokens"
          value={summary ? (summary.total_input_tokens + summary.total_output_tokens).toLocaleString() : "—"}
          loading={initialLoading}
        />
        <StatCard
          label="Total Cost"
          value={summary ? (summary.total_cost_usd === 0 ? "$0.00 (free)" : `$${summary.total_cost_usd.toFixed(4)}`) : "—"}
          loading={initialLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Latency over time */}
        <ChartCard title="Latency over time (ms)" refreshing={refreshing && !initialLoading}>
          {latency.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={latency} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="bucket" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="avg_ms" name="avg" stroke="#6366f1" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="p95_ms" name="p95" stroke="#f59e0b" dot={false} strokeWidth={2} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Tokens over time */}
        <ChartCard title="Token usage over time" refreshing={refreshing && !initialLoading}>
          {tokens.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={tokens} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="bucket" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area type="monotone" dataKey="input_tokens" name="Input" stroke="#6366f1" fill="url(#inputGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="output_tokens" name="Output" stroke="#22d3ee" fill="url(#outputGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Provider breakdown */}
      <ChartCard title="Provider breakdown" refreshing={refreshing && !initialLoading}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {providers.length === 0 ? (
            <EmptyChart height={200} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={providers} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="provider" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="total" name="Requests" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <div className="space-y-2">
            {providers.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">No data yet.</p>
            ) : (
              providers.map((p) => (
                <div key={`${p.provider}-${p.model}`} className="flex items-center gap-3 p-3 rounded-lg bg-[#0f1117] border border-[#2a2d3a]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.provider}</p>
                    <p className="text-xs text-slate-500 truncate">{p.model}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{p.total.toLocaleString()} reqs</p>
                    <p className="text-xs text-slate-500">{p.avg_latency_ms.toFixed(0)} ms avg</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">err</p>
                    <p className={`text-sm font-medium ${p.error_rate_pct > 5 ? "text-red-400" : "text-green-400"}`}>
                      {p.error_rate_pct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">cost</p>
                    <p className="text-sm font-medium text-amber-400">
                      {p.total_cost_usd === 0 ? "free" : `$${p.total_cost_usd.toFixed(4)}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

function EmptyChart({ height = 220 }: { height?: number }) {
  return (
    <div style={{ height }} className="flex items-center justify-center text-slate-600 text-sm">
      No data yet
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  warn,
}: {
  label: string;
  value: string | number;
  loading: boolean;
  warn?: boolean;
}) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${loading ? "text-slate-600" : warn ? "text-red-400" : "text-white"}`}>
        {loading ? "..." : value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  children,
  refreshing,
}: {
  title: string;
  children: React.ReactNode;
  refreshing?: boolean;
}) {
  return (
    <div className={`bg-[#1a1d27] border rounded-xl p-4 transition-colors ${refreshing ? "border-indigo-500/30" : "border-[#2a2d3a]"}`}>
      <p className="text-sm font-medium text-slate-400 mb-4">{title}</p>
      {children}
    </div>
  );
}
