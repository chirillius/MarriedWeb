const assert = require('node:assert/strict');

const { guestsList, normalizeGuestName } = require('../docs/guest-list.js');

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

test('guest list uses the updated Friedrich surname for Irina', () => {
  const newKey = normalizeGuestName('Фридрих Ирина');
  const oldKey = normalizeGuestName('Михеева Ирина');

  assert.ok(guestsList[newKey], 'Expected Фридрих Ирина to be present');
  assert.equal(guestsList[newKey].name, 'Фридрих Ирина');
  assert.equal(guestsList[newKey].role, 'Дорогие Ирина и Стас');
  assert.equal(guestsList[oldKey], undefined);
});

test('guest list includes Dorozhkina Irina and Demyanova Oksana', () => {
  const dorozhkinaKey = normalizeGuestName('Дорожкина Ирина');
  const demyanovaKey = normalizeGuestName('Демьянова Оксана');

  assert.ok(guestsList[dorozhkinaKey], 'Expected Дорожкина Ирина to be present');
  assert.equal(guestsList[dorozhkinaKey].name, 'Дорожкина Ирина');
  assert.equal(guestsList[dorozhkinaKey].role, 'Теть Ира и Дядя Сережа');

  assert.ok(guestsList[demyanovaKey], 'Expected Демьянова Оксана to be present');
  assert.equal(guestsList[demyanovaKey].name, 'Демьянова Оксана');
  assert.equal(guestsList[demyanovaKey].role, 'Дорогая Оксана');
});
