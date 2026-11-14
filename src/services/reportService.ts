import axios from 'axios';

/** "Report a wrong scheme" (POST /api/reports). Anonymous: only the scheme, the kind of problem and the note. */
export const REPORT_REASONS = ['eligibility', 'benefits', 'documents', 'apply', 'closed', 'translation', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const MAX_REPORT_MESSAGE = 1000;

export const reportService = {
  async send(schemeId: string, reason: ReportReason, message: string): Promise<void> {
    await axios.post('/api/reports', { schemeId, reason, message: message.trim() || undefined });
  },
};
