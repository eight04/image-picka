export function *parseText(text, groupBy = 1) {
  const lines = text.split(/\r?\n/g).filter(line =>
    line && /\S/.test(line) && !line.startsWith("#"));
  for (let i = 0; i < lines.length; i += groupBy) {
    yield lines.slice(i, i + groupBy);
  }
}
