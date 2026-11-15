// Anpassbare Bezeichnungen. Standardwerte stehen in .env, eigene Werte in .env.local (z. B. VITE_GROUP_LABEL=Familie).

/** Name der App, z. B. im Browser-Tab */
export const APP_NAME: string = import.meta.env.VITE_APP_NAME || 'Gruppenkalender';
/** Wie die Gruppe in der App heißt, z. B. „Gruppe“ oder „Familie“ */
export const GROUP_LABEL: string = import.meta.env.VITE_GROUP_LABEL || 'Gruppe';
