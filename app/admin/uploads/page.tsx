import { requireAdmin } from "@/lib/session";
import { ensureJaiye, getPendingUploads } from "@/lib/admin-data";
import ReviewButton from "@/components/admin/review-button";

export const dynamic = "force-dynamic";

export default async function UploadsPage() {
  await requireAdmin();
  const jaiye = await ensureJaiye();
  const uploads = await getPendingUploads(jaiye.id, 30);

  return (
    <main className="p-8 lg:p-10 pb-24">
      <div className="pb-6 mb-8 border-b border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
          Admin · Last 30 days · {uploads.length} total
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-[-0.02em]">
          Uploads <span className="italic font-normal text-[var(--color-red)]">queue.</span>
        </h1>
      </div>

      {uploads.length === 0 ? (
        <p className="text-[var(--color-warm-mute)]">No uploads yet. When Jaiye submits a photo, it shows here.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploads.map((u) => (
            <article
              key={u.completion_id}
              className={`bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded overflow-hidden ${
                !u.reviewed_at ? "border-l-[3px] border-l-[var(--color-red)]" : ""
              }`}
            >
              <div
                className="aspect-video bg-[var(--color-warm-surface-3)] relative"
                style={{
                  backgroundImage: u.photo_thumbnails[0] ? `url(${u.photo_thumbnails[0]})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!u.photo_thumbnails[0] && (
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--color-warm-mute)] text-sm font-[family-name:var(--font-jetbrains)] uppercase tracking-wider">
                    No thumbnail
                  </div>
                )}
                {u.photo_drive_ids.length > 1 && (
                  <span className="absolute top-2 right-2 bg-[rgba(10,10,10,0.85)] text-[var(--color-warm-bone)] font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.15em] px-2 py-1 rounded">
                    +{u.photo_drive_ids.length - 1}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-1">
                  {u.subject ?? "—"} · {new Date(u.completed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
                <h3 className="font-[family-name:var(--font-fraunces)] text-[1.05rem] font-semibold leading-snug mb-2">
                  {u.task_title}
                </h3>
                {u.reflection && (
                  <p className="text-sm text-[var(--color-warm-bone)] italic font-[family-name:var(--font-fraunces)] leading-relaxed mb-3">
                    &ldquo;{u.reflection}&rdquo;
                  </p>
                )}
                <div className="flex justify-end mt-3">
                  <ReviewButton completionId={u.completion_id} reviewed={!!u.reviewed_at} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
