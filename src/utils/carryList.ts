/**
 * "What to carry": one list of the documents a person's saved schemes ask for.
 * Common documents (Aadhaar, bank passbook, income certificate...) are recognised by kind (utils/documentKinds.ts)
 * and merged across schemes; any other line stays as written under the scheme that asks for it.
 * A document is ready when the person keeps it under "My documents", or ticked it on that scheme's checklist.
 */
import { DOCUMENT_KINDS, DocumentKind, kindsInLine, isHeadingLine, isFillerLine } from './documentKinds';
import type { ChecklistTicks } from '../services/checklistService';

export interface CarryScheme {
  id: string;
  name: string;
  /** The scheme's own (English) document lines: checklist ticks are saved against these. */
  documents: string[];
}

export interface CarryItem {
  /** A common document kind, or null for a line that names no common document. */
  kind: DocumentKind | null;
  /** For kind === null: the line as the scheme writes it. */
  line?: string;
  schemes: Array<{ id: string; name: string }>;
  ready: boolean;
}

const isTicked = (ticks: ChecklistTicks | undefined, line: string, held: boolean) =>
  !!ticks && (ticks.checked.includes(line) || (held && !ticks.unchecked.includes(line)));

export function buildCarryList(schemes: CarryScheme[], held: string[], ticksByScheme: Record<string, ChecklistTicks>): CarryItem[] {
  const byKind = new Map<DocumentKind, CarryItem>();
  const others: CarryItem[] = [];

  for (const s of schemes) {
    const ticks = ticksByScheme[s.id];
    for (const line of new Set(s.documents.map((l) => l.trim()).filter(Boolean))) {
      if (isHeadingLine(line) || isFillerLine(line)) continue;
      const kinds = kindsInLine(line);
      if (kinds.length === 0) {
        others.push({ kind: null, line, schemes: [{ id: s.id, name: s.name }], ready: isTicked(ticks, line, false) });
        continue;
      }
      // "Aadhaar or Voter ID" names two kinds: either one will do, so it counts under the first that's ready.
      const readyKind = kinds.find((k) => held.includes(k));
      for (const k of readyKind ? [readyKind] : kinds.slice(0, 1)) {
        const item = byKind.get(k) ?? { kind: k, schemes: [], ready: true };
        if (!item.schemes.some((x) => x.id === s.id)) item.schemes.push({ id: s.id, name: s.name });
        // Ready only when every scheme's line for this kind is covered: kept under My documents, or ticked there.
        // (the checklist's own rule: a kept document counts unless it was unticked on purpose for that scheme)
        const keeps = held.includes(k);
        item.ready = item.ready && (ticks ? isTicked(ticks, line, keeps) : keeps);
        byKind.set(k, item);
      }
    }
  }

  const order = DOCUMENT_KINDS.map((k) => k.key as DocumentKind);
  const common = [...byKind.values()].sort((a, b) => order.indexOf(a.kind!) - order.indexOf(b.kind!));
  // Still needed first, then ready; common documents before scheme-specific lines.
  return [...common.filter((i) => !i.ready), ...others.filter((i) => !i.ready), ...common.filter((i) => i.ready), ...others.filter((i) => i.ready)];
}
