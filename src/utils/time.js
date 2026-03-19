export function nowIso() {
  return new Date().toISOString();
}

export function isWithinQuietHours(quietHours) {
  if (!quietHours) return false;
  const hour = new Date().getHours();
  const { start = 0, end = 0 } = quietHours;
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}
