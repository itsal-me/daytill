import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { decodeEventPayload, isDaytillEvent } from "@/lib/daytill";
import { SharedEventView } from "@/components/shared-event-view";

type PageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ payload?: string }>;
};

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

export async function generateMetadata({
    params,
    searchParams,
}: PageProps): Promise<Metadata> {
    const { id } = await params;
    const { payload } = await searchParams;

    // Payload in URL (legacy long-form links and internal navigation)
    const fromPayload = decodeEventPayload(payload);
    if (fromPayload) {
        return {
            title: fromPayload.title,
            description: `Live countdown to ${fromPayload.title} — a shared Daytill event.`,
            openGraph: {
                title: `${fromPayload.title} — Daytill countdown`,
                description: `Track the countdown to ${fromPayload.title} (${fromPayload.category}).`,
            },
        };
    }

    // Short share ID — look up in event_shares
    const supabase = getSupabase();
    if (supabase) {
        const { data } = await supabase
            .from("event_shares")
            .select("event_data")
            .eq("id", id)
            .single();

        if (data && isDaytillEvent(data.event_data)) {
            const event = data.event_data;
            return {
                title: event.title,
                description: `Live countdown to ${event.title} — a shared Daytill event.`,
                openGraph: {
                    title: `${event.title} — Daytill countdown`,
                    description: `Track the countdown to ${event.title} (${event.category}).`,
                },
            };
        }
    }

    return {
        title: "Shared Countdown",
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
