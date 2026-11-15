import { useEffect, useState } from 'react';
import type { CalendarEvent, EventInput, Member, MemberInput, Template, TemplateInput } from '../shared/types';
import { sortEvents } from './lib/date';
import { DEFAULT_TEMPLATES, sortTemplates } from './lib/templates';
import { DEFAULT_MEMBERS, sortMembers } from './lib/members';
import { uid } from './lib/util';

export type DeleteScope = 'single' | 'series';

export interface CalendarApi {
  listEvents(from: string, to: string): Promise<CalendarEvent[]>;
  createEvents(inputs: EventInput[]): Promise<CalendarEvent[]>;
  updateEvent(id: string, input: EventInput): Promise<CalendarEvent>;
  /** liefert die IDs aller gelöschten Termine */
  deleteEvent(id: string, scope?: DeleteScope): Promise<string[]>;
  listTemplates(): Promise<Template[]>;
  createTemplate(input: TemplateInput): Promise<Template>;
  updateTemplate(id: string, input: TemplateInput): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  listMembers(): Promise<Member[]>;
  createMember(input: MemberInput): Promise<Member>;
  updateMember(id: string, input: MemberInput): Promise<Member>;
  deleteMember(id: string): Promise<void>;
}

// ---------- Cloudflare-Backend (/api → Pages Functions + D1) ----------

class BackendUnavailable extends Error {}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  } catch {
    throw new BackendUnavailable('Server nicht erreichbar');
  }
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    throw new BackendUnavailable(`Unerwartete Serverantwort (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

const enc = encodeURIComponent;

const remote: CalendarApi = {
  listEvents: (from, to) => http<CalendarEvent[]>(`/api/events?from=${from}&to=${to}`),
  createEvents: (inputs) => http<CalendarEvent[]>('/api/events', { method: 'POST', body: JSON.stringify(inputs) }),
  updateEvent: (id, input) =>
    http<CalendarEvent>(`/api/events/${enc(id)}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteEvent: async (id, scope = 'single') =>
    (await http<{ deleted: string[] }>(`/api/events/${enc(id)}?scope=${scope}`, { method: 'DELETE' })).deleted,
  listTemplates: () => http<Template[]>('/api/templates'),
  createTemplate: (input) => http<Template>('/api/templates', { method: 'POST', body: JSON.stringify(input) }),
  updateTemplate: (id, input) =>
    http<Template>(`/api/templates/${enc(id)}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteTemplate: async (id) => {
    await http(`/api/templates/${enc(id)}`, { method: 'DELETE' });
  },
  listMembers: () => http<Member[]>('/api/members'),
  createMember: (input) => http<Member>('/api/members', { method: 'POST', body: JSON.stringify(input) }),
  updateMember: (id, input) => http<Member>(`/api/members/${enc(id)}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteMember: async (id) => {
    await http(`/api/members/${enc(id)}`, { method: 'DELETE' });
  },
};

// ---------- Lokaler Demo-Modus (nur `npm run dev` ohne laufendes Backend) ----------

const LS_EVENTS = 'fc.events';
const LS_TEMPLATES = 'fc.templates';
const LS_MEMBERS = 'fc.members';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Speicher nicht verfügbar – Demo läuft dann nur im Arbeitsspeicher */
  }
}

const local: CalendarApi = {
  async listEvents(from, to) {
    const s = `${from}T00:00`;
    const e = `${to}T00:00`;
    return sortEvents(load<CalendarEvent[]>(LS_EVENTS, []).filter((ev) => ev.start < e && (ev.end > s || ev.start >= s)));
  },
  async createEvents(inputs) {
    const created = inputs.map((i) => ({ ...i, id: uid() }));
    save(LS_EVENTS, [...load<CalendarEvent[]>(LS_EVENTS, []), ...created]);
    return created;
  },
  async updateEvent(id, input) {
    const updated = { ...input, id };
    save(LS_EVENTS, load<CalendarEvent[]>(LS_EVENTS, []).map((e) => (e.id === id ? updated : e)));
    return updated;
  },
  async deleteEvent(id, scope = 'single') {
    const all = load<CalendarEvent[]>(LS_EVENTS, []);
    const target = all.find((e) => e.id === id);
    if (!target) return [];
    const ids =
      scope === 'series' && target.seriesId
        ? all.filter((e) => e.seriesId === target.seriesId).map((e) => e.id)
        : [id];
    save(LS_EVENTS, all.filter((e) => !ids.includes(e.id)));
    return ids;
  },
  async listTemplates() {
    return sortTemplates(load(LS_TEMPLATES, DEFAULT_TEMPLATES));
  },
  async createTemplate(input) {
    const created = { ...input, id: uid() };
    save(LS_TEMPLATES, [...load(LS_TEMPLATES, DEFAULT_TEMPLATES), created]);
    return created;
  },
  async updateTemplate(id, input) {
    const updated = { ...input, id };
    save(LS_TEMPLATES, load(LS_TEMPLATES, DEFAULT_TEMPLATES).map((t) => (t.id === id ? updated : t)));
    return updated;
  },
  async deleteTemplate(id) {
    save(LS_TEMPLATES, load(LS_TEMPLATES, DEFAULT_TEMPLATES).filter((t) => t.id !== id));
  },
  async listMembers() {
    return sortMembers(load(LS_MEMBERS, DEFAULT_MEMBERS));
  },
  async createMember(input) {
    const created = { ...input, id: uid() };
    save(LS_MEMBERS, [...load(LS_MEMBERS, DEFAULT_MEMBERS), created]);
    return created;
  },
  async updateMember(id, input) {
    const updated = { ...input, id };
    const all = load(LS_MEMBERS, DEFAULT_MEMBERS);
    const old = all.find((m) => m.id === id)?.color;
    save(LS_MEMBERS, all.map((m) => (m.id === id ? updated : m)));
    save(LS_EVENTS, load<CalendarEvent[]>(LS_EVENTS, []).map((e) => (e.memberId === id && e.color === old ? { ...e, color: input.color } : e)));
    save(LS_TEMPLATES, load(LS_TEMPLATES, DEFAULT_TEMPLATES).map((t) => (t.memberId === id && t.color === old ? { ...t, color: input.color } : t)));
    return updated;
  },
  async deleteMember(id) {
    save(LS_MEMBERS, load(LS_MEMBERS, DEFAULT_MEMBERS).filter((m) => m.id !== id));
    save(LS_EVENTS, load<CalendarEvent[]>(LS_EVENTS, []).map((e) => (e.memberId === id ? { ...e, memberId: null } : e)));
    save(LS_TEMPLATES, load(LS_TEMPLATES, DEFAULT_TEMPLATES).map((t) => (t.memberId === id ? { ...t, memberId: null } : t)));
  },
};

// ---------- Auswahl des Backends ----------

let active: CalendarApi | null = null;
let probing: Promise<CalendarApi> | null = null;
let localMode = false;
const listeners = new Set<(local: boolean) => void>();

function resolve(): Promise<CalendarApi> {
  if (active) return Promise.resolve(active);
  probing ??= remote.listTemplates().then(
    () => (active = remote),
    (err) => {
      probing = null;
      if (import.meta.env.DEV && err instanceof BackendUnavailable) {
        console.warn('[Kalender] Kein Backend erreichbar – lokaler Demo-Modus (localStorage).');
        localMode = true;
        listeners.forEach((fn) => fn(true));
        return (active = local);
      }
      throw err;
    },
  );
  return probing;
}

export const api: CalendarApi = {
  listEvents: (from, to) => resolve().then((a) => a.listEvents(from, to)),
  createEvents: (inputs) => resolve().then((a) => a.createEvents(inputs)),
  updateEvent: (id, input) => resolve().then((a) => a.updateEvent(id, input)),
  deleteEvent: (id, scope) => resolve().then((a) => a.deleteEvent(id, scope)),
  listTemplates: () => resolve().then((a) => a.listTemplates()),
  createTemplate: (input) => resolve().then((a) => a.createTemplate(input)),
  updateTemplate: (id, input) => resolve().then((a) => a.updateTemplate(id, input)),
  deleteTemplate: (id) => resolve().then((a) => a.deleteTemplate(id)),
  listMembers: () => resolve().then((a) => a.listMembers()),
  createMember: (input) => resolve().then((a) => a.createMember(input)),
  updateMember: (id, input) => resolve().then((a) => a.updateMember(id, input)),
  deleteMember: (id) => resolve().then((a) => a.deleteMember(id)),
};

export function useLocalMode(): boolean {
  const [value, setValue] = useState(localMode);
  useEffect(() => {
    const fn = (v: boolean) => setValue(v);
    listeners.add(fn);
    setValue(localMode);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return value;
}
