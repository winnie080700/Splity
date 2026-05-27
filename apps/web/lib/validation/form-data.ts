function getFormDataValue(formData: FormData, key: string) {
  const directValue = formData.get(key);
  if (directValue !== null) return directValue;

  for (const [entryKey, value] of formData.entries()) {
    if (entryKey.endsWith(`_${key}`)) return value;
  }

  return null;
}

export function formDataObject(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, getFormDataValue(formData, key)]));
}
