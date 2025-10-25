export const overrides = new Map<number, any>()

export function applyOverride(id: number, patch: any) {
  const prev = overrides.get(id) ?? {}
  overrides.set(id, { ...prev, ...patch })
  console.log("applyOverride:", id, patch)
}
