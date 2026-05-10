import { NextResponse } from "next/server";
import { queryBQ, table } from "@/lib/bigquery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche");
    const region = searchParams.get("region");
    const sort = searchParams.get("sort") || "subscriber_count";
    const limit = parseInt(searchParams.get("limit") || "50");

    let where = "WHERE 1=1";
    if (niche) where += ` AND a.niche = '${niche}'`;
    if (region) where += ` AND a.region = '${region}'`;

    const channels = await queryBQ(`
      SELECT
        a.*,
        d.channel_url, d.channel_description
      FROM ${table("agg_channel_metrics")} a
      JOIN ${table("dim_channels")} d ON a.channel_id = d.channel_id
      ${where}
      ORDER BY ${sort} DESC
      LIMIT ${limit}
    `);

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Channels API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
