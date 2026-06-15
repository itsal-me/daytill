import type { Metadata } from "next";
import Link from "next/link";
import { ProseLayout, ProseSection } from "@/components/prose-layout";

export const metadata: Metadata = {
    title: "Terms and Conditions",
    description:
        "Daytill terms of service — account use, reminders, event sharing, and service limits.",
};

export default function TermsPage() {
    return (
        <ProseLayout
            eyebrow="Terms & Conditions"
            title="Fair use terms for Daytill."
        >
            <ProseSection heading="Acceptable use">
                <p>
                    By using Daytill you agree to use the service for lawful,
                    non-abusive purposes. You are responsible for the content
                    of event titles, descriptions, and shared links you create.
                </p>
            </ProseSection>

            <ProseSection heading="Service availability">
                <p>
                    Daytill is provided on an as-is basis. We may update
                    features, improve security, modify interfaces, or change
                    storage methods to maintain quality and reliability. We aim
                    for high availability but do not guarantee uninterrupted
                    access.
                </p>
            </ProseSection>

            <ProseSection heading="Reminders are supportive, not authoritative">
                <p>
                    Daytill reminders are planning tools. You should verify
                    critical deadlines independently. Do not rely solely on
                    Daytill alerts for legal, academic, medical, or financial
                    obligations.
                </p>
            </ProseSection>

            <ProseSection heading="Account security">
                <p>
                    If you use Google sign-in, you are responsible for keeping
                    your account access secure. All activity occurring while
                    you are signed in is your responsibility.
                </p>
            </ProseSection>

            <ProseSection heading="Shared pages">
                <p>
                    Shared countdown pages are view-only and contain only the
                    information embedded in the share link. You control sharing
                    by creating and deleting events on your dashboard.
                </p>
            </ProseSection>

            <ProseSection heading="Changes to these terms">
                <p>
                    We may update these terms as the product evolves. Continued
                    use after changes are published implies acceptance. For
                    questions, contact{" "}
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
