import { handle, json, notFound, parseTemplateInput, readJson, type Env } from '../../../server/db';

/** PUT /api/templates/:id */
export const onRequestPut: PagesFunction<Env, 'id'> = ({ request, env, params }) =>
  handle(async () => {
    const id = String(params.id);
    const t = parseTemplateInput(await readJson(request));
    const res = await env.DB.prepare(
      `UPDATE templates
       SET name = ?, start_time = ?, end_time = ?, color = ?, sort_order = ?, member_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(t.name, t.startTime, t.endTime, t.color, t.sortOrder, t.memberId, id)
      .run();
    if (!res.meta.changes) return notFound();
    return json({ id, ...t });
  });

/** DELETE /api/templates/:id  (bereits erstellte Termine bleiben erhalten) */
export const onRequestDelete: PagesFunction<Env, 'id'> = ({ env, params }) =>
  handle(async () => {
    const res = await env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(String(params.id)).run();
    if (!res.meta.changes) return notFound();
    return json({ ok: true });
  });
