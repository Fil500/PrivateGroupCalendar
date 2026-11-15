import { useState } from 'react';
import type { Member, MemberInput, Template, TemplateInput } from '../../shared/types';
import { api } from '../api';
import { GROUP_LABEL } from '../config';
import { COLORS } from '../lib/colors';
import { sortMembers } from '../lib/members';
import { sortTemplates } from '../lib/templates';
import { cx, errorMessage } from '../lib/util';
import ColorPicker from './ColorPicker';
import MemberPicker from './MemberPicker';
import { ChevronRightIcon, PlusIcon, UploadIcon } from './icons';
import { Group, Row, SectionTitle, Sheet, SheetBody, SheetHeader, fieldInput, textButton } from './Sheet';

type Draft = { kind: 'template'; id?: string; data: TemplateInput } | { kind: 'member'; id?: string; data: MemberInput };

interface Props {
  templates: Template[];
  members: Member[];
  onChange: (templates: Template[]) => void;
  onMembersChange: (members: Member[]) => void;
  /** nach Änderungen an einer Person: Termine neu laden (Farbe bzw. Zuordnung können sich ändern) */
  onReloadEvents: () => void;
  /** fehlt, wenn kein Importformat vorhanden ist */
  onImport?: () => void;
  onClose: () => void;
}

const nextSort = (list: { sortOrder: number }[]) => Math.max(0, ...list.map((x) => x.sortOrder)) + 1;

export default function TemplateManager({ templates, members, onChange, onMembersChange, onReloadEvents, onImport, onClose }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const newTemplate = () =>
    setDraft({
      kind: 'template',
      data: { name: '', startTime: '08:00', endTime: '12:00', color: 'sky', sortOrder: nextSort(templates), memberId: null },
    });
  const newMember = () => setDraft({ kind: 'member', data: { name: '', color: 'violet', sortOrder: nextSort(members) } });

  const save = () =>
    run(async () => {
      if (!draft || !draft.data.name.trim()) return;
      if (draft.kind === 'template') {
        const input: TemplateInput = { ...draft.data, name: draft.data.name.trim() };
        if (draft.id) {
          const saved = await api.updateTemplate(draft.id, input);
          onChange(sortTemplates(templates.map((t) => (t.id === draft.id ? saved : t))));
        } else {
          onChange(sortTemplates([...templates, await api.createTemplate(input)]));
        }
      } else {
        const input: MemberInput = { ...draft.data, name: draft.data.name.trim() };
        if (draft.id) {
          const saved = await api.updateMember(draft.id, input);
          const previous = members.find((m) => m.id === draft.id);
          onMembersChange(sortMembers(members.map((m) => (m.id === draft.id ? saved : m))));
          // Vorlagen mit der bisherigen Personenfarbe ziehen mit (wie im Backend).
          onChange(templates.map((t) => (t.memberId === draft.id && t.color === previous?.color ? { ...t, color: saved.color } : t)));
          onReloadEvents();
        } else {
          onMembersChange(sortMembers([...members, await api.createMember(input)]));
        }
      }
      setDraft(null);
    });

  const remove = () =>
    run(async () => {
      if (!draft?.id) return;
      const { id, data } = draft;
      if (draft.kind === 'template') {
        if (!window.confirm(`Vorlage „${data.name}“ löschen? Bereits eingetragene Termine bleiben erhalten.`)) return;
        await api.deleteTemplate(id);
        onChange(templates.filter((t) => t.id !== id));
      } else {
        if (!window.confirm(`„${data.name}“ entfernen? Die Termine bleiben erhalten, sind dann aber niemandem mehr zugeordnet.`)) return;
        await api.deleteMember(id);
        onMembersChange(members.filter((m) => m.id !== id));
        onChange(templates.map((t) => (t.memberId === id ? { ...t, memberId: null } : t)));
        onReloadEvents();
      }
      setDraft(null);
    });

  const update = (patch: Partial<TemplateInput & MemberInput>) =>
    setDraft((d) => (d ? ({ ...d, data: { ...d.data, ...patch } } as Draft) : d));

  const title = draft
    ? draft.kind === 'template'
      ? draft.id ? 'Vorlage bearbeiten' : 'Neue Vorlage'
      : draft.id ? 'Person bearbeiten' : 'Neue Person'
    : `${GROUP_LABEL} & Vorlagen`;

  const listButton = 'flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-200/60 dark:hover:bg-slate-700/60';
  const addButton = 'flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium text-rose-600 dark:text-rose-400';

  return (
    <Sheet label={`${GROUP_LABEL} & Vorlagen`} onClose={onClose}>
      <SheetHeader
        title={title}
        left={
          draft ? (
            <button type="button" onClick={() => setDraft(null)} className={textButton}>
              Zurück
            </button>
          ) : undefined
        }
        right={
          draft ? (
            <button type="button" onClick={() => void save()} disabled={busy || !draft.data.name.trim()} className={cx(textButton, 'font-semibold')}>
              Sichern
            </button>
          ) : (
            <button type="button" onClick={onClose} className={cx(textButton, 'font-semibold')}>
              Fertig
            </button>
          )
        }
      />
      <SheetBody>
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-200">{error}</p>
        )}

        {draft?.kind === 'member' && (
          <>
            <Group>
              <input
                value={draft.data.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Name"
                maxLength={40}
                className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-slate-400"
              />
            </Group>
            <div>
              <SectionTitle>Farbe</SectionTitle>
              <Group>
                <ColorPicker value={draft.data.color} onChange={(color) => update({ color })} />
              </Group>
            </div>
            {draft.id && (
              <Group>
                <button type="button" onClick={() => void remove()} disabled={busy} className="w-full px-4 py-3 text-[15px] font-medium text-red-600">
                  Person entfernen
                </button>
              </Group>
            )}
          </>
        )}

        {draft?.kind === 'template' && (
          <>
            <Group>
              <input
                value={draft.data.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Name, z. B. Schwimmtraining"
                maxLength={80}
                className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-slate-400"
              />
            </Group>
            <Group>
              <Row label="Beginn">
                <input type="time" value={draft.data.startTime} onChange={(e) => e.target.value && update({ startTime: e.target.value })} className={fieldInput} />
              </Row>
              <Row label="Ende">
                <input type="time" value={draft.data.endTime} onChange={(e) => e.target.value && update({ endTime: e.target.value })} className={fieldInput} />
              </Row>
            </Group>
            {members.length > 0 && (
              <div>
                <SectionTitle>Für wen?</SectionTitle>
                <Group>
                  <MemberPicker
                    members={members}
                    value={draft.data.memberId}
                    onChange={(memberId) => {
                      const member = members.find((m) => m.id === memberId);
                      update(member ? { memberId, color: member.color } : { memberId });
                    }}
                  />
                </Group>
              </div>
            )}
            <Group>
              <ColorPicker value={draft.data.color} onChange={(color) => update({ color })} />
            </Group>
            {draft.id && (
              <Group>
                <button type="button" onClick={() => void remove()} disabled={busy} className="w-full px-4 py-3 text-[15px] font-medium text-red-600">
                  Vorlage löschen
                </button>
              </Group>
            )}
          </>
        )}

        {!draft && (
          <>
            {onImport && (
              <Group>
                <button type="button" onClick={onImport} className={addButton}>
                  <UploadIcon className="h-4 w-4" />
                  Termine importieren
                </button>
              </Group>
            )}

            <section>
              <SectionTitle>{GROUP_LABEL}</SectionTitle>
              <Group>
                {members.map((m) => (
                  <button key={m.id} type="button" onClick={() => setDraft({ kind: 'member', id: m.id, data: { ...m } })} className={listButton}>
                    <span className={cx('h-3 w-3 shrink-0 rounded-full', COLORS[m.color].dot)} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{m.name}</span>
                    <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
                <button type="button" onClick={newMember} className={addButton}>
                  <PlusIcon className="h-4 w-4" />
                  Neue Person
                </button>
              </Group>
            </section>

            <section>
              <SectionTitle>Vorlagen</SectionTitle>
              <p className="mb-2 px-1 text-sm text-slate-500 dark:text-slate-400">
                Vorlagen erscheinen als Ein-Klick-Buttons oben in der Leiste und beim Anlegen eines Termins.
              </p>
              <Group>
                {templates.map((t) => {
                  const owner = members.find((m) => m.id === t.memberId);
                  return (
                    <button key={t.id} type="button" onClick={() => setDraft({ kind: 'template', id: t.id, data: { ...t } })} className={listButton}>
                      <span className={cx('h-3 w-3 shrink-0 rounded-full', COLORS[t.color].dot)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{t.name}</span>
                        {owner && <span className="block text-xs text-slate-500 dark:text-slate-400">{owner.name}</span>}
                      </span>
                      <span className="text-sm tabular-nums text-slate-500">
                        {t.startTime} – {t.endTime}
                      </span>
                      <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                    </button>
                  );
                })}
                <button type="button" onClick={newTemplate} className={addButton}>
                  <PlusIcon className="h-4 w-4" />
                  Neue Vorlage
                </button>
              </Group>
            </section>
          </>
        )}
      </SheetBody>
    </Sheet>
  );
}
