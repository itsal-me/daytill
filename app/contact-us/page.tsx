import type { Metadata } from "next";
import Link from "next/link";
import { ProseLayout, ProseSection } from "@/components/prose-layout";

export const metadata: Metadata = {
    title: "Contact Us",
    description:
        "Contact the Daytill team for support, feedback, bug reports, and partnership inquiries.",
};

export default function ContactUsPage() {
    return (
        <ProseLayout
            eyebrow="Contact Us"
            title="We would love to hear from you."
        >
            <ProseSection>
                <p>
                    For support questions, bug reports, feedback, and
                    collaboration proposals, reach the Daytill team at:
                </p>
                <p>
                    <Link
                        href="mailto:support@daytill.app"
                        className="font-semibold text-ink underline underline-offset-2 hover:text-link"
                    >
                        support@daytill.app
                    </Link>
                </p>
            </ProseSection>

            <ProseSection heading="Bug reports">
                <p>
                    Include your browser name and version, operating system,
                    and a short description of what you expected vs what
                    happened. If the issue involves reminders or shared links,
                    mention whether the event was saved locally or while signed
                    in to an account.
                </p>
            </ProseSection>

            <ProseSection heading="Response time">
                <p>
                    We review messages regularly and aim to respond within one
                    business day. Security concerns are treated with priority —
                    please mark your email subject with{" "}
                    <span className="rounded bg-canvas-soft-2 px-1.5 py-0.5 font-mono text-sm text-ink">
                        [security]
                    </span>{" "}
                    so we can triage quickly.
                </p>
            </ProseSection>
        </ProseLayout>
    );
}
