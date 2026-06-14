import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DaytillEvent, EventCategory } from "@/lib/daytill";

export type EventRow = {
    id: string;
    user_id: string;
    title: string;
    event_date: string;
    event_time: string | null;
    category: string;
    recurring_yearly: boolean;
    reminders: number[];
    email_reminder: string | null;
    created_at: string;
};

let browserClient: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient() {
    if (browserClient !== undefined) {
        return browserClient;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        browserClient = null;
        return browserClient;
    }

    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });

    return browserClient;
}

export function rowToEvent(row: EventRow): DaytillEvent {
    const category = row.category as EventCategory;

    return {
        id: row.id,
        title: row.title,
        date: row.event_date,
        time: row.event_time ?? undefined,
        category,
        recurringYearly: row.recurring_yearly,
        reminders: Array.isArray(row.reminders) ? row.reminders : [],
        emailReminder: row.email_reminder ?? undefined,
        createdAt: row.created_at,
    };
}

export function eventToRow(userId: string, event: DaytillEvent) {
    return {
        id: event.id,
        user_id: userId,
        title: event.title,
        event_date: event.date,
        event_time: event.time ?? null,
        category: event.category,
        recurring_yearly: event.recurringYearly,
        reminders: event.reminders,
        email_reminder: event.emailReminder ?? null,
        created_at: event.createdAt,
    };
}
