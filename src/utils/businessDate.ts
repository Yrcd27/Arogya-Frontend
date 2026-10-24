export const BUSINESS_TIME_ZONE = 'Asia/Colombo';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parts(date: Date): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) result[part.type] = part.value;
  return result;
}

export function businessDateString(date = new Date()): string {
  const { year, month, day } = parts(date);
  return `${year}-${month}-${day}`;
}

export function businessTimeString(date = new Date()): string {
  const { hour, minute } = parts(date);
  return `${hour}:${minute}`;
}
