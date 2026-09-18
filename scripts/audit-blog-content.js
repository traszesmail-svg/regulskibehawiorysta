const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'content', 'blog-mvp');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

console.log(`Found ${files.length} blog files in content/blog-mvp`);

const patterns = [
  /kwadrans/i,
  /umów konsultację/i,
  /plan na wiele tygodni/i,
  /rozwiązanie problemu w 15/i,
  /\/book/i
];

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = content.split('\n');
  const matches = [];
  lines.forEach((line, index) => {
    if (patterns.some(p => p.test(line))) {
      matches.push({ lineNum: index + 1, text: line.trim() });
    }
  });
  if (matches.length > 0) {
    console.log(`\n=== ${file} (${matches.length} matches) ===`);
    matches.forEach(m => console.log(`  [L${m.lineNum}]: ${m.text}`));
  }
}
