import axios from 'axios';

/** Ticks against one scheme's document list, stored by line text (see backend/src/routes/checklists.ts). */
export interface ChecklistTicks {
  /** Lines ticked by hand. */
  checked: string[];
  /** Lines unticked on purpose although My documents matched them. */
  unchecked: string[];
}

function assertTicks(data: unknown, context: string): ChecklistTicks {
  const d = data as Partial<ChecklistTicks> | null;
  if (!d || !Array.isArray(d.checked) || !Array.isArray(d.unchecked)) {
    throw new Error(`[checklistService.${context}] Expected { checked, unchecked }. Backend may not be running.`);
  }
  return { checked: d.checked, unchecked: d.unchecked };
}

export const checklistService = {
  async get(schemeId: string): Promise<ChecklistTicks> {
    const response = await axios.get(`/api/checklists/${encodeURIComponent(schemeId)}`);
    return assertTicks(response.data, 'get');
  },

  async save(schemeId: string, ticks: ChecklistTicks): Promise<ChecklistTicks> {
    const response = await axios.put(`/api/checklists/${encodeURIComponent(schemeId)}`, ticks);
    return assertTicks(response.data, 'save');
  },
};
