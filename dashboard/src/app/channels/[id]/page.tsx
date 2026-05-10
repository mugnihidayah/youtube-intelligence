"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { ArrowLeft, ExternalLink, Users, Eye, TrendingUp, Film } from "lucide-react";
import StatCard from "@/components/StatCard";
import { ErrorState } from "@/components/ErrorBoundary";

const TIER_COLORS: Record<string, string> = {
  viral: "#ef4444",
  above_average: "#10b981",
  average: "#3b82f6",
  below_average: "#555570",
};

const DURATION_COLORS: Record<string, string> = {
  short: "#8b5cf6",
  medium: "#3b82f6",
  long: "#10b981",
  very_long: "#f59e0b",
};

function fmt(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function pct(n: number): string {
  if (!n) return "0%";
  return (n * 100).toFixed(2) + "%";
}

function formatDuration(seconds: number): string {
  if (!seconds) return "N/A";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${s.toString().padStart(2, "0")}`;
}

interface ChannelData {
  channel: {
    channel_id: string;
    channel_name: string;
    channel_url: string;
    niche: string;
    region: string;
    subscriber_count: number;
    size_tier: string;
  };
  metrics: {
    total_videos: number;
    total_views: number;
    avg_views: number;
    avg_engagement_rate: number;
    avg_views_per_sub: number;
    avg_views_per_day: number;
    videos_last_30d: number;
    avg_duration_seconds: number;
  } | null;
  videos: Array<{
    video_id: string;
    title: string;
    upload_date: { value: string };
    view_count: number;
    like_count: number;
    comment_count: number;
    duration_seconds: number;
    duration_category: string;
    engagement_rate: number;
    views_per_day: number;
    performance_tier: string;
    views_vs_benchmark: number;
  }>;
  benchmark: {
    avg_views_per_video: number;
    avg_engagement_rate: number;
  } | null;
  peers: Array<{
    channel_name: string;
    subscriber_count: number;
    avg_views: number;
    avg_engagement_rate: number;
  }>;
}

export default function ChannelDetailPage() {
  const params = useParams();
  const channelId = params.id as string;
  const [data, setData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/channels/${channelId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Channel not found");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [channelId]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        Loading channel...
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error || "Channel not found"} onRetry={() => window.location.reload()} />;
  }

  const { channel, metrics, videos, benchmark, peers } = data;

  // Prepare chart data
  const tierDistribution = videos.reduce((acc, v) => {
    const tier = v.performance_tier || "unknown";
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tierData = Object.entries(tierDistribution).map(([tier, count]) => ({
    name: tier.replace(/_/g, " "),
    value: count,
    tier,
  }));

  const durationDistribution = videos.reduce((acc, v) => {
    const cat = v.duration_category || "unknown";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const durationData = Object.entries(durationDistribution).map(([cat, count]) => ({
    name: cat,
    value: count,
    category: cat,
  }));

  // Benchmark comparison
  const benchmarkComparison = benchmark && metrics ? [
    {
      metric: "Avg Views",
      channel: metrics.avg_views,
      niche: benchmark.avg_views_per_video,
    },
    {
      metric: "Engagement",
      channel: metrics.avg_engagement_rate,
      niche: benchmark.avg_engagement_rate,
    },
  ] : [];

  return (
    <>
      {/* Back Link */}
      <Link href="/channels" className="filter-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, textDecoration: "none" }}>
        <ArrowLeft size={14} /> Back to Channels
      </Link>

      {/* Channel Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 8 }}>{channel.channel_name}</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className={`badge badge-${channel.niche}`}>{channel.niche}</span>
              <span className={`badge badge-${channel.region}`}>{channel.region === "ID" ? "Indonesia" : "Global"}</span>
              <span className={`badge badge-${channel.size_tier}`}>{channel.size_tier}</span>
            </div>
          </div>
          {channel.channel_url && (
            <a
              href={channel.channel_url}
              target="_blank"
              rel="noopener"
              className="filter-btn active"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
            >
              <ExternalLink size={14} /> View on YouTube
            </a>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <>
          <div className="stats-grid">
            <StatCard label="Subscribers" value={fmt(channel.subscriber_count)} icon={<Users size={20} />} gradient />
            <StatCard label="Total Views" value={fmt(metrics.total_views)} icon={<Eye size={20} />} />
            <StatCard label="Avg Views" value={fmt(metrics.avg_views)} icon={<TrendingUp size={20} />} />
            <StatCard label="Engagement" value={pct(metrics.avg_engagement_rate)} icon={<TrendingUp size={20} />} gradient />
            <StatCard label="Videos" value={metrics.total_videos} icon={<Film size={20} />} />
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8, marginBottom: 16, paddingLeft: 4 }}>
            * Based on {metrics.total_videos} sampled videos in database, not the channel&apos;s total catalog
          </p>
        </>
      )}

      {/* Charts Row */}
      <div className="grid-2">
        {/* Performance Tier Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Performance Distribution</div>
              <div className="card-subtitle">Video performance tiers</div>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tierData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4}>
                  {tierData.map((entry) => (
                    <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] || "#555"} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" formatter={(value: string) => (
                  <span style={{ color: "#8888a0", fontSize: 12 }}>{value}</span>
                )} />
                <Tooltip contentStyle={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, color: "#1a1a2e" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Duration Distribution */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Duration Distribution</div>
              <div className="card-subtitle">Video length categories</div>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData}>
                <XAxis dataKey="name" tick={{ fill: "#8888a0", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8888a0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, color: "#1a1a2e" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {durationData.map((entry) => (
                    <Cell key={entry.category} fill={DURATION_COLORS[entry.category] || "#8b5cf6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Benchmark Comparison */}
      {benchmarkComparison.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">vs {channel.niche} Average</div>
              <div className="card-subtitle">Channel performance compared to niche benchmark</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, padding: "0 20px 20px" }}>
            {benchmarkComparison.map((b) => {
              const ratio = b.niche > 0 ? b.channel / b.niche : 0;
              const isAbove = ratio >= 1;
              return (
                <div key={b.metric} style={{ textAlign: "center", padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>{b.metric}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: isAbove ? "#10b981" : "#ef4444" }}>
                    {ratio.toFixed(1)}×
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {isAbove ? "above" : "below"} niche avg
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Videos Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">All Videos ({videos.length})</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Views</th>
                <th>Likes</th>
                <th>Engagement</th>
                <th>Views/Day</th>
                <th>Duration</th>
                <th>Tier</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v, i) => (
                <tr key={v.video_id}>
                  <td>{i + 1}</td>
                  <td className="primary" style={{ maxWidth: 300 }}>
                    <a href={`https://youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noopener" style={{ color: "inherit", textDecoration: "none" }}>
                      {v.title.length > 55 ? v.title.slice(0, 55) + "…" : v.title}
                    </a>
                  </td>
                  <td className="primary number-large">{fmt(v.view_count)}</td>
                  <td>{fmt(v.like_count)}</td>
                  <td>{pct(v.engagement_rate)}</td>
                  <td>{fmt(v.views_per_day)}</td>
                  <td>{formatDuration(v.duration_seconds)}</td>
                  <td><span className={`badge badge-${v.performance_tier}`}>{v.performance_tier}</span></td>
                  <td>{v.upload_date?.value?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Niche Peers */}
      {peers.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{channel.niche} Peers</div>
              <div className="card-subtitle">Top channels in the same niche</div>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Channel</th>
                  <th>Subscribers</th>
                  <th>Avg Views</th>
                  <th>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {peers.map((p, i) => (
                  <tr key={i} style={p.channel_name === channel.channel_name ? { background: "rgba(139, 92, 246, 0.08)" } : {}}>
                    <td>{i + 1}</td>
                    <td className="primary">{p.channel_name} {p.channel_name === channel.channel_name && "← You"}</td>
                    <td>{fmt(p.subscriber_count)}</td>
                    <td>{fmt(p.avg_views)}</td>
                    <td>{pct(p.avg_engagement_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
