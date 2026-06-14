import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description:
        "Read the Daytill privacy policy describing local storage, Google sign-in, Supabase syncing, and analytics.",
};

export default function PrivacyPolicyPage() {
    return (
        <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-ink sm:px-6 lg:px-8">
            <article className="rounded-4xl border border-hairline bg-surface p-8 shadow-card sm:p-10">
                <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-body">
                    Privacy Policy
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
                    Your event data should stay under your control.
                </h1>
                <p className="mt-6 text-base leading-8 text-body">
                    Daytill is designed with a local-first approach. When you
                    use the app without signing in, event information stays in
                    your browser local storage and is not transmitted to a
                    remote account system.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    If you sign in with Google, your events are stored in your
                    Supabase account so they can sync across devices. We only
                    store the event fields needed to render your countdown
                    cards, reminders, and shared pages.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    If you generate a share link, only the information embedded
                    in that link is visible to people you choose to share it
                    with. You can remove events at any time from your dashboard
                    to stop local or cloud-backed use.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    Browser notification permissions are optional and controlled
                    by your browser settings. Analytics, when configured, are
                    used for aggregate traffic insights and do not replace your
                    browser privacy controls. We do not intentionally sell
                    personal event data.
                </p>
                <p className="mt-4 text-base leading-8 text-body">
                    For privacy-related questions, data deletion requests, or
                    account concerns, contact us at support@daytill.app.
                </p>
            </article>
        </main>
    );
}
