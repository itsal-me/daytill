"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    createTargetDate,
    decodeEventPayload,
    formatCountdown,
    formatDateLabel,
    isDaytillEvent,
    isEventExpired,
    loadEvents,
    type DaytillEvent,
} from "@/lib/daytill";

const STORAGE_KEY = "daytill.events.v1";

export function SharedEventView({
    eventId,
    initialPayload,
}: {
    eventId: string;
    initialPayload?: string;
}) {
    const [event, setEvent] = useState<DaytillEvent | null>(
        () => decodeEventPayload(initialPayload) ?? null,
    );
    const [loading, setLoading] = useState(() => !decodeEventPayload(initialPayload));
    const [now, setNow] = useState(() => Date.now());

    // Resolve event: try share API → fall back to localStorage
    useEffect(() => {
        if (event) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function resolve() {
            // Try the short-URL share store
            try {
                const res = await fetch(`/api/share/${eventId}`);
                if (!cancelled && res.ok) {
                    const raw: unknown = await res.json();
                    if (isDaytillEvent(raw)) {
                        setEvent(raw);
                        setLoading(false);
                        return;
                    }
                }
            } catch {
                // network error — fall through
            }

            if (cancelled) return;

            // Fall back to local browser storage (same-device share)
            const stored =
                loadEvents(STORAGE_KEY).find((e) => e.id === eventId) ?? null;
            setEvent(stored);
            setLoading(false);
        }

        void resolve();
        return () => {
            cancelled = true;
        };
    }, [eventId, event]);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    const countdown = useMemo(() => {
        if (!event) return null;
        return formatCountdown(createTargetDate(event), now);
    }, [event, now]);

    // ── Loading skeleton ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <main className="relative min-h-screen overflow-hidden bg-page text-ink">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="mesh-gradient absolute -top-40 left-1/2 h-112 w-xl -translate-x-1/2 rounded-full blur-3xl" />
                </div>
                <section className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
                    <div className="glass-panel w-full rounded-4xl p-6 shadow-card sm:p-10">
                        <div className="animate-pulse space-y-5">
                            <div className="mx-auto h-3 w-28 rounded-full bg-hairline" />
                            <div className="mx-auto h-8 w-64 rounded-xl bg-hairline" />
                            <div className="mx-auto h-3 w-20 rounded-full bg-hairline" />
                            <div className="mx-auto h-3 w-40 rounded-full bg-hairline" />
                            <div className="mt-8 grid grid-cols-4 gap-3">
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="h-20 rounded-3xl border border-hairline bg-canvas-soft-2"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    // ── Not found ─────────────────────────────────────────────────────────────

    if (!event || !countdown) {
        return (
            <main className="min-h-screen bg-page px-4 py-10 text-ink sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-card border border-hairline bg-surface p-8 text-center shadow-card">
                    <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                        Daytill shared page
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tighter text-ink">
                        This countdown could not be found.
                    </h1>
                    <p className="text-base leading-7 text-body">
                        The link may have expired or the event was removed.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex h-10 items-center justify-center rounded-pill bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
                    >
                        Go to Daytill
                    </Link>
                </div>
            </main>
        );
    }

    // ── Countdown view ────────────────────────────────────────────────────────

    return (
        <main className="relative min-h-screen overflow-hidden bg-page text-ink">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="mesh-gradient absolute -top-40 left-1/2 h-112 w-xl -translate-x-1/2 rounded-full blur-3xl" />
                <div className="noise-layer absolute inset-0 opacity-[0.05]" />
            </div>

            <section className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
                <article className="glass-panel w-full rounded-4xl p-6 text-center shadow-card sm:p-10">
                    <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                        Shared countdown
                    </p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-tighter text-ink sm:text-5xl">
                        {event.title}
                    </h1>
                    <p className="mt-3 text-sm uppercase tracking-[0.22em] text-body">
                        {event.category}
                    </p>
                    <p className="mt-4 text-base text-body">
                        {formatDateLabel(createTargetDate(event))}
                    </p>

                    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {(
                            [
                                ["Days", countdown.days],
                                ["Hours", countdown.hours],
                                ["Minutes", countdown.minutes],
                                ["Seconds", countdown.seconds],
                            ] as const
                        ).map(([label, value]) => (
                            <div
                                key={label}
                                className="rounded-3xl border border-hairline bg-surface p-4"
                            >
                                <div className="text-4xl font-semibold tracking-[-0.08em] text-ink">
                                    {value}
                                </div>
                                <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.24em] text-body">
                                    {label}
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="mt-8 text-sm text-body">
                        {isEventExpired(event, now)
                            ? "This countdown has passed."
                            : "This page is view-only and updates live."}
                    </p>

                    <div className="mt-8 border-t border-hairline/60 pt-8">
                        <p className="text-sm text-body">
                            Track your own countdowns for free.
                        </p>
                        <Link
                            href="/"
                            className="mt-4 inline-flex h-10 items-center rounded-pill bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary-hover"
                        >
                            Start for free
                        </Link>
                    </div>
                </article>
            </section>
        </main>
    );
}
