import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact Us",
    description:
        "Contact the Daytill team for support, feedback, bug reports, and partnership inquiries.",
};

export default function ContactUsPage() {
    return (
        <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-ink sm:px-6 lg:px-8">
            <article className="rounded-4xl border border-hairline bg-surface p-8 shadow-card sm:p-10">
                <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-body">
                    Contact Us
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
                    We would love to hear from you.
                </h1>
                <p className="mt-6 text-base leading-8 text-body">
                    If you have product feedback, bug reports, collaboration
                    proposals, or support questions, contact the Daytill team
                    at:
                </p>
                <p className="mt-4 text-lg font-semibold text-ink">
                    support@daytill.app
                </p>
                <p className="mt-6 text-base leading-8 text-body">
                    We review messages regularly and aim to respond as quickly
                    as possible. For issues related to reminders, browser
                    notifications, shared links, or Supabase sign-in, include
                    your browser and device details so we can diagnose faster.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    If you are reporting a data issue, please mention whether
                    the event was saved locally or while signed in to your
                    account. That helps us identify whether the issue is browser
                    storage, cloud sync, or OAuth related.
                </p>
            </article>
        </main>
    );
}
