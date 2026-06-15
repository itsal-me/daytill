import type { Metadata } from "next";
import Link from "next/link";
import { ProseLayout, ProseSection } from "@/components/prose-layout";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description:
        "Daytill privacy policy — how we handle local storage, Google sign-in, Supabase sync, and analytics.",
};

export default function PrivacyPolicyPage() {
    return (
        <ProseLayout
            eyebrow="Privacy Policy"
            title="Your event data should stay under your control."
        >
            <ProseSection heading="Local-first by default">
                <p>
                    When you use Daytill without signing in, all event data
                    stays in your browser's local storage. Nothing is sent to a
                    server. You can clear this data at any time by removing
                    events from the dashboard or clearing browser storage.
                </p>
            </ProseSection>

            <ProseSection heading="Google sign-in and cloud sync">
                <p>
                    If you choose to sign in with Google, your events are
                    stored in a Supabase-backed database associated with your
                    account. We store only the fields required to render
                    countdown cards and reminders: title, date, category,
                    reminder preferences, and an optional email address. We do
                    not store passwords.
                </p>
            </ProseSection>

            <ProseSection heading="Shared links">
                <p>
                    Share links encode the event payload in the URL. Only the
                    fields you choose to share are visible to people who
                    receive the link. You can delete an event at any time to
                    make existing share links inactive.
                </p>
            </ProseSection>

            <ProseSection heading="Browser notifications">
                <p>
                    Notification permission is optional and is requested only
                    when you click Enable reminders. You can revoke it at any
                    time in your browser settings.
                </p>
            </ProseSection>

            <ProseSection heading="Analytics">
                <p>
                    When configured, aggregate analytics (Google Analytics) are
                    used for traffic insights only. They do not override your
                    browser's privacy controls or tracker-blocking extensions.
                    We do not sell personal data.
                </p>
            </ProseSection>

            <ProseSection heading="Contact">
                <p>
                    For privacy questions, data deletion requests, or account
                    concerns, email{" "}
                    <Link
                        href="mailto:support@daytill.app"
                        className="text-link underline underline-offset-2"
                    >
                        support@daytill.app
                    </Link>
                    .
                </p>
            </ProseSection>
        </ProseLayout>
    );
}
