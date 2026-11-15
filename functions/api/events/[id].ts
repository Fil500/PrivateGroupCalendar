import { bindEvent, handle, json, notFound, parseEventInput, readJson, type Env } from '../../../server/db';

/** PUT /api/events/:id */
export const onRequestPut: PagesFunction<Env, 'id'> = ({ request, env, params }) =>
  handle(async () => {
    const id = String(params.id);
    const input = parseEventInput(await readJson(request));
    const stmt = env.DB.prepare(
      `UPDATE events
       SET title = ?, start_at = ?, end_at = ?, all_day = ?, color = ?, notes = ?,
           template_id = ?, series_id = ?, member_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
    );
    const res = await bindEvent(stmt, id, input).run();
    if (!res.meta.changes) return notFound();
    return json({ id, ...input });
  });

/** DELETE /api/events/:id?scope=single|series  → { deleted: string[] } */
export const onRequestDelete: PagesFunction<Env, 'id'> = ({ request, env, params }) =>
  handle(async () => {
    const id = String(params.id);
    const scope = new URL(request.url).searchParams.get('scope');

    const row = await env.DB.prepare('SELECT series_id FROM events WHERE id = ?')
      .bind(id)
      .first<{ series_id: string | null }>();
    if (!row) return notFound();

    if (scope === 'series' && row.series_id) {
      const { results } = await env.DB.prepare('SELECT id FROM events WHERE series_id = ?')
        .bind(row.series_id)
        .all<{ id: string }>();
      await env.DB.prepare('DELETE FROM events WHERE series_id = ?').bind(row.series_id).run();
      return json({ deleted: results.map((r) => r.id) });
    }

    await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
    return json({ deleted: [id] });
  });
