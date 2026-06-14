"use client";

import { type User } from "@supabase/supabase-js";
import {
    useEffect,
    useMemo,
    useState,
    type KeyboardEvent,
    type MouseEvent,
} from "react";
import {
    CATEGORY_OPTIONS,
    type DaytillEvent,
    type EventCategory,
    buildCalendarUrl,
    buildIcsDocument,
    encodeEventPayload,
    buildShareUrl,
    createTargetDate,
    formatCountdown,
    formatDateLabel,
    isEventExpired,
    loadEvents,
    sortEvents,
    summarizeCountdown,
} from "@/lib/daytill";
import {
    eventToRow,
    getSupabaseBrowserClient,
    rowToEvent,
    type EventRow,
} from "@/lib/supabase";

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

const STORAGE_KEY = "daytill.events.v1";
const NOTIFIED_KEY = "daytill.notifications.v1";
const THEME_KEY = "daytill.theme";

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

const faqItems = [
    {
        question: "What can I track with Daytill?",
        answer: "You can track birthdays, exams, deadlines, trips, anniversaries, and any other future event with a live countdown card.",
    },
    {
        question: "Are reminders available without an account?",
        answer: "Yes. Daytill supports local reminder preferences immediately, and browser notifications can be enabled per device.",
    },
    {
        question: "Can I share a countdown page publicly?",
        answer: "Yes. Each event has a unique share link that opens a dedicated, view-only countdown page.",
    },
    {
        question: "Does Daytill support recurring events?",
        answer: "Yes. You can enable yearly recurrence for events like birthdays and anniversaries.",
    },
];

function loadNotificationLog() {
    if (typeof window === "undefined") {
        return new Set<string>();
    }

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
    const reminders: number[] = [];

    if (draft.reminder7Days) reminders.push(7);
    if (draft.reminder1Day) reminders.push(1);
    if (draft.reminderDayOf) reminders.push(0);

    return reminders;
}

function saveEvents(storageKey: string, events: DaytillEvent[]) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(events));
}

export function DaytillApp() {
    const supabase = getSupabaseBrowserClient();
    const [events, setEvents] = useState<DaytillEvent[]>([]);
    const [draft, setDraft] = useState<DraftState>(DEFAULT_DRAFT);
    const [now, setNow] = useState(() => Date.now());
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [status, setStatus] = useState(
        "Create your first event to begin tracking the countdown.",
    );
    const [notificationLog, setNotificationLog] = useState<Set<string>>(
        () => new Set(),
    );
    const [notificationPermission, setNotificationPermission] =
        useState<NotificationPermission>("default");
    const [canUseNotifications, setCanUseNotifications] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [authConfigured, setAuthConfigured] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const [eventsLoaded, setEventsLoaded] = useState(false);

    useEffect(() => {
        setNotificationLog(loadNotificationLog());

        if (typeof window !== "undefined") {
            const storedTheme = window.localStorage.getItem(THEME_KEY);
            const resolvedTheme =
                storedTheme === "dark" || storedTheme === "light"
                    ? storedTheme
                    : window.matchMedia("(prefers-color-scheme: dark)").matches
                      ? "dark"
                      : "light";

            setTheme(resolvedTheme);
            document.documentElement.classList.toggle(
                "dark",
                resolvedTheme === "dark",
            );
            document.documentElement.style.colorScheme = resolvedTheme;
            setNotificationPermission(
                "Notification" in window ? Notification.permission : "denied",
            );
            setCanUseNotifications("Notification" in window);
        }
    }, []);

    useEffect(() => {
        setAuthConfigured(Boolean(supabase));

        const client = supabase;

        if (!client) {
            setEvents(loadEvents(STORAGE_KEY));
            setEventsLoaded(true);
            return;
        }

        const authedClient = client;

        let mounted = true;

        async function loadCloudEvents(userId: string) {
            const { data, error } = await authedClient
                .from("events")
                .select("*")
                .eq("user_id", userId);

            if (!mounted) {
                return;
            }

            if (error) {
                setStatus("Could not load cloud events, using local data.");
                setEvents(loadEvents(STORAGE_KEY));
                setEventsLoaded(true);
                return;
            }

            const mappedEvents = ((data ?? []) as EventRow[]).map((row) =>
                rowToEvent(row),
            );
            setEvents(sortEvents(mappedEvents, Date.now()));
            setEventsLoaded(true);
            setStatus("Synced events from your account.");
        }

        async function initAuth() {
            const {
                data: { session },
            } = await authedClient.auth.getSession();
            const sessionUser = session?.user ?? null;

            if (!mounted) {
                return;
            }

            setUser(sessionUser);

            if (sessionUser) {
                await loadCloudEvents(sessionUser.id);
            } else {
                setEvents(loadEvents(STORAGE_KEY));
                setEventsLoaded(true);
            }
        }

        void initAuth();

        const {
            data: { subscription },
        } = authedClient.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);

            if (sessionUser) {
                void loadCloudEvents(sessionUser.id);
            } else {
                setEvents(loadEvents(STORAGE_KEY));
                setEventsLoaded(true);
                setStatus("Signed out. Local browser events are active.");
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    useEffect(() => {
        if (typeof window === "undefined" || !eventsLoaded || user) {
            return;
        }

        saveEvents(STORAGE_KEY, events);
    }, [events, eventsLoaded, user]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !("Notification" in window)) {
            return;
        }

        if (Notification.permission !== "granted") {
            return;
        }

        const nextLog = new Set(notificationLog);

        for (const event of events) {
            const targetDate = createTargetDate(event);

            for (const reminderDays of event.reminders) {
                const reminderAt = new Date(
                    targetDate.getTime() - reminderDays * 24 * 60 * 60 * 1000,
                );
                const key = `${event.id}:${targetDate.toISOString().slice(0, 10)}:${reminderDays}`;
                const shouldTrigger =
                    now >= reminderAt.getTime() &&
                    now < targetDate.getTime() &&
                    !nextLog.has(key);

                if (!shouldTrigger) {
                    continue;
                }

                const label =
                    reminderDays === 0
                        ? "today"
                        : `${reminderDays} day${reminderDays === 1 ? "" : "s"} before`;
                window.navigator.serviceWorker?.ready.catch(() => undefined);

                new Notification(`Daytill reminder: ${event.title}`, {
                    body: `Your ${event.category.toLowerCase()} event is ${label}.`,
                });

                nextLog.add(key);
            }
        }

        if (nextLog.size !== notificationLog.size) {
            setNotificationLog(nextLog);
            saveNotificationLog(nextLog);
        }
    }, [events, notificationLog, now]);

    const sortedEvents = useMemo(() => sortEvents(events, now), [events, now]);
    const nextUpcoming =
        sortedEvents.find((event) => !isEventExpired(event, now)) ??
        sortedEvents[0];
    const eventCount = events.length;

    function updateDraft<K extends keyof DraftState>(
        key: K,
        value: DraftState[K],
    ) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    async function signInWithGoogle() {
        if (!supabase) {
            setStatus(
                "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
            );
            return;
        }

        setAuthBusy(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.origin,
            },
        });

        if (error) {
            setStatus(`Google sign-in failed: ${error.message}`);
            setAuthBusy(false);
            return;
        }

        setStatus("Redirecting to Google sign-in...");
    }

    async function signOutUser() {
        if (!supabase) {
            return;
        }

        setAuthBusy(true);
        const { error } = await supabase.auth.signOut();
        setAuthBusy(false);

        if (error) {
            setStatus(`Sign out failed: ${error.message}`);
            return;
        }

        setStatus("Signed out of your account.");
    }

    function handleThemeToggle() {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        document.documentElement.style.colorScheme = nextTheme;
        window.localStorage.setItem(THEME_KEY, nextTheme);
    }

    async function enableNotifications() {
        if (!("Notification" in window)) {
            setStatus("This browser does not support notifications.");
            return;
        }

        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        setCanUseNotifications(true);
        setStatus(
            permission === "granted"
                ? "Browser notifications are enabled."
                : "Notifications remain off.",
        );
    }

    async function handleCreateEvent() {
        if (!draft.title.trim() || !draft.date) {
            setStatus("Add a title and date to create your countdown.");
            return;
        }

        const reminders = draftToReminders(draft);
        const event: DaytillEvent = {
            id: crypto.randomUUID(),
            title: draft.title.trim(),
            date: draft.date,
            time: draft.time || undefined,
            category: draft.category,
            recurringYearly: draft.recurringYearly,
            reminders,
            emailReminder: draft.emailReminder.trim() || undefined,
            createdAt: new Date().toISOString(),
        };

        let savedToCloud = false;

        if (user && supabase) {
            const { error } = await supabase
                .from("events")
                .upsert(eventToRow(user.id, event));

            if (error) {
                setStatus(
                    `Could not save to cloud: ${error.message}. Saved locally instead.`,
                );
                setEvents((current) => {
                    const nextEvents = [...current, event];
                    saveEvents(STORAGE_KEY, nextEvents);
                    return nextEvents;
                });
                setDraft({ ...DEFAULT_DRAFT, category: draft.category });
                return;
            } else {
                savedToCloud = true;
            }
        }

        setEvents((current) => [...current, event]);
        setDraft({ ...DEFAULT_DRAFT, category: draft.category });
        if (!user || savedToCloud) {
            setStatus(
                savedToCloud
                    ? `Saved ${event.title} to your account.`
                    : `Saved ${event.title} as a live countdown card.`,
            );
        }
    }

    async function handleDeleteEvent(id: string) {
        if (user && supabase) {
            const { error } = await supabase
                .from("events")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) {
                setStatus(`Could not delete from cloud: ${error.message}`);
                return;
            }
        }

        setEvents((current) => {
            const nextEvents = current.filter((event) => event.id !== id);
            saveEvents(
                STORAGE_KEY,
                loadEvents(STORAGE_KEY).filter((event) => event.id !== id),
            );
            return nextEvents;
        });
        setStatus("Event removed from your dashboard.");
    }

    async function copyShareUrl(event: DaytillEvent) {
        const url = buildShareUrl(event, window.location.origin);
        await window.navigator.clipboard.writeText(url);
        setStatus("Share link copied to clipboard.");
    }

    async function exportIcs(event: DaytillEvent) {
        const targetDate = createTargetDate(event);
        const blob = new Blob([buildIcsDocument(event, targetDate)], {
            type: "text/calendar;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "daytill-event"}.ics`;
        anchor.click();
        URL.revokeObjectURL(url);
        setStatus("Calendar export downloaded.");
    }

    async function openCalendarLink(event: DaytillEvent) {
        const url = buildCalendarUrl(event);
        window.open(url, "_blank", "noopener,noreferrer");
        setStatus("Google Calendar opened in a new tab.");
    }

    function shareSubtitle(event: DaytillEvent) {
        const countdown = summarizeCountdown(event, now);
        return `${event.category} · ${countdown}`;
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-page text-ink">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="mesh-gradient absolute left-1/2 -top-40 h-112 w-xl -translate-x-1/2 rounded-full blur-3xl" />
                <div className="mesh-orb mesh-orb-a absolute left-[10%] top-72 h-40 w-40 rounded-full blur-3xl" />
                <div className="mesh-orb mesh-orb-b absolute right-[8%] top-128 h-56 w-56 rounded-full blur-3xl" />
                <div className="noise-layer absolute inset-0 opacity-[0.04]" />
            </div>

            <section className="relative mx-auto flex w-full max-w-350 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <section className="glass-panel rounded-card p-5 shadow-card lg:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 text-[12px] font-medium tracking-[0.2em] text-body uppercase shadow-[0_1px_0_rgba(0,0,0,0.03)]">
                                <span className="h-2 w-2 rounded-full bg-link" />
                                Daytill
                            </div>
                            <div className="space-y-3">
                                <h1 className="max-w-3xl text-4xl font-semibold tracking-tighter text-ink sm:text-5xl lg:text-6xl">
                                    Track the moments that matter.
                                </h1>
                                <p className="max-w-2xl text-base leading-7 text-body sm:text-lg">
                                    Create clean countdowns for exams,
                                    birthdays, trips, deadlines, and
                                    anniversaries. Every event lives locally,
                                    updates every second, and can be shared with
                                    a single link.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
                            <button
                                type="button"
                                onClick={handleThemeToggle}
                                className="inline-flex h-11 items-center rounded-pill border border-hairline bg-surface px-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-hairline-strong"
                            >
                                {theme === "dark" ? "Light mode" : "Dark mode"}
                            </button>
                            <button
                                type="button"
                                onClick={enableNotifications}
                                disabled={!canUseNotifications}
                                className="inline-flex h-11 items-center rounded-pill border border-hairline bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary-hover disabled:cursor-not-allowed disabled:border-hairline disabled:bg-surface disabled:text-body disabled:opacity-70"
                            >
                                {notificationPermission === "granted"
                                    ? "Notifications on"
                                    : "Enable reminders"}
                            </button>
                            {authConfigured ? (
                                user ? (
                                    <button
                                        type="button"
                                        onClick={signOutUser}
                                        disabled={authBusy}
                                        className="inline-flex h-11 items-center rounded-pill border border-hairline bg-surface px-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-hairline-strong disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Sign out
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={signInWithGoogle}
                                        disabled={authBusy}
                                        className="inline-flex h-11 items-center gap-2 rounded-pill border border-hairline bg-surface px-4 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-hairline-strong disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
                                            <svg
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                                className="h-3.5 w-3.5"
                                            >
                                                <path
                                                    fill="#4285F4"
                                                    d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.5-5.5 3.5-3.3 0-6-2.8-6-6.2S8.7 5.2 12 5.2c1.9 0 3.2.8 4 1.5l2.7-2.6C16.1 2.5 14.2 1.7 12 1.7 6.8 1.7 2.6 5.9 2.6 11.1S6.8 20.5 12 20.5c6.7 0 8.9-4.7 8.9-7.1 0-.5-.1-.9-.1-1.2H12Z"
                                                />
                                                <path
                                                    fill="#34A853"
                                                    d="M3.4 7.3 6.5 9.6c.8-2.4 3.1-4.2 5.5-4.2 1.9 0 3.2.8 4 1.5l2.7-2.6C16.1 2.5 14.2 1.7 12 1.7 8 1.7 4.6 4 3.4 7.3Z"
                                                />
                                                <path
                                                    fill="#FBBC05"
                                                    d="M12 20.5c2.2 0 4.1-.7 5.4-1.9l-2.5-2.1c-.8.5-1.8.9-2.9.9-4 0-5.3-2.7-5.5-3.5l-3.2 2.5C5.3 18.5 8.2 20.5 12 20.5Z"
                                                />
                                                <path
                                                    fill="#EA4335"
                                                    d="M20.9 11.7c0-.5-.1-.9-.1-1.2H12v3.9h5.5c-.3 1.6-1.5 2.9-2.6 3.1l2.5 2.1c1.6-1.5 3.5-3.7 3.5-7.9Z"
                                                />
                                            </svg>
                                        </span>
                                        Sign in with Google
                                    </button>
                                )
                            ) : (
                                <span className="rounded-pill border border-hairline bg-surface px-3 py-2 text-xs text-body">
                                    Add Supabase env vars to enable account sync
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <StatCard
                            label="Saved events"
                            value={String(eventCount).padStart(2, "0")}
                            detail={
                                user
                                    ? "Stored in your Supabase account"
                                    : "Stored in local browser storage"
                            }
                        />
                        <StatCard
                            label="Next countdown"
                            value={
                                nextUpcoming
                                    ? formatCountdown(
                                          createTargetDate(nextUpcoming),
                                          now,
                                      ).days
                                    : "00"
                            }
                            detail={
                                nextUpcoming
                                    ? nextUpcoming.title
                                    : "No upcoming event yet"
                            }
                        />
                        <StatCard
                            label="Sharing"
                            value="1 link"
                            detail="Unique share page per event"
                        />
                    </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <section className="glass-panel rounded-card p-5 shadow-card lg:p-6">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                                    Create event
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">
                                    Set a countdown in seconds.
                                </h2>
                            </div>
                            <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-body">
                                {status}
                            </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-2 md:col-span-2">
                                <span className="text-sm font-medium text-body">
                                    Event title
                                </span>
                                <input
                                    value={draft.title}
                                    onChange={(event) =>
                                        updateDraft("title", event.target.value)
                                    }
                                    placeholder="Exam, birthday, trip, deadline..."
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
                                    onChange={(event) =>
                                        updateDraft("date", event.target.value)
                                    }
                                    className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition focus:border-link"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="text-sm font-medium text-body">
                                    Time
                                </span>
                                <input
                                    type="time"
                                    value={draft.time}
                                    onChange={(event) =>
                                        updateDraft("time", event.target.value)
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
                                    onChange={(event) =>
                                        updateDraft(
                                            "category",
                                            event.target.value as EventCategory,
                                        )
                                    }
                                    className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition focus:border-link"
                                >
                                    {CATEGORY_OPTIONS.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="space-y-2">
                                <span className="text-sm font-medium text-body">
                                    Email reminder
                                </span>
                                <input
                                    type="email"
                                    value={draft.emailReminder}
                                    onChange={(event) =>
                                        updateDraft(
                                            "emailReminder",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="name@example.com"
                                    className="h-12 w-full rounded-[14px] border border-hairline bg-surface px-4 text-sm text-ink outline-none transition placeholder:text-mute focus:border-link"
                                />
                            </label>

                            <div className="rounded-[18px] border border-hairline bg-canvas-soft-2 p-4 md:col-span-2">
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="inline-flex items-center gap-2 text-sm text-body">
                                        <input
                                            type="checkbox"
                                            checked={draft.recurringYearly}
                                            onChange={(event) =>
                                                updateDraft(
                                                    "recurringYearly",
                                                    event.target.checked,
                                                )
                                            }
                                            className="h-4 w-4 rounded border-hairline text-link focus:ring-link"
                                        />
                                        Repeat yearly
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm text-body">
                                        <input
                                            type="checkbox"
                                            checked={draft.reminder7Days}
                                            onChange={(event) =>
                                                updateDraft(
                                                    "reminder7Days",
                                                    event.target.checked,
                                                )
                                            }
                                            className="h-4 w-4 rounded border-hairline text-link focus:ring-link"
                                        />
                                        7 days before
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm text-body">
                                        <input
                                            type="checkbox"
                                            checked={draft.reminder1Day}
                                            onChange={(event) =>
                                                updateDraft(
                                                    "reminder1Day",
                                                    event.target.checked,
                                                )
                                            }
                                            className="h-4 w-4 rounded border-hairline text-link focus:ring-link"
                                        />
                                        1 day before
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm text-body">
                                        <input
                                            type="checkbox"
                                            checked={draft.reminderDayOf}
                                            onChange={(event) =>
                                                updateDraft(
                                                    "reminderDayOf",
                                                    event.target.checked,
                                                )
                                            }
                                            className="h-4 w-4 rounded border-hairline text-link focus:ring-link"
                                        />
                                        On the day
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={handleCreateEvent}
                                className="inline-flex h-12 items-center rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary-hover"
                            >
                                Add countdown
                            </button>
                            <p className="text-sm text-body">
                                Email is stored locally for now and ready for
                                backend wiring later.
                            </p>
                        </div>
                    </section>

                    <section className="glass-panel rounded-card p-5 shadow-card lg:p-6">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                                    Dashboard
                                </p>
                                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">
                                    Upcoming events, sorted by date.
                                </h2>
                            </div>
                            <div className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-body">
                                Live updates every second
                            </div>
                        </div>

                        {sortedEvents.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-hairline bg-canvas-soft-2 p-8 text-center">
                                <p className="text-lg font-medium text-ink">
                                    Your dashboard is empty.
                                </p>
                                <p className="mt-2 text-sm leading-6 text-body">
                                    Add an event to see a live countdown card,
                                    share link, calendar export, and reminder
                                    badges.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {sortedEvents.map((event) => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        now={now}
                                        onOpen={() =>
                                            window.location.assign(
                                                `/event/${event.id}?payload=${encodeEventPayload(event)}`,
                                            )
                                        }
                                        onCopy={() => copyShareUrl(event)}
                                        onDelete={() =>
                                            handleDeleteEvent(event.id)
                                        }
                                        onIcs={() => exportIcs(event)}
                                        onCalendar={() =>
                                            openCalendarLink(event)
                                        }
                                        subtitle={shareSubtitle(event)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <section className="glass-panel rounded-card p-5 shadow-card lg:p-8">
                    <div className="grid gap-8 lg:grid-cols-2">
                        <article>
                            <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                                About Daytill
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tighter text-ink">
                                A focused countdown and reminder app built for
                                real life.
                            </h2>
                            <p className="mt-4 text-base leading-8 text-body">
                                Daytill is a multi-page countdown web app
                                designed to help you stay ahead of important
                                events. Whether you are preparing for a final
                                exam, counting down to a product launch,
                                planning a trip, or remembering an anniversary,
                                Daytill gives you a precise live timer with
                                days, hours, minutes, and seconds. Events can be
                                grouped by category, sorted by the nearest date,
                                and shared as clean public countdown pages.
                            </p>
                            <p className="mt-4 text-base leading-8 text-body">
                                The app starts with local-first storage so you
                                can use it instantly without sign-up. Reminder
                                options for 7 days before, 1 day before, and the
                                day itself make planning easier, and calendar
                                exports help you keep your timeline in sync. The
                                interface is intentionally minimal so your focus
                                stays on what is coming next.
                            </p>
                        </article>

                        <article>
                            <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                                FAQ
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tighter text-ink">
                                Common questions
                            </h2>
                            <div className="mt-5 space-y-3">
                                {faqItems.map((item) => (
                                    <details
                                        key={item.question}
                                        className="rounded-3xl border border-hairline bg-surface p-4"
                                    >
                                        <summary className="cursor-pointer text-sm font-semibold text-ink">
                                            {item.question}
                                        </summary>
                                        <p className="mt-3 text-sm leading-7 text-body">
                                            {item.answer}
                                        </p>
                                    </details>
                                ))}
                            </div>
                        </article>
                    </div>
                </section>
            </section>
        </main>
    );
}

function StatCard({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <div className="rounded-3xl border border-hairline bg-surface p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-body">
                {label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-ink">
                {value}
            </p>
            <p className="mt-2 text-sm text-body">{detail}</p>
        </div>
    );
}

function EventCard({
    event,
    now,
    subtitle,
    onOpen,
    onCopy,
    onDelete,
    onIcs,
    onCalendar,
}: {
    event: DaytillEvent;
    now: number;
    subtitle: string;
    onOpen: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onIcs: () => void;
    onCalendar: () => void;
}) {
    const targetDate = createTargetDate(event);
    const countdown = formatCountdown(targetDate, now);
    const expired = isEventExpired(event, now);

    function handleCardClick() {
        onOpen();
    }

    function handleCardKeyDown(eventKey: KeyboardEvent<HTMLElement>) {
        if (eventKey.key === "Enter" || eventKey.key === " ") {
            eventKey.preventDefault();
            onOpen();
        }
    }

    function stopCardClick(action: () => void) {
        return (eventMouse: MouseEvent<HTMLButtonElement>) => {
            eventMouse.stopPropagation();
            action();
        };
    }

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            className="rounded-3xl border border-hairline bg-surface p-4 shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
        >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-canvas-soft-2 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-body">
                            {event.category}
                        </span>
                        {event.recurringYearly ? (
                            <span className="rounded-full border border-link/20 bg-link/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-link">
                                Yearly
                            </span>
                        ) : null}
                        {expired ? (
                            <span className="rounded-full border border-warning/30 bg-warning-soft px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-warning-deep">
                                Passed
                            </span>
                        ) : null}
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold tracking-[-0.04em] text-ink">
                            {event.title}
                        </h3>
                        <p className="mt-1 text-sm text-body">
                            {formatDateLabel(targetDate)}
                        </p>
                        <p className="mt-1 text-sm text-body">{subtitle}</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2 rounded-[20px] border border-hairline bg-canvas-soft-2 p-3 text-center">
                    {[
                        ["Days", countdown.days],
                        ["Hours", countdown.hours],
                        ["Minutes", countdown.minutes],
                        ["Seconds", countdown.seconds],
                    ].map(([label, value]) => (
                        <div key={label} className="space-y-1">
                            <div className="text-2xl font-semibold tracking-[-0.06em] text-ink">
                                {value}
                            </div>
                            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-body">
                                {label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                {event.reminders.map((reminder) => (
                    <span
                        key={reminder}
                        className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-body"
                    >
                        {reminder === 0
                            ? "On the day"
                            : `${reminder} days before`}
                    </span>
                ))}
                {event.emailReminder ? (
                    <span className="rounded-full border border-link/20 bg-link/10 px-3 py-1 text-xs font-medium text-link">
                        Email ready
                    </span>
                ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={stopCardClick(onCopy)}
                    className="rounded-pill border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-hairline-strong"
                >
                    Copy share link
                </button>
                <button
                    type="button"
                    onClick={stopCardClick(onCalendar)}
                    className="rounded-pill border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-hairline-strong"
                >
                    Google Calendar
                </button>
                <button
                    type="button"
                    onClick={stopCardClick(onIcs)}
                    className="rounded-pill border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-hairline-strong"
                >
                    Download ICS
                </button>
                <button
                    type="button"
                    onClick={stopCardClick(onDelete)}
                    className="rounded-pill border border-error/30 bg-error-soft px-4 py-2 text-sm font-medium text-error-deep transition hover:border-error/50"
                >
                    Delete
                </button>
            </div>
        </article>
    );
}
