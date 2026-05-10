import { NextResponse } from "next/server";
import { queryBQ, table } from "@/lib/bigquery";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Total KPIs
    const kpis = await queryBQ(`
      SELECT
        COUNT(DISTINCT channel_id) as total_channels,
        COUNT(*) as total_videos,
        SUM(view_count) as total_views,
        SUM(like_count) as total_likes,
        SUM(comment_count) as total_comments,
        AVG(engagement_rate) as avg_engagement_rate
      FROM ${table("fct_video_performance")}
    `);

    // By niche
    const byNiche = await queryBQ(`
      SELECT
        niche,
        COUNT(DISTINCT channel_id) as channels,
        COUNT(*) as videos,
        SUM(view_count) as total_views,
        AVG(engagement_rate) as avg_engagement,
        AVG(view_count) as avg_views
      FROM ${table("fct_video_performance")}
      GROUP BY niche
      ORDER BY total_views DESC
    `);

    // Top videos
    const topVideos = await queryBQ(`
      SELECT
        f.video_id, f.title, d.channel_name, f.niche, f.region,
        f.view_count, f.like_count, f.engagement_rate,
        f.performance_tier, f.upload_date
      FROM ${table("fct_video_performance")} f
      JOIN ${table("dim_channels")} d ON f.channel_id = d.channel_id
      ORDER BY f.view_count DESC
      LIMIT 10
    `);

    // By region
    const byRegion = await queryBQ(`
      SELECT
        region,
        COUNT(DISTINCT channel_id) as channels,
        COUNT(*) as videos,
        SUM(view_count) as total_views,
        AVG(engagement_rate) as avg_engagement
      FROM ${table("fct_video_performance")}
      GROUP BY region
    `);

    // Performance tier distribution
    const tiers = await queryBQ(`
      SELECT
        performance_tier,
        COUNT(*) as count
      FROM ${table("fct_video_performance")}
      GROUP BY performance_tier
    `);

    return NextResponse.json({
      kpis: kpis[0],
      byNiche,
      topVideos,
      byRegion,
      tiers,
    });
  } catch (error) {
    console.error("Overview API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
