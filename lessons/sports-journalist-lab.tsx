"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import LessonShell from "@/components/lessons/lesson-shell";
import LessonHero from "@/components/lessons/lesson-hero";
import LessonScreen from "@/components/lessons/lesson-screen";
import LessonTextInput from "@/components/lessons/lesson-text-input";
import LessonTextarea from "@/components/lessons/lesson-textarea";
import LessonURLInput from "@/components/lessons/lesson-url-input";
import LessonScaffoldSidebar from "@/components/lessons/lesson-scaffold-sidebar";
import LessonAIFeedback, { type AIFeedback } from "@/components/lessons/lesson-ai-feedback";
import LessonRevise from "@/components/lessons/lesson-revise";
import LessonComplete from "@/components/lessons/lesson-complete";
import {
  DraftProvider,
  useAllDrafts,
  useDraftField,
  useDraftLoaded,
} from "@/components/lessons/draft-context";

type Props = { taskId: string };

type Screen =
  | "hero"
  | "pick"
  | "find"
  | "watch"
  | "headline"
  | "lede"
  | "closer"
  | "v1"
  | "feedback"
  | "v2"
  | "done";

const TOTAL_STEPS = 9;

const STEP_BY_SCREEN: Record<Screen, number> = {
  hero: 0,
  pick: 1,
  find: 2,
  watch: 3,
  headline: 4,
  lede: 5,
  closer: 6,
  v1: 7,
  feedback: 8,
  v2: 8,
  done: 9,
};

export default function SportsJournalistLab({ taskId }: Props) {
  const [screen, setScreen] = useState<Screen>("hero");
  return (
    <DraftProvider taskId={taskId}>
      <LessonShell
        title="Sports Desk: Playoff Recap"
        currentStep={STEP_BY_SCREEN[screen]}
        totalSteps={TOTAL_STEPS}
      >
        <Body taskId={taskId} screen={screen} setScreen={setScreen} />
      </LessonShell>
    </DraftProvider>
  );
}

function Body({
  taskId,
  screen,
  setScreen,
}: {
  taskId: string;
  screen: Screen;
  setScreen: (s: Screen) => void;
}) {
  const loaded = useDraftLoaded();
  const drafts = useAllDrafts();

  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!loaded) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-24 text-center text-[var(--color-warm-mute)] italic font-[family-name:var(--font-fraunces)]">
        Loading your notes…
      </div>
    );
  }

  const PICK_FIELDS = ["pick.team_a", "pick.team_b", "pick.game_date", "pick.final_score"];
  const pickReady = PICK_FIELDS.every((p) => (drafts[p] ?? "").trim().length > 0);
  const findReady = isYouTubeUrl(drafts["find.recap_url"]);
  const WATCH_REQUIRED = [
    "watch.top_scorer",
    "watch.top_points",
    "watch.biggest_moment",
    "watch.surprising_stat",
    "watch.fourth_quarter_winner",
    "watch.whats_next",
  ];
  const watchReady = WATCH_REQUIRED.every((p) => (drafts[p] ?? "").trim().length > 0);
  const headlineReady = (drafts["headline.my_headline"] ?? "").trim().length > 0;
  const ledeReady = (drafts["lede.lede"] ?? "").trim().length > 5;
  const closerReady = (drafts["closer.closer"] ?? "").trim().length > 5;
  const v1Ready = (drafts["article.v1"] ?? "").trim().length > 50;
  const v2Ready = (drafts["article.v2"] ?? "").trim().length > 50;

  async function fetchFeedback() {
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const prep: Record<string, string> = {};
      for (const [k, v] of Object.entries(drafts)) {
        if (k.startsWith("article.")) continue;
        prep[k] = v;
      }
      const res = await fetch("/api/lessons/sports-recap/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          prep,
          articleV1: drafts["article.v1"] ?? "",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedbackError(payload?.message ?? "AI took too long. Show Dad — he can give you feedback.");
        return;
      }
      setFeedback(payload.feedback as AIFeedback);
      // Persist the feedback as a draft so reload doesn't lose it
      await fetch("/api/lessons/draft/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          fieldPath: "ai.feedback",
          value: JSON.stringify(payload.feedback),
        }),
      });
    } catch (err) {
      console.error(err);
      setFeedbackError("AI took too long. Show Dad — he can give you feedback.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  // Hydrate persisted feedback when revisiting feedback/v2 screen
  if (!feedback && drafts["ai.feedback"]) {
    try {
      const parsed = JSON.parse(drafts["ai.feedback"]) as AIFeedback;
      if (parsed?.nailed && parsed?.missing && parsed?.try_this) {
        setFeedback(parsed);
      }
    } catch {
      /* ignore */
    }
  }

  async function submitFinal() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const responses: Record<string, unknown> = { ...drafts };
      // Parse stored ai feedback
      if (typeof responses["ai.feedback"] === "string") {
        try {
          responses["ai.feedback"] = JSON.parse(responses["ai.feedback"] as string);
        } catch {
          /* leave as string */
        }
      }
      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          lessonSlug: "sports-journalist-lab",
          responses,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(
          payload?.error === "already_completed"
            ? "You already submitted this one."
            : "Submit failed. Try again."
        );
        return;
      }
      setScreen("done");
    } catch (err) {
      console.error(err);
      setSubmitError("Submit failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const ARTICLE_NOTES: { path: string; label: string }[] = [
    { path: "headline.my_headline", label: "Headline" },
    { path: "lede.lede", label: "Lede" },
    { path: "closer.closer", label: "Closer" },
    { path: "watch.top_scorer", label: "Top scorer" },
    { path: "watch.top_points", label: "Top points" },
    { path: "watch.top_other_stat", label: "Other stats" },
    { path: "watch.biggest_moment", label: "Biggest moment" },
    { path: "watch.surprising_stat", label: "Surprising stat" },
    { path: "watch.fourth_quarter_winner", label: "Won the 4th" },
    { path: "watch.whats_next", label: "What's next" },
    { path: "pick.final_score", label: "Final score" },
  ];

  return (
    <AnimatePresence mode="wait">
      {screen === "hero" && (
        <LessonHero
          key="hero"
          tag="🎙️ Writing Mission · Sports Desk"
          title="Pick a game."
          titleAccent="Tell its story."
          description="Jaiye — you're a sports reporter today. Pick an NBA Playoff game from yesterday. Watch the recap. Take notes. Write your article. Get AI feedback. Make it better. Submit. Real reporters work the same way."
          missionItems={["Watch", "Take notes", "Write v1", "Get AI feedback", "Revise"]}
          onStart={() => setScreen("pick")}
        />
      )}

      {screen === "pick" && (
        <LessonScreen
          key="pick"
          stepLabel="Step 1 · Pick"
          title="Pick your game"
          subtitle="Pick a game from yesterday's NBA Playoffs. Type the basics. We'll come back to all of this when you write."
          onBack={() => setScreen("hero")}
          onNext={() => setScreen("find")}
          nextDisabled={!pickReady}
        >
          <div className="flex flex-col gap-5 max-w-[680px]">
            <div className="grid sm:grid-cols-2 gap-4">
              <LessonTextInput
                fieldPath="pick.team_a"
                label="Team A"
                placeholder="e.g. Lakers"
                autoFocus
              />
              <LessonTextInput fieldPath="pick.team_b" label="Team B" placeholder="e.g. Wolves" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <LessonTextInput fieldPath="pick.game_date" label="Game date" type="date" />
              <LessonTextInput
                fieldPath="pick.final_score"
                label="Final score"
                placeholder="e.g. Lakers 117, Wolves 109"
              />
            </div>
            <LessonTextInput
              fieldPath="pick.your_team"
              label="Did you have a team you wanted to win?"
              placeholder="Optional"
              hint="Optional. Some reporters root for a team. Most don't say so out loud."
            />
          </div>
        </LessonScreen>
      )}

      {screen === "find" && (
        <LessonScreen
          key="find"
          stepLabel="Step 2 · Find"
          title="Find your recap"
          subtitle={`Search YouTube for: "${(drafts["pick.team_a"] || "Team A").trim()} vs ${(drafts["pick.team_b"] || "Team B").trim()} full game recap". Pick a recap that's at least 5 minutes long. Official NBA channel is best.`}
          onBack={() => setScreen("pick")}
          onNext={() => setScreen("watch")}
          nextDisabled={!findReady}
        >
          <div className="flex flex-col gap-5 max-w-[760px]">
            <LessonURLInput
              fieldPath="find.recap_url"
              label="Recap URL"
              placeholder="https://www.youtube.com/watch?v=…"
              helpText="Paste the full link from YouTube. We'll show you a preview when it's right. If you can't find a recap, ask Dad."
            />
          </div>
        </LessonScreen>
      )}

      {screen === "watch" && (
        <LessonScreen
          key="watch"
          stepLabel="Step 3 · Watch + Note"
          title="Watch the whole recap"
          subtitle="Watch first. Don't pause every 5 seconds. Real reporters watch the whole thing, then come back here. Or pause once at the end."
          onBack={() => setScreen("find")}
          onNext={() => setScreen("headline")}
          nextDisabled={!watchReady}
        >
          <div className="flex flex-col gap-5 max-w-[760px]">
            <div className="grid sm:grid-cols-2 gap-4">
              <LessonTextInput
                fieldPath="watch.top_scorer"
                label="Who scored the most points?"
                placeholder="e.g. LeBron"
              />
              <LessonTextInput
                fieldPath="watch.top_points"
                label="How many points?"
                placeholder="e.g. 38"
              />
            </div>
            <LessonTextInput
              fieldPath="watch.top_other_stat"
              label="Did they have other big stats?"
              placeholder="rebounds, assists, blocks…"
              hint="Real reporters always mention more than just points."
            />
            <LessonTextarea
              fieldPath="watch.biggest_moment"
              label="What was the biggest moment?"
              placeholder="A clutch shot, a steal, a dunk, a turnover…"
              minRows={3}
            />
            <LessonTextInput
              fieldPath="watch.surprising_stat"
              label="One stat that surprised you"
              placeholder="e.g. the Wolves had 22 turnovers"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <LessonTextInput
                fieldPath="watch.fourth_quarter_winner"
                label="Who won the 4th quarter?"
                placeholder="e.g. Lakers, by 8"
              />
              <LessonTextInput
                fieldPath="watch.whats_next"
                label="What happens next in the series?"
                placeholder="e.g. Game 4 in LA"
              />
            </div>
          </div>
        </LessonScreen>
      )}

      {screen === "headline" && (
        <LessonScreen
          key="headline"
          stepLabel="Step 4 · Headline"
          title="Write your headline"
          subtitle="Good headlines are short. They tell who won and one cool detail."
          onBack={() => setScreen("watch")}
          onNext={() => setScreen("lede")}
          nextDisabled={!headlineReady}
        >
          <div className="flex flex-col gap-5 max-w-[680px]">
            <div className="grid sm:grid-cols-2 gap-4">
              <LessonTextInput
                fieldPath="headline.headline_a"
                label="Option A"
                placeholder="e.g. Lakers stun Wolves"
              />
              <LessonTextInput
                fieldPath="headline.headline_b"
                label="Option B"
                placeholder="Try a different angle"
              />
            </div>
            <LessonTextInput
              fieldPath="headline.my_headline"
              label="Pick your favorite — copy it here, or write a new one"
              placeholder="Your final headline"
              hint="This is the one that goes on your article."
            />
          </div>
        </LessonScreen>
      )}

      {screen === "lede" && (
        <LessonScreen
          key="lede"
          stepLabel="Step 5 · Lede"
          title="Write your lede"
          subtitle="ONE sentence. Who won, by how much, why it matters."
          onBack={() => setScreen("headline")}
          onNext={() => setScreen("closer")}
          nextDisabled={!ledeReady}
        >
          <div className="max-w-[680px]">
            <LessonTextarea
              fieldPath="lede.lede"
              label="Your lede"
              helpText="This is the most important sentence in the whole article. Read it out loud."
              minRows={3}
            />
          </div>
        </LessonScreen>
      )}

      {screen === "closer" && (
        <LessonScreen
          key="closer"
          stepLabel="Step 6 · Closer"
          title="Write your closer"
          subtitle="What does this game mean? How does it change the series? What should fans expect next?"
          onBack={() => setScreen("lede")}
          onNext={() => setScreen("v1")}
          nextDisabled={!closerReady}
        >
          <div className="max-w-[680px]">
            <LessonTextarea
              fieldPath="closer.closer"
              label="Your closer"
              helpText="One or two sentences. Endings matter."
              minRows={3}
            />
          </div>
        </LessonScreen>
      )}

      {screen === "v1" && (
        <LessonScreen
          key="v1"
          stepLabel="Step 7 · Write v1"
          title="Write the article"
          subtitle="Pull from your notes on the side. Start with your lede. End with your closer. The middle is where you tell the story."
          onBack={() => setScreen("closer")}
          onNext={async () => {
            setScreen("feedback");
            await fetchFeedback();
          }}
          nextDisabled={!v1Ready}
          nextLabel="Submit for feedback →"
        >
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
            <LessonTextarea
              fieldPath="article.v1"
              label="Your v1"
              minRows={14}
              encouragement
              placeholder="Start typing your article here. Take your time."
            />
            <LessonScaffoldSidebar fields={ARTICLE_NOTES} />
          </div>
        </LessonScreen>
      )}

      {screen === "feedback" && (
        <LessonScreen
          key="feedback"
          stepLabel="Step 8 · Feedback"
          title="What the AI thinks"
          subtitle="Read it. Some of it will sting a little. That's how you get better."
          onBack={() => setScreen("v1")}
          onNext={() => setScreen("v2")}
          nextLabel="Write v2 →"
          nextDisabled={!feedback || feedbackLoading}
        >
          {feedbackLoading ? (
            <LessonAIFeedback state="loading" />
          ) : feedbackError ? (
            <LessonAIFeedback state="error" message={feedbackError} onRetry={fetchFeedback} />
          ) : feedback ? (
            <div className="max-w-[760px]">
              <LessonAIFeedback state="ready" feedback={feedback} />
            </div>
          ) : (
            <div className="text-center">
              <button
                type="button"
                onClick={fetchFeedback}
                className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
              >
                Get AI feedback
              </button>
            </div>
          )}
        </LessonScreen>
      )}

      {screen === "v2" && feedback && (
        <LessonScreen
          key="v2"
          stepLabel="Step 9 · Revise"
          title="Write your v2"
          subtitle="Improve on v1. Don't start over."
          onBack={() => setScreen("feedback")}
          onNext={submitFinal}
          nextDisabled={!v2Ready || submitting}
          nextBusy={submitting}
          nextLabel="Send to Dad →"
        >
          <LessonRevise
            v1Text={drafts["article.v1"] ?? ""}
            feedback={feedback}
            v2FieldPath="article.v2"
          />
          {submitError && (
            <p className="mt-5 text-sm text-[var(--color-red-soft)] italic font-[family-name:var(--font-fraunces)]">
              {submitError}
            </p>
          )}
        </LessonScreen>
      )}

      {screen === "done" && (
        <LessonComplete
          key="done"
          studentNames="Jaiye"
          lessonTitle="your playoff recap"
        />
      )}
    </AnimatePresence>
  );
}

function isYouTubeUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return /(?:v=|\/)[A-Za-z0-9_-]{11}(?:\W|$)/.test(url);
}
