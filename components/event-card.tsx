"use client";

import { type KeyboardEvent, type MouseEvent } from "react";
import {
    createTargetDate,
    formatCountdown,
    formatDateLabel,
    isEventExpired,
    type DaytillEvent,
} from "@/lib/daytill";

export function EventCard({
    event,
    now,
    subtitle,
    isEditing,
    onOpen,
    onEdit,
    onCopy,
    onDelete,
    onIcs,
    onCalendar,
}: {
    event: DaytillEvent;
    now: number;
    subtitle: string;
    isEditing: boolean;
    onOpen: () => void;
    onEdit: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onIcs: () => void;
    onCalendar: () => void;
}) {
    const targetDate = createTargetDate(event);
    const countdown = formatCountdown(targetDate, now);
    const expired = isEventExpired(event, now);

    function handleCardKeyDown(e: KeyboardEvent<HTMLElement>) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
        }
    }

    function stop(action: () => void) {
        return (e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            action();
        };
    }

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={handleCardKeyDown}
            className={`rounded-3xl border bg-surface p-4 shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link ${
                isEditing
                    ? "border-link/40 ring-1 ring-link/20"
                    : "border-hairline hover:border-hairline-strong"
            }`}
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
                    {(
                        [
                            ["Days", countdown.days],
                            ["Hrs", countdown.hours],
                            ["Min", countdown.minutes],
                            ["Sec", countdown.seconds],
                        ] as const
                    ).map(([label, value]) => (
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

            {event.reminders.length > 0 || event.emailReminder ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {event.reminders.map((r) => (
                        <span
                            key={r}
                            className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-body"
                        >
                            {r === 0 ? "On the day" : `${r}d before`}
                        </span>
                    ))}
                    {event.emailReminder ? (
                        <span className="rounded-full border border-link/20 bg-link/10 px-3 py-1 text-xs font-medium text-link">
                            Email set
                        </span>
                    ) : null}
                </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={stop(onEdit)}
                    className={`rounded-pill border px-4 py-2 text-sm font-medium transition ${
                        isEditing
                            ? "border-link/40 bg-link/10 text-link"
                            : "border-hairline bg-surface text-ink hover:border-hairline-strong"
                    }`}
                >
                    {isEditing ? (
                        "Editing…"
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined">
                                edit
                            </span>
                            Edit
                        </div>
                    )}
                </button>
                <button
                    type="button"
                    onClick={stop(onCopy)}
                    className="rounded-pill border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-hairline-strong"
                >
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined">
                            content_copy
                        </span>
                        Copy link
                    </div>
                </button>
                <button
                    type="button"
                    onClick={stop(onCalendar)}
                    className="rounded-pill border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-hairline-strong"
                >
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined">
                            calendar_month
                        </span>
                        Google Cal
                    </div>
                </button>
                <button
                    type="button"
                    onClick={stop(onIcs)}
                    className="rounded-pill border border-hairline bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:border-hairline-strong"
                >
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined">
                            download
                        </span>
                        ICS
                    </div>
                </button>
                <button
                    type="button"
                    onClick={stop(onDelete)}
                    className="rounded-pill border border-error/30 bg-error-soft px-4 py-2 text-sm font-medium text-error-deep transition hover:border-error/50"
                >
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined">
                            delete
                        </span>
                        Delete
                    </div>
                </button>
            </div>
        </article>
    );
}
