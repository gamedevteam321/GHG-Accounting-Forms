(function () {
  // Use root_element (Frappe Custom HTML Block context)
  let sitePanel = root_element.querySelector('#tab-site');
  let avgPanel = root_element.querySelector('#tab-avg');
  let addRowBtn = null; // add button sits inside entry row now
  let calcBtn = null;
  let sNoCounter = 1;
  let activeTab = 'site';
  let tbodySite = root_element.querySelector('#posp-tbody-site');
  let tbodyAvg = root_element.querySelector('#posp-tbody-avg');
  let tabsHooked = false;

  const PARENT_DOCTYPE = 'Scope 3 - Processing of Sold Products';
  const CHILD_DTYPE_ACTIVITY = 'Processing of Sold Products Activity Data Item';
  const CHILD_DTYPE_EF = 'Processing of Sold Products Emission Factor Item';

  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function buildTabs() {
    // Use existing markup from index.html; just seed entry rows and default tab
    if (!tbodySite) tbodySite = root_element.querySelector('#posp-tbody-site');
    if (!tbodyAvg) tbodyAvg = root_element.querySelector('#posp-tbody-avg');
    // If HTML already contains entry rows, just hook events; else create them
    const hasSite = tbodySite?.querySelector('tr.entry-row');
    const hasAvg = tbodyAvg?.querySelector('tr.entry-row');
    if (!hasSite) createEntryRow(tbodySite, 'Site-Specific'); else hookEntryRowEvents(hasSite);
    if (!hasAvg) createEntryRow(tbodyAvg, 'Average-Data'); else hookEntryRowEvents(hasAvg);
    setActiveTab('site');
  }

  function setActiveTab(tab) {
    activeTab = tab;
    if (sitePanel && avgPanel) {
      sitePanel.classList.add('active');
      avgPanel.classList.remove('active');
      if (tab === 'avg') {
        sitePanel.classList.remove('active');
        avgPanel.classList.add('active');
      }
    }
    const siteBtn = root_element.querySelector('.tab-button[data-tab="tab-site"]');
    const avgBtn = root_element.querySelector('.tab-button[data-tab="tab-avg"]');
    siteBtn?.classList.toggle('active', tab === 'site');
    avgBtn?.classList.toggle('active', tab === 'avg');
  }

  function getActiveTbody() {
    return activeTab === 'site' ? tbodySite : tbodyAvg;
  }

  function createEntryRow(tbody, methodLabel) {
    if (!tbody) return;
    // Remove existing entry row
    const existing = tbody.querySelector('tr.entry-row');
    if (existing) existing.remove();
    const tr = document.createElement('tr');
    tr.className = 'data-entry-row entry-row';
    tr.innerHTML = `
      <td><input type="number" name="s_no" value="${sNoCounter}" readonly /></td>
      <td><input type="date" name="date" value="${todayISO()}" /></td>
      <td><input type="text" name="method" value="${methodLabel}" readonly /></td>
      <td><input type="text" name="sold_product" placeholder="e.g., Plastic Resin" /></td>
      <td><input type="number" name="mass" step="any" placeholder="Numeric" /></td>
      <td><input type="text" name="unit" value="tonne" /></td>
      <td><input type="text" name="processing_ef_note" placeholder="(Calculated or Avg.)" /></td>
      <td><input type="number" name="ef_value" step="any" placeholder="kg CO2e/tonne" /></td>
      <td><input type="number" name="calc_emissions" step="any" placeholder="Auto" readonly /></td>
      <td class="actions"><button type="button" class="btn-add add-btn-row">+ Add</button></td>
    `;
    hookEntryRowEvents(tr);
    tbody.appendChild(tr);
  }

  function ensureEntryRowForActiveTab() {
    if (activeTab === 'site') {
      if (!tbodySite || !tbodySite.querySelector('tr.entry-row')) {
        tbodySite = root_element.querySelector('#posp-tbody-site');
        createEntryRow(tbodySite, 'Site-Specific');
      }
      const row = tbodySite?.querySelector('tr.entry-row');
      if (row) hookEntryRowEvents(row);
    } else {
      if (!tbodyAvg || !tbodyAvg.querySelector('tr.entry-row')) {
        tbodyAvg = root_element.querySelector('#posp-tbody-avg');
        createEntryRow(tbodyAvg, 'Average-Data');
      }
      const row = tbodyAvg?.querySelector('tr.entry-row');
      if (row) hookEntryRowEvents(row);
    }
  }

  function addFromEntryRow(entryTr) {
    const data = {
      s_no: parseInt(entryTr.querySelector('input[name="s_no"]').value, 10) || sNoCounter,
      date: entryTr.querySelector('input[name="date"]').value || todayISO(),
      method: entryTr.querySelector('input[name="method"]').value,
      sold_product: entryTr.querySelector('input[name="sold_product"]').value,
      mass: parseFloat(entryTr.querySelector('input[name="mass"]').value || '0') || 0,
      unit: entryTr.querySelector('input[name="unit"]').value || 'tonne',
      processing_ef_note: entryTr.querySelector('input[name="processing_ef_note"]').value,
      ef_value: parseFloat(entryTr.querySelector('input[name="ef_value"]').value || '0') || 0,
      calc_emissions: parseFloat(entryTr.querySelector('input[name="calc_emissions"]').value || '0') || 0
    };
    // Minimal validation: require product and mass
    if (!data.sold_product || data.mass <= 0) return;
    const tbody = entryTr.parentElement;
    createDisplayRow(tbody, data);
    // clear inputs and increment S.No
    sNoCounter += 1;
    entryTr.querySelector('input[name="s_no"]').value = String(sNoCounter);
    entryTr.querySelector('input[name="sold_product"]').value = '';
    entryTr.querySelector('input[name="mass"]').value = '';
    entryTr.querySelector('input[name="processing_ef_note"]').value = '';
    entryTr.querySelector('input[name="ef_value"]').value = '';
    entryTr.querySelector('input[name="calc_emissions"]').value = '';
  }

  function createDisplayRow(tbody, data) {
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    tr.innerHTML = `
      <td>${data.s_no}</td>
      <td>${data.date}</td>
      <td>${data.method}</td>
      <td>${data.sold_product}</td>
      <td>${data.mass}</td>
      <td>${data.unit}</td>
      <td>${data.processing_ef_note || '-'}</td>
      <td>${data.ef_value}</td>
      <td>${data.calc_emissions}</td>
      <td class="actions"><button type="button" class="delete-row">Delete</button></td>
    `;
    tr.querySelector('.delete-row')?.addEventListener('click', () => tr.remove());
    const entryRow = tbody.querySelector('tr.entry-row');
    if (entryRow && entryRow.nextSibling) tbody.insertBefore(tr, entryRow.nextSibling);
    else tbody.appendChild(tr);
  }

  function addRow() {
    const tbody = getActiveTbody();
    const entry = tbody?.querySelector('tr.entry-row');
    if (entry) addFromEntryRow(entry);
    else ensureEntryRowForActiveTab();
  }

  function collectTableData(container, childDoctype) {
    const tbody = container?.querySelector('tbody');
    if (!tbody) return [];
    const rows = Array.from(tbody.querySelectorAll('tr'));
    return rows.map(row => {
      return {
        doctype: childDoctype,
        parameter: row.querySelector('input[name="parameter"]')?.value?.trim() || '',
        date: row.querySelector('input[name="date"]')?.value || '',
        value: parseFloat(row.querySelector('input[name="value"]').value || '0') || 0,
        unit: row.querySelector('input[name="unit"]')?.value?.trim() || '',
        note: row.querySelector('input[name="note"]')?.value?.trim() || ''
      };
    }).filter(item => item.parameter || item.value || item.unit || item.note || item.date);
  }

  function getOverview() {
    if (!overviewForm) return { title: '', period_start: '', period_end: '' };
    const formData = new FormData(overviewForm);
    return {
      title: String(formData.get('title') || ''),
      period_start: String(formData.get('period_start') || ''),
      period_end: String(formData.get('period_end') || ''),
    };
  }

  // no global add button anymore; handled per-row

  /* Calculate section removed
  calcBtn?.addEventListener('click', () => {
    const rows = [
      ...(tbodySite ? Array.from(tbodySite.querySelectorAll('tr.data-row')) : []),
      ...(tbodyAvg ? Array.from(tbodyAvg.querySelectorAll('tr.data-row')) : [])
    ];
    const activityData = rows.map(r => ({
      doctype: CHILD_DTYPE_ACTIVITY,
      parameter: r.children[3]?.textContent || '',
      date: r.children[1]?.textContent || todayISO(),
      value: parseFloat(r.children[4]?.textContent || '0') || 0,
      unit: r.children[5]?.textContent || 'tonne',
      note: r.children[6]?.textContent || ''
    }));

    const emissionFactors = rows.map(r => ({
      doctype: CHILD_DTYPE_EF,
      parameter: 'Processing EF',
      date: r.children[1]?.textContent || todayISO(),
      value: parseFloat(r.children[7]?.textContent || '0') || 0,
      unit: 'kg CO2e/tonne',
      note: ''
    }));

    const payload = {
      doctype: PARENT_DOCTYPE,
      title: 'Processing of Sold Products',
      period_start: todayISO(),
      period_end: todayISO(),
      activity_data: activityData,
      emission_factors: emissionFactors,
    };

    if (typeof frappe !== 'undefined' && frappe.call) {
      frappe.call({
        method: 'frappe.client.insert',
        args: { doc: payload },
        callback: () => frappe.show_alert?.({ message: 'Saved Processing of Sold Products record', indicator: 'green' }),
        error: () => frappe.show_alert?.({ message: 'Save failed', indicator: 'red' })
      });
    }
  });*/

  function init() {
    // refresh references in case the DOM was re-rendered by Frappe
    sitePanel = root_element.querySelector('#tab-site');
    avgPanel = root_element.querySelector('#tab-avg');
    addRowBtn = root_element.querySelector('#posp-add-row');
    calcBtn = null;

    console.log('[POSP] init start', { sitePanel: !!sitePanel, avgPanel: !!avgPanel });

    buildTabs();

    setupTabs();

    // Diagnostics
    const btnsDbg = Array.from(root_element.querySelectorAll('.tab-button')).map(b => b.getAttribute('data-tab'));
    const panelsDbg = Array.from(root_element.querySelectorAll('.tab-content')).map(p => p.id);
    console.log('[POSP] tabs found', { buttons: btnsDbg, panels: panelsDbg });

    // wire add/calc again (in case of re-render)
    addRowBtn?.addEventListener('click', addRow);

    // safety
    setTimeout(ensureEntryRowForActiveTab, 0);
    startEntryRowWatcher();

    // expose test switch for debugging
    window.switchPospTab = switchToTab;
    console.log('[POSP] expose window.switchPospTab("tab-site"|"tab-avg")');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Frappe workspace navigation support
  document.addEventListener('frappe:workspace:shown', init);

  function startEntryRowWatcher() {
    let attempts = 0;
    const maxAttempts = 5;
    const timer = setInterval(() => {
      attempts += 1;
      ensureEntryRowForActiveTab();
      if (
        (tbodySite && tbodySite.querySelector('tr.entry-row')) &&
        (tbodyAvg && tbodyAvg.querySelector('tr.entry-row'))
      ) {
        clearInterval(timer);
      }
      if (attempts >= maxAttempts) clearInterval(timer);
    }, 400);
  }

  function hookEntryRowEvents(row) {
    if (!row || row.dataset.hooked === '1') return;
    const massEl = row.querySelector('input[name="mass"]');
    const efEl = row.querySelector('input[name="ef_value"]');
    const outEl = row.querySelector('input[name="calc_emissions"]');
    const recalc = () => {
      const m = parseFloat(massEl?.value || '0') || 0;
      const ef = parseFloat(efEl?.value || '0') || 0;
      if (outEl) outEl.value = (m * ef).toFixed(2);
    };
    massEl?.addEventListener('input', recalc);
    efEl?.addEventListener('input', recalc);
    row.querySelector('.add-btn-row')?.addEventListener('click', () => addFromEntryRow(row));
    row.dataset.hooked = '1';
  }

  //let tabsHooked = false;
  function setupTabs() {
    if (tabsHooked) return;
    tabsHooked = true;
    // Delegated listener in capture phase to beat other handlers
    root_element.addEventListener('click', function(e) {
      const btn = e.target.closest && e.target.closest('.tab-button');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const targetTab = btn.getAttribute('data-tab');
      console.log('[POSP] tab click', { targetTab });
      switchToTab(targetTab);
    }, true);
    // Initialize based on current active button
    const activeBtn = root_element.querySelector('.tab-button.active');
    const initial = activeBtn ? activeBtn.getAttribute('data-tab') : 'tab-site';
    console.log('[POSP] initial tab', initial);
    switchToTab(initial);
  }

  function switchToTab(targetTab) {
    if (!targetTab) return;
    root_element.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    root_element.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
    const btn = root_element.querySelector(`.tab-button[data-tab="${targetTab}"]`);
    const panel = root_element.querySelector(`#${targetTab}`);
    if (btn) btn.classList.add('active');
    if (panel) panel.classList.add('active');
    setActiveTab(targetTab === 'tab-site' ? 'site' : 'avg');
    ensureEntryRowForActiveTab();
  }
})();
