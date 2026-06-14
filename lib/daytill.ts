export type EventCategory = 'Study' | 'Personal' | 'Work' | 'Trip' | 'Birthday' | 'Anniversary';

export type DaytillEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: EventCategory;
  recurringYearly: boolean;
  reminders: number[];
  emailReminder?: string;
  createdAt: string;
};

export const CATEGORY_OPTIONS: EventCategory[] = ['Study', 'Personal', 'Work', 'Trip', 'Birthday', 'Anniversary'];
export const DEFAULT_REMINDERS = [7, 1, 0];

export function loadEvents(storageKey: string): DaytillEvent[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    const parsed = rawValue ? (JSON.parse(rawValue) as unknown) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isDaytillEvent);
  } catch {
    return [];
  }
}

export function isDaytillEvent(value: unknown): value is DaytillEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<DaytillEvent>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.recurringYearly === 'boolean' &&
    Array.isArray(candidate.reminders)
  );
}

export function createTargetDate(event: DaytillEvent, reference = new Date()) {
  const [year, month, day] = event.date.split('-').map(Number);
  const [hours = 0, minutes = 0] = (event.time || '00:00').split(':').map(Number);
  const target = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (event.recurringYearly) {
    while (target.getTime() < reference.getTime()) {
      target.setFullYear(target.getFullYear() + 1);
    }
  }

  return target;
}

export function getUpcomingTarget(event: DaytillEvent, reference = Date.now()) {
  return createTargetDate(event, new Date(reference));
}

export function isEventExpired(event: DaytillEvent, reference = Date.now()) {
  if (event.recurringYearly) {
    return false;
  }

  return createTargetDate(event).getTime() < reference;
}

export function sortEvents(events: DaytillEvent[], reference = Date.now()) {
  return [...events].sort((left, right) => {
    const leftTarget = createTargetDate(left, new Date(reference));
    const rightTarget = createTargetDate(right, new Date(reference));
    const leftExpired = isEventExpired(left, reference);
    const rightExpired = isEventExpired(right, reference);

    if (leftExpired !== rightExpired) {
      return leftExpired ? 1 : -1;
    }

    return leftTarget.getTime() - rightTarget.getTime();
  });
}

export function formatCountdown(target: Date, now: number) {
  const difference = Math.max(0, target.getTime() - now);
  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

export function summarizeCountdown(event: DaytillEvent, now: number) {
  const target = createTargetDate(event);
  const countdown = formatCountdown(target, now);

  if (isEventExpired(event, now)) {
    return 'Completed';
  }

  return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;
}

export function formatDateLabel(target: Date) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(target);
}

export function encodeEventPayload(event: DaytillEvent) {
  return encodeURIComponent(JSON.stringify(event));
}

export function decodeEventPayload(payload?: string) {
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(payload)) as unknown;
    return isDaytillEvent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function buildShareUrl(event: DaytillEvent, origin: string) {
  return `${origin}/event/${event.id}?payload=${encodeEventPayload(event)}`;
}

export function buildCalendarUrl(event: DaytillEvent) {
  const target = createTargetDate(event);
  const start = target.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(target.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const text = encodeURIComponent(event.title);
  const details = encodeURIComponent(`Countdown created in Daytill for ${event.category}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
}

export function buildIcsDocument(event: DaytillEvent, targetDate: Date) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const start = targetDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(targetDate.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Daytill//Countdown Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@daytill`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(`Category: ${event.category}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}