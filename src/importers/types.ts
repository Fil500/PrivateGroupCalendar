import type { ColorKey, EventInput, Member, Template } from '../../shared/types';

/** Ein Eintrag in der Import-Vorschau. */
export interface ImportEntry {
  key: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** kurze Bezeichnung in der Vorschau, z. B. Kürzel oder Titel */
  code: string;
  /** null = nicht erkannt, wird nicht eingetragen */
  input: EventInput | null;
  /** z. B. Uhrzeit oder Grund, warum der Eintrag nicht erkannt wurde */
  label: string;
  color: ColorKey;
}

export interface ImportPlan {
  /** Überschrift der Vorschau, z. B. „Schulferien 2027“ */
  title: string;
  /** In diesem Zeitraum wird nach früher importierten und bereits eingetragenen Terminen gesucht ('YYYY-MM-DD', `to` exklusiv). */
  from: string;
  to: string;
  /** Termine, deren seriesId so beginnt, stammen aus einem früheren Import und werden ersetzt (null = nichts ersetzen). */
  replacePrefix: string | null;
  entries: ImportEntry[];
  /** Hinweis, wenn die Datei keine passenden Einträge enthält */
  emptyMessage: string;
}

export interface ImportContext {
  templates: Template[];
  members: Member[];
}

/**
 * Ein Importformat. Jeder Ordner unter src/importers/ mit einer index.ts, die ein Importer als default exportiert,
 * wird automatisch angeboten (siehe index.ts).
 */
export interface Importer {
  id: string;
  /** Name im Auswahlmenü, z. B. „Kalenderdatei (.ics)“ */
  label: string;
  /** kurze Erklärung vor der Dateiauswahl */
  description: string;
  /** für <input accept> */
  accept: string;
  /** Beschriftung der Dateiauswahl, z. B. „PDF auswählen“ */
  fileLabel: string;
  /** Reihenfolge im Auswahlmenü */
  order: number;
  read(file: File, ctx: ImportContext): Promise<ImportPlan>;
}

/** Fehler mit einer Meldung, die so in der App angezeigt werden kann. */
export class ImportError extends Error {}
