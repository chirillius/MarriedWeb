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

test('invitation copy matches the updated guest wording', () => {
  assert.match(html, /Скоро наступит самый важый для нас день - мы станем семьей/);
  assert.doesNotMatch(html, /Скоро наступит самый очень важный для нас день - мы станем семьей/);
  assert.match(html, /Просим избегать белых и ярких неоновых оттенков/);
  assert.match(html, />Локация</);
  assert.doesNotMatch(html, /Будем счастливы разделить с вами/);
  assert.doesNotMatch(html, /этот особенный день нашей жизни/);
  assert.match(html, />Анкета гостя</);
  assert.match(html, />Пожалуйста, заполните форму ниже и подтвердите Ваше присутствие</);
  assert.match(html, />Да, с удовольствием буду</);
  assert.match(html, />К сожалению, не смогу</);
  assert.doesNotMatch(html, />✓ Да, с удовольствием буду</);
  assert.doesNotMatch(html, />✕ К сожалению, не смогу</);
  assert.match(html, /Как планируете добираться\?/);
  assert.match(html, /Как планируете покидать праздничным вечер\?/);
  assert.match(html, /Что предпочитаете из напитков\?/);
  assert.match(html, /Мы скажем «да» через…/);

  assert.doesNotMatch(html, /Подтвердите ваше присутствие/);
  assert.doesNotMatch(html, /Я буду/);
  assert.doesNotMatch(html, /Не смогу/);
  assert.doesNotMatch(html, /На чем планируете добираться/);
  assert.doesNotMatch(html, /На чем планируете уползать/);
  assert.doesNotMatch(html, /до свадьбы осталось/);
});

test('guest questionnaire buttons fit inside the RSVP block', () => {
  const buttonsBlock = cssBlock('\\.rsvp-buttons');
  const buttonBlock = cssBlock('\\.rsvp-btn');

  assert.match(buttonsBlock, /display:\s*grid/);
  assert.match(buttonsBlock, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(buttonBlock, /max-width:\s*none/);
  assert.match(buttonBlock, /min-width:\s*0/);
  assert.match(buttonBlock, /font-size:\s*\.8rem/);
  assert.match(buttonBlock, /line-height:\s*1\.35/);
  assert.match(buttonBlock, /overflow-wrap:\s*anywhere/);
  assert.match(html, /@media \(max-width:600px\)[\s\S]*\.rsvp-buttons\s*\{\s*grid-template-columns:\s*1fr/);
});

test('transport survey only offers personal transport or transfer', () => {
  assert.equal((html.match(/<input type="radio" name="arrive"/g) || []).length, 2);
  assert.equal((html.match(/<input type="radio" name="depart"/g) || []).length, 2);
  assert.match(html, /На личном транспорте\/ с кем-нибудь из гостей/);
  assert.match(html, /Потребуется трансфер/);
  assert.doesNotMatch(html, /На общественном транспорте/);
  assert.doesNotMatch(html, /Останусь на месте проведения/);
  assert.doesNotMatch(html, /Нужна газель/);
});

test('gift note uses the updated wording and signature', () => {
  assert.match(html, /Ваше присутствие для нас уже самый тёплый подарок\./);
  assert.match(html, /Пожалуйста, не ломайте голову над подарками! Мы будем очень рады вашему приятному вкладу в бюджет нашей молодой семьи\./);
  assert.match(html, /Если захотите порадовать нас дополнительно, просим не дарить нам букеты: вместо цветов можно выбрать <strong>сертификаты WB или Ozon<\/strong>\./);
  assert.match(html, /class="rsvp-success-signature"/);
  assert.match(html, /С любовью,<br>Елизавета и Кирилл!/);

  assert.doesNotMatch(html, /А если не хочется ломать голову над подарком/);
  assert.doesNotMatch(html, /новоиспеченной семьи/);
});
