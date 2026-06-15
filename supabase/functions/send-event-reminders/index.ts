import { createClient } from "npm:@supabase/supabase-js@2";

type EventRow = {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  category: string;
  recurring_yearly: boolean;
  reminders: number[];
  email_reminder: string | null;
};

type DueReminder = {
  event: EventRow;
  targetDateKey: string;
  reminderDays: number;
  targetAt: Date;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authorization = request.headers.get("authorization");

  if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM");

  if (!resendApiKey || !emailFrom) {
    return json(
      { error: "Missing RESEND_API_KEY or EMAIL_FROM function secret" },
      500,
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    getServiceRoleKey(),
  );

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,user_id,title,event_date,event_time,category,recurring_yearly,reminders,email_reminder",
    )
    .not("email_reminder", "is", null);

  if (error) {
    return json({ error: error.message }, 500);
  }

  const now = new Date();
  const dueReminders = (data ?? []).flatMap((event) =>
    getDueReminders(event as EventRow, now),
  );

  const results = [];

  for (const reminder of dueReminders) {
    const alreadySent = await hasAlreadySent(supabase, reminder);

    if (alreadySent) {
      results.push({ eventId: reminder.event.id, status: "already_sent" });
      continue;
    }

    const sendResult = await sendReminderEmail(
      resendApiKey,
      emailFrom,
      reminder,
    );

    if (!sendResult.ok) {
      results.push({
        eventId: reminder.event.id,
        status: "send_failed",
        error: await sendResult.text(),
      });
      continue;
    }

    const { error: insertError } = await supabase
      .from("event_email_notifications")
      .insert({
        event_id: reminder.event.id,
        user_id: reminder.event.user_id,
        target_date: reminder.targetDateKey,
        reminder_days: reminder.reminderDays,
      });

    results.push({
      eventId: reminder.event.id,
      status: insertError ? "log_failed" : "sent",
      error: insertError?.message,
    });
  }

  return json({
    checked: data?.length ?? 0,
    due: dueReminders.length,
    results,
  });
});

function getServiceRoleKey() {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (legacyKey) {
    return legacyKey;
  }

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (!secretKeys) {
    throw new Error("Missing Supabase service role secret");
  }

  return JSON.parse(secretKeys).default;
}

function getDueReminders(event: EventRow, now: Date): DueReminder[] {
  if (!event.email_reminder || !Array.isArray(event.reminders)) {
    return [];
  }

  const targetAt = getTargetDate(event, now);
  const targetDateKey = targetAt.toISOString().slice(0, 10);
  const expiresAt = new Date(targetAt.getTime() + 24 * 60 * 60 * 1000);

  return event.reminders
    .filter((reminderDays) => Number.isFinite(reminderDays))
    .filter((reminderDays) => {
      const reminderAt = new Date(
        targetAt.getTime() - reminderDays * 24 * 60 * 60 * 1000,
      );

      return now >= reminderAt && now < expiresAt;
    })
    .map((reminderDays) => ({
      event,
      targetAt,
      targetDateKey,
      reminderDays,
    }));
}

function getTargetDate(event: EventRow, now: Date) {
  const [year, month, day] = event.event_date.split("-").map(Number);
  const [hours = 0, minutes = 0] = (event.event_time ?? "00:00")
    .split(":")
    .map(Number);
  const targetAt = new Date(Date.UTC(year, month - 1, day, hours, minutes));

  if (event.recurring_yearly) {
    while (targetAt.getTime() < now.getTime()) {
      targetAt.setUTCFullYear(targetAt.getUTCFullYear() + 1);
    }
  }

  return targetAt;
}

async function hasAlreadySent(
  supabase: ReturnType<typeof createClient>,
  reminder: DueReminder,
) {
  const { data, error } = await supabase
    .from("event_email_notifications")
    .select("id")
    .eq("event_id", reminder.event.id)
    .eq("target_date", reminder.targetDateKey)
    .eq("reminder_days", reminder.reminderDays)
    .maybeSingle();

  return Boolean(data && !error);
}

async function sendReminderEmail(
  resendApiKey: string,
  emailFrom: string,
  reminder: DueReminder,
) {
  const subject = `Daytill reminder: ${reminder.event.title}`;
  const label =
    reminder.reminderDays === 0
      ? "today"
      : `in ${reminder.reminderDays} day${
          reminder.reminderDays === 1 ? "" : "s"
        }`;
  const targetLabel = new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(reminder.targetAt);

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: reminder.event.email_reminder,
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717">
          <h1 style="font-size:24px;margin:0 0 12px">Your event is ${label}</h1>
          <p><strong>${escapeHtml(reminder.event.title)}</strong></p>
          <p>Category: ${escapeHtml(reminder.event.category)}</p>
          <p>When: ${escapeHtml(targetLabel)}</p>
          <p style="color:#5f5f5f">This reminder was sent by Daytill.</p>
        </div>
      `,
    }),
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
