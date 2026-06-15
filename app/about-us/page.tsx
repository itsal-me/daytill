import type { Metadata } from "next";
import { ProseLayout, ProseSection } from "@/components/prose-layout";

export const metadata: Metadata = {
    title: "About Us",
    description:
        "Daytill is a local-first countdown and reminder app for birthdays, exams, deadlines, trips, and anniversaries.",
};

export default function AboutUsPage() {
    return (
        <ProseLayout
            eyebrow="About Daytill"
            title="Built to help people stay ready for what matters."
        >
            <ProseSection>
                <p>
                    Daytill is a countdown and reminder app focused on clarity,
                    speed, and reliability. It gives students, professionals,
                    families, and teams one place to track exams, deadlines,
                    birthdays, trips, anniversaries, launches, and other
                    important milestones.
                </p>
            </ProseSection>

            <ProseSection heading="Local-first, always">
                <p>
                    Every event starts in your browser — no account, no
                    sign-up, no friction. Your countdown data stays on your
                    device by default. When you are ready to sync across
                    devices, Google sign-in with Supabase is one click away.
                </p>
            </ProseSection>

            <ProseSection heading="Shareable by design">
                <p>
                    Each event generates a unique, embeddable share link that
                    opens a clean, view-only countdown page. The same countdown
                    works as a personal planning tool and as a public
                    status page you can hand to a team or post anywhere.
                </p>
            </ProseSection>

            <ProseSection heading="What's next">
                <p>
                    Daytill is actively developed. Upcoming: email reminders,
                    recurring event support improvements, and richer
                    notification options. We build in the open and ship fast.
                </p>
            </ProseSection>
        </ProseLayout>
    );
}
