export function extractKeyValuePairs(container, {
  keyTransform = defaultKeyTransform,
  valueTransform = defaultValueTransform,
} = {}) {
  const pairs = {};

  [...container.children].forEach((row) => {
    if (row.children.length < 2) return;

    const keyCell = row.children[0];
    const valueCell = row.children[1];

    const rawKey = keyCell.textContent?.trim();
    if (!rawKey) return;

    const key = keyTransform(rawKey);
    const value = valueTransform(valueCell);

    pairs[key] = value;
  });

  return pairs;
}

function defaultKeyTransform(key) {
  return key
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function defaultValueTransform(cell) {
  const text = cell.textContent.trim();

  // Boolean coercion
  if (/^(true|false)$/i.test(text)) {
    return text.toLowerCase() === 'true';
  }

  // Number coercion
  const num = Number(text);
  if (Number.isFinite(num)) {
    return num;
  }

  // Rich content detection
  if (cell.children.length > 0) {
    return cell.innerHTML.trim();
  }

  // Fallback: plain text
  return text;
}
