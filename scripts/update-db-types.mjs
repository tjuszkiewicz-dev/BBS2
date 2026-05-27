import fs from 'fs';

const src = process.argv[2];
const dst = process.argv[3] || 'types/database.ts';

const raw = fs.readFileSync(src, 'utf8');
const data = JSON.parse(raw);
const text = data[0].text;
const parsed = JSON.parse(text);
fs.writeFileSync(dst, parsed.types, 'utf8');
console.log('Wrote', parsed.types.length, 'chars to', dst);
