// print lagest changelog entry from README.md

import fs from 'fs';

const readmePath = './README.md';
const readmeContent = fs.readFileSync(readmePath, 'utf-8');

const rxTitle = /^Changelog\r?\n[-=]+\r?\n/gm;
const rxEntry = /^\*[^\r\n]+/gm;

const titleMatch = rxTitle.exec(readmeContent);
if (!titleMatch) {
  throw new Error('Changelog title not found in README.md');
}

rxEntry.lastIndex = rxTitle.lastIndex;
const firstEntryMatch = rxEntry.exec(readmeContent);
const lastEntryMatch = rxEntry.exec(readmeContent);

if (!firstEntryMatch) {
  throw new Error('No changelog entries found in README.md');
}
const startIndex = firstEntryMatch.index;
const endIndex = lastEntryMatch ? lastEntryMatch.index : readmeContent.length;
console.log(readmeContent.slice(startIndex, endIndex).trim().replace(/^( *)([*-] +)/gm, (match, p1, p2) => {
  if (p1) {
    return p2;
  }
  return "";
}));
