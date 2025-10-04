import type { StructuredLog } from './types';

export const log = (severity: StructuredLog['severity'], event: string, detail?: Record<string, unknown>) => {
  const entry: StructuredLog = {
    timestamp: new Date().toISOString(),
    severity,
    event,
    detail
  };

  console.log(JSON.stringify(entry));
};

export const logError = (event: string, detail?: Record<string, unknown>) => {
  log('ERROR', event, detail);
};

export const logInfo = (event: string, detail?: Record<string, unknown>) => {
  log('INFO', event, detail);
};
