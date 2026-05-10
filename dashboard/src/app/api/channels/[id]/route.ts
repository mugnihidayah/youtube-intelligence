import { NextResponse } from "next/server";
import { queryBQ, table } from "@/lib/bigquery";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Channel info
    const channel = await queryBQ(`
      SELECT *
      FROM ${table("dim_channels")} 
      WHERE channel_id = '${id}'
    `);

    if (!channel.length) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Channel aggregated metrics
    const metrics = await queryBQ(`
      SELECT *
      FROM ${table("agg_channel_metrics")}
      WHERE channel_id = '${id}'
    `);

    // All videos for this channel
    const videos = await queryBQ(`
      SELECT
        f.video_id, f.title, f.upload_date,
        f.view_count, f.like_count, f.comment_count,
        f.duration_seconds, f.duration_category,
        f.engagement_rate, f.views_per_day,
        f.performance_tier, f.views_vs_benchmark
      FROM ${table("fct_video_performance")} f
      WHERE f.channel_id = '${id}'
      ORDER BY f.view_count DESC
    `);

    // Niche benchmark for comparison
    const niche = channel[0].niche;
    const benchmark = await queryBQ(`
      SELECT * FROM ${table("agg_niche_overview")}
      WHERE niche = '${niche}'
    `);

    // Niche peers (other channels in same niche, for comparison)
    const peers = await queryBQ(`
      SELECT channel_name, subscriber_count, avg_views, avg_engagement_rate
      FROM ${table("agg_channel_metrics")}
      WHERE niche = '${niche}'
      ORDER BY subscriber_count DESC
      LIMIT 10
    `);

    return NextResponse.json({
      channel: channel[0],
      metrics: metrics[0] || null,
      videos,
      benchmark: benchmark[0] || null,
      peers,
    });
  } catch (error) {
    console.error("Channel detail API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
