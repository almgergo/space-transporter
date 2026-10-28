import { auPerDayToKms, formatDate } from '../core/units';

export const kms = (auPerDay: number): string => `${auPerDayToKms(auPerDay).toFixed(2)} km/s`;
export const tonnes = (t: number): string => `${t.toFixed(1)} t`;
export const credits = (cr: number): string => `${Math.round(cr).toLocaleString('en-US')} cr`;
export const days = (d: number): string => `${Math.round(d)} d`;
export const date = formatDate;
