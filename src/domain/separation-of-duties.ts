/**
 * Maker-checker guard: an actor must not approve or post their own work.
 * The caller remains responsible for checking workflow state and permissions.
 */
export function isMakerCheckerValid(makerId: string, checkerId: string): boolean {
  return Boolean(makerId && checkerId && makerId !== checkerId);
}
