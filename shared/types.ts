// Gemeinsame Typen für Frontend (src/) und Backend (functions/, server/)

export const COLOR_KEYS = ['blue', 'sky', 'emerald', 'amber', 'orange', 'red', 'rose', 'violet', 'slate'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

/** Lokale Zeit im Format 'YYYY-MM-DDTHH:MM' */
export const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;
/** 'HH:MM' */
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
/** 'YYYY-MM-DD' */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: ColorKey;
  notes: string | null;
  templateId: string | null;
  seriesId: string | null;
  /** Mitglied der Gruppe; null = niemand Bestimmtes */
  memberId: string | null;
}

export type EventInput = Omit<CalendarEvent, 'id'>;

export interface Template {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: ColorKey;
  sortOrder: number;
  memberId: string | null;
}

export type TemplateInput = Omit<Template, 'id'>;

export interface Member {
  id: string;
  name: string;
  color: ColorKey;
  sortOrder: number;
}

export type MemberInput = Omit<Member, 'id'>;
