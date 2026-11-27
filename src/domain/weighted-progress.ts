export type WeightedProgressTask = {
  progressPercent: number;
  weight: number;
  status?: string;
};

/**
 * Calculate task-weighted delivery progress using explicit relative weights.
 * Cancelled tasks are excluded; invalid/non-positive weights fail closed.
 */
export function calculateWeightedProgress(tasks: WeightedProgressTask[]): number {
  const active = tasks.filter(task => task.status !== "CANCELLED");
  if (active.some(task => !Number.isFinite(task.weight) || task.weight <= 0)) {
    throw new Error("Every active task must have a positive finite weight.");
  }
  const totalWeight = active.reduce((sum, task) => sum + task.weight, 0);
  if (!totalWeight) return 0;
  const weighted = active.reduce((sum, task) => {
    const progress = Math.max(0, Math.min(100, Number(task.progressPercent) || 0));
    return sum + progress * task.weight;
  }, 0);
  return Math.round(weighted / totalWeight);
}
