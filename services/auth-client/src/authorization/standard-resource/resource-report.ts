import type { ResourceServerReport } from '../run-observations/protocol-event';
import {
  resourceServerReportSchema,
  resourceReportMatchesStatus,
} from '../run-observations/protocol-event';

/** A status is observed by the BFF; only these explicit, consistent headers are a HAPI report. */
export function readResourceServerReport(status: number, headers: Headers): ResourceServerReport {
  const parsed = resourceServerReportSchema.safeParse({
    available: true,
    reportedBy: 'res-server',
    decision: headers.get('x-playground-decision'),
    reason: headers.get('x-playground-reason'),
  });
  if (parsed.success && resourceReportMatchesStatus(status, parsed.data)) {
    return parsed.data;
  }
  return { available: false };
}
