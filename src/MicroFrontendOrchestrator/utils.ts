export function addValueToMappedArray(map, key, value): void {
  if (!map[key]) {
    map[key] = [];
  }
  map[key].push(value);
}

export function removeValueFromMappedArray(map, key, value): void {
  if (!map || !map[key]) {
    return;
  }

  const index = map[key].findIndex(item => item === value);
  if (index >= 0) {
    if (map[key].length === 1) {
      delete map[key];
    } else {
      map[key].splice(index, 1);
    }
  }
}
