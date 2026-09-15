// ministries.js – handles ministry activity CRUD UI with modal dialog
const ministryTemplate = () => `
  <div class="card" style="width: 100%;">
    <div class="card-header-flex" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 1.25rem;">
      <h2 style="margin: 0; border: none; padding: 0;">Scheduled Ministries</h2>
      <div>
        ${!window.isViewOnly() ? `<button id="btn-open-ministry-modal" class="btn-primary">+ Create New Ministry Activity</button>` : ''}
      </div>
    </div>
    <div class="member-filter-bar" style="grid-template-columns: 1fr;">
      <div class="filter-organization">
        <label class="filter-label">
          <span class="filter-icon">📅</span> Filter by Month
        </label>
        <select id="filter-month" class="filter-select">
          <option value="">All Months</option>
        </select>
      </div>
    </div>
    <div class="table-responsive">
      <table id="ministry-table" class="data-table">
        <thead>
          <tr>
            <th>Activity Name</th>
            <th>Date & Time</th>
            <th>Description</th>
            <th>Participating Organizations</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </div>

  <!-- Modal Form: Create / Edit Ministry Activity -->
  <div id="ministry-modal" class="modal" style="display: none;">
    <div class="modal-card">
      <div class="modal-header-flex">
        <h2 id="ministry-modal-title" style="margin: 0; border: none; padding: 0;">Create New Ministry Activity</h2>
        <button type="button" id="close-ministry-modal" class="modal-close-btn">&times;</button>
      </div>
      <form id="ministry-form">
        <input type="hidden" name="id" id="ministry-id" />
        <label>Activity Name
          <input type="text" name="name" id="ministry-name" placeholder="e.g. Youth Camp, Sunday Worship Service" required />
        </label>
        <label>Date & Time
          <input type="datetime-local" name="datetime" id="ministry-datetime" required />
        </label>
        <label>Description
          <textarea name="description" id="ministry-description" rows="3" placeholder="Activity details, objectives, and planning notes..."></textarea>
        </label>
        <label>Participating Organizations (Hold Ctrl/Cmd to select multiple)
          <select name="participants" id="ministry-participants" multiple size="5" style="min-height: 120px;"></select>
        </label>
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 1.25rem;">
          <button type="button" class="btn-secondary" id="ministry-cancel-edit-btn">Cancel</button>
          <button type="submit" id="ministry-submit-btn" class="btn-primary">Add Activity</button>
        </div>
      </form>
    </div>
  </div>
`;

window.renderMinistriesView = async function(container) {
  if (!container) return;
  container.innerHTML = ministryTemplate();

  const modal = container.querySelector('#ministry-modal');
  const form = container.querySelector('#ministry-form');
  const modalTitle = container.querySelector('#ministry-modal-title');
  const openModalBtn = container.querySelector('#btn-open-ministry-modal');
  const closeModalBtn = container.querySelector('#close-ministry-modal');
  const cancelBtn = container.querySelector('#ministry-cancel-edit-btn');
  const submitBtn = container.querySelector('#ministry-submit-btn');
  const participantsSelect = form.querySelector('#ministry-participants');
  const tableBody = container.querySelector('#ministry-table tbody');
  const filterMonth = container.querySelector('#filter-month');

  function openModal(isEdit = false) {
    if (!isEdit) {
      form.reset();
      form.querySelector('#ministry-id').value = '';
      modalTitle.textContent = 'Create New Ministry Activity';
      submitBtn.textContent = 'Add Activity';
    }
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    form.reset();
    form.querySelector('#ministry-id').value = '';
  }

  if (openModalBtn) openModalBtn.addEventListener('click', () => openModal(false));
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Populate participants list with all organizations
  const organizations = await window.OrganizationDB.getAll();
  participantsSelect.innerHTML = '';
  (organizations || []).forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.name;
    participantsSelect.appendChild(opt);
  });

  async function loadMinistries() {
    let ministries = await window.MinistryDB.getAll();
    if (!Array.isArray(ministries)) ministries = [];

    const currentFilter = filterMonth.value;
    filterMonth.innerHTML = '<option value="">All Months</option>';
    
    // Create an array of formatted "YYYY-MM" strings
    const months = [...new Set(ministries.map(m => {
      const d = new Date(m.datetime);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }).filter(Boolean))].sort((a, b) => b.localeCompare(a));

    months.forEach(ym => {
      const [y, m] = ym.split('-');
      const dateObj = new Date(y, m - 1);
      const displayStr = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const opt = document.createElement('option');
      opt.value = ym;
      opt.textContent = displayStr;
      filterMonth.appendChild(opt);
    });
    filterMonth.value = currentFilter;

    const selectedMonth = filterMonth.value;
    if (selectedMonth) {
      ministries = ministries.filter(m => {
        const d = new Date(m.datetime);
        if (isNaN(d.getTime())) return false;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
      });
    }

    tableBody.innerHTML = '';

    if (ministries.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align: center; padding: 2rem;">No ministry activities scheduled.</td></tr>';
      return;
    }

    ministries.forEach(min => {
      const participantNames = (min.participantIds || []).map(id => {
        const org = (organizations || []).find(o => o.id === id);
        return org ? org.name : 'Unknown Org';
      }).join(', ');
      
      const dateDisplay = min.datetime && !isNaN(new Date(min.datetime)) 
        ? new Date(min.datetime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) 
        : '-';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${min.name}</strong></td>
        <td>${dateDisplay}</td>
        <td>${min.description || '-'}</td>
        <td>${participantNames || '<span class="text-muted">None specified</span>'}</td>
        <td style="white-space: nowrap;">
          ${!window.isViewOnly() ? `<button class="edit-ministry btn-edit-text" data-id="${min.id}">✏ Edit</button><button class="delete-ministry btn-danger-text" data-id="${min.id}" style="margin-left:5px;">&times; Remove</button>` : '<span class="text-muted">View Only</span>'}
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const data = new FormData(form);
      const selected = Array.from(participantsSelect.selectedOptions).map(o => o.value);
      const id = data.get('id');
      const isEditing = !!id;
      
      let ministry;
      if (isEditing) {
        ministry = await window.MinistryDB.get(id);
        if (!ministry) return;
        ministry.name = data.get('name');
        ministry.datetime = data.get('datetime');
        ministry.description = data.get('description');
        ministry.participantIds = selected;
        await window.MinistryDB.update(ministry);
        window.showToast('Ministry activity updated', 'success');
      } else {
        ministry = {
          id: window.uuid(),
          name: data.get('name'),
          datetime: data.get('datetime'),
          description: data.get('description'),
          participantIds: selected,
        };
        await window.MinistryDB.add(ministry);
        window.showToast('Ministry activity added', 'success');
      }
      
      closeModal();
      await loadMinistries();
    } catch (err) {
      console.error("Error saving ministry:", err);
      window.showToast('Failed to save ministry: ' + (err.message || err), 'error');
    }
  });

  filterMonth.addEventListener('change', loadMinistries);

  tableBody.addEventListener('click', async e => {
    if (e.target.matches('.edit-ministry')) {
      const id = e.target.dataset.id;
      const min = await window.MinistryDB.get(id);
      if (min) {
        form.querySelector('#ministry-id').value = min.id;
        form.querySelector('#ministry-name').value = min.name || '';
        form.querySelector('#ministry-datetime').value = min.datetime || '';
        form.querySelector('#ministry-description').value = min.description || '';
        
        Array.from(participantsSelect.options).forEach(opt => {
          opt.selected = (min.participantIds || []).includes(opt.value);
        });
        
        modalTitle.textContent = 'Edit Ministry Activity';
        submitBtn.textContent = 'Save Changes';
        openModal(true);
      }
    }
    if (e.target.matches('.delete-ministry')) {
      if (!confirm('Are you sure you want to cancel this ministry activity?')) return;
      const id = e.target.dataset.id;
      await window.MinistryDB.delete(id);
      window.showToast('Activity removed');
      loadMinistries();
    }
  });

  await loadMinistries();
};
