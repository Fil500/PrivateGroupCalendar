import { handle, json, parseTemplateInput, readJson, rowToTemplate, type Env, type TemplateRow } from '../../../server/db';

/** GET /api/templates */
export const onRequestGet: PagesFunction<Env> = ({ env }) =>
  handle(async () => {
    const { results } = await env.DB.prepare('SELECT * FROM templates ORDER BY sort_order, name').all<TemplateRow>();
    return json(results.map(rowToTemplate));
  });

/** POST /api/templates */
export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  handle(async () => {
    const t = parseTemplateInput(await readJson(request));
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO templates (id, name, start_time, end_time, color, sort_order, member_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(id, t.name, t.startTime, t.endTime, t.color, t.sortOrder, t.memberId)
      .run();
    return json({ id, ...t }, 201);
  });
