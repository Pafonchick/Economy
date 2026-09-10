/* Presentation version only. Design corrections, September 2026. */
(() => {
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const fragment = html => { const el = document.createElement('div'); el.innerHTML = html; return el; };
  const previousFilters = pAttachFilters;
  pAttachFilters = function(root=document) {
    if (root === $('#editorFields') && ['macro','opex','other','tax'].includes(currentSection)) return;
    previousFilters(root);
  };
  const macro = pMacroWorkspace;
  pMacroWorkspace = function() {
    const el = fragment(macro());
    el.querySelectorAll('.pmacro-block header small').forEach(n => n.remove());
    return el.innerHTML;
  };
  const geo = pGeoWorkspace;
  pGeoWorkspace = function() {
    const el = fragment(geo());
    el.querySelectorAll('[name="workover"],[name="repair"]').forEach(i => i.disabled=false);
    return el.innerHTML;
  };
  const capex = pCapexWorkspace;
  pCapexWorkspace = function() {
    const el = fragment(capex());
    el.querySelector('[data-pcapex-view]')?.closest('.psegmented').remove();
    return el.innerHTML;
  };
  const opex = pOpexWorkspace;
  pOpexWorkspace = function() {
    pOpexDisplay = pOpexMethod()==='Нормативно-тарифный' ? 'tariff' : 'normative';
    const el = fragment(opex());
    el.querySelectorAll('.popex-mode-tabs,[data-penergy-add],.popex-card header span,.penergy header small').forEach(n=>n.remove());
    const index = el.querySelector('.penergy-index');
    if(index) {
      const draft=pEnergyIndexDraft(), years=pYears.slice(0,6);
      index.innerHTML=`<table><thead><tr><th>Наименование</th><th>Ед. изм.</th>${years.map(y=>`<th>${y}</th>`).join('')}</tr></thead><tbody><tr><td>Темп роста тарифов на электроэнергию (инфляционные индексы)</td><td>индекс</td>${years.map(y=>`<td><input class="penergy-input" name="index:${y}" data-type="index" data-year="${y}" value="${esc(draft[`index:${y}`]||'1,00')}"></td>`).join('')}</tr></tbody></table>`;
    }
    el.querySelectorAll('.penergy-scroll tbody tr').forEach(tr=>{ if(tr.querySelector('[data-type="total"],[data-type="cost"]'))tr.classList.add('total'); });
    return el.innerHTML;
  };

  let techVariant='recommended', selectedCluster=null, selectedBenefit=null;
  const tech = pTechWorkspace;
  pTechWorkspace = function() {
    pTechWells=false;
    const el=fragment(tech());
    el.firstElementChild.classList.add('presentation-tech');
    el.firstElementChild.insertAdjacentHTML('afterbegin',`<div class="pcapex-variants">${[['zero','Нулевой'],['recommended','Рекомендуемый'],['maximum','Максимальный']].map(([k,l])=>`<button data-tech-variant="${k}" class="${techVariant===k?'active':''}">${l} вариант</button>`).join('')}</div>`);
    el.querySelectorAll('tbody tr').forEach(tr=>{
      if(['База','Развитие'].includes(tr.cells[0]?.textContent.trim()))tr.classList.add('tech-option-row');
      const cluster=[...tr.cells].find(c=>/^Куст \d+$/.test(c.textContent.trim()));
      if(cluster){tr.dataset.cluster=cluster.textContent.trim();tr.dataset.benefit=pTechView==='combined'?cluster.nextElementSibling.textContent.trim():'';tr.tabIndex=0;tr.classList.toggle('cluster-selected',tr.dataset.cluster===selectedCluster&&tr.dataset.benefit===(selectedBenefit||''));}
    });
    const button=el.querySelector('[data-ptech-wells]');if(button)button.disabled=!selectedCluster;
    return el.innerHTML;
  };
  function openWells() {
    if(!selectedCluster)return;
    const combined=pTechView==='combined', years=pYears.slice(0,12);
    const dialog=document.createElement('dialog');dialog.className='presentation-wells';
    const metrics=[['ДОБЫЧА НЕФТИ','тыс. т'],['ДОБЫЧА ЖИДКОСТИ','тыс. т'],['ЗАКАЧКА ВОДЫ','тыс. м³'],['ДОБЫЧА ПОПУТНОГО ГАЗА','млн м³'],['ВВОД НОВЫХ СКВАЖИН','шт.'],['ДЕЙСТВУЮЩИЙ ФОНД СКВАЖИН','шт.']];
    // Retain the presentation's example for cluster 1. Imported data takes precedence.
    const example=[['7091','ГС','Добыв.','03.03.2031','0,2',100,[10,15,11,9,8,7,6]],['7092','ГС','Добыв.','03.04.2031','0,2',90,[9,16,11,9,8,7,6]],['7093','ННС','Нагнет.','03.05.2031','1,0',10,[8,2]]].map(([number,type,purpose,date,kd,total,values])=>({number,type,purpose,date,kd,metrics:Object.fromEntries([['ДОБЫЧА НЕФТИ',1],['ДОБЫЧА ЖИДКОСТИ',2]].map(([metric,mult])=>[metric,{total:total*mult,...Object.fromEntries(values.map((v,i)=>[2031+i,v*mult]))}]))}));
    const stored=JSON.parse(localStorage.getItem(`pTechWells:${currentAsset.code}:${techVariant}:${selectedCluster}`)||'null')||(selectedCluster==='Куст 1'&&techVariant==='recommended'?example:[]);
    const sum=(metric,key)=>{const values=stored.map(w=>w.metrics?.[metric]?.[key]).filter(v=>v!==undefined&&v!=='');return values.length?values.reduce((s,v)=>s+Number(v),0):'';};
    dialog.innerHTML=`<header><h3>ПОСКВАЖИННАЯ ИНФОРМАЦИЯ ${combined?'ПО КУСТАМ И ЛЬГОТАМ':'ПО КУСТАМ'}</h3><p>Просмотр данных по скважинам · ${esc(selectedCluster)}</p></header><div class="pmodel-scroll"><table class="pmodel-table"><thead><tr><th>Скважина</th><th>Тип</th>${combined?'<th>Кд</th>':''}<th>Назначение</th><th>Дата ввода</th><th>Ед. изм.</th><th>Всего</th>${years.map(y=>`<th>${y}</th>`).join('')}</tr></thead><tbody>${metrics.map(([metric,unit])=>`<tr class="well-metric"><th colspan="${years.length+(combined?7:6)}">${metric}</th></tr><tr class="total"><th>ИТОГО</th><td></td>${combined?'<td></td>':''}<td></td><td></td><td>${unit}</td><td>${sum(metric,'total')}</td>${years.map(y=>`<td>${sum(metric,y)}</td>`).join('')}</tr>${stored.map(w=>`<tr><td>${esc(w.number)}</td><td>${esc(w.type)}</td>${combined?`<td>${esc(w.kd)}</td>`:''}<td>${esc(w.purpose)}</td><td>${esc(w.date)}</td><td>${unit}</td><td>${esc(w.metrics?.[metric]?.total)}</td>${years.map(y=>`<td>${esc(w.metrics?.[metric]?.[y])}</td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table></div><footer><button class="btn" data-close-wells>Закрыть</button></footer>`;
    document.body.append(dialog);dialog.querySelector('[data-close-wells]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();dialog.querySelector('[data-close-wells]').focus();
  }
  $('#editorFields').addEventListener('click',e=>{
    const variant=e.target.closest('[data-tech-variant]');
    if(variant){e.stopImmediatePropagation();techVariant=variant.dataset.techVariant;selectedCluster=null;renderEditor();return;}
    if(e.target.closest('[data-ptech-view]')){selectedCluster=null;selectedBenefit=null;}
    if(e.target.closest('[data-ptech-wells]')){e.stopImmediatePropagation();openWells();return;}
    const row=e.target.closest('tr[data-cluster]');
    if(row){selectedCluster=row.dataset.cluster;selectedBenefit=row.dataset.benefit;$('#editorFields').querySelectorAll('tr[data-cluster]').forEach(tr=>tr.classList.toggle('cluster-selected',tr===row));$('#editorFields [data-ptech-wells]').disabled=false;}
  },true);
  $('#editorFields').addEventListener('keydown',e=>{if(e.target.matches('tr[data-cluster]')&&['Enter',' '].includes(e.key)){e.preventDefault();e.target.click();}});

  // Tax forms follow the row order and paired columns on slides 6–17.
  const years=Array.from({length:147},(_,i)=>String(1900+i));
  const taxStore=()=>JSON.parse(localStorage.getItem('presentationTax:'+currentAsset.code)||'{}');
  const dictionaries={year:years,yesno:['Нет','Да'],price:['ФАС','Ручной ввод'],region:[],license:[],share:[],location:[],kkg:[],...window.presentationTaxLists};
  function field(id,label,type='number',initial='',group=pTaxView) {
    const key=`${group}:${id}`, saved=taxStore(),value=saved[key]??initial;
    const options=dictionaries[type];
    const control=options?`<select data-tax-key="${key}" aria-label="${esc(label)}"><option value="">${options.length?'':'Список'}</option>${[...new Set([...options,...(value?[value]:[])])].map(v=>`<option ${String(v)===String(value)?'selected':''}>${esc(v)}</option>`).join('')}</select>`:`<input class="ptax-value" data-tax-key="${key}" aria-label="${esc(label)}" value="${esc(value)}" ${type==='calculated'?'readonly':''}>`;
    return `<label class="tax-line"><span>${label}</span>${control}</label>`;
  }
  function baseFields(){return [
    ['licenseYear','Год выдачи лицензии'],['reserveYear','Год первой постановки НИЗ по ЛУ на ГБЗ','year'],
    ['reserves','НИЗ AB1C1+B2C2 по ЛУ, тыс. т'],['reservesPrevious','НИЗ AB1C1+B2C2 по ЛУ на 01.01.2025 г., тыс. т'],
    ['change','Прирост/списание запасов по ЛУ за 2025 г., тыс. т'],['production','Накопл. добыча нефти по ЛУ на 01.01.2025 г., тыс. т'],
    ['annual','Добыча нефти по ЛУ за 2025 г., тыс. т'],['depletion','Степень выработанности запасов по ЛУ','calculated']
  ].map(([id,label,type])=>field(id,label,type,'','common')).join('');}
  function benefitFields(){
    const rows=[];
    if(pTaxView==='g5')rows.push(['region','Зависимость от региона','region'],['licenseType','Тип лицензии','license']);
    if(['g1b','g1a'].includes(pTaxView))rows.push(['reserveYear','Год первой постановки НИЗ по залежи на ГБЗ','year']);
    rows.push(['reserves','НИЗ AB1C1+B2C2 залежи ТрИЗ на 01.01.2025 г., тыс. т'],['production','Накопл. добыча нефти залежи на 01.01.2025 г., тыс. т'],['annual',`Добыча нефти залежи за ${['g3','g4'].includes(pTaxView)?'2022':'2025'} г.`],['change','Прирост/списание запасов залежи ТрИЗ за 2025 г., тыс. т'],['depletion2012','Степень выработанности по залежи на 01.01.2012 г., %'],['depletion2013','Степень выработанности по залежи на 01.01.2013 г., %']);
    if(['g1b','g1a'].includes(pTaxView))rows.push(['depletion2020','Степень выраб.-ти баженов. залежи на 01.01.2020 г., %'],['zeroYear','Год превышения 1% степени выработанности (нул. ставка)']);
    rows.push(['onePercentYear','Год превышения 1% выработанности ТрИЗ','year']);
    return rows.map(([id,label,type])=>field(id,label,type)).join('');
  }
  function gasForm(){
    const left=field('share','Коэффициент, характеризующий долю поставок газа на внутренний рынок РФ (Ов)','share')+field('ki','Коэффициент изъятия (Ки)','number','0,15')+field('location','Географическое расположение участка недр','location');
    const right=field('kas','Коэффициент, характеризующий принадлежность искл. к региональной сист. газоснабжения (Кас)','yesno')+field('kkg','Слагаемое (среднегодовое) для ставки НДПИ газ природный Ккг, руб./тыс. м³','kkg')+field('depth','Туронская залежь. Минимальная глубина залегания залежи углеводородного сырья, м','number','1700');
    const production=prefix=>field(prefix+'production',(prefix?'Туронская залежь. ':'')+'Накопленная добыча природного газа по залежи на 01.01.2026, тыс. м³')+field(prefix+'reserves',(prefix?'Туронская залежь. ':'')+'Остаточные запасы природного газа по залежи на 01.01.2026, тыс. м³');
    const tableYears=[2017,2018,2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030,2031];
    return `<section class="tax-frame gas-frame"><h3>НАСТРОЙКА ДАННЫХ: ГАЗ И ГАЗОВЫЙ КОНДЕНСАТ</h3><div class="tax-columns"><div>${left}</div><div>${right}</div></div><h3>НАКОПЛЕННАЯ ДОБЫЧА И ОСТАТОЧНЫЕ ЗАПАСЫ</h3><div class="tax-columns"><div>${production('')}</div><div>${production('turon')}</div></div></section><section class="tax-deduction"><h3>НАЛОГОВЫЙ ВЫЧЕТ В СВЯЗИ С ПОЛУЧЕНИЕМ ШФЛУ ПРИ ПЕРЕРАБОТКЕ ГАЗОВОГО КОНДЕНСАТА</h3><div class="pmodel-scroll"><table class="pmodel-table"><thead><tr><th>Наименование</th><th>Ед. изм.</th>${tableYears.map(y=>`<th>${y}</th>`).join('')}</tr></thead><tbody>${[['condensate','Объём добычи конденсата (МГК)','т'],['shflu','Коэффициент извлечения ШФЛУ и ПБТ (КШФЛУ)','%']].map(([id,label,unit])=>`<tr><th>${label}</th><td>${unit}</td>${tableYears.map(y=>`<td><input class="ptax-value" data-tax-key="gas:${id}:${y}" aria-label="${label}, ${y}" value="${esc(taxStore()[`gas:${id}:${y}`]||'')}"></td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  }
  pTaxWorkspace=function(){
    if(currentAsset.tax.startsWith('НДД'))return `<div class="presentation-tax"><section class="tax-frame tax-ndd"><h3>НАСТРОЙКА ДАННЫХ ДЛЯ НДД</h3>${field('natural','Источник цены природного газа','price','ФАС','ndd')}${field('associated','Источник цены попутного газа','price','ФАС','ndd')}<div title="Применяется при фактическом достижении 1%-ой выработанности ранее первого года проекта, используемого в ЭМ">${field('year','Ручной ввод года достижения 1%-ой выработанности','year','','ndd')}</div>${field('kkan','Ккан по ЛУ на 01.01.2021 равен единице?','yesno','Нет','ndd')}${field('prirazlom','Расчеты по Приразломному ЛУ?','yesno','Нет','ndd')}${field('samotlor','Расчеты по участкам Самотлорского м-р?','yesno','Нет','ndd')}</section></div>`;
    const tabs=`<div class="psection-tabs"><button data-ptax-view="base" class="${pTaxView==='base'?'active':''}">Без льгот ТрИЗ</button>${Object.entries(pTaxBenefits).map(([k,l])=>`<button data-ptax-view="${k}" class="${k===pTaxView?'active':''}">${l}</button>`).join('')}</div>`;
    return `<div class="presentation-tax">${tabs}${pTaxView==='gas'?gasForm():`<section class="tax-frame ${pTaxView==='base'?'tax-base':''}"><h3>${pTaxView==='base'?'НАСТРОЙКА ДАННЫХ ДЛЯ ОФР (без льгот ТрИЗ)':`НАСТРОЙКА ДАННЫХ ДЛЯ ОФР (льгота): ${pTaxBenefits[pTaxView]}`}</h3><div class="tax-columns"><div>${baseFields()}</div>${pTaxView==='base'?'':`<div>${benefitFields()}</div>`}</div></section>`}</div>`;
  };
  function saveTax(e){
    const key=e.target.dataset.taxKey;if(!key)return;
    const d=taxStore();d[key]=e.target.value;
    if(key.startsWith('common:')){
      const num=v=>Number(String(v).replace(/\s/g,'').replace(',','.'));
      const r=num(d['common:reserves']);
      d['common:depletion']=r>0&&d['common:production']!==undefined&&d['common:annual']!==undefined?String((num(d['common:production'])+num(d['common:annual']))/r):'';
      const out=$('[data-tax-key="common:depletion"]');if(out)out.value=d['common:depletion'];
    }
    localStorage.setItem('presentationTax:'+currentAsset.code,JSON.stringify(d));
  }
  $('#editorFields').addEventListener('input',saveTax);$('#editorFields').addEventListener('change',saveTax);
  document.querySelector('.editor-comment>span').textContent='Комментарии';
  $('#pEditorComment').placeholder='Введите комментарии…';
  $('#save').disabled=false;$('#save').innerHTML='Сохранить и<br>применить';
  if(currentAsset){renderEditor();pAttachFilters($('#editorFields'));}
})();
