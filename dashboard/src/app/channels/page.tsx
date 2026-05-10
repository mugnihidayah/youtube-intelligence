"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import Link from "next/link";

const NICHE_COLORS: Record<string, string> = {
  gaming: "#8b5cf6", tech: "#3b82f6", education: "#10b981", music: "#f59e0b",
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

interface Channel {
  channel_id: string;
  channel_name: string;
  niche: string;
  region: string;
  subscriber_count: number;
  size_tier: string;
  total_videos: number;
  total_views: number;
  avg_views: number;
  avg_engagement_rate: number;
  avg_like_rate: number;
  videos_last_30d: number;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [niche, setNiche] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [sort, setSort] = useState("subscriber_count");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (niche) params.set("niche", niche);
    if (region) params.set("region", region);
    params.set("sort", sort);
    params.set("limit", "100");

    fetch(`/api/channels?${params}`)
      .then((r) => r.json())
      .then((d) => setChannels(d.channels || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [niche, region, sort]);

    const sortKeyMap: Record<string, keyof Channel> = {
    subscriber_count: "subscriber_count",
    total_views: "total_views",
    avg_engagement_rate: "avg_engagement_rate",
    avg_views: "avg_views",
  };

  const activeKey = sortKeyMap[sort] || "subscriber_count";

  const top15 = channels.slice(0, 15).map((c) => ({
    name: c.channel_name.length > 18 ? c.channel_name.slice(0, 18) + "…" : c.channel_name,
    value: Number(c[activeKey]) || 0,
    niche: c.niche,
  }));


  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Channel Leaderboard</h1>
        <p className="page-subtitle">Compare channel performance across niches and regions</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="stat-label" style={{ marginBottom: 6 }}>Niche</div>
            <div className="filters">
              <button className={`filter-btn ${!niche ? "active" : ""}`} onClick={() => setNiche("")}>All</button>
              {["gaming", "tech", "education", "music"].map((n) => (
                <button key={n} className={`filter-btn ${niche === n ? "active" : ""}`} onClick={() => setNiche(n)}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="stat-label" style={{ marginBottom: 6 }}>Region</div>
            <div className="filters">
              <button className={`filter-btn ${!region ? "active" : ""}`} onClick={() => setRegion("")}>All</button>
              <button className={`filter-btn ${region === "ID" ? "active" : ""}`} onClick={() => setRegion("ID")}>Indonesia</button>
              <button className={`filter-btn ${region === "GLOBAL" ? "active" : ""}`} onClick={() => setRegion("GLOBAL")}>Global</button>
            </div>
          </div>
          <div>
            <div className="stat-label" style={{ marginBottom: 6 }}>Sort by</div>
            <div className="filters">
              {[
                ["subscriber_count", "Subscribers"],
                ["total_views", "Total Views"],
                ["avg_engagement_rate", "Engagement"],
                ["avg_views", "Avg Views"],
              ].map(([key, label]) => (
                <button key={key} className={`filter-btn ${sort === key ? "active" : ""}`} onClick={() => setSort(key)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="loading-spinner" />Loading channels...</div>
      ) : (
        <>
          {/* Top 15 Chart */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Top 15 Channels</div>
                <div className="card-subtitle">By {sort.replace(/_/g, " ")}</div>
              </div>
            </div>
            <div style={{ width: "100%", height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top15} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fill: "#8888a0", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#ccc", fontSize: 12 }} axisLine={false} tickLine={false} width={150} />
                  <Tooltip
                    contentStyle={{ background: "rgba(255, 255, 255, 0.95)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, color: "#1a1a2e", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                    formatter={(v: number) => [
                      sort === "avg_engagement_rate" ? pct(v) : fmt(v),
                      sort.replace(/_/g, " ")
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {top15.map((entry) => (
                      <Cell key={entry.name} fill={NICHE_COLORS[entry.niche] || "#8b5cf6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">All Channels ({channels.length})</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Channel</th>
                    <th>Niche</th>
                    <th>Region</th>
                    <th>Tier</th>
                    <th>Subscribers</th>
                    <th>Total Views</th>
                    <th>Avg Views</th>
                    <th>Engagement</th>
                    <th>Videos (30d)</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((c, i) => (
                    <tr key={c.channel_id}>
                      <td>{i + 1}</td>
                      <td className="primary">
                        <Link href={`/channels/${c.channel_id}`} style={{ color: "inherit", textDecoration: "none" }}>
                          {c.channel_name}
                        </Link>
                      </td>
                      <td><span className={`badge badge-${c.niche}`}>{c.niche}</span></td>
                      <td><span className={`badge badge-${c.region}`}>{c.region === "ID" ? "Indonesia" : "Global"}</span></td>
                      <td><span className={`badge badge-${c.size_tier}`}>{c.size_tier}</span></td>
                      <td className="primary number-large">{fmt(c.subscriber_count)}</td>
                      <td className="number-large">{fmt(c.total_views)}</td>
                      <td className="number-large">{fmt(c.avg_views)}</td>
                      <td>{pct(c.avg_engagement_rate)}</td>
                      <td>{c.videos_last_30d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
