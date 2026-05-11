"use client";
import { useEffect, useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend,
} from "recharts";

const NICHE_COLORS: Record<string, string> = {
  gaming: "#8b5cf6", tech: "#3b82f6", education: "#10b981", music: "#f59e0b",
};
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt(n: number): string {
  if (!n) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}
function pct(n: number): string { return n ? (n * 100).toFixed(2) + "%" : "0%"; }

const TT_STYLE = { background: "rgba(255, 255, 255, 0.95)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", color: "#1a1a2e", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" };

export default function NichesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/niches").then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="loading-spinner" />Loading niche data...</div>;
  if (!data) return <div>Error loading data</div>;

  // Radar data
  const mx = {
    eng: Math.max(...data.overview.map((o: any) => o.avg_engagement_rate || 0), 0.001),
    views: Math.max(...data.overview.map((o: any) => o.avg_views_per_video || 0), 1),
    subs: Math.max(...data.overview.map((o: any) => o.avg_subscribers || 0), 1),
    upl: Math.max(...data.overview.map((o: any) => o.avg_uploads_last_30d || 0), 1),
    like: Math.max(...data.overview.map((o: any) => o.avg_like_rate || 0), 0.001),
  };
  const radarData = [
    { metric: "Engagement", ...Object.fromEntries(data.overview.map((o: any) => [o.niche, Math.round((o.avg_engagement_rate / mx.eng) * 100)])) },
    { metric: "Avg Views", ...Object.fromEntries(data.overview.map((o: any) => [o.niche, Math.round((o.avg_views_per_video / mx.views) * 100)])) },
    { metric: "Avg Subs", ...Object.fromEntries(data.overview.map((o: any) => [o.niche, Math.round((o.avg_subscribers / mx.subs) * 100)])) },
    { metric: "Upload Freq", ...Object.fromEntries(data.overview.map((o: any) => [o.niche, Math.round(((o.avg_uploads_last_30d || 0) / mx.upl) * 100)])) },
    { metric: "Like Rate", ...Object.fromEntries(data.overview.map((o: any) => [o.niche, Math.round(((o.avg_like_rate || 0) / mx.like) * 100)])) },
  ];

  // Duration data
  const durLabels: Record<string, string> = { short: "<1 min", medium: "1-10 min", long: "10-60 min", very_long: ">1 hour" };
  const durationData = ["short", "medium", "long", "very_long"].map(d => ({
    duration: durLabels[d] || d,
    ...Object.fromEntries(data.durationAnalysis.filter((x: any) => x.duration_category === d).map((x: any) => [x.niche, x.avg_views])),
  }));

  // Upload day data
  const uploadDayData = DAY_NAMES.map((dayName, idx) => {
    const entry: Record<string, any> = { day: dayName };
    data.uploadDays.filter((u: any) => u.upload_day_of_week === idx + 1).forEach((u: any) => { entry[u.niche] = u.count; });
    return entry;
  });

    // ID vs Global - reshaped for grouped bar
  const idVsGlobalData = [...new Set(data.nicheRegion.map((r: any) => r.niche))].map(niche => {
    const idRow = data.nicheRegion.find((r: any) => r.niche === niche && r.region === "ID");
    const globalRow = data.nicheRegion.find((r: any) => r.niche === niche && r.region === "GLOBAL");
    return {
      niche,
      Indonesia: idRow?.avg_views || 0,
      Global: globalRow?.avg_views || 0,
    };
  });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Niche Explorer</h1>
        <p className="page-subtitle">Deep-dive comparison across Gaming, Tech, Education, and Music</p>
      </div>

      {/* Niche Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {data.overview.map((o: any) => (
          <div key={o.niche} className="card animate-in" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: NICHE_COLORS[o.niche] }} />
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: NICHE_COLORS[o.niche], marginBottom: 12, letterSpacing: "0.06em" }}>{o.niche}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>{o.total_channels} <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 400 }}>channels</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Indonesia / Global", `${o.id_channels} / ${o.global_channels}`],
                ["Avg Subscribers", fmt(o.avg_subscribers)],
                ["Avg Views/Video", fmt(o.avg_views_per_video)],
                ["Engagement Rate", pct(o.avg_engagement_rate)],
                ["Like Rate", pct(o.avg_like_rate)],
                ["Avg Duration", Math.round((o.avg_duration || 0) / 60) + "m"],
                ["Uploads (30d)", (o.avg_uploads_last_30d || 0).toFixed(1)],
              ].map(([label, val]) => (
                <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Radar + ID vs Global */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div><div className="card-title">Niche Radar Comparison</div><div className="card-subtitle">Normalized scores (0-100) across key metrics</div></div></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#8888a0", fontSize: 12 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                {data.overview.map((o: any) => (
                  <Radar key={o.niche} name={o.niche} dataKey={o.niche} stroke={NICHE_COLORS[o.niche]} fill={NICHE_COLORS[o.niche]} fillOpacity={0.12} strokeWidth={2} />
                ))}
                <Legend formatter={(v: string) => <span style={{ color: "#8888a0", fontSize: 12 }}>{v}</span>} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div><div className="card-title">Indonesia vs Global</div><div className="card-subtitle">Average views per video by niche × region</div></div></div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={idVsGlobalData}>
                <XAxis dataKey="niche" tick={{ fill: "#8888a0", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8888a0", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip contentStyle={TT_STYLE} formatter={(v) => [fmt(Number(v)), "Avg Views"]} />
                <Bar dataKey="Indonesia" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Global" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Legend formatter={(v: string) => <span style={{ color: "#8888a0", fontSize: 12 }}>{v}</span>} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Duration Analysis */}
      <div className="card">
        <div className="card-header"><div><div className="card-title">Duration vs Performance</div><div className="card-subtitle">Which video lengths perform best in each niche?</div></div></div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={durationData}>
              <XAxis dataKey="duration" tick={{ fill: "#8888a0", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8888a0", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <Tooltip contentStyle={TT_STYLE} formatter={(v, name: string) => [fmt(Number(v)), name]} />
              {["gaming", "tech", "education", "music"].map(n => (
                <Bar key={n} dataKey={n} fill={NICHE_COLORS[n]} radius={[4, 4, 0, 0]} />
              ))}
              <Legend formatter={(v: string) => <span style={{ color: "#8888a0", fontSize: 12 }}>{v}</span>} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upload Day */}
      <div className="card">
        <div className="card-header"><div><div className="card-title">Upload Day Distribution</div><div className="card-subtitle">Which days do creators prefer to upload?</div></div></div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={uploadDayData}>
              <XAxis dataKey="day" tick={{ fill: "#8888a0", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8888a0", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT_STYLE} formatter={(v, name: string) => [Number(v) + " videos", name]} />
              {["gaming", "tech", "education", "music"].map(n => (
                <Bar key={n} dataKey={n} fill={NICHE_COLORS[n]} radius={[4, 4, 0, 0]} />
              ))}
              <Legend formatter={(v: string) => <span style={{ color: "#8888a0", fontSize: 12 }}>{v}</span>} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><div><div className="card-title">Niche × Region Breakdown</div><div className="card-subtitle">Detailed metrics split by niche and region</div></div></div>
        <table className="data-table">
          <thead><tr><th>Niche</th><th>Region</th><th>Channels</th><th>Videos</th><th>Total Views</th><th>Avg Views</th><th>Engagement</th><th>Like Rate</th></tr></thead>
          <tbody>
            {data.nicheRegion.map((r: any, i: number) => (
              <tr key={i}>
                <td><span className={`badge badge-${r.niche}`}>{r.niche}</span></td>
                <td><span className={`badge badge-${r.region}`}>{r.region === "ID" ? "Indonesia" : "Global"}</span></td>
                <td className="primary">{r.channels}</td>
                <td>{r.videos}</td>
                <td className="primary number-large">{fmt(r.total_views)}</td>
                <td className="number-large">{fmt(r.avg_views)}</td>
                <td>{pct(r.avg_engagement)}</td>
                <td>{pct(r.avg_like_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
