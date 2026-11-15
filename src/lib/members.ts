import type { Member } from '../../shared/types';

/** Startdaten im lokalen Demo-Modus: leer, die Einrichtung beim ersten Start legt die Mitglieder an. */
export const DEFAULT_MEMBERS: Member[] = [];

export const sortMembers = (list: Member[]) =>
  [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
