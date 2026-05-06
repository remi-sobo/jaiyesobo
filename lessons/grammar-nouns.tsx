"use client";

/**
 * MCT-style English grammar lesson · NBA edition · Nouns
 *
 * This is the first of a growing series. Each lesson:
 *   - Lives entirely in this single file (HTML + CSS + interactivity)
 *   - Wears its own visual identity (Playfair + Source Sans 3, green/cream)
 *     distinct from the jaiyesobo app shell — like a textbook chapter inside
 *     the school. Self-contained styles via a scoped `<style jsx>` block.
 *   - Treats the kid as an intelligent reader (MCT philosophy — Socratic
 *     questions, real grammar, not babying).
 *   - Auto-saves writing-prompt drafts via DraftProvider (kid never loses work).
 *   - Submits to /api/lessons/complete to mark the assignment done.
 *
 * To add another grammar lesson, copy this file (e.g. grammar-verbs.tsx),
 * change LESSON_SLUG / TITLE / content, and register it in lib/lessons.ts.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DraftProvider,
  useAllDrafts,
  useDraftField,
  useDraftLoaded,
} from "@/components/lessons/draft-context";

const LESSON_SLUG = "grammar-nouns";
const LESSON_TITLE = "Nouns: The Names of Everything on the Court";

type Props = { taskId: string };

export default function GrammarNounsLesson({ taskId }: Props) {
  return (
    <DraftProvider taskId={taskId}>
      <Body taskId={taskId} />
    </DraftProvider>
  );
}

type Tab = "lesson" | "exercises" | "writing" | "vocab";

function Body({ taskId }: Props) {
  const router = useRouter();
  const loaded = useDraftLoaded();
  const drafts = useAllDrafts();
  const [tab, setTab] = useState<Tab>("lesson");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Submit-readiness gate: at least 2 writing prompts should have content. We
  // could be stricter, but the MCT spirit is: trust the student. Kids who try
  // are allowed to mark complete even if exercises were skipped — submit packs
  // all responses anyway so Dad can see what was attempted.
  const writingFilled = useMemo(() => {
    const fields = ["w.prop.common", "w.prop.proper", "w.idea", "w.reflect"];
    return fields.filter((f) => (drafts[f] ?? "").trim().length > 5).length;
  }, [drafts]);
  const canSubmit = writingFilled >= 2;

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const responses = {
        writing: {
          common_version: drafts["w.prop.common"] ?? "",
          proper_version: drafts["w.prop.proper"] ?? "",
          idea_nouns: drafts["w.idea"] ?? "",
          reflection: drafts["w.reflect"] ?? "",
        },
        vocab_sentence: drafts["v.sentence"] ?? "",
        // The exercises are interactive (no persistence). We capture only that
        // the kid was here — Dad can ask him about them.
      };
      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, lessonSlug: LESSON_SLUG, responses }),
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
      router.push("/me");
      router.refresh();
    } catch (err) {
      console.error(err);
      setSubmitError("Submit failed. Tell Dad — he can fix it.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="mct-loading">
        <p>Loading your work…</p>
        <style jsx>{`
          .mct-loading {
            min-height: 60vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Source Sans 3', sans-serif;
            color: #5a5a55;
            font-style: italic;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mct-root">
      <Fonts />
      <ScopedStyles />

      {/* Hero */}
      <div className="hero">
        <div className="hero-inner">
          <span className="hero-badge">MCT-Style English · Grammar</span>
          <h1 className="hero-title">{LESSON_TITLE}</h1>
          <p className="hero-subtitle">
            A grammar lesson for someone who already writes about the game — and wants to write about it even better.
          </p>
          <div className="hero-court">
            <div className="court-dot" /> NBA Playoff Series · English Language Arts
          </div>
        </div>
      </div>

      {/* Crumb back to /me — kids should always be able to escape */}
      <div className="crumb">
        <Link href="/me">← Back to today</Link>
      </div>

      <div className="page-body">
        {/* Tab nav */}
        <nav className="tab-nav" role="tablist">
          {(["lesson", "exercises", "writing", "vocab"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`tab-btn ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
              role="tab"
              aria-selected={tab === t}
            >
              {tabLabel(t)}
            </button>
          ))}
        </nav>

        {tab === "lesson" && <LessonTab />}
        {tab === "exercises" && <ExercisesTab />}
        {tab === "writing" && <WritingTab />}
        {tab === "vocab" && <VocabTab />}

        {/* Submit footer — sticky-feeling sign-off */}
        <div className="submit-footer">
          <div className="submit-status">
            {canSubmit
              ? "Looks good — when you're ready, mark this lesson complete."
              : "Write at least two answers in the Writing tab to mark complete."}
          </div>
          {submitError && <div className="submit-error">{submitError}</div>}
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? "Submitting…" : "Mark lesson complete →"}
          </button>
        </div>
      </div>

      <div className="footer">
        <strong>MCT-Style Grammar · Nouns Lesson</strong> · English Language Arts · NBA Playoffs Edition
      </div>
    </div>
  );
}

function tabLabel(t: Tab): string {
  switch (t) {
    case "lesson": return "Lesson";
    case "exercises": return "Exercises";
    case "writing": return "Writing";
    case "vocab": return "Vocabulary";
  }
}

/* ─────────────────────────────────────────────────────────
   LESSON TAB
───────────────────────────────────────────────────────── */
function LessonTab() {
  return (
    <div className="tab-content active">
      <section className="section">
        <p className="section-tag">Part One</p>
        <h2 className="section-heading">What is a noun?</h2>
        <p className="section-prose">
          Every time you write about a game, you are already using nouns — you just might not have known their name.
          A noun is the word we use to <strong>name things</strong>. Not the action, not the description — the name itself.
        </p>
        <div className="definition-card">
          <p className="main-def">A <strong>noun</strong> is a word that names a person, place, thing, or idea.</p>
          <p className="example-line">
            The <span className="noun-hl">player</span> on the <span className="noun-hl">court</span> had{" "}
            <span className="noun-hl">courage</span> that shook the whole <span className="noun-hl">arena</span>.
          </p>
        </div>
        <p className="section-prose">
          Notice: every green word is a noun. Some are things you can see and touch. One — <em>courage</em> —
          is something you can only feel. They are all names. That is the test:{" "}
          <em>Does this word name something?</em>
        </p>
      </section>

      <section className="section">
        <p className="section-tag">Part Two</p>
        <h2 className="section-heading">Four kinds of nouns</h2>
        <p className="section-prose">
          Nouns come in four types. Think of them as four positions on the court — each has a different role,
          but they all play in the same game.
        </p>
        <div className="four-types">
          <TypeCard icon="🏃" name="Person" cls="person" examples="LeBron, referee, coach, rookie, Steph Curry, teammate, point guard" />
          <TypeCard icon="🏟️" name="Place" cls="place" examples="arena, locker room, Denver, the paint, baseline, free throw line" />
          <TypeCard icon="🏀" name="Thing" cls="thing" examples="basketball, jersey, shot clock, backboard, sneakers, trophy, rim" />
          <TypeCard icon="💡" name="Idea" cls="idea" examples="effort, momentum, pressure, loyalty, teamwork, determination, courage" />
        </div>
        <p className="section-prose">
          <strong>Idea nouns are the most interesting.</strong> You cannot hold <em>momentum</em> in your hand,
          but you can feel it shift in the third quarter. You cannot photograph <em>pressure</em>, but every player
          in the fourth quarter knows what it is. These invisible nouns are some of the most powerful words in the
          English language — and they show up constantly in great sports writing.
        </p>
      </section>

      <section className="section">
        <p className="section-tag">Part Three</p>
        <h2 className="section-heading">Proper nouns: the VIPs</h2>
        <p className="section-prose">
          Some nouns are so specific — so individual — that we honor them with a capital letter. These are called{" "}
          <strong>proper nouns</strong>. A <em>common noun</em> names any player; a <em>proper noun</em> names{" "}
          <em>that exact</em> player.
        </p>
        <SentenceBox label="Common → Proper">
          The <span className="noun-hl">player</span> drove to the basket. → <span className="noun-hl">Jayson Tatum</span> drove to the basket.
        </SentenceBox>
        <SentenceBox label="Common → Proper">
          The <span className="noun-hl">arena</span> erupted. → <span className="noun-hl">Chase Center</span> erupted.
        </SentenceBox>
        <SentenceBox label="Common → Proper">
          The <span className="noun-hl">team</span> came back. → The <span className="noun-hl">Golden State Warriors</span> came back.
        </SentenceBox>
        <p className="section-prose">
          Your daily game articles are already full of proper nouns. Every player name, every team name, every arena
          name — those are proper nouns, and they are working hard in your writing.
        </p>
      </section>

      <section className="section">
        <p className="section-tag">Part Four — Deep Thinking</p>
        <h2 className="section-heading">A question worth discussing</h2>
        <div className="quote-block">
          <p className="quote-text">&ldquo;If you took every noun out of a sentence, what would be left?&rdquo;</p>
          <p className="quote-attr">Sit with this. Try it on a sentence from your last article.</p>
        </div>
        <p className="section-prose">
          Try it with this sentence: <em>&ldquo;The crowd in the arena felt the momentum shift.&rdquo;</em>{" "}
          Remove every noun: <em>&ldquo;The ___ in the ___ felt the ___ shift.&rdquo;</em> Something strange happens.
          The <span className="verb-hl">verbs</span> are still there, the feeling is still there — but we have lost
          our grip on reality. We no longer know <em>who</em>, <em>where</em>, or <em>what</em>.
        </p>
        <p className="section-prose">
          Nouns are the anchors. Without them, language floats away. This is why writers learn to choose their nouns
          carefully — not just any noun, but the <em>right</em> noun, the one that names the thing most precisely.
        </p>
      </section>
    </div>
  );
}

function TypeCard({ icon, name, cls, examples }: { icon: string; name: string; cls: string; examples: string }) {
  return (
    <div className="type-card">
      <div className="type-icon">{icon}</div>
      <p className={`type-name ${cls}`}>{name}</p>
      <p className="type-examples">{examples}</p>
    </div>
  );
}

function SentenceBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sentence-box">
      <div className="sent-label">{label}</div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   EXERCISES TAB
───────────────────────────────────────────────────────── */
const SORT_DATA: { word: string; type: "person" | "place" | "thing" | "idea" }[] = [
  { word: "LeBron James", type: "person" },
  { word: "arena", type: "place" },
  { word: "basketball", type: "thing" },
  { word: "determination", type: "idea" },
  { word: "TD Garden", type: "place" },
  { word: "momentum", type: "idea" },
];

const ID_SENTENCE = "The rookie from Oklahoma drove past the veteran defender and the arena erupted with excitement.";
const ID_NOUNS = new Set(["rookie", "oklahoma", "veteran", "defender", "arena", "excitement"]);

const PROPER_DATA: { common: string; placeholder: string }[] = [
  { common: "the player", placeholder: "e.g. Anthony Davis" },
  { common: "the arena", placeholder: "e.g. Crypto.com Arena" },
  { common: "the city", placeholder: "e.g. Boston" },
  { common: "the team", placeholder: "e.g. Golden State Warriors" },
];

function ExercisesTab() {
  const [sortChoices, setSortChoices] = useState<Record<number, string>>({});
  const [sortFeedback, setSortFeedback] = useState<Record<number, "correct" | "wrong" | null>>({});
  const [sortResult, setSortResult] = useState("");

  const [idSelected, setIdSelected] = useState<Set<number>>(new Set());
  const [idResult, setIdResult] = useState("");

  const [properValues, setProperValues] = useState<Record<number, string>>({});
  const [properResult, setProperResult] = useState("");

  const [exercisesDone, setExercisesDone] = useState(0);
  const markExercise = () => setExercisesDone((n) => Math.min(3, n + 1));

  const rawWords = useMemo(() => ID_SENTENCE.replace(/\./g, "").split(" "), []);

  function checkSort() {
    let correct = 0;
    let answered = 0;
    const next: Record<number, "correct" | "wrong"> = {};
    SORT_DATA.forEach((item, i) => {
      const val = sortChoices[i];
      if (!val) return;
      answered++;
      if (val === item.type) {
        next[i] = "correct";
        correct++;
      } else {
        next[i] = "wrong";
      }
    });
    setSortFeedback(next);
    setSortResult(answered ? `${correct} of ${answered} correct.` : "Choose an answer for each noun first.");
    if (answered > 0) markExercise();
  }

  function toggleWord(i: number) {
    setIdSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function checkIdentify() {
    const selectedWords = Array.from(idSelected).map((i) =>
      rawWords[i].toLowerCase().replace(/[^a-z]/g, "")
    );
    const correct = selectedWords.filter((w) => ID_NOUNS.has(w)).length;
    const missed = [...ID_NOUNS].filter((n) => !selectedWords.includes(n));
    const extras = selectedWords.filter((w) => !ID_NOUNS.has(w));
    let msg = `${correct} of ${ID_NOUNS.size} nouns found.`;
    if (missed.length) msg += " Missed: " + missed.join(", ") + ".";
    if (extras.length) msg += " Not nouns: " + extras.join(", ") + ".";
    setIdResult(msg);
    markExercise();
  }

  function resetIdentify() {
    setIdSelected(new Set());
    setIdResult("");
  }

  function checkProper() {
    const filled = PROPER_DATA.filter((_, i) => (properValues[i] ?? "").trim().length > 1).length;
    if (filled === PROPER_DATA.length) {
      setProperResult(
        `✓ All ${filled} replaced. Notice how the sentence becomes more vivid and rooted in a real game.`
      );
      markExercise();
    } else {
      setProperResult(`Fill in all ${PROPER_DATA.length} to complete this exercise (${filled} done so far).`);
    }
  }

  return (
    <div className="tab-content active">
      <div className="progress-wrap">
        <div className="progress-labels">
          <span>Progress</span>
          <span>{exercisesDone} of 3 exercises checked</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(exercisesDone / 3) * 100}%` }} />
        </div>
      </div>

      {/* Exercise 1: Sort */}
      <section className="section">
        <p className="section-tag">Exercise 1</p>
        <h2 className="section-heading">Sort the noun</h2>
        <p className="section-prose" style={{ fontSize: 15 }}>
          Each noun below comes from an NBA game article. Identify its type: person, place, thing, or idea.
        </p>
        <div className="exercise-card">
          <div className="exercise-header">
            <p className="exercise-title">Name that type</p>
            <p className="exercise-subtitle">Six nouns from the playoff floor</p>
          </div>
          <div className="exercise-body">
            {SORT_DATA.map((item, i) => (
              <div key={i} className="q-item">
                <p className="q-text">
                  What type of noun is <strong>{item.word}</strong>?
                </p>
                <select
                  className="q-input"
                  value={sortChoices[i] ?? ""}
                  onChange={(e) => setSortChoices((c) => ({ ...c, [i]: e.target.value }))}
                >
                  <option value="">— choose —</option>
                  <option value="person">Person</option>
                  <option value="place">Place</option>
                  <option value="thing">Thing</option>
                  <option value="idea">Idea</option>
                </select>
                {sortFeedback[i] === "correct" && (
                  <div className="q-feedback correct">✓ Correct — {item.word} is a {item.type} noun.</div>
                )}
                {sortFeedback[i] === "wrong" && (
                  <div className="q-feedback wrong">✗ Not quite. Think about whether you can see, touch, or feel it.</div>
                )}
              </div>
            ))}
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={checkSort}>Check answers</button>
            </div>
            <div className="ex-result">{sortResult}</div>
          </div>
        </div>
      </section>

      {/* Exercise 2: Identify */}
      <section className="section">
        <p className="section-tag">Exercise 2</p>
        <h2 className="section-heading">Find the nouns</h2>
        <p className="section-prose" style={{ fontSize: 15 }}>
          Tap or click every word you think is a noun in the sentence below. When you think you have them all, check your work.
        </p>
        <div className="exercise-card">
          <div className="exercise-header">
            <p className="exercise-title">Noun hunt</p>
            <p className="exercise-subtitle">Tap the nouns in the sentence</p>
          </div>
          <div className="exercise-body">
            <div className="id-sentence">
              {rawWords.map((w, i) => (
                <span
                  key={i}
                  className={`word-chip ${idSelected.has(i) ? "selected" : ""}`}
                  onClick={() => toggleWord(i)}
                >
                  {w}
                </span>
              ))}
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={checkIdentify}>Check</button>
              <button type="button" className="btn btn-ghost" onClick={resetIdentify}>Reset</button>
            </div>
            <div className="id-result">{idResult}</div>
          </div>
        </div>
      </section>

      {/* Exercise 3: Common → Proper */}
      <section className="section">
        <p className="section-tag">Exercise 3</p>
        <h2 className="section-heading">Common → Proper</h2>
        <p className="section-prose" style={{ fontSize: 15 }}>
          Write a proper noun that could replace each common noun. Be specific — think about the game you watched or wrote about.
        </p>
        <div className="exercise-card">
          <div className="exercise-header">
            <p className="exercise-title">Make it specific</p>
            <p className="exercise-subtitle">From the game you know</p>
          </div>
          <div className="exercise-body">
            {PROPER_DATA.map((item, i) => (
              <div key={i} className="q-item">
                <p className="q-text">
                  Replace the common noun <strong>&ldquo;{item.common}&rdquo;</strong> with a specific proper noun:
                </p>
                <input
                  type="text"
                  className="q-input"
                  placeholder={item.placeholder}
                  value={properValues[i] ?? ""}
                  onChange={(e) => setProperValues((p) => ({ ...p, [i]: e.target.value }))}
                />
              </div>
            ))}
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={checkProper}>Check my answers</button>
            </div>
            <div className="ex-result">{properResult}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   WRITING TAB — uses DraftProvider for autosave
───────────────────────────────────────────────────────── */
function WritingTab() {
  return (
    <div className="tab-content active">
      <section className="section">
        <p className="section-tag">Writing Challenges</p>
        <h2 className="section-heading">Grammar meets the game</h2>
        <p className="section-prose">
          These prompts ask you to use nouns with intention — not just to fill space, but to make your writing more
          grounded and precise. Write at least two sentences for each.
        </p>
      </section>

      <DraftTextarea
        fieldPath="w.prop.common"
        prompt={`"Without naming any player or team, describe a moment from the last playoff game using only common nouns. Then rewrite it with proper nouns. What changes?"`}
        label="Common noun version"
        placeholder="The player drove past the defender toward the basket as the crowd held its breath..."
      />
      <DraftTextarea
        fieldPath="w.prop.proper"
        label="Proper noun version"
        placeholder="Jaylen Brown drove past Kawhi Leonard toward the basket as Chase Center held its breath..."
        bare
      />

      <DraftTextarea
        fieldPath="w.idea"
        prompt={`"Write three sentences about the game using one idea noun in each. Choose from: momentum, pressure, determination, loyalty, or courage."`}
        placeholder="The momentum shifted in the third quarter when the crowd fell completely silent..."
      />

      <DraftTextarea
        fieldPath="w.reflect"
        prompt={`"In your next game article, circle every noun after you finish writing. How many did you use? Which ones are doing the most work?"`}
        placeholder="Reflection: In my article about last night's game, I counted ___ nouns. The ones doing the most work were... because..."
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   VOCAB TAB
───────────────────────────────────────────────────────── */
function VocabTab() {
  const vocab: { word: string; pos: string; def: React.ReactNode }[] = [
    { word: "momentum", pos: "noun · idea", def: <>The force or energy of a moving situation. From Latin <em>movere</em> — to move. In physics, a real force. In basketball, it feels just as real.</> },
    { word: "trajectory", pos: "noun · thing", def: <>The curved path an object follows through space. Describes a player&apos;s career arc just as well as a jump shot.</> },
    { word: "tenacity", pos: "noun · idea", def: <>Persistent, fierce determination. From Latin <em>tenax</em> — holding fast. The noun for what coaches mean when they say &ldquo;he never quits.&rdquo;</> },
    { word: "adversity", pos: "noun · idea", def: <>Difficulty or hardship faced with courage. Great players and great writers both know that adversity creates the most interesting stories.</> },
    { word: "precision", pos: "noun · idea", def: <>Exactness and accuracy. Steph Curry&apos;s three-pointer has it. So does a sentence where every word is exactly right.</> },
    { word: "legacy", pos: "noun · idea", def: <>What one leaves behind after the work is done. An invisible noun — but heavy. Every playoff game is a chapter in someone&apos;s legacy.</> },
  ];

  return (
    <div className="tab-content active">
      <section className="section">
        <p className="section-tag">Vocabulary</p>
        <h2 className="section-heading">Game day words worth knowing</h2>
        <p className="section-prose">
          These nouns appear in great sports writing. Understanding them deeply changes how you use them — and how
          your readers feel them.
        </p>
      </section>

      <div className="vocab-grid">
        {vocab.map((v) => (
          <div key={v.word} className="vocab-card">
            <span className="vocab-pos">{v.pos}</span>
            <p className="vocab-word">{v.word}</p>
            <p className="vocab-def">{v.def}</p>
          </div>
        ))}
      </div>

      <div className="quote-block">
        <p className="quote-text">
          &ldquo;A writer who understands that <em>momentum</em> and <em>tenacity</em> are nouns — names of invisible
          forces — will use them with far more power than one who treats them as decorations.&rdquo;
        </p>
        <p className="quote-attr">In the spirit of Michael Clay Thompson</p>
      </div>

      <section className="section" style={{ marginTop: 24 }}>
        <h2 className="section-heading" style={{ fontSize: 19 }}>Try it: use one in a sentence</h2>
        <p className="section-prose" style={{ fontSize: 15 }}>
          Pick any vocabulary word above and write a sentence about the NBA playoffs using it as a noun.
        </p>
        <DraftTextarea
          fieldPath="v.sentence"
          placeholder="Example: The tenacity of the point guard kept his team alive in the fourth quarter..."
          bare
        />
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   DRAFT TEXTAREA — autosaves on blur via DraftProvider
───────────────────────────────────────────────────────── */
function DraftTextarea({
  fieldPath,
  prompt,
  label,
  placeholder,
  bare,
}: {
  fieldPath: string;
  prompt?: string;
  label?: string;
  placeholder: string;
  bare?: boolean;
}) {
  const { value, setValue, flush, status } = useDraftField(fieldPath);

  const inner = (
    <>
      {prompt && <p className="prompt-q">{prompt}</p>}
      {label && <div className="writing-label">{label}</div>}
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={flush}
      />
      <div className="save-row">
        {status === "saving" && "saving…"}
        {status === "saved" && "✓ saved"}
        {status === "error" && "couldn't save — Dad will check"}
      </div>
    </>
  );

  if (bare) return <div className="writing-prompt bare">{inner}</div>;
  return <div className="writing-prompt">{inner}</div>;
}

/* ─────────────────────────────────────────────────────────
   FONTS — load Playfair + Source Sans 3 once on mount
───────────────────────────────────────────────────────── */
function Fonts() {
  useEffect(() => {
    const id = "mct-grammar-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@300;400;600&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
}

/* ─────────────────────────────────────────────────────────
   SCOPED STYLES — kept verbose on purpose so each lesson is
   self-contained and easy to fork. styled-jsx auto-scopes to
   .mct-root.
───────────────────────────────────────────────────────── */
function ScopedStyles() {
  return (
    <style jsx global>{`
      .mct-root {
        --mct-bg: #f7f5f0;
        --mct-surface: #ffffff;
        --mct-surface2: #f0ede6;
        --mct-border: rgba(0,0,0,0.10);
        --mct-border-mid: rgba(0,0,0,0.18);
        --mct-text: #1a1a18;
        --mct-text-2: #5a5a55;
        --mct-text-3: #8a8a80;
        --mct-green: #4a7c2a;
        --mct-green-bg: #eaf3de;
        --mct-green-dark: #27500a;
        --mct-blue-bg: #e6f1fb;
        --mct-blue-dark: #0c447c;
        --mct-purple: #534ab7;
        --mct-red-bg: #fcebeb;
        --mct-red-dark: #791f1f;
        --mct-radius-sm: 6px;
        --mct-radius-md: 10px;
        --mct-radius-lg: 14px;
        --mct-shadow: 0 2px 12px rgba(0,0,0,0.07);

        background: var(--mct-bg);
        color: var(--mct-text);
        font-family: 'Source Sans 3', sans-serif;
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
      }
      .mct-root * { box-sizing: border-box; }

      .mct-root .hero {
        background: var(--mct-surface);
        border-bottom: 1px solid var(--mct-border);
        padding: 3rem 1.5rem 2.5rem;
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .mct-root .hero::before {
        content: ''; position: absolute; inset: 0;
        background: repeating-linear-gradient(-45deg, transparent, transparent 28px, rgba(74,124,42,0.04) 28px, rgba(74,124,42,0.04) 30px);
        pointer-events: none;
      }
      .mct-root .hero-inner { position: relative; z-index: 1; }
      .mct-root .hero-badge {
        display: inline-block; font-size: 11px; letter-spacing: 0.12em;
        text-transform: uppercase; color: var(--mct-green);
        border: 1px solid var(--mct-green); padding: 3px 12px; border-radius: 20px;
        margin-bottom: 1rem; font-weight: 600;
      }
      .mct-root .hero-title {
        font-family: 'Playfair Display', serif; font-size: clamp(28px, 5vw, 44px);
        font-weight: 600; line-height: 1.15; margin-bottom: 0.75rem;
      }
      .mct-root .hero-subtitle {
        font-size: 16px; color: var(--mct-text-2); max-width: 560px;
        margin: 0 auto 1.5rem; line-height: 1.6;
      }
      .mct-root .hero-court {
        display: inline-flex; align-items: center; gap: 8px;
        background: var(--mct-green-bg); border-radius: 30px;
        padding: 6px 16px; font-size: 13px; color: var(--mct-green-dark); font-weight: 600;
      }
      .mct-root .court-dot { width: 8px; height: 8px; background: var(--mct-green); border-radius: 50%; }

      .mct-root .crumb { max-width: 820px; margin: 0 auto; padding: 14px 1.5rem 0; font-size: 13px; color: var(--mct-text-3); }
      .mct-root .crumb a { color: var(--mct-green); font-weight: 600; text-decoration: none; }
      .mct-root .crumb a:hover { color: var(--mct-green-dark); }

      .mct-root .page-body { max-width: 820px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

      .mct-root .tab-nav {
        display: flex; border-bottom: 1.5px solid var(--mct-border-mid);
        margin-bottom: 2rem; overflow-x: auto; -webkit-overflow-scrolling: touch;
      }
      .mct-root .tab-btn {
        background: none; border: none; border-bottom: 3px solid transparent;
        margin-bottom: -1.5px; padding: 12px 20px;
        font-size: 14px; font-weight: 600; font-family: 'Source Sans 3', sans-serif;
        cursor: pointer; color: var(--mct-text-3); white-space: nowrap;
        transition: color 0.18s, border-color 0.18s; letter-spacing: 0.02em;
      }
      .mct-root .tab-btn:hover { color: var(--mct-text); }
      .mct-root .tab-btn.active { color: var(--mct-green); border-bottom-color: var(--mct-green); }

      .mct-root .tab-content { animation: mctFadeIn 0.22s ease; }
      @keyframes mctFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

      .mct-root .section { margin-bottom: 2.5rem; }
      .mct-root .section-tag {
        font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
        color: var(--mct-text-3); font-weight: 600;
        margin-bottom: 6px; display: flex; align-items: center; gap: 8px;
      }
      .mct-root .section-tag::before { content: ''; display: block; width: 20px; height: 2px; background: var(--mct-green); border-radius: 1px; }
      .mct-root .section-heading {
        font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 400;
        line-height: 1.25; margin-bottom: 1rem;
      }
      .mct-root .section-prose {
        font-size: 16px; line-height: 1.75; color: var(--mct-text); margin-bottom: 1.25rem;
      }
      .mct-root .section-prose em { font-style: italic; }
      .mct-root .section-prose strong { font-weight: 600; }

      .mct-root .definition-card {
        background: var(--mct-surface); border: 1px solid var(--mct-border);
        border-left: 4px solid var(--mct-green); border-radius: var(--mct-radius-md);
        padding: 1.25rem 1.5rem; margin-bottom: 1.25rem; box-shadow: var(--mct-shadow);
      }
      .mct-root .definition-card .main-def {
        font-family: 'Playfair Display', serif; font-size: 18px; line-height: 1.5; margin-bottom: 0.75rem;
      }
      .mct-root .definition-card .example-line { font-size: 15px; color: var(--mct-text-2); line-height: 1.7; }

      .mct-root .noun-hl { background: var(--mct-green-bg); color: var(--mct-green-dark); padding: 1px 7px; border-radius: 4px; font-weight: 600; }
      .mct-root .verb-hl { background: var(--mct-blue-bg); color: var(--mct-blue-dark); padding: 1px 7px; border-radius: 4px; font-weight: 600; }

      .mct-root .four-types { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 1.25rem; }
      @media (max-width: 540px) { .mct-root .four-types { grid-template-columns: 1fr; } }
      .mct-root .type-card {
        background: var(--mct-surface); border: 1px solid var(--mct-border);
        border-radius: var(--mct-radius-md); padding: 1.1rem 1.25rem;
        box-shadow: var(--mct-shadow); transition: transform 0.15s;
      }
      .mct-root .type-card:hover { transform: translateY(-2px); }
      .mct-root .type-icon { font-size: 22px; margin-bottom: 6px; }
      .mct-root .type-name { font-size: 14px; font-weight: 600; margin-bottom: 5px; }
      .mct-root .type-name.person { color: var(--mct-green-dark); }
      .mct-root .type-name.place { color: var(--mct-blue-dark); }
      .mct-root .type-name.thing { color: #7c2856; }
      .mct-root .type-name.idea { color: var(--mct-purple); }
      .mct-root .type-examples { font-size: 13px; color: var(--mct-text-2); line-height: 1.55; }

      .mct-root .sentence-box {
        background: var(--mct-surface2); border-radius: var(--mct-radius-md);
        padding: 1rem 1.25rem; margin-bottom: 0.75rem;
        font-size: 15px; line-height: 1.75; border: 1px solid var(--mct-border);
      }
      .mct-root .sent-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--mct-text-3); font-weight: 600; margin-bottom: 5px; }

      .mct-root .quote-block { border-left: 3px solid var(--mct-border-mid); padding: 0.75rem 1.25rem; margin: 1.25rem 0; }
      .mct-root .quote-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 18px; line-height: 1.6; margin-bottom: 0.4rem; }
      .mct-root .quote-attr { font-size: 12px; color: var(--mct-text-3); }

      .mct-root .progress-wrap { margin-bottom: 2rem; }
      .mct-root .progress-labels { display: flex; justify-content: space-between; font-size: 12px; color: var(--mct-text-3); margin-bottom: 6px; font-weight: 600; }
      .mct-root .progress-track { height: 5px; background: var(--mct-border); border-radius: 3px; overflow: hidden; }
      .mct-root .progress-fill { height: 100%; background: var(--mct-green); border-radius: 3px; transition: width 0.5s cubic-bezier(.4,0,.2,1); }

      .mct-root .exercise-card {
        background: var(--mct-surface); border: 1px solid var(--mct-border);
        border-radius: var(--mct-radius-lg); overflow: hidden;
        margin-bottom: 1.75rem; box-shadow: var(--mct-shadow);
      }
      .mct-root .exercise-header {
        background: var(--mct-surface2); border-bottom: 1px solid var(--mct-border);
        padding: 0.9rem 1.5rem; display: flex; justify-content: space-between;
        align-items: center; gap: 1rem;
      }
      .mct-root .exercise-title { font-size: 15px; font-weight: 600; }
      .mct-root .exercise-subtitle { font-size: 12px; color: var(--mct-text-3); }
      .mct-root .exercise-body { padding: 1.5rem; }

      .mct-root .q-item { margin-bottom: 1.5rem; }
      .mct-root .q-item:last-of-type { margin-bottom: 0; }
      .mct-root .q-text { font-size: 15px; line-height: 1.6; margin-bottom: 8px; }
      .mct-root .q-input {
        font-family: 'Source Sans 3', sans-serif; font-size: 14px;
        padding: 8px 12px; border: 1px solid var(--mct-border-mid);
        border-radius: var(--mct-radius-sm); background: var(--mct-bg); color: var(--mct-text);
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .mct-root .q-input:focus { outline: none; border-color: var(--mct-green); box-shadow: 0 0 0 3px rgba(74,124,42,0.12); }
      .mct-root select.q-input { cursor: pointer; min-width: 180px; }
      .mct-root input.q-input { min-width: 240px; max-width: 100%; }
      .mct-root .q-feedback { font-size: 13px; margin-top: 7px; padding: 7px 12px; border-radius: var(--mct-radius-sm); font-weight: 500; }
      .mct-root .q-feedback.correct { background: var(--mct-green-bg); color: var(--mct-green-dark); }
      .mct-root .q-feedback.wrong { background: var(--mct-red-bg); color: var(--mct-red-dark); }

      .mct-root .btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 9px 18px; border-radius: var(--mct-radius-sm);
        font-family: 'Source Sans 3', sans-serif; font-size: 14px; font-weight: 600;
        cursor: pointer; border: none; transition: background 0.15s, transform 0.1s;
      }
      .mct-root .btn:active { transform: scale(0.98); }
      .mct-root .btn-primary { background: var(--mct-green); color: #fff; }
      .mct-root .btn-primary:hover { background: var(--mct-green-dark); }
      .mct-root .btn-primary:disabled { background: #b1c79c; cursor: not-allowed; }
      .mct-root .btn-ghost { background: var(--mct-surface2); color: var(--mct-text); border: 1px solid var(--mct-border-mid); }
      .mct-root .btn-ghost:hover { background: var(--mct-border); }
      .mct-root .btn-row { display: flex; gap: 10px; margin-top: 1.25rem; flex-wrap: wrap; }

      .mct-root .id-sentence {
        background: var(--mct-surface2); border: 1px solid var(--mct-border);
        border-radius: var(--mct-radius-md); padding: 1.25rem 1.5rem;
        margin-bottom: 1rem; font-size: 17px; line-height: 2.2;
      }
      .mct-root .word-chip {
        display: inline-block; padding: 3px 10px; border-radius: 18px;
        cursor: pointer; border: 1.5px solid transparent; font-size: 17px;
        transition: background 0.15s, border-color 0.15s; user-select: none;
        margin: 0 2px;
      }
      .mct-root .word-chip:hover { background: var(--mct-surface); border-color: var(--mct-border-mid); }
      .mct-root .word-chip.selected { background: var(--mct-green-bg); border-color: var(--mct-green); color: var(--mct-green-dark); font-weight: 600; }
      .mct-root .id-result { font-size: 14px; color: var(--mct-text-2); min-height: 22px; margin-top: 0.5rem; font-weight: 500; }

      .mct-root .writing-prompt {
        background: var(--mct-surface); border: 1px solid var(--mct-border);
        border-radius: var(--mct-radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;
        box-shadow: var(--mct-shadow);
      }
      .mct-root .writing-prompt.bare { padding: 0; background: transparent; border: 0; box-shadow: none; }
      .mct-root .prompt-q {
        font-family: 'Playfair Display', serif; font-style: italic;
        font-size: 17px; line-height: 1.6; margin-bottom: 1.25rem; color: var(--mct-text);
      }
      .mct-root .writing-label {
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;
        color: var(--mct-text-3); font-weight: 600; margin-bottom: 6px; margin-top: 1rem;
      }
      .mct-root .writing-prompt textarea {
        width: 100%; min-height: 100px; resize: vertical;
        background: var(--mct-bg); border: 1px solid var(--mct-border-mid);
        border-radius: var(--mct-radius-sm); padding: 0.85rem 1rem;
        font-family: 'Source Sans 3', sans-serif; font-size: 15px; line-height: 1.65; color: var(--mct-text);
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .mct-root .writing-prompt textarea:focus { outline: none; border-color: var(--mct-green); box-shadow: 0 0 0 3px rgba(74,124,42,0.12); }
      .mct-root .save-row { font-size: 11px; color: var(--mct-green); margin-top: 6px; min-height: 14px; font-weight: 600; }

      .mct-root .vocab-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
      .mct-root .vocab-card {
        background: var(--mct-surface); border: 1px solid var(--mct-border);
        border-radius: var(--mct-radius-md); padding: 1.1rem 1.25rem;
        box-shadow: var(--mct-shadow); transition: transform 0.15s;
      }
      .mct-root .vocab-card:hover { transform: translateY(-2px); }
      .mct-root .vocab-pos { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; background: var(--mct-green-bg); color: var(--mct-green); padding: 2px 8px; border-radius: 10px; font-weight: 600; display: inline-block; margin-bottom: 6px; }
      .mct-root .vocab-word { font-size: 17px; font-weight: 600; margin-bottom: 6px; }
      .mct-root .vocab-def { font-size: 13px; color: var(--mct-text-2); line-height: 1.55; }
      .mct-root .vocab-def em { font-style: italic; }

      .mct-root .ex-result { margin-top: 1rem; font-size: 14px; color: var(--mct-text-2); font-weight: 500; min-height: 22px; }

      .mct-root .submit-footer {
        margin-top: 3rem; padding: 1.5rem; border-top: 1px solid var(--mct-border);
        display: flex; flex-direction: column; gap: 10px; align-items: flex-start;
      }
      .mct-root .submit-status { font-size: 13px; color: var(--mct-text-2); font-style: italic; font-family: 'Playfair Display', serif; }
      .mct-root .submit-error { font-size: 13px; color: var(--mct-red-dark); background: var(--mct-red-bg); padding: 8px 12px; border-radius: var(--mct-radius-sm); }
      @media (min-width: 600px) { .mct-root .submit-footer { flex-direction: row; align-items: center; justify-content: space-between; } }

      .mct-root .footer {
        text-align: center; padding: 2.5rem 1rem;
        border-top: 1px solid var(--mct-border); font-size: 13px;
        color: var(--mct-text-3); margin-top: 2rem;
      }
      .mct-root .footer strong { color: var(--mct-text-2); }
    `}</style>
  );
}
