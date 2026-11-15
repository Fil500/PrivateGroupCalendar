import { handle, json, parseMemberInput, readJson, rowToMember, type Env, type MemberRow } from '../../../server/db';

/** GET /api/members */
export const onRequestGet: PagesFunction<Env> = ({ env }) =>
  handle(async () => {
    const { results } = await env.DB.prepare('SELECT * FROM members ORDER BY sort_order, name').all<MemberRow>();
    return json(results.map(rowToMember));
  });

/** POST /api/members */
export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  handle(async () => {
    const m = parseMemberInput(await readJson(request));
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO members (id, name, color, sort_order) VALUES (?, ?, ?, ?)')
      .bind(id, m.name, m.color, m.sortOrder)
      .run();
    return json({ id, ...m }, 201);
  });
