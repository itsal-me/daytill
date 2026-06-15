import { createClient } from "@supabase/supabase-js";
import { isDaytillEvent } from "@/lib/daytill";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    const supabase = getSupabase();
    if (!supabase) {
        return Response.json({ error: "Service unavailable" }, { status: 503 });
    }

    const { data, error } = await supabase
        .from("event_shares")
        .select("event_data")
        .eq("id", id)
        .single();

    if (error || !data) {
        return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (!isDaytillEvent(data.event_data)) {
        return Response.json({ error: "Corrupt share data" }, { status: 500 });
    }

    return Response.json(data.event_data);
}
