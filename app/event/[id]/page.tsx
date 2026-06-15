import type { Metadata } from "next";
import { decodeEventPayload } from "@/lib/daytill";
import { SharedEventView } from "@/components/shared-event-view";

type PageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ payload?: string }>;
};

export async function generateMetadata({
    params,
    searchParams,
}: PageProps): Promise<Metadata> {
    const { id } = await params;
    const { payload } = await searchParams;
    const event = decodeEventPayload(payload);

    if (event) {
        return {
            title: event.title,
            description: `Live countdown to ${event.title} — a shared Daytill event.`,
            openGraph: {
                title: `${event.title} — Daytill countdown`,
                description: `Track the countdown to ${event.title} (${event.category}).`,
            },
        };
    }

    return {
        title: `Shared Event ${id}`,
        description: "Shared Daytill countdown page.",
    };
}

export default async function SharedEventPage({
    params,
    searchParams,
}: PageProps) {
    const { id } = await params;
    const { payload } = await searchParams;

    return <SharedEventView eventId={id} initialPayload={payload} />;
}
