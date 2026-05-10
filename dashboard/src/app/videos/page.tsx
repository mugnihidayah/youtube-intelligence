"use client";
import { useEffect, useState } from "react";

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

interface Video {
  video_id: string;
  title: string;
  channel_name: string;
  niche: string;
  region: string;
  upload_date: { value: string } | string;
  view_count: number;
  like_count: number;
  comment_count: number;
  engagement_rate: number;
  views_per_day: number;
  performance_tier: string;
  duration_category: string;
  size_tier: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [niche, setNiche] = useState("");
  const [tier, setTier] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("view_count");
  const [type, setType] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (niche) params.set("niche", niche);
    if (tier) params.set("tier", tier);
    if (region) params.set("region", region);
    if (type) params.set("type", type);
    params.set("sort", sort);
    params.set("limit", "100");

    fetch(`/api/videos?${params}`)
      .then((r) => r.json())
      .then((d) => setVideos(d.videos || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [niche, tier, region, sort, type]);

  const getDate = (d: { value: string } | string) => {
    if (typeof d === "string") return d;
    return d?.value?.split("T")[0] || "";
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Video Performance</h1>
        <p className="page-subtitle">Explore and filter video metrics across all channels</p>
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
            <div className="stat-label" style={{ marginBottom: 6 }}>Performance</div>
            <div className="filters">
              <button className={`filter-btn ${!tier ? "active" : ""}`} onClick={() => setTier("")}>All</button>
              {["viral", "above_average", "average", "below_average"].map((t) => (
                <button key={t} className={`filter-btn ${tier === t ? "active" : ""}`} onClick={() => setTier(t)}>
                  {t === "above_average" ? "above avg" : t === "below_average" ? "below avg" : t}
                </button>
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
            <div className="stat-label" style={{ marginBottom: 6 }}>Sort</div>
            <div className="filters">
              {[
                ["view_count", "Views"],
                ["engagement_rate", "Engagement"],
                ["views_per_day", "Views/Day"],
                ["like_count", "Likes"],
                ["upload_date", "Newest"],
              ].map(([key, label]) => (
                <button key={key} className={`filter-btn ${sort === key ? "active" : ""}`} onClick={() => setSort(key)}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="stat-label" style={{ marginBottom: 6 }}>Type</div>
            <div className="filters">
              <button className={`filter-btn ${!type ? "active" : ""}`} onClick={() => setType("")}>All</button>
              <button className={`filter-btn ${type === "regular" ? "active" : ""}`} onClick={() => setType("regular")}>Regular</button>
              <button className={`filter-btn ${type === "live" ? "active" : ""}`} onClick={() => setType("live")}>Live</button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="stats-grid">
          <div className="stat-card animate-in">
            <div className="stat-label">Videos Shown</div>
            <div className="stat-value gradient">{videos.length}</div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-label">Avg Views</div>
            <div className="stat-value">{fmt(videos.reduce((s, v) => s + v.view_count, 0) / (videos.length || 1))}</div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-label">Avg Engagement</div>
            <div className="stat-value">{pct(videos.reduce((s, v) => s + v.engagement_rate, 0) / (videos.length || 1))}</div>
          </div>
          <div className="stat-card animate-in">
            <div className="stat-label">Viral Videos</div>
            <div className="stat-value" style={{ color: "#ef4444" }}>{videos.filter((v) => v.performance_tier === "viral").length}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="loading-spinner" />Loading videos...</div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Videos ({videos.length})</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Channel</th>
                  <th>Niche</th>
                  <th>Views</th>
                  <th>Likes</th>
                  <th>Engagement</th>
                  <th>Views/Day</th>
                  <th>Tier</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v, i) => (
                  <tr key={v.video_id}>
                    <td>{i + 1}</td>
                    <td className="primary" style={{ maxWidth: 280 }}>
                      <a href={`https://youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noopener" style={{ color: "inherit", textDecoration: "none" }}>
                        {v.title.length > 55 ? v.title.slice(0, 55) + "…" : v.title}
                      </a>
                    </td>
                    <td>{v.channel_name}</td>
                    <td><span className={`badge badge-${v.niche}`}>{v.niche}</span></td>
                    <td className="primary number-large">{fmt(v.view_count)}</td>
                    <td className="number-large">{fmt(v.like_count)}</td>
                    <td>{pct(v.engagement_rate)}</td>
                    <td className="number-large">{fmt(v.views_per_day)}</td>
                    <td><span className={`badge badge-${v.performance_tier}`}>{v.performance_tier}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>{getDate(v.upload_date)}</td>
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
