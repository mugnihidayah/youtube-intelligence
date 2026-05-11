import { BigQuery } from "@google-cloud/bigquery";

function getCredentials() {
  // Vercel: credentials from base64 env var
  if (process.env.GCP_SA_KEY_BASE64) {
    return JSON.parse(
      Buffer.from(process.env.GCP_SA_KEY_BASE64, "base64").toString()
    );
  }

  // Local: credentials from file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return undefined; // BigQuery SDK reads from keyFilename
  }

  throw new Error("No GCP credentials configured");
}

const credentials = getCredentials();

const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  ...(credentials
    ? { credentials }
    : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }),
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
