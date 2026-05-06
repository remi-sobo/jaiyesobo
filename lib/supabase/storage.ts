import { createServiceClient } from "@/lib/supabase/server";

export const PHOTO_BUCKET = process.env.SUPABASE_PHOTO_BUCKET || "me-photos";

/**
 * Upload a kid photo to Supabase Storage. Used as a fallback when Google Drive
 * is unavailable, or as the primary store when Drive isn't connected at all.
 *
 * The bucket is assumed to be public — `getPublicUrl` returns a stable URL we
 * persist as the thumbnail. Path is namespaced by subject folder + filename.
 */
export async function uploadPhotoToSupabase(
  file: File,
  subjectFolder: string,
  filename: string
): Promise<{ path: string; publicUrl: string }> {
  const supa = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${subjectFolder}/${filename}`;

  const { error } = await supa.storage.from(PHOTO_BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;

  const { data } = supa.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
