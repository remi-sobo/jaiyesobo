import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function GamesAdminIndex() {
  redirect("/games-admin/draft-players");
}
