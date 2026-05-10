"use client";
import { useEffect, useState } from "react";
import { Monitor, Film, Eye, Heart, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { PageSkeleton } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorBoundary";
import StatCard from "@/components/StatCard";

const NICHE_COLORS: Record<string, string> = {
  gaming: "#8b5cf6",
  tech: "#3b82f6",
  education: "#10b981",
  music: "#f59e0b",
};

const TIER_COLORS: Record<string, string> = {
  viral: "#ef4444",
  above_average: "#10b981",
  average: "#3b82f6",
  below_average: "#555570",
};

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function pct(n: number): string {
  return (n * 100).toFixed(2) + "%";
}

interface OverviewData {
  kpis: {
    total_channels: number;
    total_videos: number;
    total_views: number;
    total_likes: number;
    avg_engagement_rate: number;
  };
  byNiche: Array<{
    niche: string;
    channels: number;
    videos: number;
    total_views: number;
    avg_engagement: number;
    avg_views: number;
  }>;
  topVideos: Array<{
    video_id: string;
    title: string;
    channel_name: string;
    niche: string;
    view_count: number;
    like_count: number;
    engagement_rate: number;
    performance_tier: string;
    upload_date: { value: string };
  }>;
  byRegion: Array<{
    region: string;
    channels: number;
    videos: number;
    total_views: number;
  }>;
  tiers: Array<{ performance_tier: string; count: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/overview")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/overview")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch data");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!data) return <ErrorState message="No data available" />;

  const { kpis, byNiche, topVideos, tiers } = data;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">
          YouTube Market Intelligence
        </p>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard label="Total Channels" value={kpis.total_channels} gradient icon={<Monitor size={20} />} />
        <StatCard label="Total Videos" value={fmt(kpis.total_videos)} icon={<Film size={20} />} />
        <StatCard label="Total Views" value={fmt(kpis.total_views)} gradient icon={<Eye size={20} />} />
        <StatCard label="Total Likes" value={fmt(kpis.total_likes)} icon={<Heart size={20} />} />
        <StatCard label="Avg Engagement" value={pct(kpis.avg_engagement_rate)} icon={<BarChart3 size={20} />} />
      </div>

      {/* Charts Row */}
      <div className="grid-2">
        {/* Views by Niche */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Views by Niche</div>
              <div className="card-subtitle">Total views per content niche</div>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byNiche}>
                <XAxis
                  dataKey="niche"
                  tick={{ fill: "#8888a0", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#8888a0", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmt}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255, 255, 255, 0.95)", 
                    border: "1px solid rgba(0,0,0,0.08)", 
                    borderRadius: 8, 
                    color: "#1a1a2e", 
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
                  }}
                  formatter={(v: number) => [fmt(v), "Views"]}
                />
                <Bar dataKey="total_views" radius={[6, 6, 0, 0]}>
                  {byNiche.map((entry) => (
                    <Cell key={entry.niche} fill={NICHE_COLORS[entry.niche]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

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
                <Pie
                  data={tiers}
                  dataKey="count"
                  nameKey="performance_tier"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                >
                  {tiers.map((entry) => (
                    <Cell
                      key={entry.performance_tier}
                      fill={TIER_COLORS[entry.performance_tier] || "#555"}
                    />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string) => (
                    <span style={{ color: "#8888a0", fontSize: 12 }}>{value}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255, 255, 255, 0.95)", 
                    border: "1px solid rgba(0,0,0,0.08)", 
                    borderRadius: 8, 
                    color: "#1a1a2e", 
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Niche Comparison */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Niche Comparison</div>
            <div className="card-subtitle">Avg engagement rate by niche</div>
          </div>
        </div>
        <div className="chart-container-sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byNiche} layout="vertical">
              <XAxis
                type="number"
                tick={{ fill: "#8888a0", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => pct(v)}
              />
              <YAxis
                type="category"
                dataKey="niche"
                tick={{ fill: "#8888a0", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(255, 255, 255, 0.95)", 
                  border: "1px solid rgba(0,0,0,0.08)", 
                  borderRadius: 8, 
                  color: "#1a1a2e", 
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
                }}
                formatter={(v: number) => [pct(v), "Engagement"]}
              />
              <Bar dataKey="avg_engagement" radius={[0, 6, 6, 0]}>
                {byNiche.map((entry) => (
                  <Cell key={entry.niche} fill={NICHE_COLORS[entry.niche]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Videos Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Top Performing Videos</div>
            <div className="card-subtitle">Ranked by view count</div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Video</th>
              <th>Channel</th>
              <th>Niche</th>
              <th>Views</th>
              <th>Engagement</th>
              <th>Tier</th>
            </tr>
          </thead>
          <tbody>
            {topVideos.map((v, i) => (
              <tr key={v.video_id}>
                <td>{i + 1}</td>
                <td className="primary" style={{ maxWidth: 300 }}>
                  <a
                    href={`https://youtube.com/watch?v=${v.video_id}`}
                    target="_blank"
                    rel="noopener"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {v.title.length > 60 ? v.title.slice(0, 60) + "…" : v.title}
                  </a>
                </td>
                <td>{v.channel_name}</td>
                <td><span className={`badge badge-${v.niche}`}>{v.niche}</span></td>
                <td className="primary number-large">{fmt(v.view_count)}</td>
                <td>{pct(v.engagement_rate)}</td>
                <td>
                  <span className={`badge badge-${v.performance_tier}`}>
                    {v.performance_tier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
