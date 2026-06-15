"use client";

import Link from "next/link";
import { type User } from "@supabase/supabase-js";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from "react";
import {
    CATEGORY_OPTIONS,
    type DaytillEvent,
    type EventCategory,
    buildCalendarUrl,
    buildIcsDocument,
    buildShareUrl,
    createTargetDate,
    encodeEventPayload,
    formatCountdown,
    isEventExpired,
    loadEvents,
    sortEvents,
    summarizeCountdown,
} from "@/lib/daytill";
import {
    eventToRow,
    getUserIsPro,
    getSupabaseBrowserClient,
    rowToEvent,
    type EventRow,
} from "@/lib/supabase";
import { EventCard } from "@/components/event-card";
import { StatCard } from "@/components/stat-card";
import { ProBadge, UpgradeGate } from "@/components/upgrade-gate";

// ─── Types ───────────────────────────────────────────────────────────────────

type DraftState = {
    title: string;
    date: string;
    time: string;
    category: EventCategory;
    recurringYearly: boolean;
    emailReminder: string;
    reminder7Days: boolean;
    reminder1Day: boolean;
    reminderDayOf: boolean;
};

type Toast = { id: string; message: string; type: "info" | "error" };

type Theme = "default" | "rose" | "ocean" | "forest" | "violet" | "midnight";

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "daytill.events.v1";
const NOTIFIED_KEY = "daytill.notifications.v1";
const THEME_KEY = "daytill.appearance";

const THEMES: { id: Theme; label: string; swatch: string }[] = [
    { id: "default", label: "Default", swatch: "bg-hairline" },
    { id: "rose", label: "Rose", swatch: "bg-[#fb7185]" },
    { id: "ocean", label: "Ocean", swatch: "bg-[#06b6d4]" },
    { id: "forest", label: "Forest", swatch: "bg-[#22c55e]" },
    { id: "violet", label: "Violet", swatch: "bg-[#8b5cf6]" },
    { id: "midnight", label: "Midnight", swatch: "bg-[#6366f1]" },
];

const DEFAULT_DRAFT: DraftState = {
    title: "",
    date: "",
    time: "",
    category: "Personal",
    recurringYearly: false,
    emailReminder: "",
    reminder7Days: true,
    reminder1Day: true,
    reminderDayOf: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadNotificationLog() {
    if (typeof window === "undefined") return new Set<string>();
    try {
        return new Set<string>(
            JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) || "[]"),
        );
    } catch {
        return new Set<string>();
    }
}

function saveNotificationLog(log: Set<string>) {
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(log)));
}

function draftToReminders(draft: DraftState) {
    const r: number[] = [];
    if (draft.reminder7Days) r.push(7);
    if (draft.reminder1Day) r.push(1);
    if (draft.reminderDayOf) r.push(0);
    return r;
}

function saveLocalEvents(events: DaytillEvent[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function eventToDraft(event: DaytillEvent): DraftState {
    return {
        title: event.title,
        date: event.date,
        time: event.time ?? "",
        category: event.category,
        recurringYearly: event.recurringYearly,
        emailReminder: event.emailReminder ?? "",
        reminder7Days: event.reminders.includes(7),
        reminder1Day: event.reminders.includes(1),
        reminderDayOf: event.reminders.includes(0),
    };
}

function applyTheme(theme: Theme) {
    const html = document.documentElement;
    for (const t of THEMES) html.classList.remove(`theme-${t.id}`);
    if (theme !== "default") html.classList.add(`theme-${theme}`);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DaytillApp() {
    const supabase = getSupabaseBrowserClient();

    const [events, setEvents] = useState<DaytillEvent[]>([]);
    const [draft, setDraft] = useState<DraftState>(DEFAULT_DRAFT);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState<EventCategory | "All">(
        "All",
    );
    const [now, setNow] = useState(() => Date.now());
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [notificationLog, setNotificationLog] = useState<Set<string>>(
        () => new Set(),
    );
    const [notificationPermission, setNotificationPermission] =
        useState<NotificationPermission>("default");
    const [canUseNotifications, setCanUseNotifications] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isPro, setIsPro] = useState(false);
    const [eventsLoaded, setEventsLoaded] = useState(false);
    const [appearance, setAppearance] = useState<Theme>("default");

    const formRef = useRef<HTMLDivElement>(null);

    // ─── Toast helpers ────────────────────────────────────────────────────────

    const toast = useCallback(
        (message: string, type: Toast["type"] = "info") => {
            const id = crypto.randomUUID();
            setToasts((prev) => [...prev, { id, message, type }]);
            setTimeout(
                () => setToasts((prev) => prev.filter((t) => t.id !== id)),
                4000,
            );
        },
        [],
    );

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // ─── Boot ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        setNotificationLog(loadNotificationLog());
        if (typeof window === "undefined") return;
        setNotificationPermission(
            "Notification" in window ? Notification.permission : "denied",
        );
        setCanUseNotifications("Notification" in window);
        // Restore saved appearance (Pro theme persists in localStorage)
        const saved = window.localStorage.getItem(THEME_KEY) as Theme | null;
        if (saved && THEMES.some((t) => t.id === saved)) {
            setAppearance(saved);
            applyTheme(saved);
        }
    }, []);

    // ─── Auth + plan + cloud sync ─────────────────────────────────────────────
    //
    // Model: plan is checked FIRST, then we decide what to do with events.
    //
    // Free + signed-in  → stay on localStorage, never touch Supabase events table.
    // Pro + signed-in   → check cloud; if empty AND we have local events, migrate
    //                     them to cloud (one-time), then show merged result.
    //                     If cloud already has events, show cloud only.

    useEffect(() => {
        const client = supabase;
        if (!client) {
            setEvents(loadEvents(STORAGE_KEY));
            setEventsLoaded(true);
            return;
        }

        const c = client;
        let mounted = true;

        async function syncForProUser(userId: string) {
            const { data, error } = await c
                .from("events")
                .select("*")
                .eq("user_id", userId);

            if (!mounted) return;

            if (error) {
                toast("Could not load cloud events — showing local data.", "error");
                setEvents(loadEvents(STORAGE_KEY));
                setEventsLoaded(true);
                return;
            }

            const cloudEvents = ((data ?? []) as EventRow[]).map(rowToEvent);

            // Cloud is empty but local has events → migrate local → cloud
            const localEvents = loadEvents(STORAGE_KEY);
            if (cloudEvents.length === 0 && localEvents.length > 0) {
                const rows = localEvents.map((e) => eventToRow(userId, e));
                const { error: upsertError } = await c.from("events").upsert(rows);
                if (!mounted) return;
                if (upsertError) {
                    toast("Migration to cloud failed — keeping local events.", "error");
                    setEvents(sortEvents(localEvents, Date.now()));
                } else {
                    toast(`Migrated ${localEvents.length} local event${localEvents.length === 1 ? "" : "s"} to your Pro account.`);
                    setEvents(sortEvents(localEvents, Date.now()));
                    // Clear local copy now that cloud is authoritative
                    saveLocalEvents([]);
                }
            } else {
                setEvents(sortEvents(cloudEvents, Date.now()));
            }

            setEventsLoaded(true);
        }

        async function init() {
            const { data: { session } } = await c.auth.getSession();
            if (!mounted) return;
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);

            if (!sessionUser) {
                setEvents(loadEvents(STORAGE_KEY));
                setEventsLoaded(true);
                setIsPro(false);
                return;
            }

            // Check plan before deciding where events come from
            const pro = await getUserIsPro(c, sessionUser.id);
            if (!mounted) return;
            setIsPro(pro);

            if (pro) {
                await syncForProUser(sessionUser.id);
            } else {
                // Signed in but free — use local storage
                setEvents(loadEvents(STORAGE_KEY));
                setEventsLoaded(true);
            }
        }

        void init();

        const { data: { subscription } } = c.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);

            if (!sessionUser) {
                setEvents(loadEvents(STORAGE_KEY));
                setEventsLoaded(true);
                setIsPro(false);
                setAppearance("default");
                applyTheme("default");
                return;
            }

            // Re-check plan on every auth event (covers the free→pro upgrade moment)
            void (async () => {
                const pro = await getUserIsPro(c, sessionUser.id);
                if (!mounted) return;
                setIsPro(pro);
                if (pro) {
                    await syncForProUser(sessionUser.id);
                } else {
                    setEvents(loadEvents(STORAGE_KEY));
                    setEventsLoaded(true);
                }
            })();
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase]);

    // ─── Persist to localStorage (local-only mode) ────────────────────────────

    useEffect(() => {
        if (typeof window === "undefined" || !eventsLoaded || user) return;
        saveLocalEvents(events);
    }, [events, eventsLoaded, user]);

    // ─── Live clock ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (typeof window === "undefined") return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    // ─── Browser notifications ────────────────────────────────────────────────

    useEffect(() => {
        if (typeof window === "undefined" || !("Notification" in window))
            return;
        if (Notification.permission !== "granted") return;

        const nextLog = new Set(notificationLog);
        for (const event of events) {
            const targetDate = createTargetDate(event);
            for (const days of event.reminders) {
                const reminderAt = new Date(
                    targetDate.getTime() - days * 86400000,
                );
                const key = `${event.id}:${targetDate.toISOString().slice(0, 10)}:${days}`;
                if (
                    now >= reminderAt.getTime() &&
                    now < targetDate.getTime() &&
                    !nextLog.has(key)
                ) {
                    const label =
                        days === 0
                            ? "today"
                            : `${days} day${days === 1 ? "" : "s"} away`;
                    new Notification(`Daytill: ${event.title}`, {
                        body: `Your ${event.category.toLowerCase()} is ${label}.`,
                    });
                    nextLog.add(key);
                }
            }
        }
        if (nextLog.size !== notificationLog.size) {
            setNotificationLog(nextLog);
            saveNotificationLog(nextLog);
        }
    }, [events, notificationLog, now]);

    // ─── Derived ─────────────────────────────────────────────────────────────

    const sortedEvents = useMemo(() => sortEvents(events, now), [events, now]);
    const filteredEvents = useMemo(
        () =>
            filterCategory === "All"
                ? sortedEvents
                : sortedEvents.filter((e) => e.category === filterCategory),
        [sortedEvents, filterCategory],
    );
    const nextUpcoming =
        sortedEvents.find((e) => !isEventExpired(e, now)) ?? sortedEvents[0];

    // ─── Handlers ─────────────────────────────────────────────────────────────

    function updateDraft<K extends keyof DraftState>(k: K, v: DraftState[K]) {
        setDraft((c) => ({ ...c, [k]: v }));
    }

    function startEdit(event: DaytillEvent) {
        setEditingId(event.id);
        setDraft(eventToDraft(event));
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function cancelEdit() {
        setEditingId(null);
        setDraft(DEFAULT_DRAFT);
    }

    function handleAppearanceChange(theme: Theme) {
        if (!isPro && theme !== "default") {
            toast("Themes are a Pro feature.", "error");
            return;
        }
        setAppearance(theme);
        applyTheme(theme);
        window.localStorage.setItem(THEME_KEY, theme);
    }

    async function enableNotifications() {
        if (!("Notification" in window)) {
            toast("This browser does not support notifications.", "error");
            return;
        }
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        setCanUseNotifications(true);
        toast(
            permission === "granted"
                ? "Browser notifications enabled."
                : "Notifications remain off.",
        );
    }

    async function handleSaveEvent() {
        if (!draft.title.trim() || !draft.date) {
            toast("Add a title and date first.", "error");
            return;
        }

        // Cloud sync is Pro-only — free users save locally regardless of sign-in
        const saveToCloud = isPro && !!user && !!supabase;

        const reminders = draftToReminders(draft);

        if (editingId) {
            const existing = events.find((e) => e.id === editingId);
            if (!existing) return;

            const updated: DaytillEvent = {
                ...existing,
                title: draft.title.trim(),
                date: draft.date,
                time: draft.time || undefined,
                category: draft.category,
                recurringYearly: draft.recurringYearly,
                reminders,
                emailReminder: isPro
                    ? draft.emailReminder.trim() || undefined
                    : undefined,
            };

            if (saveToCloud) {
                const { error } = await supabase!
                    .from("events")
                    .update(eventToRow(user!.id, updated))
                    .eq("id", updated.id)
                    .eq("user_id", user!.id);
                if (error) {
                    toast(`Cloud update failed: ${error.message}`, "error");
                    return;
                }
            }

            setEvents((prev) =>
                prev.map((e) => (e.id === editingId ? updated : e)),
            );
            setEditingId(null);
            setDraft(DEFAULT_DRAFT);
            toast(`Updated "${updated.title}".`);
            return;
        }

        const event: DaytillEvent = {
            id: crypto.randomUUID(),
            title: draft.title.trim(),
            date: draft.date,
            time: draft.time || undefined,
            category: draft.category,
            recurringYearly: draft.recurringYearly,
            reminders,
            emailReminder: isPro
                ? draft.emailReminder.trim() || undefined
                : undefined,
            createdAt: new Date().toISOString(),
        };

        if (saveToCloud) {
            const { error } = await supabase!
                .from("events")
                .upsert(eventToRow(user!.id, event));
            if (error) {
                toast(
                    `Cloud save failed: ${error.message} — saved locally.`,
                    "error",
                );
                setEvents((prev) => {
                    const next = [...prev, event];
                    saveLocalEvents(next);
                    return next;
                });
                setDraft({ ...DEFAULT_DRAFT, category: draft.category });
                return;
            }
        }

        setEvents((prev) => [...prev, event]);
        setDraft({ ...DEFAULT_DRAFT, category: draft.category });
        toast(`Added "${event.title}".`);
    }

    async function handleDeleteEvent(id: string) {
        const saveToCloud = isPro && !!user && !!supabase;
        if (saveToCloud) {
            const { error } = await supabase!
                .from("events")
                .delete()
                .eq("id", id)
                .eq("user_id", user!.id);
            if (error) {
                toast(`Delete failed: ${error.message}`, "error");
                return;
            }
        }
        if (editingId === id) cancelEdit();
        setEvents((prev) => {
            const next = prev.filter((e) => e.id !== id);
            if (!saveToCloud) saveLocalEvents(next);
            return next;
        });
        toast("Event removed.");
    }

    async function copyShareUrl(event: DaytillEvent) {
        try {
            const res = await fetch("/api/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(event),
            });
            if (res.ok) {
                const { shareId } = (await res.json()) as { shareId: string };
                await window.navigator.clipboard.writeText(
                    `${window.location.origin}/event/${shareId}`,
                );
                toast("Share link copied.");
                return;
            }
        } catch {
            /* fall through */
        }
        await window.navigator.clipboard.writeText(
            buildShareUrl(event, window.location.origin),
        );
        toast("Share link copied.");
    }

    async function exportIcs(event: DaytillEvent) {
        const targetDate = createTargetDate(event);
        const blob = new Blob([buildIcsDocument(event, targetDate)], {
            type: "text/calendar;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "event"}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        toast("Calendar file downloaded.");
    }

    function openCalendarLink(event: DaytillEvent) {
        window.open(buildCalendarUrl(event), "_blank", "noopener,noreferrer");
        toast("Google Calendar opened.");
    }

    function openSharedPage(event: DaytillEvent) {
        window.location.assign(
            `/event/${event.id}?payload=${encodeEventPayload(event)}`,
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <main className="relative min-h-screen overflow-hidden bg-page text-ink">
            {/* Background mesh */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="mesh-gradient absolute -top-40 left-1/2 h-112 w-xl -translate-x-1/2 rounded-full blur-3xl" />
                <div className="mesh-orb mesh-orb-a absolute left-[10%] top-72 h-40 w-40 rounded-full blur-3xl" />
                <div className="mesh-orb mesh-orb-b absolute right-[8%] top-128 h-56 w-56 rounded-full blur-3xl" />
                <div className="noise-layer absolute inset-0 opacity-[0.04]" />
            </div>

            {/* Toast stack */}
            <div
                aria-live="polite"
                className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm ${
                            t.type === "error"
                                ? "border-error/30 bg-error-soft text-error-deep"
                                : "border-hairline bg-surface/95 text-ink"
                        }`}
                    >
                        <span className="max-w-xs">{t.message}</span>
                        <button
                            type="button"
                            onClick={() => dismissToast(t.id)}
                            aria-label="Dismiss"
                            className="mt-0.5 shrink-0 text-mute hover:text-ink"
                        >
                            <svg
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="h-3 w-3"
                            >
                                <path
                                    d="M1 1l10 10M11 1L1 11"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            <section className="relative mx-auto flex w-full max-w-350 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* ── Hero panel ── */}
                <section className="glass-panel rounded-card p-5 shadow-card lg:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 text-[12px] font-medium tracking-[0.2em] text-body uppercase shadow-[0_1px_0_rgba(0,0,0,0.03)]">
                                <span className="h-2 w-2 rounded-full bg-link" />
                                Live countdowns
                                {isPro && (
                                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
                                        Pro
                                    </span>
                                )}
                            </div>
                            <h1 className="max-w-3xl text-4xl font-semibold tracking-tighter text-ink sm:text-5xl lg:text-6xl">
                                Track the moments that matter.
                            </h1>
                            <p className="max-w-2xl text-base leading-7 text-body sm:text-lg">
                                Create countdowns for exams, birthdays, trips,
                                deadlines, and anniversaries. Local-first,
                                updates every second, shareable with one link.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={enableNotifications}
                            disabled={!canUseNotifications}
                            title={
                                notificationPermission === "granted"
                                    ? "Reminders active"
                                    : "Enable browser reminders"
                            }
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${
                                notificationPermission === "granted"
                                    ? "border-link/30 bg-link/10 text-link hover:border-link/50"
                                    : "border-hairline bg-surface text-body hover:border-hairline-strong hover:text-ink"
                            }`}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "20px" }}
                                aria-hidden="true"
                            >
                                {notificationPermission === "granted"
                                    ? "notifications_active"
                                    : "notifications"}
                            </span>
                        </button>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <StatCard
                            label="Saved events"
                            value={String(events.length).padStart(2, "0")}
                            detail={
                                isPro && user
                                    ? `Synced · ${user.email ?? "account"}`
                                    : "Local browser storage"
                            }
                        />
                        <StatCard
                            label="Next event"
                            value={
                                nextUpcoming
                                    ? formatCountdown(
                                          createTargetDate(nextUpcoming),
                                          now,
                                      ).days + "d"
                                    : "—"
                            }
                            detail={
                                nextUpcoming
                                    ? nextUpcoming.title
                                    : "No upcoming event"
                            }
                        />
                        <StatCard
                            label="Plan"
                            value={isPro ? "Pro" : "Free"}
                            detail={
                                isPro
                                    ? "All features unlocked"
                                    : "Upgrade for sync & themes"
                            }
                        />
                    </div>

                    {/* Sign-in upsell for free/unsigned users */}
                    {!user && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-hairline bg-canvas-soft-2 px-4 py-3 text-sm text-body">
                            <span
                                className="material-symbols-outlined text-mute"
                                style={{ fontSize: "18px" }}
                            >
                                info
                            </span>
                            <span>
                                <Link
                                    href="/pricing"
                                    className="font-medium text-ink underline underline-offset-2 hover:text-link"
                                >
                                    Upgrade to Pro
                                </Link>{" "}
                                to sync events across devices and unlock themes.
                            </span>
                        </div>
                    )}
                    {user && !isPro && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-hairline bg-canvas-soft-2 px-4 py-3 text-sm text-body">
                            <span
                                className="material-symbols-outlined text-mute"
                                style={{ fontSize: "18px" }}
                            >
                                lock
                            </span>
                            <span>
                                You&apos;re signed in but on the Free plan —
                                events stay local.{" "}
                                <Link
                                    href="/pricing"
                                    className="font-medium text-ink underline underline-offset-2 hover:text-link"
                                >
                                    Upgrade to Pro
                                </Link>{" "}
                                for cloud sync and themes.
                            </span>
                        </div>
                    )}
                </section>

                {/* ── Form + Dashboard grid ── */}
                <div
                    ref={formRef}
                    id="event-form"
                    className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] scroll-mt-20"
                >
                    {/* ── Event form ── */}
                    <section className="glass-panel rounded-card p-5 shadow-card lg:p-6">
                        <div className="mb-6">
                            <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                                {editingId ? "Edit event" : "Create event"}
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">
                                {editingId
                                    ? "Update your countdown."
                                    : "Set a countdown in seconds."}
                            </h2>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-2 md:col-span-2">
                                <span className="text-sm font-medium text-body">
                                    Event title
                                </span>
                                <input
                                    value={draft.title}
                                    onChange={(e) =>
                                        updateDraft("title", e.target.value)
                                    }
                                    onKeyDown={(
                                        e: KeyboardEvent<HTMLInputElement>,
                                    ) => {
                                        if (e.key === "Enter")
                                            void handleSaveEvent();
                                    }}
                                    placeholder="Exam, birthday, trip, deadline…"
                                    className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition placeholder:text-mute focus:border-link"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="text-sm font-medium text-body">
                                    Date
                                </span>
                                <input
                                    type="date"
                                    value={draft.date}
                                    onChange={(e) =>
                                        updateDraft("date", e.target.value)
                                    }
                                    className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition focus:border-link"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="text-sm font-medium text-body">
                                    Time{" "}
                                    <span className="ml-1 font-normal text-mute">
                                        (optional)
                                    </span>
                                </span>
                                <input
                                    type="time"
                                    value={draft.time}
                                    onChange={(e) =>
                                        updateDraft("time", e.target.value)
                                    }
                                    className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition focus:border-link"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="text-sm font-medium text-body">
                                    Category
                                </span>
                                <select
                                    value={draft.category}
                                    onChange={(e) =>
                                        updateDraft(
                                            "category",
                                            e.target.value as EventCategory,
                                        )
                                    }
                                    className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition focus:border-link"
                                >
                                    {CATEGORY_OPTIONS.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {/* Email reminder — Pro only */}
                            <div className="space-y-2">
                                <span className="flex items-center gap-2 text-sm font-medium text-body">
                                    Email reminder <ProBadge />
                                </span>
                                {isPro ? (
                                    <input
                                        type="email"
                                        value={draft.emailReminder}
                                        onChange={(e) =>
                                            updateDraft(
                                                "emailReminder",
                                                e.target.value,
                                            )
                                        }
                                        placeholder="name@example.com"
                                        className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition placeholder:text-mute focus:border-link"
                                    />
                                ) : (
                                    <div className="flex h-12 items-center gap-2 rounded-[14px] border border-dashed border-hairline bg-canvas-soft-2 px-4">
                                        <span className="text-sm text-mute">
                                            Unlock with Pro
                                        </span>
                                        <Link
                                            href="/pricing"
                                            className="ml-auto text-xs font-medium text-link hover:underline"
                                        >
                                            Upgrade →
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[18px] border border-hairline bg-canvas-soft-2 p-4 md:col-span-2">
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                                    <CheckboxField
                                        checked={draft.recurringYearly}
                                        onChange={(v) =>
                                            updateDraft("recurringYearly", v)
                                        }
                                        label="Repeat yearly"
                                    />
                                    <CheckboxField
                                        checked={draft.reminder7Days}
                                        onChange={(v) =>
                                            updateDraft("reminder7Days", v)
                                        }
                                        label="7 days before"
                                    />
                                    <CheckboxField
                                        checked={draft.reminder1Day}
                                        onChange={(v) =>
                                            updateDraft("reminder1Day", v)
                                        }
                                        label="1 day before"
                                    />
                                    <CheckboxField
                                        checked={draft.reminderDayOf}
                                        onChange={(v) =>
                                            updateDraft("reminderDayOf", v)
                                        }
                                        label="On the day"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => void handleSaveEvent()}
                                className="inline-flex h-12 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary-hover"
                            >
                                {editingId ? "Save changes" : "Add countdown"}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="inline-flex h-12 items-center rounded-pill border border-hairline bg-surface px-5 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-hairline-strong"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </section>

                    {/* ── Dashboard ── */}
                    <section className="glass-panel rounded-card p-5 shadow-card lg:p-6">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                                    Dashboard
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">
                                    Upcoming events.
                                </h2>
                            </div>
                            <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-mute">
                                Live
                            </span>
                        </div>

                        {/* Category filter */}
                        <div className="mb-4 flex flex-wrap gap-1.5">
                            {(["All", ...CATEGORY_OPTIONS] as const).map(
                                (c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setFilterCategory(c)}
                                        className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                                            filterCategory === c
                                                ? "bg-ink text-primary-foreground"
                                                : "border border-hairline bg-surface text-body hover:border-hairline-strong hover:text-ink"
                                        }`}
                                    >
                                        {c}
                                    </button>
                                ),
                            )}
                        </div>

                        {filteredEvents.length === 0 ? (
                            <div className="flex min-h-80 flex-col items-center justify-center gap-1 rounded-3xl border border-dashed border-hairline bg-canvas-soft-2 p-8 text-center">
                                {events.length === 0 ? (
                                    <>
                                        <p className="text-base font-medium text-ink">
                                            Your dashboard is empty.
                                        </p>
                                        <p className="mt-2 text-sm text-body">
                                            Add an event using the form to see a
                                            live countdown card.
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-body">
                                        No{" "}
                                        <span className="font-medium text-ink">
                                            {filterCategory}
                                        </span>{" "}
                                        events yet.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredEvents.map((event) => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        now={now}
                                        isEditing={editingId === event.id}
                                        subtitle={summarizeCountdown(
                                            event,
                                            now,
                                        )}
                                        onOpen={() => openSharedPage(event)}
                                        onEdit={() => startEdit(event)}
                                        onCopy={() => void copyShareUrl(event)}
                                        onDelete={() =>
                                            void handleDeleteEvent(event.id)
                                        }
                                        onIcs={() => void exportIcs(event)}
                                        onCalendar={() =>
                                            openCalendarLink(event)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* ── Appearance (Pro) ── */}
                <section className="glass-panel rounded-card p-5 shadow-card lg:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                                Appearance <ProBadge />
                            </p>
                            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-ink">
                                Background themes.
                            </h2>
                            <p className="mt-1 text-sm text-body">
                                {isPro
                                    ? "Pick a colour tint for your page background."
                                    : "Upgrade to Pro to unlock custom themes."}
                            </p>
                        </div>
                        {!isPro && (
                            <Link
                                href="/pricing"
                                className="inline-flex h-9 items-center rounded-pill bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
                            >
                                Upgrade to Pro
                            </Link>
                        )}
                    </div>

                    <UpgradeGate
                        feature="Themes"
                        isPro={isPro}
                        isSignedIn={!!user}
                    >
                        <div className="mt-5 flex flex-wrap gap-3">
                            {THEMES.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleAppearanceChange(t.id)}
                                    title={t.label}
                                    className={`flex items-center gap-2 rounded-pill border px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${
                                        appearance === t.id
                                            ? "border-ink bg-ink text-primary-foreground"
                                            : "border-hairline bg-surface text-ink hover:border-hairline-strong"
                                    }`}
                                >
                                    <span
                                        className={`h-3 w-3 rounded-full ${t.swatch}`}
                                    />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </UpgradeGate>
                </section>
            </section>
        </main>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckboxField({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
}) {
    return (
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-body">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-hairline"
            />
            {label}
        </label>
    );
}
