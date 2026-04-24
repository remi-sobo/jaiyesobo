"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import LessonShell from "@/components/lessons/lesson-shell";
import LessonHero from "@/components/lessons/lesson-hero";
import LessonScreen from "@/components/lessons/lesson-screen";
import LessonVideo from "@/components/lessons/lesson-video";
import LessonTimeline, { type TimelineItem } from "@/components/lessons/lesson-timeline";
import LessonQuestion from "@/components/lessons/lesson-question";
import LessonMatching from "@/components/lessons/lesson-matching";
import LessonActivityChoice, { type Activity } from "@/components/lessons/lesson-activity-choice";
import LessonDiscussion from "@/components/lessons/lesson-discussion";
import LessonComplete from "@/components/lessons/lesson-complete";

type Props = { taskId: string };

type Screen = "hero" | "watch" | "read" | "questions" | "activity" | "discussion" | "done";

const TOTAL_STEPS = 5; // hero doesn't count toward "Step X of Y"

const TIMELINE: TimelineItem[] = [
  {
    year: "1000 BC+",
    title: "The Ohlone / Muwekma People",
    description:
      "The first people to live on the land were the Ohlone — also called the Muwekma. They lived here for thousands of years before anyone else showed up. They fished, hunted, and lived in small villages along the bay. Their descendants are still in the area today.",
    emoji: "🌿",
  },
  {
    year: "1770s–1849",
    title: "Spanish Ranchers & Mexican Rule",
    description:
      "Spanish missionaries arrived in the 1770s. The land became part of Mexico, and big cattle ranches took over. The Ohlone's way of life was disrupted — many died from disease or were pushed off their land.",
    emoji: "⛵",
  },
  {
    year: "1930s–1950s",
    title: "The Flower Farm Era",
    description:
      "Japanese-American families turned East Palo Alto into a huge flower-growing hub. Roses, chrysanthemums, carnations — shipped all over the country. Then World War II happened and many families were forced into internment camps. They lost their farms.",
    emoji: "🌸",
  },
  {
    year: "1960s–1970s",
    title: "The Nairobi Movement",
    description:
      "Black families moved to EPA because a lot of Palo Alto wouldn't let them buy homes (because of their race). The community grew strong. In 1968, residents voted to rename the town 'Nairobi' after the capital of Kenya — to show Black pride and connection to Africa. The name didn't officially stick, but the spirit did.",
    emoji: "✊",
  },
  {
    year: "1983",
    title: "Becoming a Real City!",
    description:
      "On July 1, 1983, East Palo Alto officially became its own city — separate from San Mateo County. That meant the community could finally control its own roads, schools, police, and taxes. It took decades of organizing to make that happen.",
    emoji: "🏛️",
  },
  {
    year: "Today",
    title: "A Diverse, Resilient Community",
    description:
      "EPA is one of the most diverse small cities in America. Latino, Black, Pacific Islander, and many other communities live here. It's right next to some of the richest zip codes in the country — but EPA has its own identity, its own story. You and Kemi are part of that story now.",
    emoji: "🌍",
  },
];

const MATCHING_LEFT = [
  { letter: "A", text: "Muwekma / Ohlone — the original people" },
  { letter: "B", text: "The Flower Farm Era — when EPA grew roses" },
  { letter: "C", text: "The Nairobi Movement — community pride and renaming" },
  { letter: "D", text: "1983 — EPA becomes its own city" },
];

const MATCHING_RIGHT = [
  { key: "m1", text: "Happened in the 1960s–70s when Black families built community together" },
  { key: "m2", text: "Was led by Japanese-American families until WWII" },
  { key: "m3", text: "Were the first people to live here, for thousands of years" },
  { key: "m4", text: "Is the year East Palo Alto became a real city" },
];

const ACTIVITIES: Activity[] = [
  {
    value: "map",
    emoji: "🗺️",
    title: "Find It on a Map",
    description:
      "Look up East Palo Alto on Google Maps with Kemi. Find University Ave, Bay Road, and the old flower farm locations. What do you notice about where EPA sits?",
  },
  {
    value: "letter",
    emoji: "✍️",
    title: "Letter Through Time",
    description:
      "Write a short letter to someone from one of the eras — an Ohlone kid, a flower farmer, or a Nairobi-movement organizer. Ask them one question you'd want to know.",
  },
  {
    value: "flower",
    emoji: "🌸",
    title: "Flower Farm Drawing",
    description:
      "Draw what EPA might have looked like in 1940 — rows of flowers, wooden sheds, families working. Try to imagine the smell and the colors.",
  },
  {
    value: "interview",
    emoji: "🎙️",
    title: "Interview Someone",
    description:
      "Ask Grandma, Dad, or a neighbor who's been in the area for a while: 'What's one thing about EPA that's changed since you were little? What's one thing that stayed the same?'",
  },
];

const DISCUSSION_PROMPTS = [
  {
    who: "Both of you",
    question:
      "If you got to rename East Palo Alto today, what would you call it — and why? No wrong answers. Big ideas only.",
  },
  {
    who: "Jaiye",
    question:
      "The Nairobi Movement was about community pride. What's something you're proud of about your community right now?",
  },
  {
    who: "Both of you",
    question:
      "A lot of people lost things in this history — Ohlone people lost their land, Japanese families lost their farms. How does that make you feel? What does it teach you?",
  },
  {
    who: "Kemi",
    question:
      "Which part of the timeline was most interesting to you? Why? (Kemi goes first on this one.)",
  },
];

export default function EpaHistoryLesson({ taskId }: Props) {
  const [screen, setScreen] = useState<Screen>("hero");
  const [q1, setQ1] = useState("");
  const [m, setM] = useState<Record<string, string>>({});
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");
  const [q5, setQ5] = useState("");
  const [activity, setActivity] = useState<string | null>(null);
  const [activityResponse, setActivityResponse] = useState("");
  const [reflection, setReflection] = useState("");
  const [names, setNames] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stepByScreen: Record<Screen, number> = {
    hero: 0,
    watch: 1,
    read: 2,
    questions: 3,
    activity: 4,
    discussion: 5,
    done: 5,
  };

  const questionsAnswered =
    q1.trim().length > 0 &&
    q3.trim().length > 0 &&
    q4.trim().length > 0 &&
    q5.trim().length > 0 &&
    Object.values(m).filter(Boolean).length === 4;

  const canSubmit = useMemo(
    () =>
      questionsAnswered &&
      activity !== null &&
      activityResponse.trim().length > 0 &&
      reflection.trim().length > 0 &&
      names.trim().length > 0 &&
      !submitting,
    [questionsAnswered, activity, activityResponse, reflection, names, submitting]
  );

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          lessonSlug: "epa-history",
          responses: {
            q1: q1.trim(),
            matching: m,
            q3: q3.trim(),
            q4: q4.trim(),
            q5: q5.trim(),
            activity: { selected: activity, response: activityResponse.trim() },
            reflection: reflection.trim(),
            names: names.trim(),
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSubmitError(body?.error === "already_completed" ? "You already submitted this one." : "Submit failed. Try again.");
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

  return (
    <LessonShell
      title="The Story of East Palo Alto"
      currentStep={stepByScreen[screen]}
      totalSteps={TOTAL_STEPS}
    >
      <AnimatePresence mode="wait">
        {screen === "hero" && (
          <LessonHero
            key="hero"
            tag="🏙️ History Mission · April 2026"
            title="The Story of"
            titleAccent="East Palo Alto."
            description="Jaiye — this is your neighborhood's story. You and Kemi are going to learn it together today. Watch a video, read the timeline, answer some questions, and complete an activity. Let's go."
            missionItems={["Watch a video", "Read history", "Answer questions", "Pick an activity"]}
            onStart={() => setScreen("watch")}
          />
        )}

        {screen === "watch" && (
          <LessonScreen
            key="watch"
            stepLabel="Step 1 · Watch"
            title="Watch the videos first"
            subtitle="Open these YouTube videos and watch them together with Kemi. Come back here when you're done."
            onBack={() => setScreen("hero")}
            onNext={() => setScreen("read")}
            nextLabel="I watched it →"
          >
            <div className="grid md:grid-cols-2 gap-5">
              <LessonVideo
                title="Effort to Preserve East Palo Alto's History"
                description="News segment · 2024 · Real people from EPA tell the story."
                youtubeUrl="https://www.youtube.com/watch?v=9L9gxYTKynE"
              />
              <LessonVideo
                title="Bonus: EPA Library Historical Photos"
                description="Old photos of EPA from the 1960s–1970s. Watch after the first one."
                youtubeUrl="https://www.youtube.com/watch?v=39jayWf9WeQ"
              />
            </div>
          </LessonScreen>
        )}

        {screen === "read" && (
          <LessonScreen
            key="read"
            stepLabel="Step 2 · Read"
            title="The timeline"
            subtitle="Take turns reading each block out loud with Kemi. Pause on the parts that surprise you."
            onBack={() => setScreen("watch")}
            onNext={() => setScreen("questions")}
            nextLabel="I read it →"
          >
            <LessonTimeline items={TIMELINE} />
          </LessonScreen>
        )}

        {screen === "questions" && (
          <LessonScreen
            key="questions"
            stepLabel="Step 3 · Answer"
            title="Answer together"
            subtitle="Discuss each question with Kemi, then type the answer you both agree on. Be specific."
            onBack={() => setScreen("read")}
            onNext={() => setScreen("activity")}
            nextDisabled={!questionsAnswered}
            nextLabel="Answers locked in →"
          >
            <div className="flex flex-col gap-4">
              <LessonQuestion
                number={1}
                forWho="Both of you"
                question="Who were the first people to live on the land that is now East Palo Alto?"
                value={q1}
                onChange={setQ1}
              />
              <LessonMatching
                number={2}
                forWho="Both of you"
                question="Match each era (A/B/C/D) to the statement that fits it best. Type the letter in the box."
                leftItems={MATCHING_LEFT}
                rightItems={MATCHING_RIGHT}
                values={m}
                onChange={setM}
              />
              <LessonQuestion
                number={3}
                forWho="Both of you"
                question="What year did EPA become its own city, and why did that matter?"
                value={q3}
                onChange={setQ3}
              />
              <LessonQuestion
                number={4}
                forWho="Jaiye — stretch question"
                question="What was the Nairobi Movement, and why did the community want to rename East Palo Alto 'Nairobi'?"
                value={q4}
                onChange={setQ4}
              />
              <LessonQuestion
                number={5}
                forWho="Both of you"
                question="What is ONE thing that surprised you about East Palo Alto's history? Why?"
                value={q5}
                onChange={setQ5}
              />
            </div>
          </LessonScreen>
        )}

        {screen === "activity" && (
          <LessonScreen
            key="activity"
            stepLabel="Step 4 · Activity"
            title="Pick an activity"
            subtitle="Choose ONE of these to do together. Then write a few sentences about what you did or what you noticed."
            onBack={() => setScreen("questions")}
            onNext={() => setScreen("discussion")}
            nextDisabled={!activity || activityResponse.trim().length === 0}
            nextLabel="Activity done →"
          >
            <div className="flex flex-col gap-6">
              <LessonActivityChoice
                activities={ACTIVITIES}
                selected={activity}
                onChange={setActivity}
              />
              {activity && (
                <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5 flex flex-col gap-3">
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
                    Tell Dad about it
                  </div>
                  <textarea
                    value={activityResponse}
                    onChange={(e) => setActivityResponse(e.target.value)}
                    rows={5}
                    placeholder="What did you do? What stood out? Write at least 2–3 sentences."
                    className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-3 text-[var(--color-bone)] italic font-[family-name:var(--font-fraunces)] focus:outline-none focus:border-[var(--color-red)] resize-y min-h-[120px] leading-relaxed"
                  />
                </div>
              )}
            </div>
          </LessonScreen>
        )}

        {screen === "discussion" && (
          <LessonScreen
            key="discussion"
            stepLabel="Step 5 · Reflect & Submit"
            title="Last thing — talk and reflect"
            subtitle="Read these discussion prompts together with Kemi. Then write your big reflection and submit."
            onBack={() => setScreen("activity")}
            onNext={submit}
            nextDisabled={!canSubmit}
            nextBusy={submitting}
            nextLabel="Send to Dad →"
          >
            <div className="flex flex-col gap-8">
              <LessonDiscussion prompts={DISCUSSION_PROMPTS} />

              <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] border-l-[3px] border-l-[var(--color-red)] rounded p-5 flex flex-col gap-3">
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-red)]">
                  Big reflection
                </div>
                <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[1.1rem] leading-snug tracking-[-0.01em] text-[var(--color-bone)]">
                  What do YOU think makes a community strong?
                </div>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={5}
                  placeholder="Take your time. A few sentences minimum. Be real."
                  className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-3 text-[var(--color-bone)] italic font-[family-name:var(--font-fraunces)] focus:outline-none focus:border-[var(--color-red)] resize-y min-h-[130px] leading-relaxed"
                />
              </div>

              <div className="bg-[var(--color-warm-surface)] border border-[var(--color-line)] rounded p-5 flex flex-col gap-2">
                <label className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
                  What are both your names?
                </label>
                <input
                  type="text"
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  placeholder="e.g. Jaiye and Kemi"
                  className="bg-[var(--color-warm-bg)] border border-[var(--color-line-strong)] rounded p-3 text-[var(--color-bone)] italic font-[family-name:var(--font-fraunces)] focus:outline-none focus:border-[var(--color-red)]"
                />
              </div>

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
            studentNames={names}
            lessonTitle="the story of East Palo Alto"
          />
        )}
      </AnimatePresence>
    </LessonShell>
  );
}
