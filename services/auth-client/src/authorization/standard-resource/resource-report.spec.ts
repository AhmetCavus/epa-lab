import { readResourceServerReport } from './resource-report';

describe('explicit Resource Server report projection', () => {
  it.each([
    [200, 'allowed', 'demo-read-allowed'],
    [401, 'denied', 'missing-token'],
    [401, 'denied', 'invalid-token'],
    [403, 'denied', 'insufficient-permission'],
    [403, 'denied', 'operation-not-allowed'],
  ])('accepts only the defined consistent report %s/%s/%s', (status, decision, reason) => {
    const headers = new Headers({
      'x-playground-decision': decision,
      'x-playground-reason': reason,
    });
    expect(readResourceServerReport(status, headers)).toEqual({
      available: true,
      reportedBy: 'res-server',
      decision,
      reason,
    });
  });

  it.each([
    [200, '', ''],
    [200, 'allowed', ''],
    [401, '', 'invalid-token'],
    [200, 'denied', 'invalid-token'],
    [403, 'allowed', 'demo-read-allowed'],
    [401, 'denied', 'insufficient-permission'],
    [403, 'denied', 'missing-token'],
    [500, 'denied', 'operation-not-allowed'],
    [200, 'allowed', 'fictional-sensitive-provider-text'],
    [200, 'allowed, allowed', 'demo-read-allowed'],
    [401, 'denied', 'invalid-token, invalid-token'],
    [200, 'ALLOWED', 'demo-read-allowed'],
    [302, 'allowed', 'demo-read-allowed'],
  ])(
    'marks missing/unknown/duplicate/conflicting reports unavailable %#',
    (status, decision, reason) => {
      const headers = new Headers();
      if (decision) {
        headers.set('x-playground-decision', decision);
      }
      if (reason) {
        headers.set('x-playground-reason', reason);
      }
      headers.set('x-unsafe-evidence', 'fictional-sensitive-header');
      expect(readResourceServerReport(status, headers)).toEqual({ available: false });
    },
  );
});
