import { NextResponse } from "next/server";
import { queryBQ, table } from "@/lib/bigquery";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const overview = await queryBQ(`
      SELECT * FROM ${table("agg_niche_overview")}
    `);

    // Niche × Region breakdown
    const nicheRegion = await queryBQ(`
      SELECT
        niche, region,
        COUNT(DISTINCT channel_id) as channels,
        COUNT(*) as videos,
        SUM(view_count) as total_views,
        AVG(view_count) as avg_views,
        AVG(engagement_rate) as avg_engagement,
        AVG(like_rate) as avg_like_rate
      FROM ${table("fct_video_performance")}
      GROUP BY niche, region
      ORDER BY niche, region
    `);

    // Duration analysis per niche
    const durationAnalysis = await queryBQ(`
      SELECT
        niche, duration_category,
        COUNT(*) as count,
        AVG(view_count) as avg_views,
        AVG(engagement_rate) as avg_engagement
      FROM ${table("fct_video_performance")}
      GROUP BY niche, duration_category
      ORDER BY niche, duration_category
    `);

    // Upload day analysis
    const uploadDays = await queryBQ(`
      SELECT
        niche, upload_day_of_week,
        COUNT(*) as count,
        AVG(view_count) as avg_views
      FROM ${table("fct_video_performance")}
      GROUP BY niche, upload_day_of_week
      ORDER BY niche, upload_day_of_week
    `);

    return NextResponse.json({
      overview,
      nicheRegion,
      durationAnalysis,
      uploadDays,
    });
  } catch (error) {
    console.error("Niches API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
