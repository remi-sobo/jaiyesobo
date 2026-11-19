import { getConnection, instagramConfigured } from "@/lib/instagram/api";
import { revokeLinksAction } from "@/app/admin/replies/actions";

/** Setup card: connect @onthecourt_pod, see when the token expires, kill picker links. */
export default async function InstagramSetupPanel({ connected, error }: { connected?: string; error?: string }) {
  const configured = instagramConfigured();
  const conn = configured ? await getConnection().catch(() => null) : null;
  const mono = "font-[family-name:var(--font-jetbrains)]";

  return (
    <section className="mb-10 rounded-md border border-[var(--color-line)] bg-[var(--color-warm-surface)] p-5">
      <div className={`${mono} text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]`}>Instagram reply picker</div>
      <h2 className="mt-1 text-lg font-semibold">
        {conn ? `Connected as @${conn.username}` : configured ? "Not connected" : "Meta app keys not set"}
      </h2>
      {conn && (
        <p className="mt-1 text-sm text-[var(--color-warm-mute)]">
          {conn.never
            ? "The connection doesn't expire. Reconnect only if Instagram access is removed."
            : `Token good until ${new Date(conn.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. You'll get an email 5 days before.`}
        </p>
      )}
      {connected && <p className="mt-2 text-sm text-[var(--color-green)]">Connected @{connected}.</p>}
      {error && <p className="mt-2 text-sm text-[var(--color-red)]">Instagram connect failed: {error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {configured && (
          <a href="/api/auth/instagram/start" className="rounded-md bg-[var(--color-red)] px-4 py-2 text-sm font-semibold text-white">
            {conn ? "Reconnect Instagram" : "Connect Instagram"}
          </a>
        )}
        <a href="/admin/replies" className="rounded-md border border-[var(--color-line)] px-4 py-2 text-sm">
          Open the picker
        </a>
        <form action={revokeLinksAction}>
          <button className="rounded-md border border-[var(--color-line)] px-4 py-2 text-sm text-[var(--color-warm-mute)]">
            Kill all email links
          </button>
        </form>
      </div>
    </section>
  );
}
