/**
 * This is the default javascript transformation function, you cannot rename it or change its signature.
 * This function will be called for each item in the dataset.
 * @param {SourceRecord} record - Represent one item from your dataset - Type is inferred from the input record.
 * @param {Helper} helper - Use it to reference Secrets and get Metadata.
 * @returns {SourceRecord|Array<SourceRecord>} - Return a record or an array of records.
 */

function normalizeText(input) {
  return input
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(input) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isDateToken(token) {
  return /^20\d{2}$/.test(token) || /^(19|20)\d{2}$/.test(token);
}

function isStandardNumberToken(token) {
  return (
    /^\d{2,6}$/.test(token) &&
    !isDateToken(token)
  );
}

function generateStandardAliases(input) {
  const normalized = normalizeText(input);
  const tokens = normalized.split(" ").filter(Boolean);

  const aliases = new Set([
    input,
    normalized,
    compact(input)
  ]);

  const firstNumberIndex = tokens.findIndex(isStandardNumberToken);

  if (firstNumberIndex === -1) {
    return [...aliases];
  }

  const prefixTokens = tokens.slice(0, firstNumberIndex);
  const numberTokens = [];

  for (let i = firstNumberIndex; i < tokens.length; i++) {
    const token = tokens[i];

    if (isDateToken(token)) break;

    if (/^\d+[A-Z]?$/.test(token) || /^[A-Z]?\d+[A-Z]?$/.test(token)) {
      numberTokens.push(token);
    } else {
      break;
    }
  }

  const mainNumber = numberTokens.join("-");
  const compactNumber = compact(mainNumber);

  aliases.add(mainNumber);
  aliases.add(compactNumber);

  const fullPrefix = prefixTokens.join(" ");
  const compactPrefix = compact(fullPrefix);

  if (compactPrefix) {
    aliases.add(`${fullPrefix} ${mainNumber}`);
    aliases.add(`${compactPrefix}${compactNumber}`);
  }

  // Individual prefix aliases: DIN9001, EN9001, ISO9001
  for (const prefix of prefixTokens) {
    const prefixCompact = compact(prefix);

    aliases.add(`${prefix} ${mainNumber}`);
    aliases.add(`${prefixCompact}${compactNumber}`);
  }

  // Tail aliases: useful for DIN EN ISO 9001 -> ISO9001, ENISO9001, DINENISO9001
  for (let size = 1; size <= Math.min(prefixTokens.length, 4); size++) {
    const tailPrefix = prefixTokens.slice(-size);
    const tailPrefixText = tailPrefix.join(" ");
    const tailPrefixCompact = compact(tailPrefixText);

    aliases.add(`${tailPrefixText} ${mainNumber}`);
    aliases.add(`${tailPrefixCompact}${compactNumber}`);
  }

  const yearIndex = tokens.findIndex(token => /^(19|20)\d{2}$/.test(token));
  const monthToken = yearIndex !== -1 ? tokens[yearIndex + 1] : null;

  if (yearIndex !== -1) {
    const year = tokens[yearIndex];

    aliases.add(`${compactNumber}${year}`);
    aliases.add(`${mainNumber}:${year}`);

    if (/^\d{2}$/.test(monthToken || "")) {
      aliases.add(`${compactNumber}${year}${monthToken}`);
      aliases.add(`${mainNumber}:${year}-${monthToken}`);
    }
  }

  return [...aliases];
}
async function transform(record, helper) {

  record["aliases"] = generateStandardAliases(record.titel)

  // If you want to exclude a record, you can just return undefined.
  // If you want to return multiple records, you can return an array of records.
  return record;
}
