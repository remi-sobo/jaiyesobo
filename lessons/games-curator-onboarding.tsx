"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import LessonShell from "@/components/lessons/lesson-shell";
import LessonHero from "@/components/lessons/lesson-hero";
import LessonScreen from "@/components/lessons/lesson-screen";
import LessonTextInput from "@/components/lessons/lesson-text-input";
import LessonTextarea from "@/components/lessons/lesson-textarea";
import LessonComplete from "@/components/lessons/lesson-complete";
import {
  DraftProvider,
  useAllDrafts,
  useDraftLoaded,
} from "@/components/lessons/draft-context";

type Props = { taskId: string };

type Screen =
  | "hero"
  | "visit"
  | "play"
  | "bugs"
  | "brainstorm"
  | "favorites"
  | "submit"
  | "done";

const TOTAL_STEPS = 6;

const STEP_BY_SCREEN: Record<Screen, number> = {
  hero: 0,
  visit: 1,
  play: 2,
  bugs: 3,
  brainstorm: 4,
  favorites: 5,
  submit: 6,
  done: 6,
};

const POSITION_FIELDS = ["prompts.position.0", "prompts.position.1", "prompts.position.2", "prompts.position.3", "prompts.position.4"];
const TEAM_FIELDS = ["prompts.team.0", "prompts.team.1", "prompts.team.2", "prompts.team.3", "prompts.team.4"];
const SKILL_FIELDS = ["prompts.skill.0", "prompts.skill.1", "prompts.skill.2", "prompts.skill.3", "prompts.skill.4"];
const SPICY_FIELDS = ["prompts.spicy.0", "prompts.spicy.1", "prompts.spicy.2", "prompts.spicy.3", "prompts.spicy.4"];
const FAVORITE_FIELDS = ["favorites.0", "favorites.1", "favorites.2", "favorites.3", "favorites.4"];

export default function GamesCuratorOnboarding({ taskId }: Props) {
  const [screen, setScreen] = useState<Screen>("hero");
  return (
    <DraftProvider taskId={taskId}>
      <LessonShell
        title="Games Platform — Curator Onboarding"
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!loaded) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-24 text-center text-[var(--color-warm-mute)] italic font-[family-name:var(--font-fraunces)]">
        Loading your work…
      </div>
    );
  }

  const visitReady = (drafts["visit.noticed"] ?? "").trim().length > 0;
  const playReady =
    (drafts["play.prompt_played"] ?? "").trim().length > 0 &&
    (drafts["play.ai_verdict"] ?? "").trim().length > 0;

  const promptCount = (
    [...POSITION_FIELDS, ...TEAM_FIELDS, ...SKILL_FIELDS, ...SPICY_FIELDS]
      .map((f) => (drafts[f] ?? "").trim())
      .filter(Boolean).length
  );
  const brainstormReady = promptCount >= 1;
  const favoritesReady = FAVORITE_FIELDS.every(
    (f) => (drafts[f] ?? "").trim().length > 0
  );

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const responses = {
        visit: { noticed: drafts["visit.noticed"] ?? "" },
        play: {
          prompt_played: drafts["play.prompt_played"] ?? "",
          ai_verdict: drafts["play.ai_verdict"] ?? "",
        },
        bugs: ["bugs.0", "bugs.1", "bugs.2"]
          .map((f) => (drafts[f] ?? "").trim())
          .filter(Boolean),
        prompts: {
          position: POSITION_FIELDS.map((f) => (drafts[f] ?? "").trim()).filter(Boolean),
          team: TEAM_FIELDS.map((f) => (drafts[f] ?? "").trim()).filter(Boolean),
          skill: SKILL_FIELDS.map((f) => (drafts[f] ?? "").trim()).filter(Boolean),
          spicy: SPICY_FIELDS.map((f) => (drafts[f] ?? "").trim()).filter(Boolean),
        },
        favorites: FAVORITE_FIELDS.map((f) => (drafts[f] ?? "").trim()).filter(Boolean),
      };
      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          lessonSlug: "games-curator-onboarding",
          responses,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(
          payload?.error === "already_completed"
            ? "You already submitted this one."
            : "Submit failed. Tell Dad — he can fix it."
        );
        return;
      }
      setScreen("done");
    } catch (err) {
      console.error(err);
      setSubmitError("Submit failed. Tell Dad — he can fix it.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {screen === "hero" && (
        <LessonHero
          key="hero"
          tag="🎮 Curator Onboarding · Vol. 01"
          title="Welcome to your"
          titleAccent="games platform."
          description="Dad built the engine. You're the curator. This is your first job — visit your platform, play one round, log what's broken, and brainstorm the prompts that go in the database."
          missionItems={["Visit /games", "Play Top 5 once", "Brainstorm 20 prompts", "Pick your top 5"]}
          onStart={() => setScreen("visit")}
        />
      )}

      {screen === "visit" && (
        <LessonScreen
          key="visit"
          stepLabel="Step 1 · Visit"
          title="Go to jaiyesobo.com/games"
          subtitle="Open it in another tab. Click around. See the three game cards. Scroll to the bottom — your name is on every game. You're the curator now."
          onBack={() => setScreen("hero")}
          onNext={() => setScreen("play")}
          nextLabel="Done — I saw it →"
          nextDisabled={!visitReady}
        >
          <div className="max-w-[680px] mx-auto">
            <LessonTextarea
              fieldPath="visit.noticed"
              label="What did you notice?"
              placeholder="Anything stand out? Anything cool? Anything missing?"
              minRows={4}
            />
          </div>
        </LessonScreen>
      )}

      {screen === "play" && (
        <LessonScreen
          key="play"
          stepLabel="Step 2 · Play"
          title="Play Top 5 [Blank] one time."
          subtitle="Open /games/top-five in another tab. Pick five players. Submit. Read the AI verdict. Then come back and tell me what happened."
          onBack={() => setScreen("visit")}
          onNext={() => setScreen("bugs")}
          nextLabel="Next — bugs and ideas →"
          nextDisabled={!playReady}
        >
          <div className="max-w-[680px] mx-auto flex flex-col gap-5">
            <LessonTextInput
              fieldPath="play.prompt_played"
              label="Which prompt did you play?"
              placeholder="e.g. Top 5 Small Forwards of all time"
            />
            <LessonTextarea
              fieldPath="play.ai_verdict"
              label="What did the AI say?"
              placeholder="Was it fair? Did it roast you? Did you agree?"
              minRows={4}
            />
          </div>
        </LessonScreen>
      )}

      {screen === "bugs" && (
        <LessonScreen
          key="bugs"
          stepLabel="Step 3 · Notice"
          title="Anything weird? Anything you want to fix?"
          subtitle="Real curators notice things other people miss. Bugs. Ideas. Stuff that's confusing. Stuff that should exist but doesn't. Write whatever you've got."
          onBack={() => setScreen("play")}
          onNext={() => setScreen("brainstorm")}
          nextLabel="Next — brainstorm prompts →"
        >
          <div className="max-w-[680px] mx-auto flex flex-col gap-5">
            <LessonTextarea
              fieldPath="bugs.0"
              label="Bug or idea #1"
              placeholder="What's up?"
              minRows={2}
            />
            <LessonTextarea
              fieldPath="bugs.1"
              label="Bug or idea #2 (optional)"
              placeholder="Anything else?"
              minRows={2}
            />
            <LessonTextarea
              fieldPath="bugs.2"
              label="Bug or idea #3 (optional)"
              placeholder="Last one?"
              minRows={2}
            />
          </div>
        </LessonScreen>
      )}

      {screen === "brainstorm" && (
        <LessonScreen
          key="brainstorm"
          stepLabel="Step 4 · The Main Job"
          title='Brainstorm "Top 5" prompts.'
          subtitle="These are arguments you'd have with friends. NBA only. Fill in as many as you can in each category — at least one is enough to keep going."
          onBack={() => setScreen("bugs")}
          onNext={() => setScreen("favorites")}
          nextLabel="Next — pick your favorites →"
          nextDisabled={!brainstormReady}
        >
          <div className="flex flex-col gap-10 max-w-[680px] mx-auto">
            <PromptCategory
              label="By Position"
              examples="ex: Top 5 PGs ever, Top 5 power forwards"
              fields={POSITION_FIELDS}
            />
            <PromptCategory
              label="By Team"
              examples="ex: Top 5 Lakers, Top 5 Celtics ever"
              fields={TEAM_FIELDS}
            />
            <PromptCategory
              label="By Skill"
              examples="ex: Top 5 dunkers, Top 5 shooters ever"
              fields={SKILL_FIELDS}
            />
            <PromptCategory
              label="Spicy / Weird"
              examples="ex: Top 5 trash talkers, Top 5 nicknames"
              fields={SPICY_FIELDS}
            />
            <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
              {promptCount} prompt{promptCount === 1 ? "" : "s"} so far
            </p>
          </div>
        </LessonScreen>
      )}

      {screen === "favorites" && (
        <LessonScreen
          key="favorites"
          stepLabel="Step 5 · Pick"
          title="Star your favorite 5. Those go in first."
          subtitle="Out of everything you brainstormed, which 5 do you want Dad to put in the database tonight? Type them out exactly as you'd want them to appear — even if they're already in your lists above."
          onBack={() => setScreen("brainstorm")}
          onNext={() => setScreen("submit")}
          nextLabel="Ready to submit →"
          nextDisabled={!favoritesReady}
        >
          <div className="flex flex-col gap-3 max-w-[680px] mx-auto">
            {FAVORITE_FIELDS.map((f, i) => (
              <FavoriteRow key={f} index={i + 1} fieldPath={f} />
            ))}
          </div>
        </LessonScreen>
      )}

      {screen === "submit" && (
        <LessonScreen
          key="submit"
          stepLabel="Step 6 · Submit"
          title="Send your work to Dad."
          subtitle="Once you submit, Dad gets all your prompts in his admin. He'll add the starred ones to the database tonight, and the rest go in over the next few days."
          onBack={() => setScreen("favorites")}
          onNext={submit}
          nextLabel="Submit to Dad ✉"
          nextBusy={submitting}
          nextDisabled={submitting}
        >
          <div className="max-w-[680px] mx-auto">
            <p className="font-[family-name:var(--font-fraunces)] italic text-[1.1rem] text-[var(--color-warm-bone)] leading-relaxed">
              You&apos;re about to submit your first curator job. Real ones.
            </p>
            {submitError && (
              <div className="mt-5 px-4 py-3 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)] text-sm italic font-[family-name:var(--font-fraunces)]">
                {submitError}
              </div>
            )}
          </div>
        </LessonScreen>
      )}

      {screen === "done" && (
        <LessonComplete
          key="done"
          studentNames="Jaiye"
          lessonTitle="your first curator job"
        />
      )}
    </AnimatePresence>
  );
}

function PromptCategory({
  label,
  examples,
  fields,
}: {
  label: string;
  examples: string;
  fields: string[];
}) {
  return (
    <div>
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)] mb-1">
        {label}
      </div>
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-[var(--color-warm-mute)] mb-4">
        {examples}
      </div>
      <div className="flex flex-col gap-3">
        {fields.map((f, i) => (
          <LessonTextInput
            key={f}
            fieldPath={f}
            label={`Prompt ${i + 1}`}
            placeholder={`Top 5 …`}
          />
        ))}
      </div>
    </div>
  );
}

function FavoriteRow({ index, fieldPath }: { index: number; fieldPath: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-4 items-center bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-4">
      <span className="font-[family-name:var(--font-jetbrains)] text-sm text-[var(--color-red)] font-bold whitespace-nowrap">
        ★ {String(index).padStart(2, "0")}
      </span>
      <div>
        <LessonTextInput
          fieldPath={fieldPath}
          label={`Favorite #${index}`}
          placeholder="Top 5 …"
        />
      </div>
    </div>
  );
}
