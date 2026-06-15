import { createClient } from "@supabase/supabase-js";
import { isDaytillEvent } from "@/lib/daytill";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

function generateShareId(): string {
    // Unambiguous alphanumeric — no 0/O/I/l/1
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(7));
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function POST(request: Request) {
    const supabase = getSupabase();
    if (!supabase) {
        return Response.json({ error: "Service unavailable" }, { status: 503 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!isDaytillEvent(body)) {
        return Response.json({ error: "Invalid event payload" }, { status: 400 });
    }

    const shareId = generateShareId();

    const { error } = await supabase
        .from("event_shares")
        .insert({ id: shareId, event_data: body });

    if (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ shareId }, { status: 201 });
}
