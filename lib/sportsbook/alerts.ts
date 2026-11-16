import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { normalizeEmail } from "@/lib/email/rules";
import { playerAlertEmail } from "@/lib/email/templates";
import { SIGNUP_ALERT_TO } from "./contact";
import { fullName } from "./players";

/**
 * Tells Remi and Jaiye about every new player and every returner. Run it from
 * `after()` so a slow or failed email never holds up joining or signing in.
 * Never throws.
 */

const db = () => createServiceClient();

/** Before a join subscribes an email: the earlier player that address belonged to, if any. */
export async function priorPlayerForEmail(raw: string): Promise<string | null> {
  const email = normalizeEmail(raw);
  if (!email) return null;
  const { data } = await db().from("sb_subscribers").select("player_id").eq("email", email).not("player_id", "is", null).limit(1);
  return (data?.[0]?.player_id as string | undefined) ?? null;
}

type Opts = {
  via: "website" | "app";
  how?: "player code" | "email code" | "email link";
  league?: string | null;
  /** From `priorPlayerForEmail`, checked before the join changed anything. */
  priorPlayerId?: string | null;
};

export async function alertPlayer(kind: "new" | "back", playerId: string, opts: Opts): Promise<void> {
  try {
    const { data: p } = await db()
      .from("sb_players")
      .select("id, display_name, first_name, last_name, age_band")
      .eq("id", playerId)
      .eq("kind", "challenger")
      .maybeSingle();
    if (!p) return;
    const realName = fullName({ first_name: (p.first_name as string | null) ?? null, last_name: (p.last_name as string | null) ?? null });

    let lookslike: string | null = null;
    if (kind === "new") {
      const prior = opts.priorPlayerId && opts.priorPlayerId !== playerId ? opts.priorPlayerId : null;
      if (prior) {
        const { data: old } = await db().from("sb_players").select("display_name").eq("id", prior).maybeSingle();
        lookslike = (old?.display_name as string | undefined) ?? null;
      }
      if (!lookslike && p.first_name && p.last_name) {
        const { data: same } = await db()
          .from("sb_players")
          .select("display_name")
          .eq("kind", "challenger")
          .neq("id", playerId)
          .ilike("first_name", p.first_name as string)
          .ilike("last_name", p.last_name as string)
          .limit(1);
        lookslike = (same?.[0]?.display_name as string | undefined) ?? null;
      }
    }

    const [{ count }, { data: sub }] = await Promise.all([
      db().from("sb_players").select("id", { count: "exact", head: true }).eq("kind", "challenger").is("deleted_at", null),
      db().from("sb_subscribers").select("id").eq("player_id", playerId).limit(1),
    ]);

    const mail = playerAlertEmail({
      kind,
      nickname: p.display_name as string,
      realName,
      ageBand: (p.age_band as "13_plus" | "under_13" | null) ?? null,
      via: opts.via,
      how: opts.how,
      lookslike,
      league: opts.league ?? null,
      hasEmail: !!sub?.length,
      total: count ?? 0,
    });
    for (const to of SIGNUP_ALERT_TO) {
      const r = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text });
      if (r.status !== "sent") console.error(JSON.stringify({ scope: "sportsbook.alert", kind, to: to.split("@")[1], status: r.status }));
    }
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.alert", kind, err: String(e) }));
  }
}
