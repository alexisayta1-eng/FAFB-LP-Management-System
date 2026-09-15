// dashboard.js – Dashboard view with metrics and summary lists
const dashboardTemplate = () => `
  <div class="dashboard-header-block">
    <h2>FAFB LP Assembly Overview</h2>
    <p class="subtitle">Real-time indicators of members, activities, and support pledges.</p>
  </div>

  <div class="dashboard-grid">
    <!-- Stat Cards -->
    <div class="stat-card card hover-scale" data-view="members">
      <div class="stat-info">
        <span class="stat-label">Total Members</span>
        <span class="stat-val" id="stat-members-count">0</span>
      </div>
    </div>

    <div class="stat-card card hover-scale" data-view="organizations">
      <div class="stat-info">
        <span class="stat-label">Cell Organizations</span>
        <span class="stat-val" id="stat-organizations-count">0</span>
      </div>
    </div>

    <div class="stat-card card hover-scale" data-view="ministries">
      <div class="stat-info">
        <span class="stat-label">Ministries Scheduled</span>
        <span class="stat-val" id="stat-ministries-count">0</span>
      </div>
    </div>

    <div class="stat-card card hover-scale" data-view="pledges" data-tab="hospitalization">
      <div class="stat-info">
        <span class="stat-label">Admitted Patients</span>
        <span class="stat-val" id="stat-hospitalized-count">0</span>
      </div>
    </div>
  </div>

  <div class="dashboard-sections-grid">
    <!-- Pledge Performance Card -->
    <div class="card summary-card">
      <h3>Financial Pledges Overview</h3>
      <div class="pledge-summary-list">
        <div class="summary-item">
          <div class="summary-item-header">
            <span>Thanksgiving Pledges</span>
            <strong id="summary-tg-total">₱0.00</strong>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" id="progress-tg" style="width: 0%"></div>
          </div>
          <div class="summary-item-footer">
            <span id="summary-tg-collected">Collected: ₱0.00</span>
            <span id="summary-tg-pct">0%</span>
          </div>
        </div>

        <div class="summary-item">
          <div class="summary-item-header">
            <span>Wedding Pledges</span>
            <strong id="summary-wd-total">₱0.00</strong>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" id="progress-wd" style="width: 0%; background: var(--success);"></div>
          </div>
          <div class="summary-item-footer">
            <span id="summary-wd-collected">Collected: ₱0.00</span>
            <span id="summary-wd-pct" style="color: var(--success); font-weight: bold;">0%</span>
          </div>
        </div>

        <div class="summary-item">
          <div class="summary-item-header">
            <span>Hospital Assistance Pledged</span>
            <strong id="summary-hosp-total">₱0.00</strong>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" id="progress-hosp" style="width: 0%; background: var(--danger);"></div>
          </div>
          <div class="summary-item-footer">
            <span id="summary-hosp-disbursed">Disbursed: ₱0.00</span>
            <span id="summary-hosp-pct" style="color: var(--danger); font-weight: bold;">0%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Upcoming Events & Recent Entries -->
    <div class="card summary-card">
      <h3>Activities & Hospitalized Alerts <small id="live-clock" style="float: right; font-weight: normal; font-size: 0.8em; color: #666;"></small></h3>
      <div class="recent-alerts-list" id="recent-alerts">
        <p class="text-muted">Loading alerts...</p>
      </div>
    </div>
  </div>
`;

window.renderDashboardView = async function(container, navigateToView) {
  if (!container) return;

  // Pre-fetch all stats in parallel safely
  const [members, organizations, ministries, pledges] = await Promise.all([
    window.MemberDB.getAll().catch(() => []),
    window.OrganizationDB.getAll().catch(() => []),
    window.MinistryDB.getAll().catch(() => []),
    window.PledgeDB.getAll().catch(() => []),
  ]);

  // If container changed while fetching, avoid rendering
  if (!container || !document.body.contains(container)) return;

  container.innerHTML = dashboardTemplate();

  // Helper safe DOM mutators
  const setText = (selector, val) => {
    const el = container.querySelector(selector);
    if (el) el.textContent = val;
  };
  const setStyle = (selector, prop, val) => {
    const el = container.querySelector(selector);
    if (el) el.style[prop] = val;
  };

  // Helper for date comparison
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Setup Live Clock
  const clockEl = container.querySelector('#live-clock');
  function updateClock() {
    if (!clockEl || !document.body.contains(clockEl)) return;
    const current = new Date();
    clockEl.textContent = current.toLocaleString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric', 
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true 
    });
  }
  updateClock();
  const clockInterval = setInterval(updateClock, 1000);
  
  // Clean up interval when navigating away
  const observer = new MutationObserver(() => {
    if (!document.body.contains(clockEl)) {
      clearInterval(clockInterval);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Safe count updates
  const memberList = Array.isArray(members) ? members : [];
  const orgList = Array.isArray(organizations) ? organizations : [];
  const minList = Array.isArray(ministries) ? ministries : [];
  const pledgeList = Array.isArray(pledges) ? pledges : [];

  setText('#stat-members-count', memberList.length);
  setText('#stat-organizations-count', orgList.length);
  setText('#stat-ministries-count', minList.filter(m => m && m.datetime && !isNaN(new Date(m.datetime)) && new Date(m.datetime) >= startOfToday).length);

  const hospitalizedAdmitted = pledgeList.filter(p => p && p.type === 'hospitalization' && p.status && p.status.trim().toLowerCase() === 'admitted');
  setText('#stat-hospitalized-count', hospitalizedAdmitted.length);

  // Thanksgiving Calculations
  const tgPledges = pledgeList.filter(p => p && p.type === 'thanksgiving');
  const tgTotal = tgPledges.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const tgPaid = tgPledges.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || (curr.status === 'Paid' ? (parseFloat(curr.amount) || 0) : 0) || 0), 0);
  const tgPct = tgTotal > 0 ? Math.round((tgPaid / tgTotal) * 100) : 0;

  setText('#summary-tg-total', `₱${tgTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  setText('#summary-tg-collected', `Collected: ₱${tgPaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  setText('#summary-tg-pct', `${tgPct}%`);
  setStyle('#progress-tg', 'width', `${tgPct}%`);

  // Wedding Calculations
  const wdEvents = pledgeList.filter(p => p && p.type === 'wedding');
  const wdEventIds = new Set(wdEvents.map(w => w.id));
  const wdPayments = pledgeList.filter(p => p && p.type === 'event_payment' && wdEventIds.has(p.eventId));
  
  const wdTotal = wdPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const wdPaid = wdPayments.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const wdPct = wdTotal > 0 ? Math.round((wdPaid / wdTotal) * 100) : 0;

  setText('#summary-wd-total', `₱${wdTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  setText('#summary-wd-collected', `Collected: ₱${wdPaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  setText('#summary-wd-pct', `${wdPct}%`);
  setStyle('#progress-wd', 'width', `${wdPct}%`);

  // Hospital Assistance Calculations
  const hospEvents = pledgeList.filter(p => p && p.type === 'hospitalization');
  const hospEventIds = new Set(hospEvents.map(h => h.id));
  const hospPayments = pledgeList.filter(p => p && p.type === 'event_payment' && hospEventIds.has(p.eventId));

  const hospTotal = hospPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const hospCollected = hospPayments.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const hospPct = hospTotal > 0 ? Math.round((hospCollected / hospTotal) * 100) : 0;

  setText('#summary-hosp-total', `₱${hospTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  setText('#summary-hosp-disbursed', `Collected: ₱${hospCollected.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  setText('#summary-hosp-pct', `${hospPct}%`);
  setStyle('#progress-hosp', 'width', `${hospPct}%`);

  // Dynamic Alerts & List
  const alertsDiv = container.querySelector('#recent-alerts');
  if (alertsDiv) {
    alertsDiv.innerHTML = '';
    const alerts = [];

    // Admitted patients
    hospitalizedAdmitted.forEach(p => {
      const member = memberList.find(m => m.id === p.memberId);
      alerts.push({
        type: 'hospital',
        title: `${member ? member.name : 'A member'} is currently Admitted`,
        subtitle: `At ${p.hospitalName || 'Hospital'}.`,
        date: p.admissionDate || '',
      });
    });

    // Upcoming weddings
    const upcomingWeddings = pledgeList.filter(p => p && p.type === 'wedding' && p.weddingDate && !isNaN(new Date(p.weddingDate)) && new Date(p.weddingDate) >= startOfToday);
    upcomingWeddings.forEach(p => {
      alerts.push({
        type: 'wedding',
        title: `Wedding: ${p.groomName || 'Groom'} & ${p.brideName || 'Bride'}`,
        subtitle: `Date: ${window.formatDate(p.weddingDate)}. Pledge support: ₱${(parseFloat(p.amount) || 0).toLocaleString('en-PH')}`,
        date: p.weddingDate,
      });
    });

    // Upcoming and Ongoing ministry activities
    const upcomingMin = minList.filter(m => m && m.datetime && !isNaN(new Date(m.datetime)) && new Date(m.datetime) >= startOfToday);
    upcomingMin.forEach(m => {
      const minTime = new Date(m.datetime);
      const isOngoing = minTime <= now;
      const statusText = isOngoing ? 'Ongoing' : 'Upcoming';

      alerts.push({
        type: 'ministry',
        title: `${statusText} Ministry: ${m.name}`,
        subtitle: `${window.formatDate(m.datetime)} - ${m.description || 'No description'}`,
        date: m.datetime,
      });
    });

    // Sort by date ascending safely
    alerts.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

    if (alerts.length === 0) {
      alertsDiv.innerHTML = '<p class="text-muted">No urgent alerts or upcoming activities found.</p>';
    } else {
      alerts.slice(0, 5).forEach(alert => {
        const item = document.createElement('div');
        item.className = `alert-item border-left-${alert.type}`;
        item.innerHTML = `
          <strong>${alert.title}</strong>
          <p>${alert.subtitle}</p>
        `;
        alertsDiv.appendChild(item);
      });
    }
  }

  // Bind navigational click to stat cards
  container.querySelectorAll('.stat-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const targetView = card.dataset.view;
      const targetTab = card.dataset.tab;
      if (navigateToView) navigateToView(targetView, targetTab);
    });
  });
};
