import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Us",
    description:
        "Learn about Daytill, the local-first countdown app for birthdays, exams, deadlines, trips, and anniversaries.",
};

export default function AboutUsPage() {
    return (
        <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-ink sm:px-6 lg:px-8">
            <article className="rounded-4xl border border-hairline bg-surface p-8 shadow-card sm:p-10">
                <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-body">
                    About Daytill
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
                    Built to help people stay ready for important dates.
                </h1>
                <p className="mt-6 text-base leading-8 text-body">
                    Daytill is a countdown and reminder application focused on
                    clarity, speed, and reliability. It gives students,
                    professionals, families, and teams one place to track exams,
                    deadlines, birthdays, trips, anniversaries, launches, and
                    other important milestones.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    Our product philosophy is local-first, fast, and
                    distraction-free. You can start creating event cards
                    immediately without setting up an account, then optionally
                    connect Google sign-in through Supabase when you want your
                    countdowns to follow you across devices.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    Every event can open its own shareable page, so the same
                    countdown works both as a personal planning tool and a
                    public view-only status page. Daytill continues to evolve
                    with stronger reminder tools, accessibility improvements,
                    and account syncing for users who need it.
                </p>
            </article>
        </main>
    );
}
