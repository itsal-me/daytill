import type { Metadata } from "next";
import { DaytillApp } from "@/components/daytill-app";

export const metadata: Metadata = {
    title: "Countdown App for Events and Reminders",
    description:
        "Daytill is a multi-page countdown and reminder app that helps you track birthdays, exams, deadlines, trips, and anniversaries with live event cards and shareable countdown pages.",
};

const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
        {
            "@type": "Question",
            name: "How does Daytill store my events?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Daytill starts with browser local storage, so your countdown events remain in your current device and browser unless you choose to share them.",
            },
        },
        {
            "@type": "Question",
            name: "Can I share a countdown with friends or team members?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Every event can generate a unique shareable link that opens a clean, view-only countdown page.",
            },
        },
        {
            "@type": "Question",
            name: "Does Daytill support reminders?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. You can set reminders for 7 days before, 1 day before, and on the day. Browser notifications are available when permission is granted.",
            },
        },
    ],
};

export default function HomePage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <DaytillApp />
        </>
    );
}
