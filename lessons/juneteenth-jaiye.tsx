"use client";

/**
 * Juneteenth — The Day Freedom Reached Texas
 *
 * Jaiye's brand: editorial sports-magazine, Jordan-era "serious craft."
 * Reuses the Session 6 lesson primitives (LessonShell, LessonHero,
 * LessonScreen, LessonVideo, LessonTimeline, LessonComplete) plus an
 * inline auto-graded quiz block. All free-text fields autosave via
 * DraftProvider / useDraftField. Submit posts to /api/lessons/complete.
 *
 * Flow: hero → watch → read → timeline → quiz → file the report →
 *       think about it → reflect & submit → done.
 */

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import LessonShell from "@/components/lessons/lesson-shell";
import LessonHero from "@/components/lessons/lesson-hero";
import LessonScreen from "@/components/lessons/lesson-screen";
import LessonVideo from "@/components/lessons/lesson-video";
import LessonTimeline, { type TimelineItem } from "@/components/lessons/lesson-timeline";
import LessonComplete from "@/components/lessons/lesson-complete";
import LessonTextInput from "@/components/lessons/lesson-text-input";
import LessonTextarea from "@/components/lessons/lesson-textarea";
import {
  DraftProvider,
  useAllDrafts,
  useDraftLoaded,
} from "@/components/lessons/draft-context";

const LESSON_SLUG = "juneteenth-jaiye";
const LESSON_TITLE = "Juneteenth — The Day Freedom Reached Texas";

type Props = { taskId: string };

type Screen =
  | "hero"
  | "watch"
  | "read"
  | "timeline"
  | "quiz"
  | "report"
  | "think"
  | "reflect"
  | "done";

const TOTAL_STEPS = 7;

const STEP_BY_SCREEN: Record<Screen, number> = {
  hero: 0,
  watch: 1,
  read: 2,
  timeline: 3,
  quiz: 4,
  report: 5,
  think: 6,
  reflect: 7,
  done: 7,
};

const TIMELINE: TimelineItem[] = [
  {
    year: "Jan 1, 1863",
    title: "The Emancipation Proclamation",
    description:
      "Lincoln declares enslaved people in Confederate states free — but words on paper only become real where Union troops arrive to enforce them.",
    emoji: "📜",
    color: "var(--color-history)",
  },
  {
    year: "Apr 9, 1865",
    title: "The Civil War Ends",
    description:
      "The Confederacy surrenders at Appomattox. The war is over — but slavery hasn't actually ended everywhere yet.",
    emoji: "🏳️",
    color: "var(--color-history)",
  },
  {
    year: "June 19, 1865",
    title: "Juneteenth",
    description:
      "General Gordon Granger reads General Order No. 3 in Galveston, Texas. The last enslaved people learn they are free — 2½ years late.",
    emoji: "✊",
    color: "var(--color-red)",
  },
  {
    year: "Dec 6, 1865",
    title: "The 13th Amendment",
    description:
      "Slavery is abolished everywhere in the United States by constitutional law — permanently.",
    emoji: "📖",
    color: "var(--color-history)",
  },
  {
    year: "June 17, 2021",
    title: "A National Holiday",
    description:
      "Juneteenth becomes a federal holiday, recognized across the whole country.",
    emoji: "🇺🇸",
    color: "var(--color-history)",
  },
];

type MCQ = {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
};

const QUIZ: MCQ[] = [
  {
    id: "q1",
    prompt: "The word “Juneteenth” is a blend of which two words?",
    options: [
      "“June” and “nineteenth”",
      "“June” and “teenager”",
      "“Jubilee” and “month”",
      "“June” and “freedom”",
    ],
    correct: 0,
  },
  {
    id: "q2",
    prompt: "In what year did the last enslaved people in Galveston, Texas learn they were free?",
    options: ["1776", "1863", "1865", "1921"],
    correct: 2,
  },
  {
    id: "q3",
    prompt: "Why did it take so long for the news of freedom to reach Texas?",
    options: [
      "No one had written it down yet",
      "Texas was the most distant part of the Confederacy and freedom needed Union troops to enforce it",
      "The Emancipation Proclamation hadn’t been signed",
      "People in Texas didn’t celebrate holidays",
    ],
    correct: 1,
  },
  {
    id: "q4",
    prompt: "The Emancipation Proclamation came first, but what finally made slavery illegal everywhere in the U.S.?",
    options: [
      "General Order No. 3",
      "The first Juneteenth celebration",
      "The 13th Amendment",
      "The end of the Civil War",
    ],
    correct: 2,
  },
];

export default function JuneteenthJaiyeLesson({ taskId }: Props) {
  const [screen, setScreen] = useState<Screen>("hero");
  return (
    <DraftProvider taskId={taskId}>
      <LessonShell
        title={LESSON_TITLE}
        currentStep={STEP_BY_SCREEN[screen]}
        totalSteps={TOTAL_STEPS}
      >
        <Body screen={screen} setScreen={setScreen} taskId={taskId} />
      </LessonShell>
    </DraftProvider>
  );
}

function Body({
  screen,
  setScreen,
  taskId,
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
  taskId: string;
}) {
  const loaded = useDraftLoaded();
  const drafts = useAllDrafts();

  const [quizPicks, setQuizPicks] = useState<Record<string, number>>({});
  const [quizLocked, setQuizLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const allMCAnswered = QUIZ.every((q) => typeof quizPicks[q.id] === "number");
  const quizScore = useMemo(() => {
    if (!quizLocked) return 0;
    return QUIZ.reduce((n, q) => (quizPicks[q.id] === q.correct ? n + 1 : n), 0);
  }, [quizLocked, quizPicks]);

  const reportReady =
    (drafts["report.headline"] ?? "").trim().length > 0 &&
    (drafts["report.lede"] ?? "").trim().length > 0;

  const thinkReady =
    (drafts["think.why"] ?? "").trim().length > 0 &&
    (drafts["think.secondindependence"] ?? "").trim().length > 0;

  const reflectReady =
    (drafts["reflect.word"] ?? "").trim().length > 0 &&
    (drafts["reflect.ask"] ?? "").trim().length > 0;

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const responses = {
        watch: {
          surprise: (drafts["watch.surprise"] ?? "").trim(),
        },
        quiz: {
          q1: { picked: quizPicks["q1"] ?? null, correct: QUIZ[0].correct },
          q2: { picked: quizPicks["q2"] ?? null, correct: QUIZ[1].correct },
          q3: { picked: quizPicks["q3"] ?? null, correct: QUIZ[2].correct },
          q4: { picked: quizPicks["q4"] ?? null, correct: QUIZ[3].correct },
          q5_meaning: (drafts["q5.meaning"] ?? "").trim(),
          score: `${quizScore}/4`,
        },
        report: {
          headline: (drafts["report.headline"] ?? "").trim(),
          lede: (drafts["report.lede"] ?? "").trim(),
        },
        think: {
          why_kept_alive: (drafts["think.why"] ?? "").trim(),
          second_independence: (drafts["think.secondindependence"] ?? "").trim(),
        },
        reflect: {
          word: (drafts["reflect.word"] ?? "").trim(),
          ask_dad: (drafts["reflect.ask"] ?? "").trim(),
        },
        quiz_score: `${quizScore}/4`,
      };

      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, lessonSlug: LESSON_SLUG, responses }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSubmitError(
          body?.error === "already_completed"
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

  if (!loaded) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-24 text-center text-[var(--color-warm-mute)] italic font-[family-name:var(--font-fraunces)]">
        Loading your work…
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {screen === "hero" && (
        <LessonHero
          key="hero"
          tag="History · Freedom Files · June 19"
          title="Juneteenth."
          titleAccent="The day freedom reached Texas."
          description="On June 19, 1865, freedom finally reached the very last people who were still enslaved in America — in Galveston, Texas. This is the story of why it took so long, and why we still celebrate it today."
          missionItems={["Watch two videos", "Read the essay", "Walk the timeline", "Take the quiz", "File the report"]}
          onStart={() => setScreen("watch")}
        />
      )}

      {screen === "watch" && (
        <LessonScreen
          key="watch"
          stepLabel="Step 1 · Watch"
          title="Watch first."
          subtitle="Two short videos. Watch both — they tell the same story two ways. The first sets the scene; the second goes a layer deeper."
          onBack={() => setScreen("hero")}
          onNext={() => setScreen("read")}
          nextDisabled={(drafts["watch.surprise"] ?? "").trim().length === 0}
          nextLabel="I watched them →"
        >
          <div className="flex flex-col gap-6">
            <div className="grid md:grid-cols-2 gap-5">
              <LessonVideo
                title="What Is Juneteenth?"
                description="HISTORY · All About Holidays for Kids — quick, clear, scene-setting."
                youtubeUrl="https://www.youtube.com/watch?v=xumaItN5tbo"
              />
              <LessonVideo
                title="What is Juneteenth, and why is it important?"
                description="TED-Ed · Karlos K. Hill & Soraya Field Fiorio. Goes deeper on the history."
                youtubeUrl="https://www.youtube.com/watch?v=lq8TNKZVEWs"
              />
            </div>

            <CaptureField
              fieldPath="watch.surprise"
              label="While You Watch"
              question="What is one thing that surprised you, or that you didn’t know before?"
            />
          </div>
        </LessonScreen>
      )}

      {screen === "read" && (
        <LessonScreen
          key="read"
          stepLabel="Step 2 · Read"
          title="Freedom Delayed, But Never Denied"
          subtitle="Read this out loud if you can. Pause on the pull quote. Sit with it before you go on."
          onBack={() => setScreen("watch")}
          onNext={() => setScreen("timeline")}
          nextLabel="I read it →"
        >
          <Essay />
        </LessonScreen>
      )}

      {screen === "timeline" && (
        <LessonScreen
          key="timeline"
          stepLabel="Step 3 · The Timeline"
          title="Five dates that tell the story."
          subtitle="The red dot is Juneteenth. Notice the gap between 1863 and 1865 — that gap is the whole point of this day."
          onBack={() => setScreen("read")}
          onNext={() => setScreen("quiz")}
          nextLabel="On to the quiz →"
        >
          <LessonTimeline items={TIMELINE} />
        </LessonScreen>
      )}

      {screen === "quiz" && (
        <LessonScreen
          key="quiz"
          stepLabel="Step 4 · Check Your Understanding"
          title="Quiz time."
          subtitle="Four multiple choice, then one short answer. Take your time. You can change your mind before you hit Check."
          onBack={() => setScreen("timeline")}
          onNext={() => setScreen("report")}
          nextDisabled={!quizLocked || (drafts["q5.meaning"] ?? "").trim().length === 0}
          nextLabel="Next →"
        >
          <Quiz
            picks={quizPicks}
            setPicks={setQuizPicks}
            locked={quizLocked}
            onCheck={() => setQuizLocked(true)}
            allAnswered={allMCAnswered}
            score={quizScore}
          />
        </LessonScreen>
      )}

      {screen === "report" && (
        <LessonScreen
          key="report"
          stepLabel="Step 5 · Your Assignment"
          title="File the report."
          subtitle="You’re a journalist in Galveston, Texas, on June 19, 1865. You just watched General Granger read the order aloud. Write your story."
          onBack={() => setScreen("quiz")}
          onNext={() => setScreen("think")}
          nextDisabled={!reportReady}
          nextLabel="Story filed →"
        >
          <DispatchPanel>
            <div className="flex flex-col gap-5">
              <LessonTextInput
                fieldPath="report.headline"
                label="1 — Your headline"
                placeholder="One powerful line. Make it land."
                hint="A great headline gives the reader the news AND the feeling, in as few words as possible."
              />
              <LessonTextarea
                fieldPath="report.lede"
                label="2 — Your opening paragraph"
                placeholder="What happened today? What did you see and hear? How did people react?"
                helpText="Write it like you were there. Two or three sentences minimum."
                minRows={5}
                encouragement
              />
            </div>
          </DispatchPanel>
        </LessonScreen>
      )}

      {screen === "think" && (
        <LessonScreen
          key="think"
          stepLabel="Step 6 · Think About It"
          title="No right answers here — just your real thinking."
          subtitle="Slow down. Read each question twice before you start typing."
          onBack={() => setScreen("report")}
          onNext={() => setScreen("reflect")}
          nextDisabled={!thinkReady}
          nextLabel="Last step →"
        >
          <div className="flex flex-col gap-5">
            <LessonTextarea
              fieldPath="think.why"
              label="Question 1"
              helpText="For over 150 years, families kept celebrating Juneteenth even while equality was still a hard fight. Why do you think they kept the day alive?"
              placeholder="Write at least two or three sentences."
              minRows={5}
              encouragement
            />
            <LessonTextarea
              fieldPath="think.secondindependence"
              label="Question 2"
              helpText="Juneteenth is sometimes called America’s “second Independence Day.” Do you think that’s a good name for it? Why or why not?"
              placeholder="There’s no wrong answer — just be honest and back it up."
              minRows={5}
              encouragement
            />
          </div>
        </LessonScreen>
      )}

      {screen === "reflect" && (
        <LessonScreen
          key="reflect"
          stepLabel="Step 7 · Before You Submit"
          title="Two quick ones."
          subtitle="Then you send it to Dad."
          onBack={() => setScreen("think")}
          onNext={submit}
          nextDisabled={!reflectReady || submitting}
          nextBusy={submitting}
          nextLabel="Submit My Mission →"
        >
          <div className="flex flex-col gap-5">
            <LessonTextInput
              fieldPath="reflect.word"
              label="One word"
              placeholder="One word for how learning this makes you feel."
              maxLength={60}
            />
            <LessonTextInput
              fieldPath="reflect.ask"
              label="One question for Dad"
              placeholder="One thing you want to ask Dad about Juneteenth."
              maxLength={200}
            />
            {submitError && (
              <div className="px-4 py-3 rounded border border-[var(--color-red)] bg-[rgba(230,57,70,0.08)] text-[var(--color-red-soft)] text-sm italic font-[family-name:var(--font-fraunces)]">
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
          lessonTitle="Juneteenth — the day freedom reached Texas"
        />
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────
   Essay — "Freedom Delayed, But Never Denied"
───────────────────────────────────────────────────────── */
function Essay() {
  return (
    <article className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-6 md:p-8">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-4">
        Feature · 6 min read · Freedom Files
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.75rem] leading-tight tracking-[-0.02em] text-[var(--color-bone)] mb-6">
        Freedom Delayed, But Never Denied
      </h3>

      <div className="font-[family-name:var(--font-fraunces)] text-[1.05rem] leading-[1.75] text-[var(--color-warm-bone)] flex flex-col gap-4">
        <p>
          For more than 200 years, millions of Black people in America were enslaved. They were forced
          to work without pay, bought and sold like property, and denied the most basic freedoms. It
          was one of the most unjust chapters in our country’s history — and ending it was not quick,
          and it was not simple.
        </p>
        <p>
          On <strong className="text-[var(--color-bone)] font-semibold">January 1, 1863</strong>, in
          the middle of the Civil War, President Abraham Lincoln issued the{" "}
          <em>Emancipation Proclamation</em>. It declared that enslaved people in the Confederate
          states “shall be free.” But a piece of paper can’t free anyone on its own. Freedom only
          became real where Union soldiers arrived to enforce it — and the war was still raging.
        </p>

        <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.25rem] tracking-[-0.01em] text-[var(--color-red)] mt-4">
          The last to know
        </h4>
        <p>
          Texas was the most distant corner of the Confederacy. There were few Union troops there,
          so slaveholders kept the news quiet and kept people enslaved — even after the war ended in
          April 1865. For <strong className="text-[var(--color-bone)] font-semibold">two and a half more years</strong>,
          people in Texas were free by law but not in life.
        </p>
        <p>
          That changed on <strong className="text-[var(--color-bone)] font-semibold">June 19, 1865</strong>.
          Union General Gordon Granger arrived in Galveston, Texas, with his troops and read{" "}
          <em>General Order No. 3</em> aloud: all enslaved people were free, immediately. The reaction
          was electric — shouts, prayers, dancing, tears. People left plantations to find family who
          had been sold away. That day became known as <strong className="text-[var(--color-bone)] font-semibold">Juneteenth</strong>{" "}
          — a blend of “June” and “nineteenth.”
        </p>

        <blockquote className="border-l-[3px] border-[var(--color-red)] pl-5 my-4 italic font-[family-name:var(--font-fraunces)] text-[1.35rem] leading-snug text-[var(--color-history)]">
          “Freedom delayed is not freedom denied.”
        </blockquote>

        <h4 className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.25rem] tracking-[-0.01em] text-[var(--color-red)] mt-4">
          Making it law — and a holiday
        </h4>
        <p>
          Later that year, on <strong className="text-[var(--color-bone)] font-semibold">December 6, 1865</strong>,
          the 13th Amendment was added to the Constitution, ending slavery everywhere in the United
          States for good. The very next year, the freed communities of Texas held the first
          Juneteenth celebrations — and they never stopped. For over 150 years, families kept the day
          alive with red foods, music, and storytelling, even when full equality was still a long
          fight ahead.
        </p>
        <p>
          On <strong className="text-[var(--color-bone)] font-semibold">June 17, 2021</strong>,
          Juneteenth became a national holiday — a day for all Americans to remember both how hard
          freedom was won and how worth celebrating it is.
        </p>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────
   Capture field — single textarea card matched to question style
───────────────────────────────────────────────────────── */
function CaptureField({
  fieldPath,
  label,
  question,
}: {
  fieldPath: string;
  label: string;
  question: string;
}) {
  return (
    <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5 flex flex-col gap-3">
      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
        {label}
      </div>
      <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.05rem] leading-snug tracking-[-0.01em] text-[var(--color-bone)]">
        {question}
      </div>
      <LessonTextarea
        fieldPath={fieldPath}
        label=""
        placeholder="Type your answer…"
        minRows={3}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   DispatchPanel — gives the "File the Report" screen a real
   newsroom feel: a faux dateline + byline above the form.
───────────────────────────────────────────────────────── */
function DispatchPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] rounded px-5 py-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--color-red)]">
            Dispatch · Galveston, Texas
          </div>
          <div className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-bone)] text-[0.95rem]">
            June 19, 1865 · Filed by{" "}
            <span className="not-italic font-semibold text-[var(--color-bone)]">Jaiye Sobo</span>
          </div>
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded-sm px-2 py-1">
          WIRE · The Freedom Files
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Quiz — 4 MC + 1 short. Lock + reveal correct/incorrect
   on "Check My Answers". Scorecard appears after lock.
───────────────────────────────────────────────────────── */
function Quiz({
  picks,
  setPicks,
  locked,
  onCheck,
  allAnswered,
  score,
}: {
  picks: Record<string, number>;
  setPicks: (next: Record<string, number>) => void;
  locked: boolean;
  onCheck: () => void;
  allAnswered: boolean;
  score: number;
}) {
  const pick = (id: string, idx: number) => {
    if (locked) return;
    setPicks({ ...picks, [id]: idx });
  };

  return (
    <div className="flex flex-col gap-5">
      {QUIZ.map((q, qi) => (
        <div
          key={q.id}
          className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
              Question {qi + 1} of 5
            </div>
          </div>
          <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.1rem] leading-snug tracking-[-0.01em] text-[var(--color-bone)]">
            {q.prompt}
          </div>

          <div className="flex flex-col gap-2 mt-1">
            {q.options.map((opt, oi) => {
              const selected = picks[q.id] === oi;
              const isCorrect = locked && oi === q.correct;
              const isWrongPick = locked && selected && oi !== q.correct;
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => pick(q.id, oi)}
                  disabled={locked}
                  className={[
                    "text-left rounded border px-4 py-3 flex items-center gap-3 transition-colors",
                    "font-[family-name:var(--font-fraunces)] text-[var(--color-bone)]",
                    isCorrect
                      ? "border-[var(--color-green)] bg-[rgba(74,222,128,0.10)]"
                      : isWrongPick
                        ? "border-[var(--color-red-deep)] bg-[rgba(230,57,70,0.10)]"
                        : selected
                          ? "border-[var(--color-red)] bg-[var(--color-warm-surface-2)]"
                          : "border-[var(--color-line)] bg-[var(--color-warm-bg)] hover:border-[var(--color-line-strong)]",
                    locked ? "cursor-default" : "cursor-pointer",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex-none w-5 h-5 rounded-full border flex items-center justify-center text-[0.65rem]",
                      isCorrect
                        ? "border-[var(--color-green)] bg-[var(--color-green)] text-[var(--color-warm-bg)]"
                        : isWrongPick
                          ? "border-[var(--color-red-deep)] bg-[var(--color-red-deep)] text-[var(--color-bone)]"
                          : selected
                            ? "border-[var(--color-red)] bg-[var(--color-red)] text-[var(--color-bone)]"
                            : "border-[var(--color-line-strong)] text-transparent",
                    ].join(" ")}
                  >
                    ✓
                  </span>
                  <span className="text-[0.98rem] leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>

          {locked && (
            <div
              className={[
                "font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.2em] mt-1",
                picks[q.id] === q.correct ? "text-[var(--color-green)]" : "text-[var(--color-red-soft)]",
              ].join(" ")}
            >
              {picks[q.id] === q.correct ? "✓ Correct" : `✗ The answer was: ${q.options[q.correct]}`}
            </div>
          )}
        </div>
      ))}

      {/* Short answer Q5 — not graded, but required */}
      <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5 flex flex-col gap-3">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
          Question 5 of 5 · Think harder
        </div>
        <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.1rem] leading-snug tracking-[-0.01em] text-[var(--color-bone)]">
          The essay said “freedom delayed is not freedom denied.” In your own words, what do you think that means?
        </div>
        <LessonTextarea
          fieldPath="q5.meaning"
          label=""
          placeholder="No multiple choice here — just your own words. A couple of sentences."
          minRows={4}
          encouragement
        />
      </div>

      {!locked && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="font-[family-name:var(--font-fraunces)] italic text-[var(--color-warm-mute)] text-[0.95rem]">
            {allAnswered ? "Looks like you have an answer for each. Ready to check?" : "Pick an answer for all four multiple-choice questions first."}
          </div>
          <button
            type="button"
            onClick={onCheck}
            disabled={!allAnswered}
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3 rounded-sm hover:bg-[var(--color-red-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Check My Answers
          </button>
        </div>
      )}

      {locked && (
        <div className="bg-[var(--color-warm-surface-2)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5 flex flex-col gap-2">
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
            Scorecard
          </div>
          <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.5rem] tracking-[-0.01em] text-[var(--color-bone)]">
            {score} of 4 correct{" "}
            <span className="italic font-normal text-[var(--color-warm-bone)] text-[1.05rem]">
              {score === 4
                ? "— perfect. Real history scholar."
                : score === 3
                  ? "— strong. One slipped by you."
                  : score === 2
                    ? "— halfway. Worth a second read."
                    : score === 1
                      ? "— rough start. Look back at the timeline before moving on."
                      : "— it’s okay. Re-read the essay, then keep going."}
            </span>
          </div>
          <div className="text-[var(--color-warm-mute)] text-[0.9rem] italic font-[family-name:var(--font-fraunces)]">
            Finish question 5, then move on to your assignment.
          </div>
        </div>
      )}
    </div>
  );
}
