import type { Metadata } from "next";
import { SharedEventView } from "@/components/shared-event-view";

type PageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ payload?: string }>;
};

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { id } = await params;

    return {
        title: `Daytill · Event ${id}`,
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
