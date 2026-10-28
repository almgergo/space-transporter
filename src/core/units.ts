/**
 * Simulation units: astronomical units (AU), days, AU/day.
 * Time `t` is days since the J2000 epoch (2000-01-01 12:00).
 */

/** Gaussian gravitational constant, AU^1.5 / day. */
export const GAUSSIAN_K = 0.01720209895;

/** Sun's gravitational parameter μ, AU³/day². */
export const MU_SUN = GAUSSIAN_K * GAUSSIAN_K;

export const KM_PER_AU = 149_597_870.7;
export const SECONDS_PER_DAY = 86_400;

/** 1 AU/day ≈ 1731.46 km/s. */
export const KMS_PER_AU_PER_DAY = KM_PER_AU / SECONDS_PER_DAY;

export const kmsToAuPerDay = (kms: number): number => kms / KMS_PER_AU_PER_DAY;
export const auPerDayToKms = (auPerDay: number): number => auPerDay * KMS_PER_AU_PER_DAY;

export const DEG = Math.PI / 180;
export const TWO_PI = 2 * Math.PI;

/** Wraps an angle into [0, 2π). */
export const wrapAngle = (radians: number): number => ((radians % TWO_PI) + TWO_PI) % TWO_PI;

const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12);
const MS_PER_DAY = SECONDS_PER_DAY * 1000;

export const dateToJ2000Days = (date: Date): number => (date.getTime() - J2000_UNIX_MS) / MS_PER_DAY;
export const j2000DaysToDate = (days: number): Date => new Date(J2000_UNIX_MS + days * MS_PER_DAY);

/** e.g. "2026-11-14". */
export const formatDate = (days: number): string => j2000DaysToDate(days).toISOString().slice(0, 10);
