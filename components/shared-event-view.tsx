"use client";

import { useEffect, useMemo, useState } from "react";
import {
    createTargetDate,
    decodeEventPayload,
    formatCountdown,
    formatDateLabel,
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
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (event) {
            return;
        }

        const storedEvents = loadEvents(STORAGE_KEY);
        const storedEvent =
            storedEvents.find((candidate) => candidate.id === eventId) ?? null;
        setEvent(storedEvent);
    }, [event, eventId]);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    const countdown = useMemo(() => {
        if (!event) {
            return null;
        }

        return formatCountdown(createTargetDate(event), now);
    }, [event, now]);

    if (!event || !countdown) {
        return (
            <main className="min-h-screen bg-page px-4 py-10 text-ink sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-card border border-hairline bg-surface p-8 text-center shadow-card">
                    <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                        Daytill shared page
                    </p>
                    <h1 className="text-3xl font-semibold tracking-[-0.05em] text-ink">
                        This event could not be found.
                    </h1>
                    <p className="text-base leading-7 text-body">
                        The shared link needs an embedded payload or a local
                        Daytill event saved in this browser.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-page text-ink">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="mesh-gradient absolute left-1/2 -top-40 h-112 w-xl -translate-x-1/2 rounded-full blur-3xl" />
                <div className="noise-layer absolute inset-0 opacity-[0.05]" />
            </div>

            <section className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
                <article className="glass-panel w-full rounded-4xl p-6 text-center shadow-card sm:p-10">
                    <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                        Shared countdown
                    </p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
                        {event.title}
                    </h1>
                    <p className="mt-3 text-sm uppercase tracking-[0.22em] text-body">
                        {event.category}
                    </p>
                    <p className="mt-4 text-base text-body">
                        {formatDateLabel(createTargetDate(event))}
                    </p>

                    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            ["Days", countdown.days],
                            ["Hours", countdown.hours],
                            ["Minutes", countdown.minutes],
                            ["Seconds", countdown.seconds],
                        ].map(([label, value]) => (
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
                </article>
            </section>
        </main>
    );
}
