export const gainToDecibels = (gain: number): number => Math.log10(gain) * 20;
export const decibelsToGain = (db: number): number => 10 ** (db * 0.05);
