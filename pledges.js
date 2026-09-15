// pledges.js – handles Thanksgiving Pledges, Hospitalization Monitoring, and Wedding Pledges
const pledgesTemplate = () => `
  <div class="pledges-header">
    <div class="pledge-tabs">
      <button class="pledge-tab-btn active" data-tab="thanksgiving">Thanksgiving Pledges</button>
      <button class="pledge-tab-btn" data-tab="hospitalization">Hospitalization Monitoring</button>
      <button class="pledge-tab-btn" data-tab="wedding">Wedding Pledges</button>
    </div>
  </div>

  <div id="pledge-tab-content">
    <!-- Dynamic tab content injected here -->
  </div>

  <!-- Event Payments Modal -->
  <div id="payments-modal" class="modal" style="display:none;">
    <div class="modal-card" style="max-width:650px;">
      <div class="modal-header-flex">
        <h2 id="payments-modal-title" style="margin:0; border:none; padding:0;">Family Payments</h2>
        <button id="close-payments-modal" class="modal-close-btn" aria-label="Close modal">&times;</button>
      </div>
      <div id="payments-stats" style="margin-bottom:15px; font-weight:bold; color:var(--primary);"></div>
      <div style="margin-bottom: 15px; position: relative;">
        <span style="position: absolute; left: 10px; top: 9px; color: #888;">🔍</span>
        <input type="text" id="payments-search-input" placeholder="Search family..." style="width: 100%; padding: 8px 8px 8px 35px; border: 1px solid var(--border-color, #ccc); border-radius: var(--border-radius, 8px);">
      </div>
      <div class="table-responsive" style="max-height: 380px; overflow-y: auto;">
        <table class="data-table" id="payments-table">
          <thead>
            <tr>
              <th>Family</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  </div>
`;

window.renderPledgesView = async function(container) {
  container.innerHTML = pledgesTemplate();
  const tabs = container.querySelectorAll('.pledge-tab-btn');
  const tabContent = container.querySelector('#pledge-tab-content');

  // Change tab handler
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switchTab(tab.dataset.tab);
    });
  });

  async function switchTab(tabName) {
    tabContent.innerHTML = '<div class="loader">Loading pledges...</div>';
    try {
      const members = await window.MemberDB.getAll().catch(() => []);
      if (tabName === 'thanksgiving') {
        await renderThanksgivingTab(tabContent, members);
      } else if (tabName === 'hospitalization') {
        await renderHospitalizationTab(tabContent, members);
      } else if (tabName === 'wedding') {
        await renderWeddingTab(tabContent, members);
      }
    } catch (err) {
      console.error("Error switching tab:", err);
      tabContent.innerHTML = `<div class="card"><p class="text-muted text-center" style="padding: 1.5rem;">Failed to load tab. <button class="btn-primary" onclick="window.navigateToView('pledges')">Retry</button></p></div>`;
    }
  }

  // Initial load
  switchTab('thanksgiving');

  // Modal logic for family payments
  const paymentsModal = container.querySelector('#payments-modal');
  container.querySelector('#close-payments-modal').addEventListener('click', () => {
    paymentsModal.style.display = 'none';
  });
  paymentsModal.addEventListener('click', (e) => {
    if (e.target === paymentsModal) paymentsModal.style.display = 'none';
  });

  window.openPaymentsModal = async function(eventId, eventTitle) {
    const allPledges = await window.PledgeDB.getAll();
    const payments = (allPledges || []).filter(p => p && p.type === 'event_payment' && p.eventId === eventId);
    payments.sort((a,b) => (a.family || '').localeCompare(b.family || ''));

    const tbody = container.querySelector('#payments-table tbody');
    tbody.innerHTML = '';

    if (payments.length === 0) {
      // Auto-generate missing payments for legacy records
      const members = await window.MemberDB.getAll();
      const families = [...new Set((members || []).map(m => m.family).filter(Boolean))];
      if (families.length > 0) {
        const eventRecord = await window.PledgeDB.get(eventId);
        if (eventRecord) {
          const defaultAmount = eventRecord.type === 'hospitalization' ? (parseFloat(eventRecord.pledgeAmount) || 0) : (parseFloat(eventRecord.amount) || 0);
          for (const f of families) {
            await window.PledgeDB.add({
              id: window.uuid(),
              type: 'event_payment',
              eventId: eventId,
              family: f,
              amount: defaultAmount,
              status: 'Pending'
            });
          }
          return window.openPaymentsModal(eventId, eventTitle);
        }
      }
    }
    
    function renderTable() {
      const searchTerm = (container.querySelector('#payments-search-input').value || '').toLowerCase().trim();
      const filteredPayments = payments.filter(p => (p.family || '').toLowerCase().includes(searchTerm));

      const tbody = container.querySelector('#payments-table tbody');
      tbody.innerHTML = '';
      let collected = 0;
      let target = 0;

      if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center">No payment records found.</td></tr>';
      } else if (filteredPayments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center">No families match your search.</td></tr>';
      } else {
        filteredPayments.forEach(p => {
          const pAmount = parseFloat(p.amount) || 0;
          target += pAmount;
          if (p.status === 'Paid') collected += pAmount;

          const tr = document.createElement('tr');
          const statusLower = (p.status || 'pending').toLowerCase();
          tr.innerHTML = `
            <td><strong style="font-size: 1.05rem; color: var(--text-primary);">👥 ${p.family || '-'}</strong></td>
            <td><strong style="font-size: 1rem; color: var(--primary);">₱${pAmount.toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></td>
            <td><span class="badge badge-${statusLower}">${p.status || 'Pending'}</span></td>
            <td>
              ${!window.isViewOnly() && p.status === 'Pending' ? `<button class="mark-paid-btn btn-primary" data-id="${p.id}" style="padding: 6px 12px; font-size: 0.88rem;">Mark Paid</button>` : ''}
              ${!window.isViewOnly() && p.status === 'Paid' ? `<button class="mark-pending-btn btn-secondary" data-id="${p.id}" style="padding: 6px 12px; font-size: 0.88rem;">Undo</button>` : ''}
            </td>
          `;
          tbody.appendChild(tr);
        });
      }

      let overallCollected = 0;
      let overallTarget = 0;
      payments.forEach(p => {
        const val = parseFloat(p.amount || 0);
        overallTarget += val;
        if (p.status === 'Paid') overallCollected += val;
      });
      const statsEl = container.querySelector('#payments-stats');
      if (statsEl) statsEl.textContent = `Total Collected: ₱${overallCollected.toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2})} / ₱${overallTarget.toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
      
      // Bind handlers
      tbody.querySelectorAll('.mark-paid-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const p = await window.PledgeDB.get(e.target.dataset.id);
          if (p) {
            p.status = 'Paid';
            await window.PledgeDB.update(p);
            window.openPaymentsModal(eventId, eventTitle);
          }
        });
      });
      tbody.querySelectorAll('.mark-pending-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const p = await window.PledgeDB.get(e.target.dataset.id);
          if (p) {
            p.status = 'Pending';
            await window.PledgeDB.update(p);
            window.openPaymentsModal(eventId, eventTitle);
          }
        });
      });
    }

    renderTable();
    
    const searchInput = container.querySelector('#payments-search-input');
    if (searchInput) searchInput.onkeyup = () => renderTable();

    const titleEl = container.querySelector('#payments-modal-title');
    if (titleEl) titleEl.textContent = `Payments for: ${eventTitle}`;
    paymentsModal.style.display = 'flex';
  };
};

// ----------------------------------------------------
// 1. THANKSGIVING PLEDGES SUB-TAB
// ----------------------------------------------------
async function renderThanksgivingTab(container, members) {
  container.innerHTML = `
    <div class="card" style="width: 100%;">
      <div class="card-header-flex" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 1.25rem;">
        <h2 style="margin: 0; border: none; padding: 0;">Thanksgiving Registry</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          ${!window.isViewOnly() ? `<button id="btn-open-thanksgiving-modal" class="btn-primary">+ Record Thanksgiving Pledge</button>` : ''}
          <button id="print-thanksgiving" class="btn-secondary">Print</button>
          <button id="export-thanksgiving" class="btn-secondary">Export CSV</button>
        </div>
      </div>

      <div class="table-responsive">
        <div style="margin-bottom: 15px; position: relative;">
          <span style="position: absolute; left: 10px; top: 9px; color: #888;"></span>
          <input type="text" id="thanksgiving-search" placeholder="Search pledger, status, or notes..." style="width: 100%; padding: 8px 8px 8px 35px; border: 1px solid var(--border-color, #ccc); border-radius: var(--border-radius, 8px);">
        </div>
        <table class="data-table" id="thanksgiving-table">
          <thead>
            <tr>
              <th>Family / Pledger</th>
              <th>Date of Thanksgiving</th>
              <th>Pledge Amount</th>
              <th>Advance Payment / Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form: Record / Edit Thanksgiving Pledge -->
    <div id="thanksgiving-modal" class="modal" style="display: none;">
      <div class="modal-card">
        <div class="modal-header-flex">
          <h2 id="thanksgiving-modal-title" style="margin: 0; border: none; padding: 0;">Record Thanksgiving Pledge</h2>
          <button type="button" id="close-thanksgiving-modal" class="modal-close-btn">&times;</button>
        </div>
        <form id="thanksgiving-form">
          <input type="hidden" name="id" id="thanksgiving-id" />
          <label>Family / Pledger Name
            <input type="text" name="family" id="thanksgiving-family" list="family-datalist" placeholder="Select or type family / pledger name" required />
            <datalist id="family-datalist">
              ${[...new Set([...(members || []).map(m => m.family).filter(Boolean), ...(members || []).map(m => m.name).filter(Boolean)])].sort().map(f => `<option value="${f}">`).join('')}
            </datalist>
          </label>
          <label>Total Pledge Amount (₱)
            <input type="number" name="amount" id="thanksgiving-amount" min="1" step="any" required placeholder="e.g. 500" />
          </label>
          <label>Advance Payment / Initial Paid (₱)
            <input type="number" name="paidAmount" id="thanksgiving-paid" min="0" step="any" value="0" placeholder="0 if none" />
          </label>
          <div style="background: rgba(35, 108, 93, 0.08); border-radius: 8px; padding: 10px 14px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">Remaining Balance:</span>
            <strong id="thanksgiving-balance-preview" style="font-size: 1.05rem; color: var(--primary);">₱0.00</strong>
          </div>
          <label>Date of Thanksgiving
            <input type="date" name="datePledged" id="thanksgiving-date" value="${new Date().toISOString().split('T')[0]}" required />
          </label>
          <label>Notes
            <textarea name="notes" id="thanksgiving-notes" rows="2" placeholder="Special thanksgiving intentions or notes..."></textarea>
          </label>
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 1rem;">
            <button type="button" class="btn-secondary" id="thanksgiving-cancel-edit-btn">Cancel</button>
            <button type="submit" id="thanksgiving-submit-btn" class="btn-primary">Save Pledge</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Form: Quick Advance Payment / Payment -->
    <div id="thanksgiving-advance-modal" class="modal" style="display: none;">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header-flex">
          <h2 style="margin: 0; border: none; padding: 0;">Record Advance Payment</h2>
          <button type="button" id="close-advance-modal" class="modal-close-btn">&times;</button>
        </div>
        <form id="thanksgiving-advance-form">
          <input type="hidden" id="adv-pledge-id" />
          <div style="background: rgba(35, 108, 93, 0.08); border-radius: 8px; padding: 12px 16px; margin-bottom: 1.25rem;">
            <div style="font-size: 0.95rem; margin-bottom: 6px;">Family: <strong id="adv-modal-family">-</strong></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.85rem;">
              <span>Total Pledge:</span>
              <strong id="adv-modal-total">₱0.00</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.85rem;">
              <span>Total Advance Paid:</span>
              <span id="adv-modal-paid" style="color: var(--primary); font-weight: 600;">₱0.00</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(35, 108, 93, 0.15); padding-top: 4px; font-size: 0.9rem;">
              <span>Remaining Balance:</span>
              <strong id="adv-modal-balance" style="color: #e67e22;">₱0.00</strong>
            </div>
          </div>
          <label>Advance Payment Amount (₱)
            <input type="number" id="adv-modal-amount" min="1" step="any" required placeholder="Enter amount to deduct" />
          </label>
          <div style="margin-top: 4px; margin-bottom: 1rem;">
            <button type="button" id="adv-fill-full-btn" class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;">Pay Full Remaining Balance</button>
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" class="btn-secondary" id="adv-cancel-btn">Cancel</button>
            <button type="submit" class="btn-primary">Apply Payment</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Modal elements
  const modal = container.querySelector('#thanksgiving-modal');
  const form = container.querySelector('#thanksgiving-form');
  const modalTitle = container.querySelector('#thanksgiving-modal-title');
  const openModalBtn = container.querySelector('#btn-open-thanksgiving-modal');
  const closeModalBtn = container.querySelector('#close-thanksgiving-modal');
  const cancelBtn = container.querySelector('#thanksgiving-cancel-edit-btn');
  const tbody = container.querySelector('#thanksgiving-table tbody');
  const exportBtn = container.querySelector('#export-thanksgiving');
  const submitBtn = container.querySelector('#thanksgiving-submit-btn');

  const amountInput = form.querySelector('#thanksgiving-amount');
  const paidInput = form.querySelector('#thanksgiving-paid');
  const balancePreview = form.querySelector('#thanksgiving-balance-preview');

  // Advance Modal elements
  const advModal = container.querySelector('#thanksgiving-advance-modal');
  const advForm = container.querySelector('#thanksgiving-advance-form');
  const closeAdvBtn = container.querySelector('#close-advance-modal');
  const cancelAdvBtn = container.querySelector('#adv-cancel-btn');
  const advPledgeId = container.querySelector('#adv-pledge-id');
  const advModalFamily = container.querySelector('#adv-modal-family');
  const advModalTotal = container.querySelector('#adv-modal-total');
  const advModalPaid = container.querySelector('#adv-modal-paid');
  const advModalBalance = container.querySelector('#adv-modal-balance');
  const advModalAmount = container.querySelector('#adv-modal-amount');
  const advFillFullBtn = container.querySelector('#adv-fill-full-btn');

  let currentAdvBalance = 0;

  function updateBalancePreview() {
    const total = parseFloat(amountInput.value) || 0;
    const paid = parseFloat(paidInput.value) || 0;
    const balance = Math.max(0, total - paid);
    balancePreview.textContent = `₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (balance === 0 && total > 0) {
      balancePreview.style.color = 'var(--success)';
    } else {
      balancePreview.style.color = 'var(--primary)';
    }
  }

  amountInput.addEventListener('input', updateBalancePreview);
  paidInput.addEventListener('input', updateBalancePreview);

  function openModal(isEdit = false) {
    if (!isEdit) {
      form.reset();
      form.querySelector('#thanksgiving-id').value = '';
      form.querySelector('#thanksgiving-paid').value = '0';
      form.querySelector('#thanksgiving-date').value = new Date().toISOString().split('T')[0];
      modalTitle.textContent = 'Record Thanksgiving Pledge';
      submitBtn.textContent = 'Save Pledge';
      updateBalancePreview();
    }
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    form.reset();
    form.querySelector('#thanksgiving-id').value = '';
  }

  function openAdvModal(p, pledgerName, totalAmount, paidAmount, balance) {
    advPledgeId.value = p.id;
    advModalFamily.textContent = pledgerName;
    advModalTotal.textContent = `₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    advModalPaid.textContent = `₱${paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    advModalBalance.textContent = `₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    currentAdvBalance = balance;
    advModalAmount.value = balance > 0 ? balance : '';
    advModalAmount.max = balance;
    advModal.style.display = 'flex';
    setTimeout(() => advModalAmount.focus(), 100);
  }

  function closeAdvModal() {
    advModal.style.display = 'none';
    advForm.reset();
  }

  if (openModalBtn) openModalBtn.addEventListener('click', () => openModal(false));
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (closeAdvBtn) closeAdvBtn.addEventListener('click', closeAdvModal);
  if (cancelAdvBtn) cancelAdvBtn.addEventListener('click', closeAdvModal);
  if (advFillFullBtn) advFillFullBtn.addEventListener('click', () => {
    advModalAmount.value = currentAdvBalance;
  });
  advModal.addEventListener('click', (e) => {
    if (e.target === advModal) closeAdvModal();
  });

  const searchInput = container.querySelector('#thanksgiving-search');
  if (searchInput) searchInput.addEventListener('input', loadPledges);

  async function loadPledges() {
    try {
      const allPledges = await window.PledgeDB.getAll();
      let thanksgiving = (allPledges || []).filter(p => p && p.type === 'thanksgiving');

      // Populate family datalist with member families + member names + any existing pledge families
      const datalist = form.querySelector('#family-datalist');
      if (datalist) {
        const memberFamilies = (members || []).map(m => m.family).filter(Boolean);
        const memberNames = (members || []).map(m => m.name).filter(Boolean);
        const existingFamilies = (allPledges || []).map(p => p.family).filter(Boolean);
        const allFamilies = [...new Set([...memberFamilies, ...memberNames, ...existingFamilies])].sort();
        
        datalist.innerHTML = allFamilies.map(f => `<option value="${f}">`).join('');
      }

      const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();
      if (searchTerm) {
        thanksgiving = thanksgiving.filter(p => {
          const member = (members || []).find(m => m.id === p.memberId);
          const name = member ? member.name.toLowerCase() : '';
          const fam = (p.family || '').toLowerCase();
          const notes = (p.notes || '').toLowerCase();
          const status = (p.status || '').toLowerCase();
          return name.includes(searchTerm) || fam.includes(searchTerm) || notes.includes(searchTerm) || status.includes(searchTerm);
        });
      }

      tbody.innerHTML = '';

      if (thanksgiving.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-muted text-center" style="padding: 2rem;">${searchTerm ? 'No matching thanksgiving pledges found.' : 'No thanksgiving pledges recorded yet.'}</td></tr>`;
        return;
      }

    thanksgiving.forEach(p => {
      let pledgerName = p.family;
      if (!pledgerName) {
        const member = (members || []).find(m => m.id === p.memberId);
        pledgerName = member ? (member.family || member.name) : 'Unknown Family';
      }

      const totalAmount = parseFloat(p.amount) || 0;
      let paidAmount = 0;
      if (p.paidAmount !== undefined && p.paidAmount !== null) {
        paidAmount = parseFloat(p.paidAmount) || 0;
      } else if (p.status === 'Paid') {
        paidAmount = totalAmount;
      }

      const balance = Math.max(0, totalAmount - paidAmount);

      let status = p.status || 'Pledged';
      let statusBadgeClass = 'badge-pledged';

      if (paidAmount >= totalAmount && totalAmount > 0) {
        status = 'Paid';
        statusBadgeClass = 'badge-paid';
      } else if (paidAmount > 0) {
        status = 'Partial';
        statusBadgeClass = 'badge-partial';
      } else {
        status = 'Pledged';
        statusBadgeClass = 'badge-pledged';
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="font-size: 1.05rem; color: var(--text-primary);">👥 ${pledgerName}</strong></td>
        <td style="font-size: 0.95rem;">${window.formatDate(p.thanksgivingDate || p.datePledged)}</td>
        <td><strong style="font-size: 1rem; color: var(--text-primary);">₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
        <td style="color: var(--primary); font-weight: 700; font-size: 1rem;">₱${paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>
          ${balance > 0 
            ? `<strong style="color: #e67e22; font-size: 1rem;">₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>` 
            : `<span style="color: var(--success); font-weight: 700; font-size: 1rem;">₱0.00</span>`
          }
        </td>
        <td><span class="badge ${statusBadgeClass}">${status}</span></td>
        <td class="text-sm" style="font-size: 0.9rem;">${p.notes || '-'}</td>
        <td style="white-space: nowrap;">
          ${!window.isViewOnly() && balance > 0 ? `<button class="cash-advance-btn btn-primary" data-id="${p.id}" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 4px;">+ Advance Payment</button>` : ''}
          ${!window.isViewOnly() && balance > 0 ? `<button class="pay-full-btn btn-secondary" data-id="${p.id}" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 4px;">Pay Full</button>` : ''}
          ${!window.isViewOnly() && paidAmount > 0 ? `<button class="reset-paid-btn btn-secondary" data-id="${p.id}" data-family="${pledgerName}" style="padding: 6px 12px; font-size: 0.85rem; margin-right: 4px;" title="Reset payments to 0">Reset</button>` : ''}
          ${!window.isViewOnly() ? `<button class="edit-thanksgiving-btn btn-edit-text" data-id="${p.id}" style="margin-left: 4px; font-size: 0.88rem;">✏ Edit</button><button class="delete-pledge-btn btn-danger-text" data-id="${p.id}" style="margin-left: 4px; font-size: 0.88rem;">&times; Delete</button>` : '<span class="text-muted">View Only</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Advance Payment button handler
    container.querySelectorAll('.cash-advance-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = e.currentTarget.dataset.id;
        const p = await window.PledgeDB.get(id);
        if (p) {
          let pledgerName = p.family;
          if (!pledgerName) {
            const member = (members || []).find(m => m.id === p.memberId);
            pledgerName = member ? (member.family || member.name) : 'Unknown Family';
          }
          const totalAmount = parseFloat(p.amount) || 0;
          let paidAmount = 0;
          if (p.paidAmount !== undefined && p.paidAmount !== null) {
            paidAmount = parseFloat(p.paidAmount) || 0;
          } else if (p.status === 'Paid') {
            paidAmount = totalAmount;
          }
          const balance = Math.max(0, totalAmount - paidAmount);
          openAdvModal(p, pledgerName, totalAmount, paidAmount, balance);
        }
      });
    });

    // Pay Full handler
    container.querySelectorAll('.pay-full-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = e.currentTarget.dataset.id;
        const p = await window.PledgeDB.get(id);
        if (p) {
          const totalAmount = parseFloat(p.amount) || 0;
          p.paidAmount = totalAmount;
          p.status = 'Paid';
          await window.PledgeDB.update(p);
          window.showToast('Pledge marked as Fully Paid', 'success');
          loadPledges();
        }
      });
    });

    // Reset payment handler
    container.querySelectorAll('.reset-paid-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = e.currentTarget.dataset.id;
        const family = e.currentTarget.dataset.family || 'family';
        if (!confirm(`Reset payments for ${family} to ₱0.00?`)) return;
        const p = await window.PledgeDB.get(id);
        if (p) {
          p.paidAmount = 0;
          p.status = 'Pledged';
          await window.PledgeDB.update(p);
          window.showToast('Payment reset to ₱0.00', 'info');
          loadPledges();
        }
      });
    });

    // Edit handler
    container.querySelectorAll('.edit-thanksgiving-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = e.currentTarget.dataset.id;
        const p = await window.PledgeDB.get(id);
        if (p) {
          form.querySelector('#thanksgiving-id').value = p.id;
          
          form.querySelector('#thanksgiving-family').value = p.family || '';
          
          form.querySelector('#thanksgiving-amount').value = p.amount || '';
          
          const totalAmount = parseFloat(p.amount) || 0;
          let currentPaid = 0;
          if (p.paidAmount !== undefined && p.paidAmount !== null) {
            currentPaid = parseFloat(p.paidAmount) || 0;
          } else if (p.status === 'Paid') {
            currentPaid = totalAmount;
          }
          form.querySelector('#thanksgiving-paid').value = currentPaid;
          form.querySelector('#thanksgiving-date').value = p.thanksgivingDate || p.datePledged || '';
          form.querySelector('#thanksgiving-notes').value = p.notes || '';
          
          updateBalancePreview();
          modalTitle.textContent = 'Edit Thanksgiving Pledge';
          submitBtn.textContent = 'Save Changes';
          openModal(true);
        }
      });
    });

    // Delete handler
    container.querySelectorAll('.delete-pledge-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        if (!confirm('Delete this pledge entry?')) return;
        const id = e.currentTarget.dataset.id;
        await window.PledgeDB.delete(id);
        window.showToast('Pledge removed');
        loadPledges();
      });
    });
    } catch (err) {
      console.error("Error loading thanksgiving pledges:", err);
      tbody.innerHTML = '<tr><td colspan="8" class="text-muted text-center" style="padding: 2rem;">Error loading pledges. Please check your connection.</td></tr>';
    }
  }

  // Submit main Thanksgiving Pledge form
  form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const data = new FormData(form);
      const id = data.get('id');
      const isEditing = !!id;

      const totalAmount = parseFloat(data.get('amount')) || 0;
      const paidAmount = parseFloat(data.get('paidAmount')) || 0;

      let calculatedStatus = 'Pledged';
      if (paidAmount >= totalAmount && totalAmount > 0) {
        calculatedStatus = 'Paid';
      } else if (paidAmount > 0) {
        calculatedStatus = 'Partial';
      }
      
      let pledge;
      if (isEditing) {
        pledge = await window.PledgeDB.get(id);
        if (!pledge) return;
        pledge.family = data.get('family');
        pledge.amount = totalAmount;
        pledge.paidAmount = paidAmount;
        pledge.thanksgivingDate = data.get('datePledged');
        delete pledge.datePledged;
        pledge.status = calculatedStatus;
        pledge.notes = data.get('notes');
        await window.PledgeDB.update(pledge);
        window.showToast('Thanksgiving pledge updated', 'success');
      } else {
        pledge = {
          id: window.uuid(),
          type: 'thanksgiving',
          family: data.get('family'),
          amount: totalAmount,
          paidAmount: paidAmount,
          thanksgivingDate: data.get('datePledged'),
          status: calculatedStatus,
          notes: data.get('notes'),
        };
        await window.PledgeDB.add(pledge);
        window.showToast('Thanksgiving pledge recorded', 'success');
      }
      
      if (searchInput) searchInput.value = '';
      closeModal();
      await loadPledges();
    } catch (err) {
      console.error("Error saving thanksgiving pledge:", err);
      window.showToast('Failed to save pledge: ' + (err.message || err), 'error');
    }
  });

  // Submit Quick Advance Payment modal form
  advForm.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const id = advPledgeId.value;
      const advanceAmount = parseFloat(advModalAmount.value) || 0;
      if (advanceAmount <= 0) {
        window.showToast('Please enter a valid amount', 'error');
        return;
      }

      const pledge = await window.PledgeDB.get(id);
      if (!pledge) return;

      const totalAmount = parseFloat(pledge.amount) || 0;
      let currentPaid = 0;
      if (pledge.paidAmount !== undefined && pledge.paidAmount !== null) {
        currentPaid = parseFloat(pledge.paidAmount) || 0;
      } else if (pledge.status === 'Paid') {
        currentPaid = totalAmount;
      }

      const newPaidAmount = currentPaid + advanceAmount;
      pledge.paidAmount = newPaidAmount;

      if (newPaidAmount >= totalAmount && totalAmount > 0) {
        pledge.status = 'Paid';
      } else {
        pledge.status = 'Partial';
      }

      await window.PledgeDB.update(pledge);
      const newBalance = Math.max(0, totalAmount - newPaidAmount);
      window.showToast(`Advance payment of ₱${advanceAmount.toLocaleString('en-PH', {minimumFractionDigits:2})} applied! Remaining: ₱${newBalance.toLocaleString('en-PH', {minimumFractionDigits:2})}`, 'success');
      closeAdvModal();
      await loadPledges();
    } catch (err) {
      console.error("Error applying advance payment:", err);
      window.showToast('Failed to apply payment: ' + (err.message || err), 'error');
    }
  });

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const allPledges = await window.PledgeDB.getAll();
      const thanksgiving = (allPledges || []).filter(p => p && p.type === 'thanksgiving');
      let csv = 'Pledger,Pledge Amount,Advance Payment / Paid,Remaining Balance,Date of Thanksgiving,Status,Notes\n';
      thanksgiving.forEach(p => {
        let pledgerName = p.family;
        if (!pledgerName) {
          const member = (members || []).find(m => m.id === p.memberId);
          pledgerName = member ? (member.family || member.name) : 'Unknown';
        }
        const totalAmount = parseFloat(p.amount) || 0;
        let paidAmount = 0;
        if (p.paidAmount !== undefined && p.paidAmount !== null) {
          paidAmount = parseFloat(p.paidAmount) || 0;
        } else if (p.status === 'Paid') {
          paidAmount = totalAmount;
        }
        const balance = Math.max(0, totalAmount - paidAmount);
        const name = (pledgerName || '').replace(/"/g, '""');
        const notes = p.notes ? p.notes.replace(/"/g, '""') : '';
        const status = (p.status || (balance === 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pledged')));

        csv += `"${name}",${totalAmount},${paidAmount},${balance},"${p.thanksgivingDate || p.datePledged || ''}","${status}","${notes}"\n`;
      });
      downloadCSV(csv, 'thanksgiving_pledges.csv');
    });
  }

  const printTgBtn = container.querySelector('#print-thanksgiving');
  if (printTgBtn) {
    printTgBtn.addEventListener('click', () => {
      const printWindow = window.open('', '_blank');
      const tableHtml = container.querySelector('#thanksgiving-table').outerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>Thanksgiving Registry</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #333; }
              h1 { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #f8f9fa; font-weight: bold; }
              th:last-child, td:last-child { display: none; }
              .badge { font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>FAFB LP - Thanksgiving Registry</h1>
            ${tableHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    });
  }

  await loadPledges();
}

// ----------------------------------------------------
// 2. HOSPITALIZATION MONITORING SUB-TAB
// ----------------------------------------------------
async function renderHospitalizationTab(container, members) {
  container.innerHTML = `
    <div class="card" style="width: 100%;">
      <div class="card-header-flex" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 1.25rem;">
        <h2 style="margin: 0; border: none; padding: 0;">Hospitalization Tracker</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          ${!window.isViewOnly() ? `<button id="btn-open-hosp-modal" class="btn-primary">+ Report Hospitalized Member</button>` : ''}
          <button id="print-hosp" class="btn-secondary">🖨️ Print</button>
          <button id="export-hosp" class="btn-secondary">Export CSV</button>
        </div>
      </div>

      <div class="table-responsive">
        <div style="margin-bottom: 15px; position: relative;">
          <span style="position: absolute; left: 10px; top: 9px; color: #888;">🔍</span>
          <input type="text" id="hosp-search" placeholder="Search patient or hospital..." style="width: 100%; padding: 8px 8px 8px 35px; border: 1px solid var(--border-color, #ccc); border-radius: var(--border-radius, 8px);">
        </div>
        <table class="data-table" id="hospitalization-table">
          <thead>
            <tr>
              <th>Patient Details</th>
              <th>Admission Info</th>
              <th>Financial Support</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form: Report Hospitalized Member -->
    <div id="hospitalization-modal" class="modal" style="display: none;">
      <div class="modal-card">
        <div class="modal-header-flex">
          <h2 id="hosp-modal-title" style="margin: 0; border: none; padding: 0;">Report Hospitalized Member</h2>
          <button type="button" id="close-hosp-modal" class="modal-close-btn">&times;</button>
        </div>
        <form id="hospitalization-form">
          <input type="hidden" name="id" id="hospitalization-id" />
          <label>Patient (Member)
            <select name="memberId" id="hosp-memberId" required>
              <option value="">-- Select Member --</option>
              ${(members || []).map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
            </select>
          </label>
          <label>Hospital Name
            <input type="text" name="hospitalName" id="hosp-hospitalName" placeholder="e.g. Davao Doctors Hospital" required />
          </label>
          <label>Admission Date
            <input type="date" name="admissionDate" id="hosp-admissionDate" value="${new Date().toISOString().split('T')[0]}" required />
          </label>
          <label>Status
            <select name="status" id="hosp-status">
              <option value="Admitted">Admitted</option>
              <option value="Discharged">Discharged</option>
            </select>
          </label>
          <label>Discharge Date (If Discharged)
            <input type="date" name="dischargeDate" id="hosp-dischargeDate" />
          </label>
          <label>Target Amount per Family (₱)
            <input type="number" name="pledgeAmount" id="hosp-pledgeAmount" min="0" step="any" placeholder="0 if none" />
          </label>
          <label>Support Pledge Status
            <select name="pledgeStatus" id="hosp-pledgeStatus">
              <option value="None">No Pledge</option>
              <option value="Pledged">Pledged</option>
              <option value="Disbursed">Disbursed</option>
            </select>
          </label>
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 1rem;">
            <button type="button" class="btn-secondary" id="hosp-cancel-edit-btn">Cancel</button>
            <button type="submit" id="hosp-submit-btn" class="btn-primary">Save Report</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const modal = container.querySelector('#hospitalization-modal');
  const form = container.querySelector('#hospitalization-form');
  const modalTitle = container.querySelector('#hosp-modal-title');
  const openModalBtn = container.querySelector('#btn-open-hosp-modal');
  const closeModalBtn = container.querySelector('#close-hosp-modal');
  const cancelBtn = container.querySelector('#hosp-cancel-edit-btn');
  const tbody = container.querySelector('#hospitalization-table tbody');
  const exportBtn = container.querySelector('#export-hosp');
  const submitBtn = container.querySelector('#hosp-submit-btn');

  function openModal(isEdit = false) {
    if (!isEdit) {
      form.reset();
      form.querySelector('#hospitalization-id').value = '';
      form.querySelector('#hosp-admissionDate').value = new Date().toISOString().split('T')[0];
      modalTitle.textContent = 'Report Hospitalized Member';
      submitBtn.textContent = 'Save Report';
    }
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    form.reset();
    form.querySelector('#hospitalization-id').value = '';
  }

  if (openModalBtn) openModalBtn.addEventListener('click', () => openModal(false));
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const searchInputHosp = container.querySelector('#hosp-search');
  if (searchInputHosp) searchInputHosp.addEventListener('input', loadHosp);

  async function loadHosp() {
    try {
      const allPledges = await window.PledgeDB.getAll();
      let hosp = (allPledges || []).filter(p => p && p.type === 'hospitalization');

      const searchTerm = (searchInputHosp ? searchInputHosp.value : '').toLowerCase().trim();
      if (searchTerm) {
        hosp = hosp.filter(p => {
          const member = (members || []).find(m => m.id === p.memberId);
          const name = member ? member.name.toLowerCase() : '';
          const hospital = (p.hospitalName || '').toLowerCase();
          return name.includes(searchTerm) || hospital.includes(searchTerm);
        });
      }

      tbody.innerHTML = '';

      if (hosp.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center" style="padding: 2rem;">${searchTerm ? 'No matching hospitalization records found.' : 'No hospitalization records found.'}</td></tr>`;
        return;
      }

      hosp.forEach(p => {
        const member = (members || []).find(m => m.id === p.memberId);
        const tr = document.createElement('tr');
        const statusLower = (p.status || 'admitted').toLowerCase();
        const pledgeStatusLower = (p.pledgeStatus || 'none').toLowerCase();
        tr.innerHTML = `
          <td>
            <strong style="font-size: 1.05rem; color: var(--text-primary);">${member ? member.name : 'Unknown Member'}</strong><br>
            <span class="text-muted" style="font-size: 0.9rem;">🏥 ${p.hospitalName || 'Hospital'} ${member && member.family ? `&bull; 👥 Family: <strong>${member.family}</strong>` : ''}</span>
          </td>
          <td style="font-size: 0.95rem;">
            ${window.formatDate(p.admissionDate)} ${p.dischargeDate ? `<br><small class="text-muted">Disch: ${window.formatDate(p.dischargeDate)}</small>` : ''}<br>
            <span class="badge badge-${statusLower}">${p.status || 'Admitted'}</span>
          </td>
          <td>
            <strong style="font-size: 1.05rem; color: var(--text-primary);">₱${(parseFloat(p.pledgeAmount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><br>
            <span class="badge badge-${pledgeStatusLower}">${p.pledgeStatus || 'None'}</span>
          </td>
          <td style="white-space: nowrap;">
            <button class="view-payments-btn btn-secondary" data-id="${p.id}" data-title="Hospitalization of ${member ? member.name : 'Unknown'}" style="padding: 6px 12px; font-size: 0.88rem;">👥 View Family Payments</button>
            ${!window.isViewOnly() && p.status === 'Admitted' ? `<button class="discharge-btn btn-primary" data-id="${p.id}" style="margin-left:5px; padding: 6px 12px; font-size: 0.88rem;">Discharge</button>` : ''}
            ${!window.isViewOnly() && p.pledgeStatus === 'Pledged' && (parseFloat(p.pledgeAmount) || 0) > 0 ? `<button class="disburse-btn btn-primary" data-id="${p.id}" style="margin-left:5px; padding: 6px 12px; font-size: 0.88rem;">Disburse</button>` : ''}
            ${!window.isViewOnly() ? `<button class="edit-hosp-btn btn-edit-text" data-id="${p.id}" style="margin-left:5px; font-size: 0.88rem;">✏ Edit</button><button class="delete-hosp-btn btn-danger-text" data-id="${p.id}" style="margin-left:5px; font-size: 0.88rem;">&times; Delete</button>` : '<span class="text-muted">View Only</span>'}
          </td>
        `;
        tbody.appendChild(tr);
      });

      // View payments handler
      container.querySelectorAll('.view-payments-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          window.openPaymentsModal(e.target.dataset.id, e.target.dataset.title);
        });
      });

      // Discharge handler
      container.querySelectorAll('.discharge-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const id = e.target.dataset.id;
          const p = await window.PledgeDB.get(id);
          if (p) {
            p.status = 'Discharged';
            p.dischargeDate = new Date().toISOString().split('T')[0];
            await window.PledgeDB.update(p);
            window.showToast('Member marked as Discharged', 'success');
            loadHosp();
          }
        });
      });

      // Disburse pledge handler
      container.querySelectorAll('.disburse-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const id = e.target.dataset.id;
          const p = await window.PledgeDB.get(id);
          if (p) {
            p.pledgeStatus = 'Disbursed';
            await window.PledgeDB.update(p);
            window.showToast('Assistance pledge marked as Disbursed', 'success');
            loadHosp();
          }
        });
      });

      // Edit handler
      container.querySelectorAll('.edit-hosp-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const id = e.target.dataset.id;
          const p = await window.PledgeDB.get(id);
          if (p) {
            form.querySelector('#hospitalization-id').value = p.id;
            form.querySelector('#hosp-memberId').value = p.memberId || '';
            form.querySelector('#hosp-hospitalName').value = p.hospitalName || '';
            form.querySelector('#hosp-admissionDate').value = p.admissionDate || '';
            form.querySelector('#hosp-status').value = p.status || 'Admitted';
            form.querySelector('#hosp-dischargeDate').value = p.dischargeDate || '';
            form.querySelector('#hosp-pledgeAmount').value = p.pledgeAmount || '';
            form.querySelector('#hosp-pledgeStatus').value = p.pledgeStatus || 'None';
            
            modalTitle.textContent = 'Edit Hospitalization Record';
            submitBtn.textContent = 'Save Changes';
            openModal(true);
          }
        });
      });

      // Delete handler
      container.querySelectorAll('.delete-hosp-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          if (!confirm('Delete this hospitalization tracking entry?')) return;
          const id = e.target.dataset.id;
          
          const all = await window.PledgeDB.getAll();
          const payments = (all || []).filter(p => p.type === 'event_payment' && p.eventId === id);
          for (const payment of payments) {
            await window.PledgeDB.delete(payment.id);
          }
          
          await window.PledgeDB.delete(id);
          window.showToast('Entry removed');
          loadHosp();
        });
      });
    } catch (err) {
      console.error("Error loading hospitalization records:", err);
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center" style="padding: 2rem;">Error loading hospitalization records.</td></tr>';
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const data = new FormData(form);
      const id = data.get('id');
      const isEditing = !!id;
      
      let record;
      if (isEditing) {
        record = await window.PledgeDB.get(id);
        if (!record) return;
        record.memberId = data.get('memberId');
        record.hospitalName = data.get('hospitalName');
        record.admissionDate = data.get('admissionDate');
        record.dischargeDate = data.get('dischargeDate') || null;
        record.status = data.get('status');
        record.pledgeAmount = parseFloat(data.get('pledgeAmount')) || 0;
        record.pledgeStatus = data.get('pledgeStatus');
        await window.PledgeDB.update(record);
        
        const all = await window.PledgeDB.getAll();
        const payments = (all || []).filter(p => p.type === 'event_payment' && p.eventId === id);
        for (const p of payments) {
          if (p.amount !== record.pledgeAmount) {
            p.amount = record.pledgeAmount;
            await window.PledgeDB.update(p);
          }
        }
        
        window.showToast('Hospitalization record updated', 'success');
      } else {
        const newId = window.uuid();
        record = {
          id: newId,
          type: 'hospitalization',
          memberId: data.get('memberId'),
          hospitalName: data.get('hospitalName'),
          admissionDate: data.get('admissionDate'),
          dischargeDate: data.get('dischargeDate') || null,
          status: data.get('status'),
          pledgeAmount: parseFloat(data.get('pledgeAmount')) || 0,
          pledgeStatus: data.get('pledgeStatus'),
        };
        await window.PledgeDB.add(record);
        
        const families = [...new Set((members || []).map(m => m.family).filter(Boolean))];
        for (const f of families) {
          await window.PledgeDB.add({
            id: window.uuid(),
            type: 'event_payment',
            eventId: newId,
            family: f,
            amount: record.pledgeAmount,
            status: 'Pending'
          });
        }
        
        window.showToast('Hospitalization record added', 'success');
      }
      
      closeModal();
      await loadHosp();
    } catch (err) {
      console.error("Error saving hospitalization record:", err);
      window.showToast('Failed to save record: ' + (err.message || err), 'error');
    }
  });

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const allPledges = await window.PledgeDB.getAll();
      const hosp = (allPledges || []).filter(p => p && p.type === 'hospitalization');
      let csv = 'Patient,Hospital,Admission Date,Discharge Date,Status,Target Assistance/Family,Event Disburse Status\n';
      hosp.forEach(p => {
        const member = (members || []).find(m => m.id === p.memberId);
        const name = member ? member.name.replace(/"/g, '""') : 'Unknown';
        const hospital = (p.hospitalName || '').replace(/"/g, '""');
        csv += `"${name}","${hospital}","${p.admissionDate}","${p.dischargeDate || ''}","${p.status}",${p.pledgeAmount || 0},"${p.pledgeStatus}"\n`;
      });
      downloadCSV(csv, 'hospitalization_records.csv');
    });
  }

  const printHospBtn = container.querySelector('#print-hosp');
  if (printHospBtn) {
    printHospBtn.addEventListener('click', () => {
      const printWindow = window.open('', '_blank');
      const tableHtml = container.querySelector('#hospitalization-table').outerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>Hospitalization Tracker</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #333; }
              h1 { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #f8f9fa; font-weight: bold; }
              th:last-child, td:last-child { display: none; }
              .badge { font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>FAFB LP - Hospitalization Tracker</h1>
            ${tableHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    });
  }

  await loadHosp();
}

// ----------------------------------------------------
// 3. WEDDING PLEDGES SUB-TAB
// ----------------------------------------------------
async function renderWeddingTab(container, members) {
  container.innerHTML = `
    <div class="card" style="width: 100%;">
      <div class="card-header-flex" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 1.25rem;">
        <h2 style="margin: 0; border: none; padding: 0;">Wedding Pledges Registry</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          ${!window.isViewOnly() ? `<button id="btn-open-wedding-modal" class="btn-primary">+ Record Wedding Pledge</button>` : ''}
          <button id="print-wedding" class="btn-secondary">🖨️ Print</button>
          <button id="export-wedding" class="btn-secondary">Export CSV</button>
        </div>
      </div>

      <div class="table-responsive">
        <div style="margin-bottom: 15px; position: relative;">
          <span style="position: absolute; left: 10px; top: 9px; color: #888;">🔍</span>
          <input type="text" id="wedding-search" placeholder="Search couple..." style="width: 100%; padding: 8px 8px 8px 35px; border: 1px solid var(--border-color, #ccc); border-radius: var(--border-radius, 8px);">
        </div>
        <table class="data-table" id="wedding-table">
          <thead>
            <tr>
              <th>Wedding Details</th>
              <th>Target Amount/Family</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form: Record Wedding Pledge -->
    <div id="wedding-modal" class="modal" style="display: none;">
      <div class="modal-card">
        <div class="modal-header-flex">
          <h2 id="wedding-modal-title" style="margin: 0; border: none; padding: 0;">Record Wedding Pledge</h2>
          <button type="button" id="close-wedding-modal" class="modal-close-btn">&times;</button>
        </div>
        <form id="wedding-form">
          <input type="hidden" name="id" id="wedding-id" />
          <label>Groom Name
            <input type="text" name="groomName" id="wedding-groomName" placeholder="Groom's Full Name" required />
          </label>
          <label>Bride Name
            <input type="text" name="brideName" id="wedding-brideName" placeholder="Bride's Full Name" required />
          </label>
          <label>Wedding Date
            <input type="date" name="weddingDate" id="wedding-date" required />
          </label>
          <label>Target Amount per Family (₱)
            <input type="number" name="amount" id="wedding-amount" min="0" step="any" required placeholder="e.g. 500" />
          </label>
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 1rem;">
            <button type="button" class="btn-secondary" id="wedding-cancel-edit-btn">Cancel</button>
            <button type="submit" id="wedding-submit-btn" class="btn-primary">Save Wedding Pledge</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const modal = container.querySelector('#wedding-modal');
  const form = container.querySelector('#wedding-form');
  const modalTitle = container.querySelector('#wedding-modal-title');
  const openModalBtn = container.querySelector('#btn-open-wedding-modal');
  const closeModalBtn = container.querySelector('#close-wedding-modal');
  const cancelBtn = container.querySelector('#wedding-cancel-edit-btn');
  const tbody = container.querySelector('#wedding-table tbody');
  const exportBtn = container.querySelector('#export-wedding');
  const submitBtn = container.querySelector('#wedding-submit-btn');

  function openModal(isEdit = false) {
    if (!isEdit) {
      form.reset();
      form.querySelector('#wedding-id').value = '';
      modalTitle.textContent = 'Record Wedding Pledge';
      submitBtn.textContent = 'Save Wedding Pledge';
    }
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    form.reset();
    form.querySelector('#wedding-id').value = '';
  }

  if (openModalBtn) openModalBtn.addEventListener('click', () => openModal(false));
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const searchInputWedding = container.querySelector('#wedding-search');
  if (searchInputWedding) searchInputWedding.addEventListener('input', loadWeddingPledges);

  async function loadWeddingPledges() {
    try {
      const allPledges = await window.PledgeDB.getAll();
      let weddings = (allPledges || []).filter(p => p && p.type === 'wedding');

      const searchTerm = (searchInputWedding ? searchInputWedding.value : '').toLowerCase().trim();
      if (searchTerm) {
        weddings = weddings.filter(p => {
          const groom = (p.groomName || '').toLowerCase();
          const bride = (p.brideName || '').toLowerCase();
          return groom.includes(searchTerm) || bride.includes(searchTerm);
        });
      }

      tbody.innerHTML = '';

      if (weddings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-muted text-center" style="padding: 2rem;">${searchTerm ? 'No matching wedding pledges found.' : 'No wedding pledges recorded yet.'}</td></tr>`;
        return;
      }

      weddings.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <strong style="font-size: 1.05rem; color: var(--text-primary);">💍 ${p.groomName || 'Groom'} & ${p.brideName || 'Bride'}</strong><br>
            <span class="text-muted" style="font-size: 0.9rem;">📅 ${window.formatDate(p.weddingDate)}</span>
          </td>
          <td><strong style="font-size: 1.05rem; color: var(--primary);">₱${(parseFloat(p.amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
          <td style="white-space: nowrap;">
            <button class="view-payments-btn btn-secondary" data-id="${p.id}" data-title="${p.groomName} & ${p.brideName}" style="padding: 6px 12px; font-size: 0.88rem;">👥 View Family Payments</button>
            ${!window.isViewOnly() ? `<button class="edit-wedding-btn btn-edit-text" data-id="${p.id}" style="margin-left:5px; font-size: 0.88rem;">✏ Edit</button><button class="delete-wedding-btn btn-danger-text" data-id="${p.id}" style="margin-left:5px; font-size: 0.88rem;">&times; Delete</button>` : '<span class="text-muted">View Only</span>'}
          </td>
        `;
        tbody.appendChild(tr);
      });

      // View payments handler
      container.querySelectorAll('.view-payments-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          window.openPaymentsModal(e.target.dataset.id, e.target.dataset.title);
        });
      });

      // Edit handler
      container.querySelectorAll('.edit-wedding-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const id = e.target.dataset.id;
          const p = await window.PledgeDB.get(id);
          if (p) {
            form.querySelector('#wedding-id').value = p.id;
            form.querySelector('#wedding-groomName').value = p.groomName || '';
            form.querySelector('#wedding-brideName').value = p.brideName || '';
            form.querySelector('#wedding-date').value = p.weddingDate || '';
            form.querySelector('#wedding-amount').value = p.amount || '';
            
            modalTitle.textContent = 'Edit Wedding Pledge';
            submitBtn.textContent = 'Save Changes';
            openModal(true);
          }
        });
      });

      // Delete handler
      container.querySelectorAll('.delete-wedding-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          if (!confirm('Delete this wedding pledge?')) return;
          const id = e.target.dataset.id;
          
          const all = await window.PledgeDB.getAll();
          const payments = (all || []).filter(p => p.type === 'event_payment' && p.eventId === id);
          for (const payment of payments) {
            await window.PledgeDB.delete(payment.id);
          }
          
          await window.PledgeDB.delete(id);
          window.showToast('Wedding pledge removed');
          loadWeddingPledges();
        });
      });
    } catch (err) {
      console.error("Error loading wedding pledges:", err);
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted text-center" style="padding: 2rem;">Error loading wedding pledges.</td></tr>';
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const data = new FormData(form);
      const id = data.get('id');
      const isEditing = !!id;
      
      let pledge;
      if (isEditing) {
        pledge = await window.PledgeDB.get(id);
        if (!pledge) return;
        pledge.groomName = data.get('groomName');
        pledge.brideName = data.get('brideName');
        pledge.weddingDate = data.get('weddingDate');
        pledge.amount = parseFloat(data.get('amount')) || 0;
        await window.PledgeDB.update(pledge);
        
        const all = await window.PledgeDB.getAll();
        const payments = (all || []).filter(p => p.type === 'event_payment' && p.eventId === id);
        for (const p of payments) {
          if (p.amount !== pledge.amount) {
            p.amount = pledge.amount;
            await window.PledgeDB.update(p);
          }
        }
        
        window.showToast('Wedding pledge updated', 'success');
      } else {
        const newId = window.uuid();
        pledge = {
          id: newId,
          type: 'wedding',
          groomName: data.get('groomName'),
          brideName: data.get('brideName'),
          weddingDate: data.get('weddingDate'),
          amount: parseFloat(data.get('amount')) || 0,
        };
        await window.PledgeDB.add(pledge);
        
        const families = [...new Set((members || []).map(m => m.family).filter(Boolean))];
        for (const f of families) {
          await window.PledgeDB.add({
            id: window.uuid(),
            type: 'event_payment',
            eventId: newId,
            family: f,
            amount: pledge.amount,
            status: 'Pending'
          });
        }
        
        window.showToast('Wedding pledge recorded', 'success');
      }
      
      closeModal();
      await loadWeddingPledges();
    } catch (err) {
      console.error("Error saving wedding pledge:", err);
      window.showToast('Failed to save wedding pledge: ' + (err.message || err), 'error');
    }
  });

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const allPledges = await window.PledgeDB.getAll();
      const weddings = (allPledges || []).filter(p => p && p.type === 'wedding');
      let csv = 'Groom,Bride,Wedding Date,Target Amount/Family\n';
      weddings.forEach(p => {
        const groom = (p.groomName || '').replace(/"/g, '""');
        const bride = (p.brideName || '').replace(/"/g, '""');
        csv += `"${groom}","${bride}","${p.weddingDate}",${p.amount}\n`;
      });
      downloadCSV(csv, 'wedding_pledges.csv');
    });
  }

  const printWedBtn = container.querySelector('#print-wedding');
  if (printWedBtn) {
    printWedBtn.addEventListener('click', () => {
      const printWindow = window.open('', '_blank');
      const tableHtml = container.querySelector('#wedding-table').outerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>Wedding Pledges Registry</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #333; }
              h1 { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #f8f9fa; font-weight: bold; }
              th:last-child, td:last-child { display: none; }
            </style>
          </head>
          <body>
            <h1>FAFB LP - Wedding Pledges Registry</h1>
            ${tableHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    });
  }

  await loadWeddingPledges();
}

// Utility: Download CSV helper
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
