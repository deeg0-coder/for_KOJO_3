'use strict';

// === УЧЁТНЫЕ ЗАПИСИ KOJO GUIDE ===
// Пароли:
//   Сотрудники (6 шт):  1234
//   Администраторы (4): admin1234 (Татьяна Романовна — boss)
var KOJO_ACCOUNTS = [
  { login: 'Борисенко Екатерина', role: 'staff', passHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' },
  { login: 'Панченко Мария', role: 'staff', passHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' },
  { login: 'Бер Никита', role: 'staff', passHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' },
  { login: 'Басина Антонина', role: 'staff', passHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' },
  { login: 'Куделина Алиса', role: 'staff', passHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' },
  { login: 'Глазунов Кирилл', role: 'staff', passHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' },
  { login: 'Бариста-администратор', role: 'admin', passHash: 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270' },
  { login: 'Дарья Пляшкевич', role: 'admin', passHash: 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270' },
  { login: 'Ульяна Ашер', role: 'admin', passHash: 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270' },
  { login: 'Татьяна Романовна', role: 'admin', position: 'Boss', passHash: 'a5e7c002443743c5836758c7d1cd8ddefd9fcf2061daa0efaac683fb99966057' }
];

var KOJO_ROLE_LABELS = { staff: 'Сотрудник', admin: 'Администратор' };

function kojoRoleLabel(acc) {
  if (!acc) return '';
  return acc.position || KOJO_ROLE_LABELS[acc.role] || '';
}

function kojoAccountByLogin(login) {
  for (var i = 0; i < KOJO_ACCOUNTS.length; i++) {
    if (KOJO_ACCOUNTS[i].login === login) return KOJO_ACCOUNTS[i];
  }
  return null;
}
