// Temporada arbitral: empieza 1 septiembre, termina 31 agosto siguiente.
const SEASON_START_MONTH = 8; // 0-indexed: septiembre

export function getSeasonLabel(date: Date | string): string {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const startYear = month >= SEASON_START_MONTH ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
}

export function getSeasonRange(label: string): { start: Date; end: Date } {
  const [startYear] = label.split('/').map(Number);
  const start = new Date(Date.UTC(startYear, SEASON_START_MONTH, 1, 0, 0, 0));
  const end = new Date(Date.UTC(startYear + 1, SEASON_START_MONTH, 1, 0, 0, 0));
  return { start, end };
}

export function isDateInSeason(date: Date | string, label: string): boolean {
  const d = new Date(date);
  const { start, end } = getSeasonRange(label);
  return d >= start && d < end;
}

export function getCurrentSeasonLabel(): string {
  return getSeasonLabel(new Date());
}

export function getAvailableSeasons(dates: (Date | string)[]): string[] {
  const labels = new Set(dates.map(getSeasonLabel));
  labels.add(getCurrentSeasonLabel());
  return Array.from(labels).sort((a, b) => b.localeCompare(a));
}
