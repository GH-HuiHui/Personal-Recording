export function formFingerprint(entries) {
  return JSON.stringify(Array.from(entries, ([key, value]) => [key, String(value)]));
}

export function formState(entries, baseline, { valid = true, requireChanges = false } = {}) {
  const values = Array.from(entries);
  const dirty = formFingerprint(values) !== baseline;
  const name = values.find(([key]) => key === 'name')?.[1];
  const hasName = name === undefined || String(name).trim().length > 0;
  return { dirty, canSave: valid && hasName && (!requireChanges || dirty) };
}
