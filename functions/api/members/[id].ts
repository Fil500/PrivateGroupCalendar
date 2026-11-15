import { handle, json, notFound, parseMemberInput, readJson, type Env } from '../../../server/db';

/** PUT /api/members/:id */
export const onRequestPut: PagesFunction<Env, 'id'> = ({ request, env, params }) =>
  handle(async () => {
    const id = String(params.id);
    const m = parseMemberInput(await readJson(request));
    const old = await env.DB.prepare('SELECT color FROM members WHERE id = ?').bind(id).first<{ color: string }>();
    if (!old) return notFound();
    // Termine und Vorlagen mit der bisherigen Personenfarbe ziehen mit, eigene Farben (z. B. Schichten) bleiben.
    await env.DB.batch([
      env.DB.prepare(`UPDATE members SET name = ?, color = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?`).bind(
        m.name,
        m.color,
        m.sortOrder,
        id,
      ),
      env.DB.prepare('UPDATE events SET color = ? WHERE member_id = ? AND color = ?').bind(m.color, id, old.color),
      env.DB.prepare('UPDATE templates SET color = ? WHERE member_id = ? AND color = ?').bind(m.color, id, old.color),
    ]);
    return json({ id, ...m });
  });

/** DELETE /api/members/:id  (Termine und Vorlagen bleiben erhalten, nur ohne Person) */
export const onRequestDelete: PagesFunction<Env, 'id'> = ({ env, params }) =>
  handle(async () => {
    const id = String(params.id);
    const [res] = await env.DB.batch([
      env.DB.prepare('DELETE FROM members WHERE id = ?').bind(id),
      env.DB.prepare('UPDATE events SET member_id = NULL WHERE member_id = ?').bind(id),
      env.DB.prepare('UPDATE templates SET member_id = NULL WHERE member_id = ?').bind(id),
    ]);
    if (!res.meta.changes) return notFound();
    return json({ ok: true });
  });
