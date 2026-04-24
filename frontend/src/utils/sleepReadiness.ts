// utils/sleepReadiness.ts
export function calculateSleepReadiness(
  temp: number,
  humidity: number,
  light: number,
  sound: number
) {
  const tempScore = Math.max(0, 100 - 5 * Math.abs(temp - 21));
  const humidityScore = Math.max(0, 100 - 2 * Math.abs(humidity - 50));

  const lightScore = light <= 30 ? 100 : Math.max(0, 100 - (light - 30) * 2);
  const soundScore = sound <= 40 ? 100 : Math.max(0, 100 - (sound - 40) * 2);

  const finalScore =
    0.3 * tempScore +
    0.2 * humidityScore +
    0.25 * lightScore +
    0.25 * soundScore;

  return Math.round(finalScore);
}

export function getReadinessLabel(score: number) {
  if (score >= 80) return { label: "Ready", color: "green" };
  if (score >= 60) return { label: "Okay", color: "yellow" };
  return { label: "Not Ready", color: "red" };
}