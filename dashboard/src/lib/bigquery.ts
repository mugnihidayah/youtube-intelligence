import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const DATASET = process.env.BQ_DATASET || "youtube_analytics_marts";
const PROJECT = process.env.GCP_PROJECT_ID || "youtube-intelligence-495520";

export async function queryBQ<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const [rows] = await bigquery.query({ query: sql });
  return rows as T[];
}

export function table(name: string): string {
  return `\`${PROJECT}.${DATASET}.${name}\``;
}

export { bigquery, DATASET, PROJECT };
