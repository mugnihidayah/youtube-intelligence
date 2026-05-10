import { NextResponse } from "next/server";
import { queryBQ, table } from "@/lib/bigquery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche");
    const region = searchParams.get("region");
    const tier = searchParams.get("tier");
    const sort = searchParams.get("sort") || "view_count";
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type");

    let where = "WHERE 1=1";
    if (niche) where += ` AND f.niche = '${niche}'`;
    if (region) where += ` AND f.region = '${region}'`;
    if (tier) where += ` AND f.performance_tier = '${tier}'`;
    if (type === "live") where += ` AND f.was_live = true`;
    if (type === "regular") where += ` AND f.was_live = false`;

    const videos = await queryBQ(`
      SELECT
        f.video_id, f.title, f.channel_id,
        d.channel_name, d.subscriber_count, d.size_tier,
        f.niche, f.region, f.upload_date,
        f.view_count, f.like_count, f.comment_count,
        f.duration_seconds, f.duration_category,
        f.engagement_rate, f.like_rate, f.comment_rate,
        f.views_per_subscriber, f.views_per_day,
        f.performance_tier, f.engagement_vs_benchmark, f.views_vs_benchmark
      FROM ${table("fct_video_performance")} f
      JOIN ${table("dim_channels")} d ON f.channel_id = d.channel_id
      ${where}
      ORDER BY ${sort} DESC
      LIMIT ${limit}
    `);

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Videos API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
