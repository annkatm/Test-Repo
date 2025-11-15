import fs from 'fs';
const path = process.argv[2] || 'resources/js/Users/EmployeeHome.jsx';
const s = fs.readFileSync(path, 'utf8');
const opens = {'(':')','[':']','{':'}'};
const stack = [];
let line = 1;
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch === '\n') line++;
  if (opens[ch]) {
    stack.push({ ch, line, i, context: s.slice(Math.max(0, i-40), Math.min(s.length, i+40)) });
  } else if (Object.values(opens).includes(ch)) {
    const last = stack.pop();
    if (!last || opens[last.ch] !== ch) {
      console.log('Mismatch at line', line, 'index', i, 'found', ch, 'but last open was', last?last.ch:'<none>');
      if (last) {
        console.log('Last open context (around here):', last.context);
      }
      console.log('Current context:', s.slice(Math.max(0, i-40), Math.min(s.length, i+40)));
      process.exit(0);
    }
  }
}
if (stack.length) {
  const last = stack[stack.length-1];
  console.log('Unclosed', last.ch, 'opened at line', last.line);
  console.log('Context around open:', last.context);
  process.exit(0);
}
console.log('All balanced');
