import { describe, it, expect } from 'vitest';
import { getSeasonLabel, getSeasonRange, isDateInSeason, getAvailableSeasons } from '../season';

describe('season', () => {
  it('assigns dates on/after Sept 1 to the season starting that year', () => {
    expect(getSeasonLabel('2026-09-01T12:00:00Z')).toBe('2026/2027');
    expect(getSeasonLabel('2026-12-25T12:00:00Z')).toBe('2026/2027');
  });

  it('assigns dates before Sept 1 to the previous season', () => {
    expect(getSeasonLabel('2026-08-31T12:00:00Z')).toBe('2025/2026');
    expect(getSeasonLabel('2026-01-15T12:00:00Z')).toBe('2025/2026');
  });

  it('computes season range boundaries', () => {
    const { start, end } = getSeasonRange('2025/2026');
    expect(start.toISOString()).toBe('2025-09-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('checks whether a date falls in a season', () => {
    expect(isDateInSeason('2025-09-01T00:00:00Z', '2025/2026')).toBe(true);
    expect(isDateInSeason('2026-08-31T23:59:59Z', '2025/2026')).toBe(true);
    expect(isDateInSeason('2026-09-01T00:00:00Z', '2025/2026')).toBe(false);
  });

  it('derives available seasons from a list of dates, including current season', () => {
    const seasons = getAvailableSeasons(['2024-10-01T00:00:00Z', '2025-11-01T00:00:00Z']);
    expect(seasons).toContain('2024/2025');
    expect(seasons).toContain('2025/2026');
    expect(seasons[0] >= seasons[1]).toBe(true);
  });
});
