const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('docs/wedding-invitation.html', 'utf8');

function cssBlock(selector) {
  const pattern = new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\{([^}]*)\\}`, 'm');
  const match = html.match(pattern);
  assert.ok(match, `Missing CSS block for ${selector}`);
  return match[1];
}

function extractFunction(name) {
  const start = html.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `Missing function ${name}`);

  const braceStart = html.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) return html.slice(start, i + 1);
  }

  throw new Error(`Could not parse function ${name}`);
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test('viewport prevents tap zoom on mobile invitation screen', () => {
  assert.match(html, /name="viewport" content="[^"]*maximum-scale=1[^"]*user-scalable=no/);
});

test('seal button is smaller on the envelope screen', () => {
  const block = cssBlock('\\.envelope-seal');
  assert.match(block, /width:\s*92px/);
  assert.match(block, /height:\s*92px/);
});

test('mobile dress-code palette stays two rows of three colors', () => {
  assert.match(html, /@media \(max-width:600px\)[\s\S]*\.dress-palette\s*\{\s*grid-template-columns:\s*repeat\(3,\s*1fr\)/);
});

test('long envelope greetings are split into narrow lines', () => {
  const source = `${extractFunction('formatPreInviteGreeting')}
    formatPreInviteGreeting('Дорогие бабушка Светлана и дедушка Иван');`;
  const output = vm.runInNewContext(source);
  const lines = Array.from(output.matchAll(/<span class="title-line">([^<]+)<\/span>/g), match => match[1]);

  assert.ok(lines.length >= 3, `Expected at least 3 lines, got ${lines.length}: ${output}`);
  assert.ok(lines.every(line => line.length <= 18), `Expected short lines, got: ${lines.join(' | ')}`);
});

test('welcome form asks for surname before name and shows the Kirill example', () => {
  assert.match(html, /<label for="guestName">Фамилия и имя<\/label>/);
  assert.match(html, /placeholder="Например: Артамонов Кирилл"/);
  assert.match(html, /Пожалуйста, введите фамилию и имя/);
  assert.doesNotMatch(html, /Имя и фамилия/);
  assert.doesNotMatch(html, /Пожалуйста, введите имя и фамилию/);
  assert.doesNotMatch(html, /Например: Артамонова Мария/);
});

test('hotel contact phone is the real booking number', () => {
  assert.match(html, /\+7 \(4912\) 408-900/);
  assert.doesNotMatch(html, /\+7 \(900\) 000 00-00/);
});

test('location section includes an external map button', () => {
  assert.match(html, /class="[^"]*\bmap-link\b[^"]*"/);
  assert.match(html, /href="https:\/\/yandex\.ru\/maps\/\?text=[^"]*"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, />Открыть карту</);
});
