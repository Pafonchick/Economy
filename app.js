const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const assets = [
  { code: '41', name: 'Западно-Салымский', license: 'ХМН 16172 НЭ', tax: 'НДД, 3 группа', npv: '18,2' },
  { code: '42', name: 'Восточно-Салымский', license: 'ХМН 16172 НЭ', tax: 'НДД, 3 группа', npv: '14,8' },
  { code: '43', name: 'Северо-Петелинский', license: 'ХМН 03439 НЭ', tax: 'ОФР', npv: '9,7' },
  { code: '44', name: 'Южно-Петелинский', license: 'ХМН 03439 НЭ', tax: 'ОФР', npv: '5,9' }
];

const scenarios = {
  stress: { npv: '29,3', irr: '23,6', capex: '131,8', payback: '8,2', breakeven: '2034', cash: [-22,-36,-41,-24,-3,12,25,33,37,39], capexData: [24,34,40,31,21,16,11,8,5,3] },
  base: { npv: '48,6', irr: '31,8', capex: '126,4', payback: '6,4', breakeven: '2032', cash: [-20,-31,-34,-13,13,34,48,57,61,64], capexData: [22,32,39,28,19,13,9,6,4,2] },
  growth: { npv: '67,9', irr: '39,2', capex: '124,1', payback: '5,1', breakeven: '2031', cash: [-18,-28,-26,2,31,54,70,79,84,88], capexData: [21,31,37,26,17,12,8,5,3,2] }
};

const statusVariants = {
  recommended: assets.map((asset, index) => ({ ...asset, values: [1,1,1,1,1,1,1,1], comment: index === 1 ? { column: 6, text: 'Уточнён индекс тарифа на энергию' } : null })),
  zero: [
    { ...assets[1], values: [1,1,1,1,1,1,1,1] },
    { ...assets[2], values: [1,0,0,0,0,0,0,0], comment: { column: 2, text: 'Ждём данные по технологическим показателям' } }
  ]
};

const editorSections = {
  macro: { title: 'Макропараметры', kicker: 'Годовые значения · шаблон ЭМ / ручной ввод', fields: [] },
  grp: { title: 'Геолого-разведочные работы', kicker: '', fields: [['Период ГРР','2026–2029','text'],['Сейсмика 3D, км²','420','number'],['Поисковые скважины','3','number'],['Разведочные скважины','6','number'],['Бюджет, млрд ₽','8,4','text'],['Источник','Проект ГРР','text',1]] },
  tech: { title: 'Технологические показатели', kicker: 'Профиль добычи', fields: [['Начало добычи','2026','number'],['Полка добычи, тыс. т','1 280','text'],['Длительность полки, лет','4','number'],['Темп падения, %','7,5','text'],['КИН','0,34','text'],['Горизонт прогноза','2046','number']] },
  geo: { title: 'Геолого-технические данные', kicker: 'Ресурсная база', fields: [['Извлекаемые запасы, млн т','18,6','text'],['Добывающие скважины','38','number'],['Нагнетательные скважины','14','number'],['Глубина, м','2 740','text'],['Плотность нефти, т/м³','0,86','text'],['Схема разработки','Базовая','select',['Базовая','Уплотнённая']]] },
  tax: { title: 'НДД / НДПИ', kicker: 'Налоговое окружение', fields: [['Режим','НДД, 3 группа','select',['НДД, 3 группа','ОФР']],['Налог на имущество, %','2,2','text'],['Ставка дисконтирования, %','10','number'],['Льгота','Не применяется','select',['Не применяется','Региональная']],['Дата начала','01.01.2026','text'],['Дата окончания','31.12.2046','text']] },
  capex: { title: 'Капитальные вложения', kicker: 'CAPEX', fields: [['Бурение, млрд ₽','46,8','text'],['Инфраструктура, млрд ₽','28,4','text'],['Подготовка, млрд ₽','16,2','text'],['Обустройство, млрд ₽','21,6','text'],['Прочее, млрд ₽','13,4','text'],['Всего, млрд ₽','126,4','text',1]] },
  opex: { title: 'Операционные затраты', kicker: 'OPEX', fields: [['Метод','Нормативный','select',['Нормативный','Нормативно-тарифный','Ресурсный']],['Добыча, ₽/т','1 640','text'],['Транспорт, ₽/т','780','number'],['Энергия, ₽/т','420','number'],['Персонал, млн ₽/год','940','number'],['Индексация','По макропараметрам','text',1]] },
  other: { title: 'Прочее', kicker: 'Дополнительные допущения', fields: [['Валюта','RUB','select',['RUB','USD']],['Цены','Реальные','select',['Реальные','Номинальные']],['Резерв CAPEX, %','7','number'],['Резерв OPEX, %','5','number'],['Шаг расчёта','1 год','select',['1 год','1 квартал']],['Комментарий к версии','Базовая оценка','text']] }
};

const editorSectionOrder = ['macro','grp','tech','geo','tax','capex','opex','other'];
const macroYears = Array.from({ length: 21 }, (_, index) => 2026 + index);
const oilValues = [272.8,301.6,322.6,340.0,350.2,351.8,...Array(15).fill(353.3)];
const apgValues = [2897,3373,3460,3788,...Array(17).fill(4140)];
const cabotageValues = [800,600,900,1125,1218,...Array(8).fill(1389),800,600,900,1125,...Array(4).fill(1389)];

function macroYearCells(values, manual = false, suffix = '') {
  return macroYears.map((year, index) => `<td><input class="macro-value" value="${values[index] ?? '—'}${suffix}" ${manual ? '' : 'disabled'} aria-label="${year}"></td>`).join('');
}

function macroSetting(selected, options) {
  return `<select class="macro-setting">${options.map(option => `<option${option === selected ? ' selected' : ''}>${option}</option>`).join('')}</select>`;
}

function macroRow(name, unit, setting, options, values, manual = false) {
  return `<tr><th>${name}</th><td>${unit}</td><td>${macroSetting(setting, options)}</td>${macroYearCells(values, manual)}</tr>`;
}

function renderMacroWorkspace() {
  const ndd = activeAsset.tax.startsWith('НДД');
  const empty = Array(macroYears.length).fill('—');
  const header = macroYears.map(year => `<th>${year}</th>`).join('');
  const settingOptions = ['<Пусто>','ООО «РН-Юганскнефтегаз»','Да','Нет','Ручной ввод'];
  $('#editorFields').innerHTML = `<div class="macro-workspace">
    <div class="macro-scope" role="radiogroup"><label><input type="radio" name="macroScope" value="all" checked> Единые макропараметры для всех вариантов</label><label><input type="radio" name="macroScope" value="variant"> Макропараметры по каждому варианту</label></div>
    <div class="macro-variants" hidden><button type="button" data-macro-variant="zero">Нулевой вариант</button><button type="button" class="active" data-macro-variant="recommended">Рекомендуемый вариант</button><button type="button" data-macro-variant="maximum">Максимальный вариант</button></div>
    <section class="macro-block"><div class="macro-block-head"><div><span>01</span><h4>Настройка NetBack</h4></div><small>Выбор справочника, признака или ручного ввода</small></div><div class="macro-table-wrap"><table class="macro-table"><thead><tr><th>Наименование</th><th>Ед. изм.</th><th>Настройка</th>${header}</tr></thead><tbody>
      ${macroRow('NetBack по нефти','$ / т','ООО «РН-Юганскнефтегаз»',settingOptions,oilValues)}
      ${macroRow('NetBack по нефти и ГК','$ / т','Да',settingOptions,oilValues)}
      ${macroRow('NetBack по ГК','$ / т','<Пусто>',settingOptions,empty)}
      ${macroRow('NetBack по природному газу','руб / тыс. м³','<Пусто>',settingOptions,empty)}
      ${macroRow('NetBack по попутному газу','руб / тыс. м³','Ручной ввод',settingOptions,apgValues,true)}
    </tbody></table></div></section>
    <section class="macro-block"><div class="macro-block-head"><div><span>02</span><h4>Прочие настройки</h4></div><small>${ndd ? 'Общие параметры и дополнительные признаки НДД' : 'Общие параметры для режима ОФР'}</small></div><div class="macro-table-wrap"><table class="macro-table"><thead><tr><th>Наименование</th><th>Ед. изм.</th><th>Настройка</th>${header}</tr></thead><tbody>
      ${macroRow('Каботаж','руб / т','Ручной ввод',['Без настройки','Ручной ввод'],cabotageValues,true)}
      ${macroRow('Ручной ввод Ккг2023/2024 (ПГ и СОГ)','руб / тыс. м³','Без настройки',['Без настройки','Ручной ввод'],empty)}
      ${macroRow('Ручной ввод Ккг2023/2024 (газ прочим потребителям)','руб / тыс. м³','Без настройки',['Без настройки','Ручной ввод'],empty)}
    </tbody></table></div>${ndd ? `<div class="ndd-settings"><label><span>Направление поставок нефти</span><select><option>Рег. признак</option><option>Экспорт</option><option>Внутренний рынок</option></select></label><label><span>Район сдачи</span><select><option>Иркутская обл.</option><option>ХМАО</option></select></label><label><span>Цена ПГ</span><select><option>Даниловский</option><option>Ручной ввод</option></select></label><label><span>Цена ПНГ</span><select><option>Даниловский</option><option>Ручной ввод</option></select></label></div>` : ''}</section>
    <section class="macro-block"><div class="macro-block-head"><div><span>03</span><h4>Налоги на прибыль и имущество</h4></div><small>Льготы и ставки по годам</small></div><div class="macro-table-wrap"><table class="macro-table"><thead><tr><th>Наименование</th><th>Ед. изм.</th><th>Льгота</th>${header}</tr></thead><tbody>
      ${macroRow('Налог на прибыль','%','Нет',['Нет','Да','Ручной ввод'],Array(macroYears.length).fill(25))}
      ${macroRow('Налог на имущество','%','Да',['Нет','Да','Ручной ввод'],macroYears.map(year => year <= 2030 ? 2.2 : 2.0))}
    </tbody></table></div></section>
  </div>`;
  $('#editorFields').classList.add('macro-editor-fields');
  const draft = JSON.parse(localStorage.getItem(`macroDraft:${activeAsset.code}`) || 'null');
  if (draft) $$('.macro-value:not(:disabled)', $('#editorFields')).forEach((input, index) => { if (draft[index] !== undefined) input.value = draft[index]; });
}

const grrYears = Array.from({ length: 21 }, (_, index) => 2026 + index);
const grrTables = {
  seismic: {
    step: '1/3', title: 'Сейсмические работы', range: 'строки 3–14 листа «Шаблон»',
    rows: [
      ['1.','Сейсморазведочные работы. Метод 2D','тыс. руб.','group'],['','объём','пог. км','child'],['','операционные затраты','тыс. руб.','child'],['','капитальные вложения','тыс. руб.','child'],
      ['2.','Сейсморазведочные работы. Метод 3D','тыс. руб.','group'],['','объём','км²','child'],['','операционные затраты','тыс. руб.','child'],['','капитальные вложения','тыс. руб.','child'],
      ['3.','Лицензионные обязательства','—','group'],['','2D сейсмика','пог. км','child'],['','3D сейсмика','км²','child']
    ]
  },
  drilling: {
    step: '2/3', title: 'Поисково-разведочное бурение', range: 'строки 17–42 листа «Шаблон»',
    rows: [
      ['1.','Поисково-разведочное бурение','тыс. руб.','group'],['','проходка','тыс. м','child'],['','скважины, законченные строительством','скв.','child'],['','вероятность геологической успешности','%','child'],['','операционные затраты','тыс. руб.','child'],['','капитальные вложения','тыс. руб.','child'],
      ['2.','НИР','тыс. руб.','group'],['','операционные затраты','тыс. руб.','child'],['','капитальные вложения','тыс. руб.','child'],
      ['3.','ПЗ + ТЭО КИН','тыс. руб.','group'],['','операционные затраты','тыс. руб.','child'],['','капитальные вложения','тыс. руб.','child'],
      ['4.','Агентское вознаграждение','тыс. руб.','group'],['','операционные затраты','тыс. руб.','child'],['','капитальные вложения','тыс. руб.','child'],
      ['5.','Прочее','тыс. руб.','group'],['','операционные затраты','тыс. руб.','child'],['','капитальные вложения','тыс. руб.','child'],
      ['6.','Мероприятия по повышению эффективности ПРБ (95%)','тыс. руб.','group'],
      ['7.','Затраты, связанные с разработкой месторождения','тыс. руб.','group'],['','операционные затраты','тыс. руб.','child'],['','капитальные вложения','тыс. руб.','child'],
      ['8.','Корректировка под финансирование','тыс. руб.','group'],['','операционные затраты','тыс. руб.','child'],['','капитальные вложения','тыс. руб.','child']
    ]
  },
  reserves: {
    step: '3/3', title: 'Прирост запасов', range: 'строки 45–77 листа «Шаблон»',
    rows: ['АВ1С1','В2С2'].flatMap((category, categoryIndex) => [
      [`${categoryIndex + 1}.`,`Прирост запасов категории ${category} на конец года`,'—','group'],
      ...['Нефть','Конденсат','Газ'].flatMap((product, productIndex) => [
        [`${categoryIndex + 1}.${productIndex + 1}`,product,'тыс. т','subgroup'],
        ['', 'разведочное бурение','тыс. т','child'],['','эксплуатационное бурение','тыс. т','child'],['','переоценка запасов (с учётом списания)','тыс. т','child'],['','приобретение','тыс. т','child']
      ])
    ])
  }
};
let grrView = 'seismic';
let grrVariant = 'recommended';
let grrFileName = 'Шаблон Программа ГРР.xlsx';
let grrImportOpen = false;

function grrDraftKey() { return `grrDraft:${activeAsset.code}:${grrVariant}:${grrView}`; }
function grrSeed(rowIndex, yearIndex) {
  if (yearIndex > 7 || (rowIndex + yearIndex) % 4) return '';
  if (grrView === 'seismic') return rowIndex % 4 === 1 ? 40 + rowIndex * 7 + yearIndex * 5 : 850 + rowIndex * 120 + yearIndex * 45;
  if (grrView === 'drilling') return rowIndex === 3 ? 78 : 1200 + rowIndex * 95 + yearIndex * 70;
  return Math.max(0, 18 + rowIndex * 3 + yearIndex * 2);
}
function grrValues() {
  const saved = JSON.parse(localStorage.getItem(grrDraftKey()) || 'null');
  return saved || grrTables[grrView].rows.map((_, rowIndex) => grrYears.map((__, yearIndex) => grrSeed(rowIndex, yearIndex)));
}
function grrTotal(values) { return values.reduce((sum, value) => sum + (Number(String(value).replace(',', '.').replace(/\s/g, '')) || 0), 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }); }
function grrRowsMarkup() {
  const values = grrValues();
  const highlighted = new Set(['Сейсморазведочные работы. Метод 2D','Сейсморазведочные работы. Метод 3D','Лицензионные обязательства']);
  return grrTables[grrView].rows.map(([number, name, unit, kind], rowIndex) => `<tr class="grr-row-${kind}${highlighted.has(name) ? ' grr-highlight' : ''}"><td>${number}</td><th>${name}</th><td>${unit}</td><td class="grr-total">${grrTotal(values[rowIndex])}</td>${grrYears.map((year, yearIndex) => `<td><input class="grr-value" data-row="${rowIndex}" data-year="${year}" value="${values[rowIndex][yearIndex]}" aria-label="${name}, ${year}" readonly></td>`).join('')}</tr>`).join('');
}
function grrMappingRows() {
  const zero = [assets[1], assets[2]];
  return [['Нулевой',zero],['Рекомендуемый',assets],['Максимальный',assets]].map(([variant, list]) => list.map((asset, index) => {
    const prefix = variant === 'Нулевой' ? 'Нул' : variant === 'Рекомендуемый' ? 'Рек' : 'Макс';
    const shortName = asset.name.split('-').map(part => part.slice(0, 2)).join('');
    return `<tr>${index ? '' : `<td class="grr-variant-cell" rowspan="${list.length}"><b>${variant}</b></td>`}<td>${asset.license}</td><td>${asset.name}</td><td><select class="grr-sheet-select"><option>&lt;Отсутствует&gt;</option><option selected>${prefix}_${shortName}_${asset.license.match(/\d+/)?.[0] || asset.code}</option><option>Программа_${asset.code}</option></select></td><td><span class="grr-load-status ok">✓ Проверен</span></td></tr>`;
  }).join('')).join('');
}
function renderGrrWorkspace() {
  const table = grrTables[grrView];
  const yearHead = grrYears.map(year => `<th>${year}</th>`).join('');
  $('#editorFields').innerHTML = `<div class="grr-workspace">
    <section class="grr-toolbar"><button class="button button-dark" type="button" data-grr-upload>Загрузить программу ГРР</button><span id="grrFileName">${grrFileName}</span><button class="button button-secondary" type="button" data-grr-download>Скачать шаблон программы ГРР</button></section>
    <div class="grr-variants" role="tablist"><button type="button" data-grr-variant="zero" class="${grrVariant === 'zero' ? 'active' : ''}">Нулевой вариант</button><button type="button" data-grr-variant="recommended" class="${grrVariant === 'recommended' ? 'active' : ''}">Рекомендуемый вариант</button><button type="button" data-grr-variant="maximum" class="${grrVariant === 'maximum' ? 'active' : ''}">Максимальный вариант</button></div>
    <div class="grr-view-tabs" role="tablist">${Object.entries(grrTables).map(([key, item]) => `<button type="button" data-grr-view="${key}" class="${grrView === key ? 'active' : ''}"><span>${item.step}</span>${item.title}</button>`).join('')}</div>
    <section class="grr-table-block"><header><div><span>${table.step}</span><div><h4>${table.title}</h4></div></div><div class="grr-legend">Данные из файла</div></header><div class="grr-table-scroll"><table class="grr-table"><thead><tr><th>№</th><th>Показатель</th><th>Ед. изм.</th><th>Итого</th>${yearHead}</tr></thead><tbody>${grrRowsMarkup()}</tbody></table></div></section>
    <aside class="grr-import ${grrImportOpen ? 'open' : ''}" aria-hidden="${!grrImportOpen}"><div class="grr-import-head"><div><span>Импорт Excel</span><h4>Настройка исходных данных для программы ГРР</h4></div><button type="button" class="icon-button" data-grr-close aria-label="Закрыть">×</button></div><div class="grr-file-row"><input id="grrFileInput" type="file" accept=".xlsx,.xlsm,.xls" hidden><button class="button button-secondary" type="button" data-grr-file>Выбрать файл</button><span><b>${grrFileName}</b></span></div><div class="grr-map-scroll"><table class="grr-map"><thead><tr><th>Вариант</th><th>Лицензия</th><th>Месторождение</th><th>Наименование листа из файла</th><th>Статус загрузки</th></tr></thead><tbody>${grrMappingRows()}</tbody></table></div><div class="grr-import-foot"><span id="grrImportHint">Сопоставьте листы и загрузите данные.</span><button class="button button-primary" type="button" data-grr-import>Загрузить данные</button></div></aside>
  </div>`;
  $('#editorFields').classList.add('grr-editor-fields');
}

function saveGrrDraft() {
  const rows = grrTables[grrView].rows.map((_, rowIndex) => $$(`.grr-value[data-row="${rowIndex}"]`, $('#editorFields')).map(input => input.value));
  if (rows.some(row => row.length)) localStorage.setItem(grrDraftKey(), JSON.stringify(rows));
}
function updateGrrTotals() {
  $$('.grr-table tbody tr', $('#editorFields')).forEach(row => { $('.grr-total', row).textContent = grrTotal($$('.grr-value', row).map(input => input.value)); });
}
function validateGrrMapping() {
  const selects = $$('.grr-sheet-select', $('#editorFields'));
  const valid = selects.every(select => select.value !== '<Отсутствует>');
  selects.forEach(select => { const status = $('.grr-load-status', select.closest('tr')); const ok = select.value !== '<Отсутствует>'; status.className = `grr-load-status ${ok ? 'ok' : 'bad'}`; status.textContent = ok ? '✓ Проверен' : '× Лист не выбран'; });
  $('[data-grr-import]', $('#editorFields')).disabled = !valid;
  $('#grrImportHint').textContent = valid ? 'Все строки прошли минимальную проверку. Данные можно перенести.' : 'Исправьте строки со статусом ошибки или выберите другой лист.';
}

const geoReserveGroups = [
  { key: 'initial', title: 'Начальные извлекаемые запасы АВ1С1 + В2С2', date: 'на 01.01.2026', values: ['11 000,000','5 000,000','3 000,000'] },
  { key: 'production', title: 'Накопленная добыча', date: 'на 01.01.2026', values: ['11 000,000','5 000,000','3 000,000'] },
  { key: 'ab1c1', title: 'Остаточные запасы категории АВ1С1', date: 'на 01.01.2026', values: ['11 000,000','5 000,000','3 000,000'] },
  { key: 'b2c2', title: 'Остаточные запасы категории В2С2', date: 'на 01.01.2026', values: ['11 000,000','5 000,000','3 000,000'] }
];
const geoProducts = [['Нефть','тыс. т'],['Конденсат','тыс. т'],['Газ','млн м³']];
let geoLoadState = { reserves: 'ready', wells: 'ready' };

function currentOpexMethod() { return $('input[name="opex"]:checked')?.value || 'normative'; }
function renderGeoWorkspace() {
  const repairsEnabled = currentOpexMethod() === 'resource';
  const draft = JSON.parse(localStorage.getItem(`geoDraft:${activeAsset.code}`) || 'null') || { loss: '0,01', own: '2', workover: '25', repair: '100' };
  const reserveRows = geoProducts.map(([name, unit], productIndex) => `<tr><th>${name}</th><td>${unit}</td>${geoReserveGroups.map(group => `<td><input value="${group.values[productIndex]}" disabled></td>`).join('')}</tr>`).join('');
  const wellRows = [['Нефтяной','11'],['Газовый','—'],['Нагнетательный','3'],['Водозаборный','1'],['Прочие','—']].map(([name,value]) => `<tr><th>${name}</th><td>скв.</td><td><input value="${value}" disabled></td></tr>`).join('');
  const manualRows = [
    ['Коэффициенты приведения нефти к товарной','Потери при производстве','%','loss',draft.loss,true],
    ['Коэффициенты приведения нефти к товарной','Нефть на собственные нужды','%','own',draft.own,true],
    ['Ремонты, обеспечивающие базовую добычу','Прочие КРС','% от СДФ','workover',draft.workover,repairsEnabled],
    ['Ремонты, обеспечивающие базовую добычу','ТРС','% от СДФ','repair',draft.repair,repairsEnabled]
  ].map(([group,name,unit,key,value,enabled]) => `<tr><td>${group}</td><th>${name}</th><td>${unit}</td><td><input class="geo-manual" name="${key}" value="${value}" inputmode="decimal" ${enabled ? '' : 'disabled'}></td></tr>`).join('');
  $('#editorFields').innerHTML = `<div class="geo-workspace geo-table-workspace">
    <section class="geo-table-panel geo-reserves-panel"><header><div><h4>Запасы на 01.01.2026</h4></div><button class="button button-secondary" type="button" data-geo-load="reserves">${geoLoadState.reserves === 'loading' ? 'Загрузка…' : 'Загрузить геологические данные'}</button></header><div class="geo-table-scroll"><table class="geo-data-table"><thead><tr><th>Показатель</th><th>Ед. изм.</th>${geoReserveGroups.map(group => `<th>${group.title}</th>`).join('')}</tr></thead><tbody>${reserveRows}</tbody></table></div></section>
    <section class="geo-table-panel"><header><div><h4>Фонд скважин на конец 2025 года</h4></div><button class="button button-secondary" type="button" data-geo-load="wells">${geoLoadState.wells === 'loading' ? 'Загрузка…' : 'Загрузить данные по фонду'}</button></header><div class="geo-table-scroll"><table class="geo-data-table geo-well-table"><thead><tr><th>Тип фонда</th><th>Ед. изм.</th><th>Значение</th></tr></thead><tbody>${wellRows}<tr class="total-row"><th>Всего в фонде</th><td>скв.</td><td>15</td></tr></tbody></table></div></section>
    <section class="geo-table-panel"><header><div><h4>Коэффициенты и ремонты</h4></div><small>Метод OPEX: ${currentOpexMethod() === 'normative' ? 'нормативный' : currentOpexMethod() === 'tariff' ? 'нормативно-тарифный' : 'ресурсный'}</small></header><div class="geo-table-scroll"><table class="geo-data-table geo-manual-table"><thead><tr><th>Группа</th><th>Показатель</th><th>Ед. изм.</th><th>Значение</th></tr></thead><tbody>${manualRows}</tbody></table></div></section>
  </div>`;
  $('#editorFields').classList.add('geo-editor-fields');
}

function saveGeoDraft() {
  const fields = $$('.geo-manual', $('#editorFields'));
  if (!fields.length) return;
  localStorage.setItem(`geoDraft:${activeAsset.code}`, JSON.stringify(Object.fromEntries(fields.map(input => [input.name, input.value]))));
}

const opexNormGroups = [
  { id:'variable', title:'Нормативы переменных затрат (без учёта электроэнергии)', rows:[['Затраты на добычу и перекачку жидкости','руб/тн'],['Затраты на подготовку нефти','руб/тн'],['Затраты на подготовку конденсата','руб/тн'],['Затраты на добычу и подготовку природного газа','руб/тыс. м³'],['Затраты на добычу и подготовку попутного газа','руб/тыс. м³'],['Затраты на закачку воды','руб/м³'],['Затраты на закачку газа (пара)','руб/тыс. м³ (тн)'],['Затраты на транспортировку нефти','руб/тн'],['Затраты на транспортировку газа','руб/тыс. м³']] },
  { id:'electricity', title:'Нормативы переменных затрат (электроэнергия)', rows:[['Затраты на добычу и перекачку жидкости','руб/тн'],['Затраты на подготовку нефти','руб/тн'],['Затраты на подготовку конденсата','руб/тн'],['Затраты на добычу и подготовку природного газа','руб/тыс. м³'],['Затраты на добычу и подготовку попутного газа','руб/тыс. м³'],['Затраты на закачку воды','руб/м³'],['Затраты на закачку газа (пара)','руб/тыс. м³ (тн)'],['Затраты на транспортировку нефти','руб/тн'],['Затраты на транспортировку газа','руб/тыс. м³']] },
  { id:'gtm', title:'Нормативы ГТМ', rows:[['ГРП','тыс. руб/скв.-опер.'],['ПиП','тыс. руб/скв.-опер.'],['Ввод прочих новых','тыс. руб/скв.-опер.'],['Ввод из бездействия','тыс. руб/скв.-опер.'],['Перевод под нагнетание','тыс. руб/скв.-опер.'],['Прочие КРС','тыс. руб/скв.-опер.'],['ТРС','тыс. руб/скв.-опер.'],['Консервация скважин','тыс. руб/скв.-опер.'],['Ликвидация скважин','тыс. руб/скв.-опер.']] },
  { id:'fixed', title:'Нормативы условно-постоянных затрат', rows:[['Обслуживание нефтяных скважин','тыс. руб/год на скв.'],['Обслуживание газовых скважин','тыс. руб/год на скв.'],['Обслуживание дорог','тыс. руб/год за км'],['Обслуживание ВЛ','тыс. руб/год за км'],['Обслуживание трубопроводов','тыс. руб/год за км'],['Постоянные затраты в составе эксплуатационных (нефть)','тыс. руб/год'],['Постоянные затраты в составе эксплуатационных (газ)','тыс. руб/год'],['Постоянные затраты в составе неэксплуатационных (нефть)','тыс. руб/год'],['Постоянные затраты в составе неэксплуатационных (газ)','тыс. руб/год']] },
  { id:'otherfixed', title:'Нормативы прочих постоянных затрат', rows:[['Прочие постоянные затраты в составе эксплуатационных (нефть)','тыс. руб'],['Прочие постоянные затраты в составе эксплуатационных (газ)','тыс. руб'],['Прочие постоянные затраты в составе неэксплуатационных (нефть)','тыс. руб'],['Прочие постоянные затраты в составе неэксплуатационных (газ)','тыс. руб']] },
  { id:'residual', title:'Остаточная стоимость ОС, без НДС', rows:[['Группа 1','млн руб'],['Группа 2','млн руб'],['Группа 3','млн руб'],['Группа 4','млн руб']] }
];
let opexEnergyVariant = 'recommended';
let opexLoadState = 'ready';
let opexDisplayMode = 'normative';
function opexDraft() { return JSON.parse(localStorage.getItem(`opexDraft:${activeAsset.code}`) || '{}'); }
function opexNormTable(group) {
  const draft = opexDraft();
  return `<section class="opex-norm-card"><header><div><span>${String(opexNormGroups.indexOf(group) + 1).padStart(2,'0')}</span><h4>${group.title}</h4></div><small>Ручной ввод</small></header><table><thead><tr><th>Наименование</th><th>Ед. изм.</th><th>Норматив</th></tr></thead><tbody>${group.rows.map(([name,unit], index) => { const key = `${group.id}:${index}`; return `<tr><td>${name}</td><td>${unit}</td><td><input class="opex-input" name="${key}" value="${draft[key] || ''}" inputmode="decimal" placeholder="—"></td></tr>`; }).join('')}</tbody></table></section>`;
}
function energySourceCount() { return Number(localStorage.getItem(`opexSources:${activeAsset.code}:${opexEnergyVariant}`) || 2); }
function energyDraft() { return JSON.parse(localStorage.getItem(`energyDraft:${activeAsset.code}:${opexEnergyVariant}`) || '{}'); }
function energyIndexDraft() { return JSON.parse(localStorage.getItem(`energyIndexDraft:${activeAsset.code}`) || '{}'); }
function energyRow(name, unit, source, type, disabled = false) {
  const draft = energyDraft();
  return `<tr><th>${source ? `Источник ${source}` : 'ИТОГО'}</th><td>${name}</td><td>${unit}</td>${macroYears.map(year => { const key=`${source || 0}:${type}:${year}`; return `<td><input class="energy-input ${disabled ? type : ''}" name="${key}" data-source="${source || 0}" data-type="${type}" data-year="${year}" value="${draft[key] || ''}" ${disabled ? 'disabled' : ''}></td>`; }).join('')}</tr>`;
}
function renderEnergyProfiles() {
  const bpYears = macroYears.slice(0, 6), indexes = energyIndexDraft(), count = energySourceCount();
  const sources = Array.from({length:count},(_,index)=>index+1);
  return `<section class="energy-workspace"><header><div><span>Профили энергопотребления</span><h4>Тарифы, объёмы и затраты по источникам</h4><small>Профили формируются отдельно для каждого варианта; инфляционные индексы едины.</small></div><button class="button button-secondary" type="button" data-opex-load>${opexLoadState === 'loading' ? 'Сбор данных…' : 'Загрузить профили энергопотребления'}</button></header><div class="opex-variants">${[['zero','Нулевой'],['recommended','Рекомендуемый'],['maximum','Максимальный']].map(([key,label])=>`<button type="button" data-opex-variant="${key}" class="${opexEnergyVariant === key ? 'active' : ''}">${label} вариант</button>`).join('')}</div><div class="energy-index"><div><b>Темп роста тарифов на электроэнергию</b><small>Едины для всех вариантов · последний год БП = 2031</small></div>${bpYears.map(year => `<label><span>${year}</span><input class="energy-input" name="index:${year}" data-type="index" data-year="${year}" value="${indexes[`index:${year}`] || '1,00'}"></label>`).join('')}</div><div class="energy-table-wrap"><table class="energy-table"><thead><tr><th>Источник</th><th>Наименование</th><th>Ед. изм.</th>${macroYears.map(year=>`<th>${year}</th>`).join('')}</tr></thead><tbody>${energyRow('Затраты на энергопотребление по всем источникам (с учётом инфляции)','тыс. руб',0,'energy-total',true)}${sources.map(source => `${energyRow('Тариф','руб/кВт·ч',source,'tariff')}${energyRow('Объём потребления','тыс. кВт·ч/год',source,'volume')}${energyRow(`Затраты на энергопотребление по источнику ${source} (с учётом инфляции)`,'тыс. руб',source,'energy-cost',true)}`).join('')}</tbody></table></div><footer><span class="opex-sync ${opexLoadState}"><i></i>${opexLoadState === 'loading' ? 'Выполняется сбор объёмов по типам источников…' : `${count} источника · данные готовы к редактированию`}</span><button class="text-button" type="button" data-opex-source-add>+ Добавить источник</button></footer></section>`;
}
function renderOpexWorkspace() {
  const method = currentOpexMethod(), tariff = method === 'tariff', resource = method === 'resource';
  if (!resource) opexDisplayMode = tariff ? 'tariff' : opexDisplayMode;
  const shownTariff = !resource && opexDisplayMode === 'tariff';
  const groups = resource ? [] : opexNormGroups.filter(group => !(shownTariff && group.id === 'electricity'));
  $('#editorFields').innerHTML = `<div class="opex-workspace">${resource ? renderResourceOpex() : `<div class="opex-mode-tabs"><button type="button" data-opex-mode="normative" class="${!shownTariff?'active':''}">Нормативный метод</button><button type="button" data-opex-mode="tariff" class="${shownTariff?'active':''}">Нормативно-тарифный метод</button></div><div class="opex-norm-grid">${groups.map(opexNormTable).join('')}</div>${shownTariff ? renderEnergyProfiles() : ''}`}</div>`;
  $('#editorFields').classList.add('opex-editor-fields');
  if (shownTariff) recalcEnergy();
}
function saveOpexDraft() {
  const current = opexDraft();
  $$('.opex-input', $('#editorFields')).forEach(input => current[input.name] = input.value);
  localStorage.setItem(`opexDraft:${activeAsset.code}`, JSON.stringify(current));
}
function saveEnergyDraft() {
  const current = energyDraft();
  $$('.energy-table .energy-input:not(:disabled)', $('#editorFields')).forEach(input => current[input.name] = input.value);
  localStorage.setItem(`energyDraft:${activeAsset.code}:${opexEnergyVariant}`, JSON.stringify(current));
  const indexes = energyIndexDraft();
  $$('.energy-index .energy-input', $('#editorFields')).forEach(input => indexes[input.name] = input.value);
  localStorage.setItem(`energyIndexDraft:${activeAsset.code}`, JSON.stringify(indexes));
}
function recalcEnergy() {
  const root = $('.energy-workspace'); if (!root) return;
  const number = value => Number(String(value || '').replace(',','.').replace(/\s/g,'')) || 0;
  macroYears.forEach(year => {
    let total = 0;
    for (let source=1; source<=energySourceCount(); source++) {
      const tariff = number($(`.energy-input[data-source="${source}"][data-type="tariff"][data-year="${year}"]`, root)?.value);
      const volume = number($(`.energy-input[data-source="${source}"][data-type="volume"][data-year="${year}"]`, root)?.value);
      const bpYear = Math.min(year, 2031), index = number($(`.energy-input[data-type="index"][data-year="${bpYear}"]`, root)?.value) || 1;
      const cost = tariff * volume * index; total += cost;
      const costInput = $(`.energy-input[data-source="${source}"][data-type="energy-cost"][data-year="${year}"]`, root); if (costInput) costInput.value = cost ? cost.toLocaleString('ru-RU',{maximumFractionDigits:2}) : '';
    }
    const totalInput = $(`.energy-input[data-type="energy-total"][data-year="${year}"]`, root); if (totalInput) totalInput.value = total ? total.toLocaleString('ru-RU',{maximumFractionDigits:2}) : '';
  });
}

const modelVariants = [['zero','Нулевой'],['recommended','Рекомендуемый'],['maximum','Максимальный']];
let editorVariant = 'recommended';
let techView = 'general';
let techWellsOpen = false;
let taxView = 'base';
let capexView = 'bp';
let capexVariant = 'recommended';

function variantName(key = editorVariant) { return modelVariants.find(([value]) => value === key)?.[1] || 'Рекомендуемый'; }
function yearHeader(years) { return years.map(year => `<th>${year}</th>`).join(''); }
function emptyYearInputs(years, className, readOnly = false, values = []) {
  return years.map((year, index) => `<td><input class="${className}" data-year="${year}" value="${values[index] ?? ''}" ${readOnly ? 'readonly' : ''}></td>`).join('');
}

const techMetrics = [
  ['ИТОГО','Добыча нефти','тыс. т'],['ИТОГО','Добыча жидкости','тыс. т'],['ИТОГО','Закачка воды','тыс. м³'],['ИТОГО','Добыча попутного газа','млн м³'],['ИТОГО','Ввод новых скважин','шт.'],['ИТОГО','Действующий фонд скважин','шт.'],
  ['База','Добыча нефти','тыс. т'],['База','Добыча жидкости','тыс. т'],['База','Закачка воды','тыс. м³'],['База','Добыча попутного газа','млн м³'],['База','Ввод новых скважин','шт.'],['База','Действующий фонд скважин','шт.'],
  ['Развитие','Добыча нефти','тыс. т'],['Развитие','Добыча жидкости','тыс. т'],['Развитие','Закачка воды','тыс. м³'],['Развитие','Добыча попутного газа','млн м³'],['Развитие','Ввод новых скважин','шт.'],['Развитие','Действующий фонд скважин','шт.']
];
function techRowsMarkup() {
  const years = macroYears;
  return techMetrics.map(([option,metric,unit]) => {
    const row = (dimension = '', kind = '') => `<tr class="${option === 'ИТОГО' || kind === 'total' ? 'group-row' : ''}"><td>${option}</td><th>${metric}</th>${techView === 'general' ? '' : techView === 'combined' ? `<td>${dimension.split('|')[0] || '—'}</td><td>${dimension.split('|')[1] || '—'}</td>` : `<td>${dimension || '—'}</td>`}<td>${unit}</td><td>—</td>${emptyYearInputs(years,'tech-value',true)}</tr>`;
    if (option !== 'Развитие' || techView === 'general') return row();
    if (techView === 'cluster') return row('ИТОГО','total') + row('Куст 1') + row('Куст 2');
    if (techView === 'benefit') return row('ИТОГО','total') + row('1,0') + row('0,2');
    return row('ИТОГО|ИТОГО','total') + row('Куст 1|1,0') + row('Куст 1|0,2') + row('Куст 2|1,0') + row('Куст 2|0,2');
  }).join('');
}
function techWellTable() {
  const years = macroYears.slice(0,12), wells = [['7091','ГС','Добыв.','03.03.2031','100',[10,15,11,9,8,7,6]],['7092','ГС','Добыв.','03.04.2031','90',[9,16,11,9,8,7,6]],['7093','ННС','Нагнет.','03.05.2031','10',[8,2]]];
  const combined = techView === 'combined';
  return `<section class="tech-wells"><header><h4>Поскважинная информация ${combined ? 'по кустам и категориям льгот' : 'по кустам'}</h4><button class="text-button" type="button" data-tech-wells-close>Закрыть</button></header><div class="model-table-scroll"><table class="model-table"><thead><tr><th>Скважина</th><th>Тип</th>${combined ? '<th>Кд</th>' : ''}<th>Назначение</th><th>Дата ввода</th><th>Ед. изм.</th><th>Всего</th>${yearHeader(years)}</tr></thead><tbody><tr class="group-row"><th colspan="${combined ? 6 : 5}">Добыча нефти</th><td>200</td>${years.map((y,i)=>`<td>${[27,33,22,18,16,14,12][i]||''}</td>`).join('')}</tr>${wells.map(([well,type,use,date,total,values],index)=>`<tr><th>${well}</th><td>${type}</td>${combined ? `<td>${index===2?'1,0':'0,2'}</td>` : ''}<td>${use}</td><td>${date}</td><td>тыс. т</td><td>${total}</td>${years.map((y,i)=>`<td>${values[i]||''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function renderTechWorkspace() {
  const years = macroYears;
  if (techView === 'benefit' || techView === 'general') techWellsOpen = false;
  const dimensionHeaders = techView === 'general' ? '' : techView === 'combined' ? '<th>Куст</th><th>Кд</th>' : `<th>${techView === 'benefit' ? 'Кд' : 'Куст'}</th>`;
  const wellsAllowed = techView === 'cluster' || techView === 'combined';
  $('#editorFields').innerHTML = `<div class="model-workspace tech-workspace"><div class="section-toolbar"><div class="segmented">${[['general','Общий вид'],['cluster','По кустам'],['benefit','По категориям льгот'],['combined','Кусты и льготы']].map(([key,label])=>`<button type="button" data-tech-view="${key}" class="${techView===key?'active':''}">${label}</button>`).join('')}</div><div class="period-fields"><label>Период<select><option>По умолчанию</option><option>Задать период</option></select></label><label>Год начала<input value="2026"></label><label>Год окончания<input value="2046"></label></div><button class="button button-dark" type="button" data-tech-load>Загрузить технологические данные и ГТМ</button>${wellsAllowed ? '<button class="button button-secondary" type="button" data-tech-wells>Поскважинная информация</button>' : ''}</div><div class="model-table-scroll"><table class="model-table tech-table"><thead><tr><th>Опция</th><th>Показатель</th>${dimensionHeaders}<th>Ед. изм.</th><th>Итого</th>${yearHeader(years)}</tr></thead><tbody>${techRowsMarkup()}</tbody></table></div>${techWellsOpen ? techWellTable() : ''}</div>`;
  $('#editorFields').classList.add('model-editor-fields');
}

const taxBaseFields = [
  ['Накопленная добыча нефти по ЛУ на 01.01.2025, тыс. т','210'],['Добыча нефти по ЛУ за 2025, тыс. т','30'],['НИЗ АВ1С1 + В2С2 по ЛУ, тыс. т','1500'],['НИЗ АВ1С1 + В2С2 по ЛУ на 01.01.2025, тыс. т','1290'],['Прирост или списание запасов по ЛУ за 2025, тыс. т','—'],['Год первой постановки НИЗ по ЛУ на ГБЗ','2006'],['Год выдачи лицензии','2021'],['Степень выработанности запасов по ЛУ','Расчётное значение']
];
const taxBenefitNames = {g1b:'Группа 1 · Баженовская свита',g1a:'Группа 1 · Абалакская, Хадумская и Доманиковая свиты',g2:'Группа 2 · третья категория ТрИЗ (0,2)',g3:'Группа 3 · вторая категория ТрИЗ (0,4)',g4:'Группа 4 · первая категория ТрИЗ (0,8)',g5:'Группа 5 · высоковязкая нефть',g6:'Группа 6 · сверхвязкая нефть',gas:'Газ и газовый конденсат'};
function taxField(label,value,type='input') { return `<label><span>${label}</span>${type==='select'?`<select class="tax-value"><option>${value}</option><option>Нет</option><option>Да</option></select>`:`<input class="tax-value" value="${value}">`}</label>`; }
function taxBenefitPanel() {
  if (taxView === 'gas') return `<section class="tax-panel"><header><h4>Газ и газовый конденсат</h4></header><div class="tax-fields">${[['Доля поставок газа на внутренний рынок РФ (Ов)','Список','select'],['Туронская залежь · минимальная глубина, м','1700'],['Накопленная добыча природного газа на 01.01.2026, тыс. м³','—'],['Остаточные запасы природного газа на 01.01.2026, тыс. м³','—'],['Слагаемое для ставки НДПИ на газ Ккг, руб./тыс. м³','Список','select'],['Коэффициент изъятия Ки','0,15'],['Географическое расположение участка недр','Список','select'],['Принадлежность к региональной системе газоснабжения Кас','Список','select']].map(x=>taxField(...x)).join('')}</div><div class="model-table-scroll"><table class="model-table"><thead><tr><th>Наименование</th><th>Ед. изм.</th>${yearHeader(Array.from({length:15},(_,i)=>2017+i))}</tr></thead><tbody><tr><th>Объём добычи конденсата (МГК)</th><td>т</td>${emptyYearInputs(Array.from({length:15},(_,i)=>2017+i),'tax-year-value')}</tr><tr><th>Коэффициент извлечения ШФЛУ и ПБТ</th><td>%</td>${emptyYearInputs(Array.from({length:15},(_,i)=>2017+i),'tax-year-value')}</tr></tbody></table></div></section>`;
  return `<section class="tax-panel"><header><h4>${taxBenefitNames[taxView]}</h4></header><div class="tax-fields">${[['НИЗ АВ1С1 + В2С2 залежи ТрИЗ на 01.01.2025, тыс. т','300'],['Прирост или списание запасов залежи ТрИЗ за 2025, тыс. т','—'],['Год первой постановки НИЗ по залежи на ГБЗ','Список','select'],['Степень выработанности по залежи на 01.01.2012, %','1'],['Накопленная добыча нефти залежи на 01.01.2025, тыс. т','—'],['Добыча нефти залежи за 2025, тыс. т','—'],['Степень выработанности по залежи на 01.01.2013, %','—'],['Год превышения 1% выработанности ТрИЗ','Список','select']].map(x=>taxField(...x)).join('')}</div></section>`;
}
function renderTaxWorkspace() {
  const ndd = activeAsset.tax.startsWith('НДД');
  if (ndd) $('#editorFields').innerHTML = `<div class="model-workspace tax-workspace"><section class="tax-panel"><header><h4>Настройка данных для НДД</h4></header><div class="tax-fields">${[['Источник цены природного газа','ФАС','select'],['Источник цены попутного газа','ФАС','select'],['Ккан по ЛУ на 01.01.2021 равен единице?','Нет','select'],['Расчёты по Приразломному ЛУ?','Нет','select'],['Расчёты по участкам Самотлорского месторождения?','Нет','select'],['Год достижения 1% выработанности','2026','select']].map(x=>taxField(...x)).join('')}</div></section></div>`;
  else $('#editorFields').innerHTML = `<div class="model-workspace tax-workspace"><div class="section-subnav"><button type="button" data-tax-view="base" class="${taxView==='base'?'active':''}">Без льгот ТрИЗ</button>${Object.entries(taxBenefitNames).map(([key,label])=>`<button type="button" data-tax-view="${key}" class="${taxView===key?'active':''}">${label}</button>`).join('')}</div><section class="tax-panel"><header><h4>Данные по лицензионному участку</h4></header><div class="tax-fields">${taxBaseFields.map(([label,value])=>taxField(label,value)).join('')}</div></section>${taxView==='base'?'':taxBenefitPanel()}</div>`;
  $('#editorFields').classList.add('model-editor-fields');
}

const capexYears = Array.from({length:21},(_,i)=>2026+i);
const capexRows = [
  ['1.','Эксплуатационное бурение','—','тыс. руб','group'],['1.1','Наклонно-направленные скважины','—','тыс. руб','sub'],['','Количество скважин, законченных строительством','—','скв.','child'],['','Проходка по законченным строительством скважинам','—','тыс. м','child'],['1.2','Скважины с горизонтальным окончанием','—','тыс. руб','sub'],['','Количество скважин, законченных строительством','—','скв.','child'],['','Проходка по законченным строительством скважинам','—','тыс. м','child'],['1.4','Специальные скважины','—','тыс. руб','sub'],['2.','ЗБС и углубления','—','тыс. руб','group'],['','Количество ЗБС','—','шт.','child'],['3.','Промышленное строительство','—','тыс. руб','group'],['3.1','Подготовительные работы','—','тыс. руб','sub'],['3.1.1','Отсыпка при новом строительстве','—','тыс. руб','child'],['','Объём отсыпки','—','тыс. м³','child'],['','Количество кустов','—','шт.','child'],['','Количество скважин','—','скв.','child'],['','Куст 1','БП','тыс. руб','object']
];
function renderCapexWorkspace() {
  const seed=[25000,100000,185000,75000,75000], perspectives=capexView==='all';
  const rows=[...capexRows,...(perspectives?[['','Куст 2','Перспектива','тыс. руб','object'],['','Объём отсыпки','Перспектива','тыс. м³','child'],['','Количество кустов','Перспектива','шт.','child'],['','Количество скважин','Перспектива','скв.','child']]:[])];
  const typeLabel = kind => ({group:'Раздел',sub:'Тип скважины',child:'Показатель',object:'Объект КВ'}[kind] || 'Показатель');
  $('#editorFields').innerHTML = `<div class="model-workspace capex-workspace"><div class="capex-variants">${modelVariants.map(([key,label])=>`<button type="button" data-capex-variant="${key}" class="${capexVariant===key?'active':''}">${label} вариант</button>`).join('')}</div><div class="section-toolbar"><div class="segmented"><button type="button" data-capex-view="bp" class="${capexView==='bp'?'active':''}">Капитальные вложения по БП</button><button type="button" data-capex-view="all" class="${capexView==='all'?'active':''}">БП и перспективы</button></div><div class="toolbar-actions"><button class="button button-secondary" type="button" data-capex-action="load">Загрузить стоимости по БП</button><button class="button button-secondary" type="button" data-capex-action="edit">Редактировать объект КВ</button><button class="button button-secondary" type="button" data-capex-action="drill">Рассчитать бурение, ЗБС и ОНВСС</button><button class="button button-dark" type="button" data-capex-action="future">Сформировать стоимость за периодом БП</button></div></div><div class="model-table-scroll capex-table-scroll"><table class="model-table capex-table"><thead><tr><th>№</th><th>Тип объекта</th><th>Наименование</th><th>Признак</th><th>Ед. изм.</th><th>Всего</th>${yearHeader(capexYears)}</tr></thead><tbody><tr class="total-row"><td></td><td>Итого</td><th>КАПИТАЛЬНЫЕ ВЛОЖЕНИЯ, ВСЕГО</th><td>—</td><td>тыс. руб</td><td>510 000</td>${emptyYearInputs(capexYears,'capex-value',true,seed)}</tr>${rows.map(([number,name,flag,unit,kind])=>`<tr class="${kind}-row"><td>${number}</td><td>${typeLabel(kind)}</td><th>${name}</th><td>${flag}</td><td>${unit}</td><td>${kind==='object'?'510 000':'—'}</td>${emptyYearInputs(capexYears,'capex-value',true,kind==='object'?seed:[])}</tr>`).join('')}</tbody></table></div></div>`;
  $('#editorFields').classList.add('model-editor-fields');
}

function renderResourceOpex() {
  const rows = [['1.','Материалы'],['2.','Электроэнергия'],['3.','ФОТ'],['4.','Прочие затраты']];
  return `<section class="opex-resource resource-grid"><header><div><span>Ресурсный метод</span><h4>Операционные затраты по ресурсам</h4></div><div><button class="button button-secondary" type="button" data-resource-load>Загрузить данные</button><button class="button button-dark" type="button" data-resource-rnkin>Загрузить ресурсы из РН-КИН</button></div></header><div class="model-table-scroll"><table class="model-table"><thead><tr><th>№</th><th>Наименование</th><th>Признак</th><th>Ед. изм.</th><th>Всего</th>${yearHeader(macroYears)}</tr></thead><tbody><tr class="total-row"><td></td><th>ОПЕРАЦИОННЫЕ ЗАТРАТЫ, ВСЕГО</th><td>—</td><td>тыс. руб</td><td>—</td>${emptyYearInputs(macroYears,'opex-input')}</tr>${rows.map(([n,name])=>`<tr><td>${n}</td><th>${name}</th><td>—</td><td>тыс. руб</td><td>—</td>${emptyYearInputs(macroYears,'opex-input')}</tr>`).join('')}</tbody></table></div></section>`;
}

const otherVariants = [['zero','Нулевой'],['recommended','Рекомендуемый'],['maximum','Максимальный']];
let otherVariant = 'recommended';
function otherYears() { const end = Number($('#endYear')?.value || 2046); return Array.from({length:Math.max(1,end-2026+1)},(_,index)=>2026+index); }
function otherDraft(variant = otherVariant) { return JSON.parse(localStorage.getItem(`otherDraft:${activeAsset.code}:${variant}`) || '{}'); }
function otherTable(variant = otherVariant, compact = false) {
  const years = otherYears(), draft = otherDraft(variant);
  return `<div class="other-table-wrap ${compact ? 'compact' : ''}"><table class="other-table"><thead><tr><th>Наименование</th><th>Ед. изм.</th><th>Итого</th>${years.map(year=>`<th>${year}</th>`).join('')}</tr></thead><tbody>${[['normal','За сжигание попутного газа в пределах нормы'],['excess','За сверхнормативное сжигание попутного газа']].map(([type,label])=>{const values=years.map(year=>draft[`${type}:${year}`]||'');return `<tr><th>${label}</th><td>млн руб.</td><td class="other-total">${grrTotal(values)}</td>${years.map((year,index)=>`<td><input class="other-value" data-variant="${variant}" name="${type}:${year}" value="${values[index]}" inputmode="decimal" readonly></td>`).join('')}</tr>`}).join('')}</tbody></table></div>`;
}
function renderOtherWorkspace() {
  const settings = JSON.parse(localStorage.getItem(`otherSettings:${activeAsset.code}`) || 'null') || { ndpi:'Нет', loss:'КГН' };
  $('#editorFields').innerHTML = `<div class="other-workspace"><section class="other-settings"><header><span>01</span><div><h4>Прочие настройки</h4></div></header><div><label><span>Использовать ставку НДПИ на нефть (без льгот)</span><select class="other-setting" name="ndpi"><option${settings.ndpi==='Нет'?' selected':''}>Нет</option><option${settings.ndpi==='Да'?' selected':''}>Да</option></select></label><label><span>Учёт переноса убытка</span><select class="other-setting" name="loss"><option${settings.loss==='КГН'?' selected':''}>КГН</option><option${settings.loss==='Вне КГН'?' selected':''}>Вне КГН</option><option${settings.loss==='Не учитывать'?' selected':''}>Не учитывать</option></select></label></div></section><section class="other-impact"><header><div><span>02 · Экологические платежи</span><h4>Плата за негативное воздействие на окружающую среду</h4></div></header><div class="other-variants">${otherVariants.map(([key,label])=>`<button type="button" data-other-variant="${key}" class="${otherVariant===key?'active':''}">${label} вариант</button>`).join('')}</div>${otherTable()}</section></div>`;
  $('#editorFields').classList.add('other-editor-fields');
}
function saveOtherDraft() {
  const values = $$('.other-value', $('#editorFields')); if (values.length) { const byVariant = {}; values.forEach(input => { const variant=input.dataset.variant; byVariant[variant] ||= otherDraft(variant); byVariant[variant][input.name]=input.value; }); Object.entries(byVariant).forEach(([variant,data])=>localStorage.setItem(`otherDraft:${activeAsset.code}:${variant}`,JSON.stringify(data))); }
  const settings = $$('.other-setting', $('#editorFields')); if (settings.length) localStorage.setItem(`otherSettings:${activeAsset.code}`,JSON.stringify(Object.fromEntries(settings.map(select=>[select.name,select.value]))));
}
function updateOtherTotals() { $$('.other-table tbody tr', $('#editorFields')).forEach(row => { $('.other-total', row).textContent = grrTotal($$('.other-value', row).map(input=>input.value)); }); }

const chart = $('#cashflowChart');
const svg = $('svg', chart);
const NS = 'http://www.w3.org/2000/svg';
const bounds = { left: 48, right: 780, top: 20, bottom: 224 };
let activeAsset = assets[0];
let opexChanged = false;
let periodChanged = false;
let currentSetupState = 'final';
let calculationCompleted = false;
let readyAssetCodes = new Set(assets.map(asset => asset.code));

function svgEl(tag, attrs = {}) {
  const element = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function drawChart(name = 'base') {
  const data = scenarios[name];
  const grid = $('.chart-grid-lines', svg), bars = $('.chart-bars', svg), area = $('.cash-area', svg), line = $('.cash-line', svg), points = $('.chart-points', svg), labels = $('.chart-axis-labels', svg);
  [grid, bars, points, labels].forEach(group => group.replaceChildren());
  const min = -50, max = 100, xStep = (bounds.right - bounds.left) / (data.cash.length - 1);
  const y = value => bounds.bottom - ((value - min) / (max - min)) * (bounds.bottom - bounds.top);
  const zeroY = y(0);
  [-50, 0, 50, 100].forEach(value => {
    grid.append(svgEl('line', { x1: bounds.left, y1: y(value), x2: bounds.right, y2: y(value) }));
    const label = svgEl('text', { x: 7, y: y(value) + 3 }); label.textContent = value === 0 ? '0' : `${value} млрд`; labels.append(label);
  });
  const pointsList = data.cash.map((value, index) => [bounds.left + index * xStep, y(value)]);
  const linePath = pointsList.map(([x, py], index) => `${index ? 'L' : 'M'} ${x} ${py}`).join(' ');
  line.setAttribute('d', linePath); area.setAttribute('d', `${linePath} L ${bounds.right} ${zeroY} L ${bounds.left} ${zeroY} Z`);
  pointsList.forEach(([x, py], index) => {
    bars.append(svgEl('rect', { x: x - 12, y: zeroY, width: 24, height: data.capexData[index] * 1.05 }));
    points.append(svgEl('circle', { cx: x, cy: py, r: 4, 'data-index': index }));
    if (index % 2 === 0 || index === data.cash.length - 1) { const label = svgEl('text', { x, y: 248, 'text-anchor': 'middle' }); label.textContent = 2026 + index * 2; labels.append(label); }
  });
  chart.dataset.scenario = name;
  $('#npvValue').textContent = data.npv; $('#irrValue').textContent = data.irr; $('#capexValue').textContent = data.capex; $('#paybackValue').textContent = data.payback; $('#breakevenLabel').textContent = data.breakeven;
}

function handleChartMove(event) {
  const data = scenarios[chart.dataset.scenario || 'base'], rect = svg.getBoundingClientRect(), relativeX = ((event.clientX - rect.left) / rect.width) * 800, step = (bounds.right - bounds.left) / (data.cash.length - 1);
  const index = Math.max(0, Math.min(data.cash.length - 1, Math.round((relativeX - bounds.left) / step))), x = bounds.left + index * step, value = data.cash[index], py = bounds.bottom - ((value + 50) / 150) * (bounds.bottom - bounds.top);
  const tooltip = $('#chartTooltip'), crosshair = $('.crosshair', svg); crosshair.setAttribute('x1', x); crosshair.setAttribute('x2', x); crosshair.style.opacity = 1;
  tooltip.style.opacity = 1; tooltip.style.left = `${(x / 800) * 100}%`; tooltip.style.top = `${(py / 260) * 100}%`; $('span', tooltip).textContent = `${2026 + index * 2} год`; $('b', tooltip).textContent = `${value > 0 ? '+' : ''}${value} млрд ₽`; $('small', tooltip).textContent = `CAPEX: ${data.capexData[index]} млрд ₽`;
}

function openModal(modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; $('[data-close-modal]', modal)?.focus(); }
function closeModal(modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); if (!$('.modal-backdrop.open')) document.body.style.overflow = ''; }
function toast(title, message, icon = 'i-check') { const item = document.createElement('div'); item.className = 'toast'; item.innerHTML = `<span><svg><use href="#${icon}"/></svg></span><div><b>${title}</b><small>${message}</small></div>`; $('#toastRegion').append(item); setTimeout(() => { item.classList.add('out'); setTimeout(() => item.remove(), 250); }, 3600); }

let activeFilterPanel = null;
function tableCellValue(cell) {
  const control = cell?.querySelector('input,select,textarea');
  return String(control?.value ?? cell?.textContent ?? '').replace(/[⌄✓×]/g,'').trim();
}
function closeTableFilter() { activeFilterPanel?.remove(); activeFilterPanel = null; }
function applyTableFilters(table) {
  const filters = table._columnFilters || new Map();
  [...(table.tBodies[0]?.rows || [])].forEach(row => {
    row.hidden = [...filters].some(([index, allowed]) => allowed.size && !allowed.has(tableCellValue(row.cells[index])));
  });
}
function openTableFilter(button, table, columnIndex) {
  closeTableFilter();
  const values = [...new Set([...(table.tBodies[0]?.rows || [])].map(row => tableCellValue(row.cells[columnIndex])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));
  const current = table._columnFilters?.get(columnIndex) || new Set();
  const panel = document.createElement('div'); panel.className = 'table-filter-panel';
  panel.innerHTML = `<label class="filter-search"><span>Поиск</span><input type="search" placeholder="Введите значение"></label><label class="filter-all"><input type="checkbox" checked> Выбрать всё</label><div class="filter-values">${values.slice(0,80).map((value,index)=>`<label data-filter-value="${value.toLowerCase()}"><input type="checkbox" value="${value.replace(/"/g,'&quot;')}" ${!current.size||current.has(value)?'checked':''}> <span>${value}</span></label>`).join('')}</div><footer><button type="button" data-filter-clear>Сбросить</button><button type="button" data-filter-apply>Применить</button></footer>`;
  document.body.append(panel); activeFilterPanel = panel;
  const rect = button.getBoundingClientRect(); panel.style.left = `${Math.min(innerWidth-panel.offsetWidth-10,Math.max(10,rect.left))}px`; panel.style.top = `${Math.min(innerHeight-panel.offsetHeight-10,rect.bottom+5)}px`;
  const all = $('input[type="checkbox"]', panel), checks = $$('.filter-values input', panel), search = $('input[type="search"]', panel);
  all.addEventListener('change',()=>checks.forEach(check=>check.checked=all.checked));
  search.addEventListener('input',()=>$$('[data-filter-value]',panel).forEach(label=>label.hidden=!label.dataset.filterValue.includes(search.value.toLowerCase())));
  $('[data-filter-clear]',panel).addEventListener('click',()=>{ table._columnFilters?.delete(columnIndex); applyTableFilters(table); button.classList.remove('filtered'); closeTableFilter(); });
  $('[data-filter-apply]',panel).addEventListener('click',()=>{ const selected=new Set(checks.filter(check=>check.checked).map(check=>check.value)); table._columnFilters ||= new Map(); if(selected.size===checks.length)table._columnFilters.delete(columnIndex); else table._columnFilters.set(columnIndex,selected); button.classList.toggle('filtered',selected.size!==checks.length); applyTableFilters(table); closeTableFilter(); });
}
function attachTableFilters(root = document) {
  $$('table',root).forEach(table => {
    const row = table.tHead?.rows?.[table.tHead.rows.length-1]; if (!row) return;
    [...row.cells].forEach((cell,index) => {
      if (cell.querySelector('.column-filter')) return;
      cell.classList.add('filterable-header');
      const button=document.createElement('button'); button.type='button'; button.className='column-filter'; button.textContent='⌄'; button.setAttribute('aria-label',`Фильтр: ${tableCellValue(cell) || `столбец ${index+1}`}`);
      button.addEventListener('click',event=>{event.stopPropagation();openTableFilter(button,table,index)}); cell.append(button);
    });
  });
}
document.addEventListener('mousedown',event=>{ if(activeFilterPanel&&!activeFilterPanel.contains(event.target)&&!event.target.closest('.column-filter'))closeTableFilter(); });
new MutationObserver(() => queueMicrotask(() => attachTableFilters($('#editorFields')))).observe($('#editorFields'), { childList:true, subtree:true });

function statusCell(value, comment) {
  const icon = value ? '<i class="cell-ok">✓</i>' : '<i class="cell-bad">×</i>';
  const note = comment ? `<button class="cell-comment" data-tooltip="${comment}"><svg><use href="#i-comment"/></svg></button>` : '';
  return `<span class="status-cell">${icon}${note}</span>`;
}

function renderStatus() {
  const rows = [['Нулевой', statusVariants.zero], ['Рекомендуемый', statusVariants.recommended]].flatMap(([variant, items]) => items.map(asset => ({ variant, ...asset })));
  $('#statusTableBody').innerHTML = rows.map(asset => `<tr class="visible"><td class="status-variant-label">${asset.variant}</td><td><b>${asset.name}</b><small>Код ${asset.code} · ${asset.license}</small></td>${asset.values.map((value, index) => `<td>${statusCell(value, asset.comment?.column === index ? asset.comment.text : null)}</td>`).join('')}<td><button class="table-link" data-open-asset="${asset.code}">Открыть</button></td></tr>`).join('');
  const complete = rows.filter(row => row.values.every(Boolean)).length, percent = Math.round((complete / rows.length) * 100);
  $('#statusScore').style.setProperty('--score', percent); $('#statusScore span').innerHTML = `${complete}<small>/${rows.length}</small>`;
  $('#statusScoreTitle').textContent = complete === rows.length ? 'Все модели готовы' : 'Есть незаполненные разделы';
  $('#statusScoreHint').textContent = complete === rows.length ? 'Можно запускать расчёт' : 'Расчёт для этого варианта недоступен';
  attachTableFilters($('#statusModal'));
}

function renderEditorSection(sectionKey) {
  const section = editorSections[sectionKey];
  $$('[data-editor-tab]').forEach(button => button.classList.toggle('active', button.dataset.editorTab === sectionKey));
  $('#editorFields').classList.remove('macro-editor-fields', 'grr-editor-fields', 'geo-editor-fields', 'opex-editor-fields', 'other-editor-fields', 'model-editor-fields');
  queueMicrotask(() => attachTableFilters($('#editorFields')));
  if (sectionKey === 'macro') { renderMacroWorkspace(); return; }
  if (sectionKey === 'grp') { renderGrrWorkspace(); return; }
  if (sectionKey === 'tech') { renderTechWorkspace(); return; }
  if (sectionKey === 'geo') { renderGeoWorkspace(); return; }
  if (sectionKey === 'tax') { renderTaxWorkspace(); return; }
  if (sectionKey === 'capex') { renderCapexWorkspace(); return; }
  if (sectionKey === 'opex') { renderOpexWorkspace(); return; }
  if (sectionKey === 'other') { renderOtherWorkspace(); return; }
  $('#editorFields').innerHTML = section.fields.map(([label, value, type, options]) => {
    if (type === 'select') return `<label><span>${label}</span><select>${options.map(option => `<option${option === value ? ' selected' : ''}>${option}</option>`).join('')}</select></label>`;
    return `<label><span>${label}</span><input type="${type}" value="${value}" ${options === 1 ? 'disabled' : ''}></label>`;
  }).join('');
}

function openAssetEditor(asset) {
  activeAsset = asset; $('#assetModalTitle').textContent = asset.name; $('#assetLicense').textContent = asset.license; $('#assetCode').textContent = `Код актива ${asset.code} · ${asset.tax}`; $('#editorComment').value = localStorage.getItem(`editorComment:${asset.code}`) || ''; renderEditorSection('macro'); openModal($('#assetModal'));
}

function populateExportList() {
  $('#exportList').innerHTML = assets.map(asset => `<label class="selection-row"><input type="checkbox" value="${asset.code}" checked><span><b>${asset.name}</b><small>${asset.license} · код ${asset.code}</small></span><span class="status status-ok"><i></i>Готова</span></label>`).join('');
}

function updateSetupUi() {
  $$('.asset-row').forEach(row => {
    const ready = readyAssetCodes.has(row.dataset.code);
    const status = $('.status', row);
    status.className = `status ${ready ? 'status-ok' : 'status-bad'}`;
    status.innerHTML = `<i></i>${ready ? 'Настройка данных завершена' : 'Настройка не выполнена'}`;
    $('.row-action span', row).textContent = ready ? 'Изменить данные для ЭМ' : 'Настроить данные для ЭМ';
  });
  const readyCount = readyAssetCodes.size;
  const allReady = readyCount === assets.length;
  const modelsStep = $$('.readiness-list li')[1];
  modelsStep.className = allReady ? 'done' : 'blocked';
  $('span', modelsStep).innerHTML = allReady ? '<svg><use href="#i-check"/></svg>' : '<svg><use href="#i-alert"/></svg>';
  const readinessRing = $('.readiness-panel .score-ring');
  readinessRing.style.setProperty('--score', allReady ? 92 : 55);
  $('span', readinessRing).innerHTML = `${allReady ? 92 : 55}<small>%</small>`;
  $('#modelsReadyText').textContent = allReady ? 'Исходные модели готовы' : 'Требуется настройка исходных моделей';
  $('#calculateButton').disabled = !allReady;
  $('#exportButton').disabled = !allReady || !calculationCompleted;
  $('#reportButton').disabled = !allReady || !calculationCompleted;
  $('#calculationState').textContent = allReady ? 'Готов к запуску' : 'Доступен после настройки всех ЭМ';
  $('#summaryTabStatus').textContent = !allReady ? 'ожидает данных' : (calculationCompleted ? 'актуален' : 'требует расчёта');
}

function setSetupState(state) {
  currentSetupState = state;
  calculationCompleted = false;
  readyAssetCodes = new Set(state === 'final' ? assets.map(asset => asset.code) : []);
  $$('[data-setup-state]').forEach(button => button.classList.toggle('active', button.dataset.setupState === state));
  updateSetupUi();
  toast(state === 'final' ? 'Финальный вид' : 'Начальный вид', state === 'final' ? 'Все четыре ЭМ настроены' : 'Данные ЭМ ещё не записаны в БД РН-Альфа', state === 'final' ? 'i-check' : 'i-alert');
}

function markParametersDirty(event) {
  calculationCompleted = false;
  const button = $('#saveParameters'); button.disabled = false; button.classList.add('dirty'); $('span', button).textContent = 'Сохранить и применить'; $('use', button).setAttribute('href', '#i-arrow');
  if (event?.target?.name === 'opex') { opexChanged = true; if(event.target.value!=='resource')opexDisplayMode=event.target.value; toast('Метод OPEX изменён', 'Потребуется повторная настройка раздела «Операционные затраты»', 'i-alert'); }
  if (event?.target?.id === 'evaluationYear' || event?.target?.id === 'discountYear') periodChanged = true;
}

$$('[data-scenario]').forEach(button => button.addEventListener('click', () => { $$('[data-scenario]').forEach(item => item.classList.toggle('active', item === button)); drawChart(button.dataset.scenario); toast('Сценарий изменён', `Показатели пересчитаны: ${button.textContent}`); }));
chart.addEventListener('mousemove', handleChartMove); chart.addEventListener('mouseleave', () => { $('#chartTooltip').style.opacity = 0; $('.crosshair', svg).style.opacity = 0; });

$$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop'))));
$$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('mousedown', event => { if (event.target === backdrop) closeModal(backdrop); }));
document.addEventListener('keydown', event => { if (event.key === 'Escape') $$('.modal-backdrop.open').forEach(closeModal); });

$('#statusButton').addEventListener('click', () => {
  renderStatus();
  openModal($('#statusModal'));
});
$('#statusTableBody').addEventListener('click', event => { const button = event.target.closest('[data-open-asset]'); if (!button) return; closeModal($('#statusModal')); openAssetEditor(assets.find(asset => asset.code === button.dataset.openAsset)); });
$$('.row-action').forEach(button => button.addEventListener('click', () => { const row = button.closest('.asset-row'); openAssetEditor(assets.find(asset => asset.code === row.dataset.code)); }));
$$('[data-editor-tab]').forEach(button => button.addEventListener('click', () => renderEditorSection(button.dataset.editorTab)));
$$('[data-editor-variant]').forEach(button => button.addEventListener('click', () => {
  editorVariant = button.dataset.editorVariant;
  grrVariant = editorVariant;
  opexEnergyVariant = editorVariant;
  otherVariant = editorVariant;
  $$('[data-editor-variant]').forEach(item => item.classList.toggle('active', item === button));
  renderEditorSection($('[data-editor-tab].active').dataset.editorTab);
}));
$('#editorFields').addEventListener('change', event => {
  if (event.target.name === 'macroScope') $('.macro-variants').hidden = event.target.value !== 'variant';
  if (event.target.classList.contains('macro-setting')) {
    const manual = event.target.value === 'Ручной ввод';
    $$('input.macro-value', event.target.closest('tr')).forEach(input => input.disabled = !manual);
  }
  if (event.target.classList.contains('grr-sheet-select')) validateGrrMapping();
  if (event.target.id === 'grrFileInput' && event.target.files?.[0]) { grrFileName = event.target.files[0].name; grrImportOpen = true; renderGrrWorkspace(); }
  if (event.target.classList.contains('other-setting')) saveOtherDraft();
});
$('#editorFields').addEventListener('click', event => {
  const button = event.target.closest('[data-macro-variant]'); if (button) $$('[data-macro-variant]').forEach(item => item.classList.toggle('active', item === button));
  const viewButton = event.target.closest('[data-grr-view]'); if (viewButton) { saveGrrDraft(); grrView = viewButton.dataset.grrView; renderGrrWorkspace(); }
  const variantButton = event.target.closest('[data-grr-variant]'); if (variantButton) { saveGrrDraft(); grrVariant = variantButton.dataset.grrVariant; renderGrrWorkspace(); }
  if (event.target.closest('[data-grr-upload]')) { grrImportOpen = true; renderGrrWorkspace(); }
  if (event.target.closest('[data-grr-download]')) { const blob=new Blob(['Вариант\tЛицензия\tМесторождение\tПоказатель\tЕд. изм.\t2026\r\nРекомендуемый\tХМН 16172 НЭ\tЗападно-Салымский\tСейсморазведочные работы. Метод 2D\tпог. км\t'],{type:'application/vnd.ms-excel;charset=utf-8'}); const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download='Шаблон_программы_ГРР.xls'; link.click(); setTimeout(()=>URL.revokeObjectURL(link.href),500); }
  if (event.target.closest('[data-grr-close]')) { grrImportOpen = false; renderGrrWorkspace(); }
  if (event.target.closest('[data-grr-file]')) $('#grrFileInput')?.click();
  if (event.target.closest('[data-grr-import]')) { grrImportOpen = false; renderGrrWorkspace(); toast('Программа ГРР загружена', 'Все листы прошли проверку; данные перенесены в три таблицы'); }
  const geoLoad = event.target.closest('[data-geo-load]');
  if (geoLoad) { const source = geoLoad.dataset.geoLoad; geoLoadState[source] = 'loading'; renderGeoWorkspace(); setTimeout(() => { geoLoadState[source] = 'ready'; if ($('.geo-workspace')) renderGeoWorkspace(); toast(source === 'reserves' ? 'Геологические данные загружены' : 'Данные по фонду загружены', source === 'reserves' ? 'Получены результаты «Структуризации запасов» из БД РН-Альфа' : 'Получены результаты плагина «МЭР» из БД РН-Альфа'); }, 650); }
  const opexVariant = event.target.closest('[data-opex-variant]'); if (opexVariant) { saveEnergyDraft(); opexEnergyVariant = opexVariant.dataset.opexVariant; renderOpexWorkspace(); }
  const opexMode = event.target.closest('[data-opex-mode]'); if (opexMode) { saveOpexDraft(); saveEnergyDraft(); opexDisplayMode=opexMode.dataset.opexMode; const radio=$(`input[name="opex"][value="${opexDisplayMode==='tariff'?'tariff':'normative'}"]`); if(radio)radio.checked=true; renderOpexWorkspace(); }
  if (event.target.closest('[data-opex-source-add]')) { saveEnergyDraft(); localStorage.setItem(`opexSources:${activeAsset.code}:${opexEnergyVariant}`, Math.min(6, energySourceCount() + 1)); renderOpexWorkspace(); toast('Источник добавлен', 'В профиль энергопотребления добавлены тариф, объём и расчёт затрат'); }
  if (event.target.closest('[data-opex-load]')) { opexLoadState = 'loading'; renderOpexWorkspace(); setTimeout(() => { opexLoadState = 'ready'; if ($('.opex-workspace')) renderOpexWorkspace(); toast('Профили энергопотребления загружены', 'Объёмы собраны по типам источников выбранного варианта'); }, 650); }
  const otherButton = event.target.closest('[data-other-variant]'); if (otherButton) { saveOtherDraft(); otherVariant = otherButton.dataset.otherVariant; renderOtherWorkspace(); }
  const techButton = event.target.closest('[data-tech-view]'); if (techButton) { techView = techButton.dataset.techView; renderTechWorkspace(); }
  if (event.target.closest('[data-tech-wells]')) { techWellsOpen = true; renderTechWorkspace(); }
  if (event.target.closest('[data-tech-wells-close]')) { techWellsOpen = false; renderTechWorkspace(); }
  if (event.target.closest('[data-tech-load]')) toast('Технологические данные загружены', 'Профили добычи и ГТМ обновлены из выбранного файла', 'i-check');
  const taxButton = event.target.closest('[data-tax-view]'); if (taxButton) { taxView = taxButton.dataset.taxView; renderTaxWorkspace(); }
  const capexButton = event.target.closest('[data-capex-view]'); if (capexButton) { capexView = capexButton.dataset.capexView; renderCapexWorkspace(); }
  const capexVariantButton = event.target.closest('[data-capex-variant]'); if (capexVariantButton) { capexVariant=capexVariantButton.dataset.capexVariant; renderCapexWorkspace(); }
  const capexAction = event.target.closest('[data-capex-action]'); if (capexAction) toast('Операция CAPEX выполнена', capexAction.textContent.trim(), 'i-check');
  if (event.target.closest('[data-resource-load]')) toast('Данные OPEX загружены', 'Файл прошёл проверку и значения перенесены в таблицу', 'i-check');
  if (event.target.closest('[data-resource-rnkin]')) toast('Ресурсы получены', 'Данные загружены из РН-КИН', 'i-check');
});
$('#editorFields').addEventListener('input', event => {
  if (event.target.classList.contains('macro-value')) { const values = $$('.macro-value:not(:disabled)', $('#editorFields')).map(input => input.value); localStorage.setItem(`macroDraft:${activeAsset.code}`, JSON.stringify(values)); }
  if (event.target.classList.contains('geo-manual')) saveGeoDraft();
  if (event.target.classList.contains('opex-input')) saveOpexDraft();
  if (event.target.classList.contains('energy-input')) { saveEnergyDraft(); recalcEnergy(); }
  if (event.target.classList.contains('other-value')) { saveOtherDraft(); updateOtherTotals(); }
});
let gridAnchor = null, gridExtent = null, gridDragging = false;
function gridInput(cell) { return cell?.querySelector('input, textarea, select'); }
function clearGridSelection() { $$('.cell-selected', $('#editorFields')).forEach(cell => cell.classList.remove('cell-selected')); }
function gridPoint(target) {
  const cell = target.closest?.('table td, table th');
  if (!cell || !$('#editorFields').contains(cell) || !gridInput(cell)) return null;
  const table = cell.closest('table'), rows = [...table.rows];
  return { table, cell, row:rows.indexOf(cell.parentElement), col:cell.cellIndex };
}
function selectGridRange(from, to) {
  if (!from || !to || from.table !== to.table) return;
  clearGridSelection();
  const rows = [...from.table.rows], rowStart = Math.min(from.row, to.row), rowEnd = Math.max(from.row, to.row), colStart = Math.min(from.col, to.col), colEnd = Math.max(from.col, to.col);
  for (let row = rowStart; row <= rowEnd; row++) for (let col = colStart; col <= colEnd; col++) rows[row]?.cells[col]?.classList.add('cell-selected');
  gridExtent = to;
}
$('#editorFields').addEventListener('mousedown', event => {
  if (event.button !== 0) return;
  const point = gridPoint(event.target); if (!point) return;
  if (event.shiftKey && gridAnchor?.table === point.table) selectGridRange(gridAnchor, point);
  else { gridAnchor = point; gridExtent = point; clearGridSelection(); point.cell.classList.add('cell-selected'); }
  gridDragging = true;
  $('#editorFields').classList.add('grid-selecting');
}, true);
$('#editorFields').addEventListener('mouseover', event => { const point = gridPoint(event.target); if (gridDragging && point?.table === gridAnchor?.table) selectGridRange(gridAnchor, point); });
document.addEventListener('mouseup', () => { gridDragging = false; $('#editorFields').classList.remove('grid-selecting'); });
$('#editorFields').addEventListener('copy', event => {
  const table = event.target.closest('table') || gridAnchor?.table; if (!table || !$('#editorFields').contains(table)) return;
  const selected = $$('.cell-selected', table); if (!selected.length) return;
  const allRows = [...table.rows], rowIndexes = selected.map(cell => allRows.indexOf(cell.parentElement)), cols = selected.map(cell => cell.cellIndex);
  const minRow = Math.min(...rowIndexes), maxRow = Math.max(...rowIndexes), minCol = Math.min(...cols), maxCol = Math.max(...cols);
  const text = Array.from({length:maxRow-minRow+1},(_,rowOffset) => { const row=allRows[minRow+rowOffset]; return Array.from({length:maxCol-minCol+1},(_,colOffset) => { const cell=row?.cells[minCol+colOffset]; return gridInput(cell)?.value ?? cell?.textContent.trim() ?? ''; }).join('\t'); }).join('\n');
  event.preventDefault(); event.clipboardData.setData('text/plain', text);
});
function setGridValue(control, value) {
  if (!control || control.disabled || control.readOnly) return false;
  if (control.tagName === 'SELECT' && ![...control.options].some(option => option.value === value)) return false;
  control.value = value;
  control.dispatchEvent(new Event('input',{bubbles:true}));
  control.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}
$('#editorFields').addEventListener('paste', event => {
  const target = event.target.closest('table input, table textarea, table select');
  if (!target || target.disabled || target.readOnly) return;
  const clipboard = event.clipboardData.getData('text').replace(/\r/g,'').replace(/\n+$/,'');
  event.preventDefault();
  const matrix = clipboard.split('\n').map(row => row.split('\t')), cell = target.closest('td,th'), table = target.closest('table'), rows = [...table.rows], startRow = rows.indexOf(cell.parentElement), startCol = cell.cellIndex;
  const selected = $$('.cell-selected', table);
  if (matrix.length === 1 && matrix[0].length === 1 && selected.length > 1) {
    selected.forEach(selectedCell => setGridValue(gridInput(selectedCell), matrix[0][0]));
    return;
  }
  matrix.forEach((values,rowOffset) => values.forEach((value,colOffset) => setGridValue(gridInput(rows[startRow+rowOffset]?.cells[startCol+colOffset]), value)));
  const end = rows[Math.min(rows.length-1,startRow+matrix.length-1)]?.cells[startCol+Math.max(...matrix.map(row=>row.length))-1];
  if (end) { gridAnchor={table,row:startRow,col:startCol,cell}; selectGridRange(gridAnchor,{table,row:[...table.rows].indexOf(end.parentElement),col:end.cellIndex,cell:end}); }
});
function moveEditor(direction) { const active = $('[data-editor-tab].active').dataset.editorTab; if (active === 'grp') saveGrrDraft(); const index = editorSectionOrder.indexOf(active); renderEditorSection(editorSectionOrder[(index + direction + editorSectionOrder.length) % editorSectionOrder.length]); }
$('#previousEditorSection').addEventListener('click', () => moveEditor(-1));
$('#nextEditorSection').addEventListener('click', () => moveEditor(1));
$('#editorHome').addEventListener('click', () => closeModal($('#assetModal')));
$('#editorComment').addEventListener('input', event => { if (activeAsset) localStorage.setItem(`editorComment:${activeAsset.code}`, event.target.value); });
$('#assetEditorForm').addEventListener('submit', event => { event.preventDefault(); calculationCompleted = false; localStorage.removeItem(`macroDraft:${activeAsset.code}`); localStorage.removeItem(`geoDraft:${activeAsset.code}`); localStorage.removeItem(`opexDraft:${activeAsset.code}`); localStorage.removeItem(`energyIndexDraft:${activeAsset.code}`); localStorage.removeItem(`otherSettings:${activeAsset.code}`); ['zero','recommended','maximum'].forEach(variant => { localStorage.removeItem(`energyDraft:${activeAsset.code}:${variant}`); localStorage.removeItem(`opexSources:${activeAsset.code}:${variant}`); localStorage.removeItem(`otherDraft:${activeAsset.code}:${variant}`); }); Object.keys(grrTables).forEach(view => ['zero','recommended','maximum'].forEach(variant => localStorage.removeItem(`grrDraft:${activeAsset.code}:${variant}:${view}`))); const now = new Date().toLocaleString('ru-RU', { day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit' }).replace(',',''); $('#editorSavedAt').textContent = `Последняя запись: ${now}`; readyAssetCodes.add(activeAsset.code); updateSetupUi(); closeModal($('#assetModal')); toast('Данные ЭМ сохранены', `${activeAsset.name}: запись в БД РН-Альфа сформирована. Выполните расчёт показателей`); });
$$('[data-setup-state]').forEach(button => button.addEventListener('click', () => setSetupState(button.dataset.setupState)));

$$('.workspace-tabs button').forEach(button => button.addEventListener('click', () => { $$('.workspace-tabs button').forEach(item => item.classList.toggle('active', item === button)); document.getElementById(button.dataset.scrollTarget).scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
$('#summaryButton').addEventListener('click', () => $('[data-scroll-target="summarySection"]').click());
$('#macroInfo')?.addEventListener('click', () => toast('Версия макропараметров', 'Сцепка: название патча + дата + номер патча', 'i-info'));
$$('#parametersForm input:not(:disabled), #parametersForm select').forEach(input => input.addEventListener('change', markParametersDirty));
$('#parametersForm').addEventListener('submit', event => {
  event.preventDefault(); const button = $('#saveParameters'); button.disabled = true; $('span', button).textContent = 'Сохраняем…';
  setTimeout(() => {
    button.classList.remove('dirty'); $('span', button).textContent = 'Сохранено'; $('use', button).setAttribute('href', '#i-check');
    if (opexChanged) { $('#exportButton').disabled = true; $('#reportButton').disabled = true; $('#summaryTabStatus').textContent = 'требует пересчёта'; $('#calculationState').textContent = 'Изменён метод OPEX — нужен пересчёт'; toast('Параметры записаны', 'Повторно настройте OPEX в ЭМ, затем пересчитайте показатели', 'i-alert'); }
    else if (periodChanged) { $('#exportButton').disabled = true; $('#reportButton').disabled = true; $('#summaryTabStatus').textContent = 'требует пересчёта'; $('#calculationState').textContent = 'Период изменён — нужен пересчёт'; toast('Период проекта обновлён', 'Данные ЭМ повторно настраивать не нужно. Выполните повторный расчёт и замените ранее выгруженные ЭМ', 'i-alert'); }
    else toast('Параметры применены', 'Запись в БД РН-Альфа и переменные для расчётов созданы');
    opexChanged = false; periodChanged = false;
  }, 700);
});
$('#resetParameters').addEventListener('click', () => { $('#evaluationYear').value = '2026'; $('#discountYear').value = '2026'; $('#endYear').value = '2046'; $('input[name="opex"][value="normative"]').checked = true; periodChanged = true; opexChanged = true; markParametersDirty(); toast('Поля сброшены', 'Примените значения кнопкой сохранения', 'i-refresh'); });

$('#calculateButton').addEventListener('click', () => {
  const button = $('#calculateButton'), state = $('#calculationState'); button.disabled = true; $('span', button).textContent = 'Расчёт выполняется…'; let progress = 0;
  const phases = ['Проверяем записи в БД', 'Считаем денежные потоки', 'Агрегируем показатели'];
  const timer = setInterval(() => { state.textContent = phases[Math.min(progress, phases.length - 1)]; progress++; if (progress > phases.length) { clearInterval(timer); calculationCompleted = true; button.disabled = false; $('span', button).textContent = 'Пересчитать показатели'; state.textContent = 'Расчёт завершён без ошибок'; $('#exportButton').disabled = false; $('#reportButton').disabled = false; $('#summaryTabStatus').textContent = 'актуален'; const now = new Date(); $('#lastUpdated').textContent = now.toLocaleString('ru-RU', { day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit' }).replace(',',''); toast('Расчёт завершён', 'Показатели обновлены, выгрузка ЭМ и свод доступны'); } }, 620);
});

$('#exportButton').addEventListener('click', () => { populateExportList(); openModal($('#exportModal')); });
$('#reportButton').addEventListener('click', () => openModal($('#reportModal')));
$('#exportSelectAll').addEventListener('change', event => { $$('#exportList input').forEach(input => input.checked = event.target.checked); });
$('#confirmExport').addEventListener('click', () => { const count = $$('#exportList input:checked').length; if (!count) { toast('Выберите модели', 'Для выгрузки нужна хотя бы одна ЭМ', 'i-alert'); return; } closeModal($('#exportModal')); toast('Выгрузка ЭМ запущена', `Будет сформировано файлов .xlsb: ${count}`, 'i-download'); });
$('#confirmReport').addEventListener('click', () => { const format = $('input[name="reportFormat"]:checked').closest('label').querySelector('b').textContent; closeModal($('#reportModal')); toast('Свод формируется', `Выбранный формат: ${format}`, 'i-file'); });

$$('.nav-item').forEach(button => button.addEventListener('click', () => { $$('.nav-item').forEach(item => item.classList.toggle('active', item === button)); if (button.dataset.view !== 'dashboard') toast(button.textContent.trim(), 'Раздел подключён к навигационному сценарию прототипа', 'i-arrow'); $('#sidebar').classList.remove('open'); }));
$('#projectSelect').addEventListener('change', event => toast('Проект переключен', `Выбран: ${event.target.value}`, 'i-briefcase'));
$('#notificationsButton').addEventListener('click', () => toast('Новых событий нет', 'Все изменения проекта обработаны', 'i-bell'));
$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

$('#saveParameters').disabled = true;
updateSetupUi();
renderStatus();
renderEditorSection('macro');
populateExportList();
drawChart('base');

const previewState = new URLSearchParams(location.search).get('preview');
if (previewState === 'status') openModal($('#statusModal'));
if (previewState === 'status-zero') openModal($('#statusModal'));
if (previewState === 'asset') openAssetEditor(assets[0]);
if (previewState === 'asset-ofr') openAssetEditor(assets[2]);
if (previewState === 'grr') { openAssetEditor(assets[0]); renderEditorSection('grp'); }
if (previewState === 'grr-import') { openAssetEditor(assets[0]); grrImportOpen = true; renderEditorSection('grp'); }
if (previewState === 'tech') { openAssetEditor(assets[0]); renderEditorSection('tech'); }
if (previewState === 'geo') { openAssetEditor(assets[0]); renderEditorSection('geo'); }
if (previewState === 'geo-resource') { $('input[name="opex"][value="resource"]').checked = true; openAssetEditor(assets[0]); renderEditorSection('geo'); }
if (previewState === 'tax') { openAssetEditor(assets[2]); renderEditorSection('tax'); }
if (previewState === 'capex') { openAssetEditor(assets[0]); renderEditorSection('capex'); }
if (previewState === 'opex') { openAssetEditor(assets[0]); renderEditorSection('opex'); }
if (previewState === 'opex-tariff') { $('input[name="opex"][value="tariff"]').checked = true; openAssetEditor(assets[0]); renderEditorSection('opex'); }
if (previewState === 'opex-resource') { $('input[name="opex"][value="resource"]').checked = true; openAssetEditor(assets[0]); renderEditorSection('opex'); }
if (previewState === 'other') { openAssetEditor(assets[0]); renderEditorSection('other'); }
if (previewState === 'export') openModal($('#exportModal'));
if (previewState === 'report') openModal($('#reportModal'));
if (previewState === 'initial') setSetupState('initial');
