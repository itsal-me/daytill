import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Pricing",
    description:
        "Daytill Free forever or Pro at $2.49/month — cloud sync, themes, and email reminders.",
};

const freeFeatures = [
    "Unlimited countdown events",
    "Live timer (days, hours, minutes, seconds)",
    "6 event categories",
    "Browser reminders (7d, 1d, day-of)",
    "Shareable short links",
    "Google Calendar & ICS export",
    "Local-first — no account required",
];

const proFeatures = [
    "Everything in Free",
    "Cloud sync across all devices",
    "5 custom themes & backgrounds",
    "Email reminders",
    "Priority support",
];

function CheckIcon({ dim }: { dim?: boolean }) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            className={`mt-0.5 h-4 w-4 shrink-0 ${dim ? "text-primary-foreground/40" : "text-ink"}`}
            aria-hidden="true"
        >
            <circle
                cx="8"
                cy="8"
                r="7"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.25"
            />
            <path
                d="M5 8l2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function PricingPage() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-page text-ink">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="mesh-gradient absolute left-1/2 -top-40 h-112 w-xl -translate-x-1/2 rounded-full blur-3xl opacity-50" />
                <div className="noise-layer absolute inset-0 opacity-[0.04]" />
            </div>

            <section className="relative mx-auto w-full max-w-350 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-body">
                        Pricing
                    </p>
                    <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl">
                        Simple, honest pricing.
                    </h1>
                    <p className="mt-5 text-lg leading-8 text-body">
                        Start for free — no card, no account. Upgrade to Pro
                        for sync, themes, and email reminders.
                    </p>
                </div>

                <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-2">
                    {/* Free tier */}
                    <div className="flex flex-col rounded-xl border border-hairline bg-surface p-8 shadow-[0_1px_1px_rgba(0,0,0,0.04),0_2px_2px_rgba(0,0,0,0.04),inset_0_0_0_1px_rgba(0,0,0,0.04)]">
                        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-body">
                            Free
                        </p>
                        <div className="mt-4 flex items-end gap-1">
                            <span className="text-5xl font-semibold tracking-[-0.04em] text-ink">
                                $0
                            </span>
                            <span className="mb-1.5 text-sm text-body">
                                / forever
                            </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-body">
                            Everything you need to stay on top of important
                            dates, right in your browser.
                        </p>

                        <Link
                            href="/#event-form"
                            className="mt-6 inline-flex h-10 items-center justify-center rounded-pill border border-hairline bg-surface px-5 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-hairline-strong"
                        >
                            Start for free
                        </Link>

                        <ul className="mt-8 space-y-3">
                            {freeFeatures.map((f) => (
                                <li key={f} className="flex items-start gap-3 text-sm text-body">
                                    <CheckIcon />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pro tier */}
                    <div className="flex flex-col rounded-xl bg-primary p-8 shadow-[0_1px_1px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.18)]">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary-foreground/70">
                                Pro
                            </p>
                            <span className="rounded-full bg-primary-foreground/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary-foreground/60">
                                Most popular
                            </span>
                        </div>
                        <div className="mt-4 flex items-end gap-1">
                            <span className="text-5xl font-semibold tracking-[-0.04em] text-primary-foreground">
                                $2.49
                            </span>
                            <span className="mb-1.5 text-sm text-primary-foreground/60">
                                / month
                            </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-primary-foreground/70">
                            Sync across devices, personalise your experience,
                            and never miss a date with email reminders.
                        </p>

                        <button
                            type="button"
                            disabled
                            className="mt-6 inline-flex h-10 cursor-not-allowed items-center justify-center rounded-pill bg-primary-foreground/10 px-5 text-sm font-medium text-primary-foreground/40"
                            title="Payments coming soon — contact us to get Pro access"
                        >
                            Coming soon
                        </button>

                        <ul className="mt-8 space-y-3">
                            {proFeatures.map((f) => (
                                <li key={f} className="flex items-start gap-3 text-sm text-primary-foreground/80">
                                    <CheckIcon dim />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* FAQ row */}
                <div className="mx-auto mt-16 max-w-2xl space-y-4">
                    <h2 className="text-center text-xl font-semibold tracking-[-0.03em] text-ink">
                        Questions
                    </h2>

                    {[
                        {
                            q: "How do I get Pro access right now?",
                            a: "Payments are not live yet. Email support@daytill.app and we will manually grant Pro access so you can experience every feature.",
                        },
                        {
                            q: "What counts as cloud sync?",
                            a: "Sign in with Google on any device and your events follow you. Free users keep events in browser local storage only.",
                        },
                        {
                            q: "What themes are included in Pro?",
                            a: "Five background themes: Rose, Ocean, Forest, Violet, and Midnight. Each applies a subtle colour tint to the page background.",
                        },
                        {
                            q: "Can I try Pro before paying?",
                            a: "Yes — reach out and we will grant a trial. Payments will be handled by Stripe once the billing flow is live.",
                        },
                    ].map(({ q, a }) => (
                        <details
                            key={q}
                            className="rounded-xl border border-hairline bg-surface p-5"
                        >
                            <summary className="cursor-pointer text-sm font-semibold text-ink">
                                {q}
                            </summary>
                            <p className="mt-3 text-sm leading-7 text-body">{a}</p>
                        </details>
                    ))}
                </div>

                <div className="mx-auto mt-12 max-w-xl text-center">
                    <p className="text-sm text-body">
                        More questions?{" "}
                        <Link
                            href="/contact-us"
                            className="text-link underline underline-offset-2 transition hover:text-link/80"
                        >
                            Contact us
                        </Link>{" "}
                        and we'll get back to you quickly.
                    </p>
                </div>
            </section>
        </main>
    );
}
