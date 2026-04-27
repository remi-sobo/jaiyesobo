"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type DraftMap = Record<string, string>;

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type Ctx = {
  taskId: string;
  drafts: DraftMap;
  loaded: boolean;
  /** Persist to server immediately. Updates the in-memory map. */
  saveField: (fieldPath: string, value: string) => Promise<boolean>;
};

const DraftContext = createContext<Ctx | null>(null);

export function DraftProvider({
  taskId,
  children,
}: {
  taskId: string;
  children: React.ReactNode;
}) {
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lessons/draft/load?taskId=${encodeURIComponent(taskId)}`);
        if (!res.ok) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const payload = await res.json();
        if (!cancelled) {
          setDrafts(payload?.drafts ?? {});
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const saveField = useCallback(
    async (fieldPath: string, value: string): Promise<boolean> => {
      setDrafts((d) => ({ ...d, [fieldPath]: value }));
      try {
        const res = await fetch("/api/lessons/draft/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, fieldPath, value }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [taskId]
  );

  return (
    <DraftContext.Provider value={{ taskId, drafts, loaded, saveField }}>
      {children}
    </DraftContext.Provider>
  );
}

export function useAllDrafts(): DraftMap {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useAllDrafts must be inside <DraftProvider>");
  return ctx.drafts;
}

export function useDraftLoaded(): boolean {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraftLoaded must be inside <DraftProvider>");
  return ctx.loaded;
}

const DEBOUNCE_MS = 600;

export function useDraftField(fieldPath: string) {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraftField must be inside <DraftProvider>");

  // Local mirror for immediate keystroke responsiveness; synced on debounce + on initial load.
  const [value, setValueInternal] = useState<string>(ctx.drafts[fieldPath] ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const initialised = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When the context finishes loading, hydrate this field once.
  useEffect(() => {
    if (!ctx.loaded || initialised.current) return;
    const stored = ctx.drafts[fieldPath];
    if (typeof stored === "string") {
      setValueInternal(stored);
      if (stored.length > 0) {
        setStatus("saved");
        setSavedAt(new Date());
      }
    }
    initialised.current = true;
  }, [ctx.loaded, ctx.drafts, fieldPath]);

  const persist = useCallback(
    async (val: string) => {
      setStatus("saving");
      const ok = await ctx.saveField(fieldPath, val);
      if (ok) {
        setStatus("saved");
        setSavedAt(new Date());
      } else {
        setStatus("error");
      }
    },
    [ctx, fieldPath]
  );

  const setValue = useCallback(
    (next: string) => {
      setValueInternal(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => persist(next), DEBOUNCE_MS);
    },
    [persist]
  );

  /** Force-flush any pending debounced save (e.g. on blur or before navigating). */
  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      persist(value);
    }
  }, [persist, value]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return { value, setValue, flush, status, savedAt };
}
