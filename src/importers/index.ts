import type { Importer } from './types';

// Jedes Format liegt in einem eigenen Ordner mit index.ts. Ein neues Format braucht hier keine Änderung.
const modules = import.meta.glob<{ default: Importer }>('./*/index.ts', { eager: true });

export const IMPORTERS: Importer[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order);
