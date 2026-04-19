import { google, type drive_v3 } from "googleapis";
import { Readable } from "node:stream";
import { createServiceClient } from "@/lib/supabase/server";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function oauthClient(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri
  );
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const client = oauthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh_token even on re-auth
    scope: [DRIVE_SCOPE],
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCode(code: string, redirectUri: string) {
  const client = oauthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function saveTokens(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}) {
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error(
      "Google OAuth response missing access_token / refresh_token / expiry_date. Use prompt=consent and access_type=offline."
    );
  }
  const supa = createServiceClient();
  const { error } = await supa.from("drive_tokens").upsert({
    id: 1,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expiry_date).toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function hasDriveConnection(): Promise<boolean> {
  const supa = createServiceClient();
  const { data } = await supa.from("drive_tokens").select("id").eq("id", 1).maybeSingle();
  return !!data;
}

async function getStoredTokens() {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("drive_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Google Drive not connected. Admin must authorize first at /admin.");
  return data;
}

async function persistRefreshedAccessToken(accessToken: string, expiryMs: number) {
  const supa = createServiceClient();
  await supa
    .from("drive_tokens")
    .update({
      access_token: accessToken,
      expires_at: new Date(expiryMs).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
}

async function buildAuthedClient() {
  const stored = await getStoredTokens();
  const auth = oauthClient();
  auth.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    expiry_date: new Date(stored.expires_at).getTime(),
  });

  auth.on("tokens", (fresh) => {
    if (fresh.access_token && fresh.expiry_date) {
      persistRefreshedAccessToken(fresh.access_token, fresh.expiry_date).catch((err) =>
        console.error("Failed to persist refreshed Drive token:", err)
      );
    }
  });

  return auth;
}

export async function getDriveClient(): Promise<drive_v3.Drive> {
  const auth = await buildAuthedClient();
  return google.drive({ version: "v3", auth });
}

export async function findOrCreateSubjectFolder(subject: string): Promise<string> {
  const drive = await getDriveClient();
  const parent = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  if (!parent) throw new Error("GOOGLE_DRIVE_FOLDER_ID not set");

  const escaped = subject.replace(/'/g, "\\'");
  const q = `name='${escaped}' and mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false`;
  const list = await drive.files.list({ q, fields: "files(id, name)", pageSize: 1 });
  const found = list.data.files?.[0];
  if (found?.id) return found.id;

  const created = await drive.files.create({
    requestBody: {
      name: subject,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parent],
    },
    fields: "id",
  });
  if (!created.data.id) throw new Error("Drive folder creation returned no id");
  return created.data.id;
}

export async function uploadPhoto(
  file: File,
  subject: string,
  filename: string
): Promise<{ id: string; thumbnail: string | null }> {
  const drive = await getDriveClient();
  const folderId = await findOrCreateSubjectFolder(subject);
  const buffer = Buffer.from(await file.arrayBuffer());
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: file.type, body: stream },
    fields: "id, thumbnailLink",
  });

  if (!res.data.id) throw new Error("Drive upload returned no id");
  return { id: res.data.id, thumbnail: res.data.thumbnailLink ?? null };
}

/**
 * Map a task's subject/type to one of the 6 Drive subfolder names.
 */
export function folderNameForSubject(subject: string | null, type: string | null): string {
  const known = ["Math", "Reading", "Writing", "Science", "Ball"];
  if (subject) {
    const clean = subject.split("·")[0].trim();
    if (known.includes(clean)) return clean;
  }
  if (type === "ball") return "Ball";
  return "Other";
}
