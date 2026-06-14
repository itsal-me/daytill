import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms and Conditions",
    description:
        "Review the Daytill terms and conditions covering account use, reminders, event sharing, and service limits.",
};

export default function TermsPage() {
    return (
        <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-ink sm:px-6 lg:px-8">
            <article className="rounded-4xl border border-hairline bg-surface p-8 shadow-card sm:p-10">
                <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-body">
                    Terms &amp; Conditions
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
                    Fair use terms for Daytill.
                </h1>
                <p className="mt-6 text-base leading-8 text-body">
                    By using Daytill, you agree to use the service for lawful
                    and non-abusive purposes. You are responsible for any
                    content entered into event titles, reminders, and shared
                    links.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    Daytill is provided on an as-is basis without warranties of
                    uninterrupted availability. We may update features, improve
                    security, modify interfaces, or change storage methods over
                    time to maintain service quality and reliability.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    You should verify critical deadlines independently. Daytill
                    reminders are intended as supportive planning tools and
                    should not be your sole alert system for legal, academic,
                    medical, or financial obligations.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    Shared countdown pages are view-only. If you use Google
                    sign-in or Supabase-backed syncing, you are responsible for
                    keeping your account access secure and for any activity that
                    occurs while you are signed in.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    Continued use of Daytill after updates implies acceptance of
                    revised terms.
                </p>
            </article>
        </main>
    );
}
