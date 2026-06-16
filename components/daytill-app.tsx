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
const BACKUP_META_KEY = "daytill.backup.v1";

const THEMES: { id: Theme; label: string; swatch: string }[] = [
    { id: "default", label: "Default", swatch: "bg-hairline" },
    { id: "rose", label: "Rose", swatch: "bg-[#fb7185]" },
    { id: "ocean", label: "Ocean", swatch: "bg-[#06b6d4]" },
    { id: "forest", label: "Forest", swatch: "bg-[#22c55e]" },
    { id: "violet", label: "Violet", swatch: "bg-[#8b5cf6]" },
    { id: "midnight", label: "Midnight", swatch: "bg-[#6366f1]" },
];

type CategoryConfig = {
    icon: string;
    hint: string;
    prompt: string;
    placeholder: string;
    showTime: boolean;
    defaultRecurringYearly: boolean;
    defaultReminders: { r7: boolean; r1: boolean; r0: boolean };
};

const CATEGORY_CONFIG: Record<EventCategory, CategoryConfig> = {
    Study: {
        icon: "🎓",
        hint: "Exams, tests, IELTS, SAT…",
        prompt: "What are you studying for?",
        placeholder: "e.g. Final Exam, IELTS, Thesis…",
        showTime: true,
        defaultRecurringYearly: false,
        defaultReminders: { r7: true, r1: true, r0: true },
    },
    Birthday: {
        icon: "🎂",
        hint: "Repeats every year — auto set",
        prompt: "Whose birthday is it?",
        placeholder: "e.g. Mom's Birthday, Alex…",
        showTime: false,
        defaultRecurringYearly: true,
        defaultReminders: { r7: true, r1: false, r0: true },
    },
    Trip: {
        icon: "✈️",
        hint: "Flights, vacations, adventures",
        prompt: "Where are you headed?",
        placeholder: "e.g. Japan Trip, Bali Vacation…",
        showTime: false,
        defaultRecurringYearly: false,
        defaultReminders: { r7: true, r1: true, r0: false },
    },
    Anniversary: {
        icon: "💍",
        hint: "Repeats every year — auto set",
        prompt: "What's the anniversary?",
        placeholder: "e.g. Wedding Anniversary…",
        showTime: false,
        defaultRecurringYearly: true,
        defaultReminders: { r7: true, r1: false, r0: true },
    },
    Work: {
        icon: "💼",
        hint: "Launches, interviews, sprints",
        prompt: "What's the deadline or event?",
        placeholder: "e.g. Product Launch, Sprint End…",
        showTime: true,
        defaultRecurringYearly: false,
        defaultReminders: { r7: false, r1: true, r0: true },
    },
    Personal: {
        icon: "🎉",
        hint: "Any moment that matters",
        prompt: "What's the moment?",
        placeholder: "e.g. Graduation, New Year's Eve…",
        showTime: false,
        defaultRecurringYearly: false,
        defaultReminders: { r7: true, r1: false, r0: true },
    },
};

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

function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
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
    const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [creationStep, setCreationStep] = useState<"pick" | "detail">("pick");

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
        const savedBackup = window.localStorage.getItem(BACKUP_META_KEY);
        if (savedBackup) setLastBackupAt(savedBackup);
    }, []);

    // ─── Auth + plan + cloud sync ─────────────────────────────────────────────
    //
    // Visitor (no login) → localStorage only. Data never leaves the browser.
    // Free + signed-in   → localStorage is the working copy. Cloud is a manual
    //                      backup vault. "Back up" pushes local → cloud.
    //                      "Restore" pulls cloud → local. No auto-sync.
    // Pro + signed-in    → every change auto-syncs to cloud. Real-time channel
    //                      delivers other-device changes instantly.

    useEffect(() => {
        const client = supabase;
        if (!client) {
            setEvents(loadEvents(STORAGE_KEY));
            setEventsLoaded(true);
            return;
        }

        const c = client;
        let mounted = true;
        let realtimeChannel: ReturnType<typeof c.channel> | null = null;

        // Pro only: load from cloud and auto-migrate any local-only events.
        async function syncCloudEvents(userId: string) {
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
            const localEvents = loadEvents(STORAGE_KEY);

            if (cloudEvents.length === 0 && localEvents.length > 0) {
                // Cloud empty (first Pro login or upgrade) → push all local
                const rows = localEvents.map((e) => eventToRow(userId, e));
                const { error: upsertErr } = await c.from("events").upsert(rows);
                if (!mounted) return;
                if (upsertErr) toast(`Initial cloud sync failed: ${upsertErr.message}`, "error");
                setEvents(sortEvents(localEvents, Date.now()));
            } else {
                // Cloud has events. Add any local-only events (handles Free→Pro
                // upgrade where user had local changes after their last backup).
                const cloudIds = new Set(cloudEvents.map((e) => e.id));
                const localOnly = localEvents.filter((e) => !cloudIds.has(e.id));
                if (localOnly.length > 0) {
                    await c.from("events").upsert(localOnly.map((e) => eventToRow(userId, e)));
                    if (!mounted) return;
                    setEvents(sortEvents([...cloudEvents, ...localOnly], Date.now()));
                } else {
                    setEvents(sortEvents(cloudEvents, Date.now()));
                }
            }

            setEventsLoaded(true);
        }

        function subscribeRealtime(userId: string) {
            if (realtimeChannel) void c.removeChannel(realtimeChannel);
            realtimeChannel = c
                .channel(`events:${userId}`)
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "events", filter: `user_id=eq.${userId}` },
                    (payload) => {
                        if (!mounted) return;
                        if (payload.eventType === "INSERT") {
                            const incoming = rowToEvent(payload.new as EventRow);
                            setEvents((prev) =>
                                prev.some((e) => e.id === incoming.id)
                                    ? prev
                                    : sortEvents([...prev, incoming], Date.now()),
                            );
                        } else if (payload.eventType === "UPDATE") {
                            const incoming = rowToEvent(payload.new as EventRow);
                            setEvents((prev) =>
                                sortEvents(
                                    prev.map((e) => (e.id === incoming.id ? incoming : e)),
                                    Date.now(),
                                ),
                            );
                        } else if (payload.eventType === "DELETE") {
                            const deletedId = (payload.old as { id: string }).id;
                            setEvents((prev) => prev.filter((e) => e.id !== deletedId));
                        }
                    },
                )
                .subscribe();
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

            const pro = await getUserIsPro(c, sessionUser.id);
            if (!mounted) return;
            setIsPro(pro);

            if (pro) {
                // Pro: cloud is authoritative, real-time keeps it live
                await syncCloudEvents(sessionUser.id);
                subscribeRealtime(sessionUser.id);
            } else {
                // Free: local is the working copy, cloud backup is manual
                setEvents(loadEvents(STORAGE_KEY));
                setEventsLoaded(true);
            }
        }

        void init();

        const { data: { subscription } } = c.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);

            if (!sessionUser) {
                if (realtimeChannel) {
                    void c.removeChannel(realtimeChannel);
                    realtimeChannel = null;
                }
                setEvents(loadEvents(STORAGE_KEY));
                setEventsLoaded(true);
                setIsPro(false);
                setLastBackupAt(null);
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
                    await syncCloudEvents(sessionUser.id);
                    subscribeRealtime(sessionUser.id);
                } else {
                    if (realtimeChannel) {
                        void c.removeChannel(realtimeChannel);
                        realtimeChannel = null;
                    }
                    setEvents(loadEvents(STORAGE_KEY));
                    setEventsLoaded(true);
                }
            })();
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
            if (realtimeChannel) void c.removeChannel(realtimeChannel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase]);

    // ─── Persist to localStorage (always — local is an offline backup) ─────────

    useEffect(() => {
        if (typeof window === "undefined" || !eventsLoaded) return;
        saveLocalEvents(events);
    }, [events, eventsLoaded]);

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

    function handleCategoryChange(newCat: EventCategory) {
        setDraft((prev) => ({
            ...prev,
            category: newCat,
            recurringYearly:
                newCat === "Birthday" || newCat === "Anniversary"
                    ? true
                    : prev.recurringYearly,
        }));
    }

    function handlePickCategory(cat: EventCategory) {
        const cfg = CATEGORY_CONFIG[cat];
        setDraft({
            ...DEFAULT_DRAFT,
            category: cat,
            recurringYearly: cfg.defaultRecurringYearly,
            reminder7Days: cfg.defaultReminders.r7,
            reminder1Day: cfg.defaultReminders.r1,
            reminderDayOf: cfg.defaultReminders.r0,
        });
        setCreationStep("detail");
    }

    function startEdit(event: DaytillEvent) {
        setEditingId(event.id);
        setDraft(eventToDraft(event));
        setCreationStep("detail");
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function cancelEdit() {
        setEditingId(null);
        setDraft(DEFAULT_DRAFT);
        setCreationStep("pick");
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

    async function handleBackupToCloud() {
        if (!user || !supabase || isPro) return;
        setIsBackingUp(true);
        try {
            // Replace cloud copy with current local state
            const { error: delErr } = await supabase
                .from("events")
                .delete()
                .eq("user_id", user.id);
            if (delErr) { toast(`Backup failed: ${delErr.message}`, "error"); return; }
            if (events.length > 0) {
                const { error: upsertErr } = await supabase
                    .from("events")
                    .upsert(events.map((e) => eventToRow(user.id, e)));
                if (upsertErr) { toast(`Backup failed: ${upsertErr.message}`, "error"); return; }
            }
            const ts = new Date().toISOString();
            setLastBackupAt(ts);
            window.localStorage.setItem(BACKUP_META_KEY, ts);
            toast(`Backed up ${events.length} event${events.length === 1 ? "" : "s"} to cloud.`);
        } finally {
            setIsBackingUp(false);
        }
    }

    async function handleRestoreFromCloud() {
        if (!user || !supabase || isPro) return;
        setIsRestoring(true);
        try {
            const { data, error } = await supabase
                .from("events")
                .select("*")
                .eq("user_id", user.id);
            if (error) { toast(`Restore failed: ${error.message}`, "error"); return; }
            const restored = ((data ?? []) as EventRow[]).map(rowToEvent);
            setEvents(sortEvents(restored, Date.now()));
            toast(
                restored.length > 0
                    ? `Restored ${restored.length} event${restored.length === 1 ? "" : "s"} from cloud.`
                    : "No cloud backup found.",
            );
        } finally {
            setIsRestoring(false);
        }
    }

    async function handleSaveEvent() {
        if (!draft.title.trim() || !draft.date) {
            toast("Add a title and date first.", "error");
            return;
        }

        // Pro users auto-sync every change to cloud; Free uses manual backup
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
                    .upsert(eventToRow(user!.id, updated));
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
            setCreationStep("pick");
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
                setEvents((prev) => [...prev, event]);
                setDraft(DEFAULT_DRAFT);
                setCreationStep("pick");
                return;
            }
        }

        setEvents((prev) => [...prev, event]);
        setDraft(DEFAULT_DRAFT);
        setCreationStep("pick");
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
        setEvents((prev) => prev.filter((e) => e.id !== id));
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
        <main className="relative min-h-screen overflow-hidden text-ink">
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
                                Your personal timeline
                                {isPro && (
                                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
                                        Pro
                                    </span>
                                )}
                            </div>
                            <h1 className="max-w-3xl text-4xl font-semibold tracking-tighter text-ink sm:text-5xl lg:text-6xl">
                                Never lose track of what you&apos;re looking forward to.
                            </h1>
                            <p className="max-w-2xl text-base leading-7 text-body sm:text-lg">
                                From exams and birthdays to trips and big life
                                milestones — Daytill keeps every moment alive
                                and shareable, updating every second.
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
                            label="Countdowns"
                            value={String(events.length).padStart(2, "0")}
                            detail={
                                isPro && user
                                    ? `Synced · ${user.email ?? "account"}`
                                    : user
                                      ? lastBackupAt
                                        ? `Backed up ${formatRelativeTime(lastBackupAt)}`
                                        : "Just on this device"
                                      : "Just on this device"
                            }
                        />
                        <StatCard
                            label="Up next"
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
                                    : "Nothing coming up"
                            }
                        />
                        <StatCard
                            label="Plan"
                            value={isPro ? "Pro" : "Free"}
                            detail={
                                isPro
                                    ? "All features unlocked"
                                    : user
                                      ? "Upgrade for auto-sync & themes"
                                      : "Sign up to back up your moments"
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
                                Sign up free to keep your moments safe across devices, or{" "}
                                <Link
                                    href="/pricing"
                                    className="font-medium text-ink underline underline-offset-2 hover:text-link"
                                >
                                    upgrade to Pro
                                </Link>{" "}
                                for live sync everywhere.
                            </span>
                        </div>
                    )}
                    {user && !isPro && (
                        <div className="mt-4 rounded-xl border border-hairline bg-canvas-soft-2 px-4 py-3 text-sm text-body">
                            <div className="flex flex-wrap items-center gap-3">
                                <span
                                    className="material-symbols-outlined text-mute"
                                    style={{ fontSize: "18px" }}
                                >
                                    cloud_upload
                                </span>
                                <span className="flex-1">
                                    {lastBackupAt
                                        ? `Your moments are backed up · ${formatRelativeTime(lastBackupAt)}.`
                                        : "Your moments are only on this device."}{" "}
                                    <Link
                                        href="/pricing"
                                        className="font-medium text-ink underline underline-offset-2 hover:text-link"
                                    >
                                        Upgrade to Pro
                                    </Link>{" "}
                                    for live sync across all your devices.
                                </span>
                                <div className="flex shrink-0 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void handleBackupToCloud()}
                                        disabled={isBackingUp || isRestoring}
                                        className="inline-flex h-8 items-center rounded-pill border border-hairline bg-surface px-3 text-xs font-medium text-ink transition hover:border-hairline-strong disabled:opacity-50"
                                    >
                                        {isBackingUp ? "Backing up…" : "Back up"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleRestoreFromCloud()}
                                        disabled={isBackingUp || isRestoring}
                                        className="inline-flex h-8 items-center rounded-pill border border-hairline bg-surface px-3 text-xs font-medium text-ink transition hover:border-hairline-strong disabled:opacity-50"
                                    >
                                        {isRestoring ? "Restoring…" : "Restore"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* ── Form + Dashboard grid ── */}
                <div
                    ref={formRef}
                    id="event-form"
                    className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] scroll-mt-20"
                >
                    {/* ── Creation wizard / Edit form ── */}
                    <section className="glass-panel rounded-card p-5 shadow-card lg:p-6">
                        {editingId ? (
                            /* ─── Edit mode: full form ─── */
                            <>
                                <div className="mb-6">
                                    <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                                        Edit countdown
                                    </p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">
                                        Update your countdown.
                                    </h2>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="space-y-2 md:col-span-2">
                                        <span className="text-sm font-medium text-body">Title</span>
                                        <input
                                            value={draft.title}
                                            onChange={(e) => updateDraft("title", e.target.value)}
                                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                                if (e.key === "Enter") void handleSaveEvent();
                                            }}
                                            placeholder="What's the moment?"
                                            className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition placeholder:text-mute focus:border-link"
                                        />
                                    </label>

                                    <label className="space-y-2">
                                        <span className="text-sm font-medium text-body">Date</span>
                                        <input
                                            type="date"
                                            value={draft.date}
                                            onChange={(e) => updateDraft("date", e.target.value)}
                                            className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition focus:border-link"
                                        />
                                    </label>

                                    <label className="space-y-2">
                                        <span className="text-sm font-medium text-body">
                                            Time{" "}
                                            <span className="ml-1 font-normal text-mute">(optional)</span>
                                        </span>
                                        <input
                                            type="time"
                                            value={draft.time}
                                            onChange={(e) => updateDraft("time", e.target.value)}
                                            className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition focus:border-link"
                                        />
                                    </label>

                                    <label className="space-y-2">
                                        <span className="text-sm font-medium text-body">Category</span>
                                        <select
                                            value={draft.category}
                                            onChange={(e) => handleCategoryChange(e.target.value as EventCategory)}
                                            className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition focus:border-link"
                                        >
                                            {CATEGORY_OPTIONS.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <div className="space-y-2">
                                        <span className="flex items-center gap-2 text-sm font-medium text-body">
                                            Email reminder <ProBadge />
                                        </span>
                                        {isPro ? (
                                            <input
                                                type="email"
                                                value={draft.emailReminder}
                                                onChange={(e) => updateDraft("emailReminder", e.target.value)}
                                                placeholder="name@example.com"
                                                className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition placeholder:text-mute focus:border-link"
                                            />
                                        ) : (
                                            <div className="flex h-12 items-center gap-2 rounded-[14px] border border-dashed border-hairline bg-canvas-soft-2 px-4">
                                                <span className="text-sm text-mute">Unlock with Pro</span>
                                                <Link href="/pricing" className="ml-auto text-xs font-medium text-link hover:underline">
                                                    Upgrade →
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-[18px] border border-hairline bg-canvas-soft-2 p-4 md:col-span-2">
                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                                            <CheckboxField checked={draft.recurringYearly} onChange={(v) => updateDraft("recurringYearly", v)} label="Repeat yearly" />
                                            <CheckboxField checked={draft.reminder7Days} onChange={(v) => updateDraft("reminder7Days", v)} label="7 days before" />
                                            <CheckboxField checked={draft.reminder1Day} onChange={(v) => updateDraft("reminder1Day", v)} label="1 day before" />
                                            <CheckboxField checked={draft.reminderDayOf} onChange={(v) => updateDraft("reminderDayOf", v)} label="On the day" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => void handleSaveEvent()}
                                        className="inline-flex h-12 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary-hover"
                                    >
                                        Save changes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="inline-flex h-12 items-center rounded-pill border border-hairline bg-surface px-5 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-hairline-strong"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : creationStep === "pick" ? (
                            /* ─── Step 1: Pick a category ─── */
                            <>
                                <div className="mb-6">
                                    <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                                        New countdown
                                    </p>
                                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink">
                                        What are you counting down to?
                                    </h2>
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {CATEGORY_OPTIONS.map((cat) => {
                                        const cfg = CATEGORY_CONFIG[cat];
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => handlePickCategory(cat)}
                                                className="flex flex-col items-start gap-3 rounded-2xl border border-hairline bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] active:translate-y-0"
                                            >
                                                <span className="text-2xl" aria-hidden="true">{cfg.icon}</span>
                                                <div>
                                                    <p className="text-sm font-semibold text-ink">{cat}</p>
                                                    <p className="mt-0.5 text-[11px] leading-relaxed text-mute">{cfg.hint}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            /* ─── Step 2: Fill in the details ─── */
                            (() => {
                                const cfg = CATEGORY_CONFIG[draft.category];
                                return (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setCreationStep("pick")}
                                            className="mb-5 flex items-center gap-1.5 text-sm text-mute transition hover:text-ink"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                                arrow_back
                                            </span>
                                            Back
                                        </button>

                                        <div className="mb-6">
                                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-body">
                                                <span aria-hidden="true">{cfg.icon}</span>
                                                {draft.category}
                                            </div>
                                            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">
                                                {cfg.prompt}
                                            </h2>
                                        </div>

                                        <div className="grid gap-4">
                                            <input
                                                autoFocus
                                                value={draft.title}
                                                onChange={(e) => updateDraft("title", e.target.value)}
                                                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                                    if (e.key === "Enter") void handleSaveEvent();
                                                }}
                                                placeholder={cfg.placeholder}
                                                className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition placeholder:text-mute focus:border-link"
                                            />

                                            <div className={`grid gap-4${cfg.showTime ? " sm:grid-cols-2" : ""}`}>
                                                <label className="space-y-2">
                                                    <span className="text-sm font-medium text-body">When?</span>
                                                    <input
                                                        type="date"
                                                        value={draft.date}
                                                        onChange={(e) => updateDraft("date", e.target.value)}
                                                        className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition focus:border-link"
                                                    />
                                                </label>
                                                {cfg.showTime && (
                                                    <label className="space-y-2">
                                                        <span className="text-sm font-medium text-body">
                                                            Time{" "}
                                                            <span className="ml-1 font-normal text-mute">(optional)</span>
                                                        </span>
                                                        <input
                                                            type="time"
                                                            value={draft.time}
                                                            onChange={(e) => updateDraft("time", e.target.value)}
                                                            className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition focus:border-link"
                                                        />
                                                    </label>
                                                )}
                                            </div>

                                            <div className="rounded-[18px] border border-hairline bg-canvas-soft-2 p-4">
                                                <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-mute">
                                                    Reminders
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                                                    <CheckboxField checked={draft.recurringYearly} onChange={(v) => updateDraft("recurringYearly", v)} label="Repeat yearly" />
                                                    <CheckboxField checked={draft.reminder7Days} onChange={(v) => updateDraft("reminder7Days", v)} label="7 days before" />
                                                    <CheckboxField checked={draft.reminder1Day} onChange={(v) => updateDraft("reminder1Day", v)} label="1 day before" />
                                                    <CheckboxField checked={draft.reminderDayOf} onChange={(v) => updateDraft("reminderDayOf", v)} label="On the day" />
                                                </div>
                                            </div>

                                            {isPro && (
                                                <label className="space-y-2">
                                                    <span className="flex items-center gap-2 text-sm font-medium text-body">
                                                        Email reminder <ProBadge />
                                                    </span>
                                                    <input
                                                        type="email"
                                                        value={draft.emailReminder}
                                                        onChange={(e) => updateDraft("emailReminder", e.target.value)}
                                                        placeholder="name@example.com"
                                                        className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition placeholder:text-mute focus:border-link"
                                                    />
                                                </label>
                                            )}
                                        </div>

                                        <div className="mt-6">
                                            <button
                                                type="button"
                                                onClick={() => void handleSaveEvent()}
                                                className="inline-flex h-12 items-center gap-2 rounded-pill bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary-hover"
                                            >
                                                Add countdown
                                                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                                                    arrow_forward
                                                </span>
                                            </button>
                                        </div>
                                    </>
                                );
                            })()
                        )}
                    </section>

                    {/* ── Dashboard ── */}
                    <section className="glass-panel rounded-card p-5 shadow-card lg:p-6">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                                    Your timeline
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">
                                    What&apos;s coming up.
                                </h2>
                            </div>
                            <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-mute">
                                Live
                            </span>
                        </div>

                        {/* Category filter */}
                        <div className="mb-4 flex flex-wrap gap-1.5">
                            {(["All", ...CATEGORY_OPTIONS] as const).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setFilterCategory(c)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition ${
                                        filterCategory === c
                                            ? "bg-ink text-primary-foreground"
                                            : "border border-hairline bg-surface text-body hover:border-hairline-strong hover:text-ink"
                                    }`}
                                >
                                    {c !== "All" && (
                                        <span aria-hidden="true" className="text-[11px]">
                                            {CATEGORY_CONFIG[c].icon}
                                        </span>
                                    )}
                                    {c}
                                </button>
                            ))}
                        </div>

                        {filteredEvents.length === 0 ? (
                            <div className="flex min-h-80 flex-col items-center justify-center gap-1 rounded-3xl border border-dashed border-hairline bg-canvas-soft-2 p-8 text-center">
                                {events.length === 0 ? (
                                    <>
                                        <p className="text-base font-medium text-ink">
                                            What are you looking forward to?
                                        </p>
                                        <p className="mt-2 text-sm text-body">
                                            Add your first countdown and it will
                                            appear here, live every second.
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-body">
                                        No{" "}
                                        <span className="font-medium text-ink">
                                            {filterCategory.toLowerCase()}
                                        </span>{" "}
                                        countdowns yet.
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
                                    ? "Pick a theme that matches your mood."
                                    : "Upgrade to Pro to personalize your experience."}
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
