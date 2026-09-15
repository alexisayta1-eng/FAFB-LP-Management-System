// organizations.js – handles organization CRUD UI and member organizationing with modal dialog
const organizationTemplate = () => `
  <div class="card" style="width: 100%;">
    <div class="card-header-flex" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 1.25rem;">
      <h2 style="margin: 0; border: none; padding: 0;">Active Organizations</h2>
      <div>
        ${!window.isViewOnly() ? `<button id="btn-open-org-modal" class="btn-primary">+ Create New Organization</button>` : ''}
      </div>
    </div>
    <div id="organizations-list" class="organizations-grid"></div>
  </div>

  <!-- Modal Form: Create / Edit Organization -->
  <div id="organization-modal" class="modal" style="display: none;">
    <div class="modal-card">
      <div class="modal-header-flex">
        <h2 id="org-modal-title" style="margin: 0; border: none; padding: 0;">Create New Cell Organization</h2>
        <button type="button" id="close-org-modal" class="modal-close-btn">&times;</button>
      </div>
      <form id="organization-form">
        <input type="hidden" name="id" id="organization-id" />
        <label>Organization Name
          <input type="text" name="name" id="organization-name" placeholder="e.g. Men's Fellowship, Cell Organization A, Youth Ministry" required />
        </label>
        <label>Organization Leader
          <select name="leaderId" id="organization-leaderId">
            <option value="">-- Select Leader --</option>
          </select>
        </label>
        <label>Description
          <textarea name="description" id="organization-description" rows="3" placeholder="Describe the purpose, meeting schedule, or mission of this organization..."></textarea>
        </label>
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 1.25rem;">
          <button type="button" class="btn-secondary" id="org-cancel-edit-btn">Cancel</button>
          <button type="submit" id="org-submit-btn" class="btn-primary">Create Organization</button>
        </div>
      </form>
    </div>
  </div>
`;

window.renderOrganizationsView = async function(container) {
  if (!container) return;
  container.innerHTML = organizationTemplate();

  const modal = container.querySelector('#organization-modal');
  const form = container.querySelector('#organization-form');
  const modalTitle = container.querySelector('#org-modal-title');
  const openModalBtn = container.querySelector('#btn-open-org-modal');
  const closeModalBtn = container.querySelector('#close-org-modal');
  const cancelBtn = container.querySelector('#org-cancel-edit-btn');
  const leaderSelect = form.querySelector('#organization-leaderId');
  const organizationsList = container.querySelector('#organizations-list');
  const submitBtn = container.querySelector('#org-submit-btn');

  function openModal(isEdit = false) {
    if (!isEdit) {
      form.reset();
      form.querySelector('#organization-id').value = '';
      modalTitle.textContent = 'Create New Cell Organization';
      submitBtn.textContent = 'Create Organization';
    }
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    form.reset();
    form.querySelector('#organization-id').value = '';
  }

  if (openModalBtn) openModalBtn.addEventListener('click', () => openModal(false));
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Populate leader select with members
  const members = await window.MemberDB.getAll();
  leaderSelect.innerHTML = '<option value="">-- Select Leader --</option>';
  (members || []).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    leaderSelect.appendChild(opt);
  });

  async function loadOrganizations() {
    const [organizations, allMembers] = await Promise.all([
      window.OrganizationDB.getAll(),
      window.MemberDB.getAll()
    ]);
    organizationsList.innerHTML = '';

    const orgList = Array.isArray(organizations) ? organizations : [];
    const memberList = Array.isArray(allMembers) ? allMembers : [];

    if (orgList.length === 0) {
      organizationsList.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 2rem;">No organizations created yet. Click "+ Create New Organization" to get started.</p>';
      return;
    }

    orgList.forEach(g => {
      const leader = memberList.find(m => m.id === g.leaderId);
      const organizationMembers = memberList.filter(m => m.organizationId === g.id);

      const div = document.createElement('div');
      div.className = 'organization-card';
      div.style.cursor = 'pointer';
      div.title = !window.isViewOnly() ? 'Click to edit organization' : 'Click to view members';
      div.addEventListener('click', async (e) => {
        if (!e.target.matches('.delete-organization') && !e.target.matches('.edit-organization')) {
          if (!window.isViewOnly()) {
            form.querySelector('#organization-id').value = g.id;
            form.querySelector('#organization-name').value = g.name || '';
            form.querySelector('#organization-leaderId').value = g.leaderId || '';
            form.querySelector('#organization-description').value = g.description || '';
            
            modalTitle.textContent = 'Edit Organization';
            submitBtn.textContent = 'Save Changes';
            openModal(true);
          } else {
            window.navigateToView('members', null, g.id);
          }
        }
      });
      div.innerHTML = `
        <div class="organization-header">
          <h3>${g.name}</h3>
          <div>
            ${!window.isViewOnly() ? `<button class="edit-organization btn-edit-text" data-id="${g.id}">✏ Edit</button><button class="delete-organization btn-danger-text" data-id="${g.id}" style="margin-left:5px;">&times; Delete</button>` : ''}
          </div>
        </div>
        <p class="organization-leader"><strong>Leader:</strong> ${leader ? leader.name : '<span class="text-muted">Unassigned</span>'}</p>
        <p class="organization-desc">${g.description || '<span class="text-muted">No description provided.</span>'}</p>
        <div class="organization-members-list">
          <h4>Members (${organizationMembers.length}):</h4>
          <ul>
            ${organizationMembers.map(m => `<li>${m.name}</li>`).join('') || '<li class="text-muted">No members assigned yet.</li>'}
          </ul>
        </div>
      `;
      organizationsList.appendChild(div);
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const data = new FormData(form);
      const id = data.get('id');
      const isEditing = !!id;
      
      let organization;
      if (isEditing) {
        organization = await window.OrganizationDB.get(id);
        if (!organization) return;
        organization.name = data.get('name');
        organization.leaderId = data.get('leaderId') || null;
        organization.description = data.get('description');
        await window.OrganizationDB.update(organization);
        window.showToast('Organization updated successfully!', 'success');
      } else {
        organization = {
          id: window.uuid(),
          name: data.get('name'),
          leaderId: data.get('leaderId') || null,
          description: data.get('description'),
        };
        await window.OrganizationDB.add(organization);
        window.showToast('Organization created successfully!', 'success');
      }
      
      closeModal();
      await loadOrganizations();
    } catch (err) {
      console.error("Error saving organization:", err);
      window.showToast('Failed to save organization: ' + (err.message || err), 'error');
    }
  });

  organizationsList.addEventListener('click', async e => {
    if (e.target.matches('.edit-organization')) {
      e.stopPropagation();
      const id = e.target.dataset.id;
      const org = await window.OrganizationDB.get(id);
      if (org) {
        form.querySelector('#organization-id').value = org.id;
        form.querySelector('#organization-name').value = org.name || '';
        form.querySelector('#organization-leaderId').value = org.leaderId || '';
        form.querySelector('#organization-description').value = org.description || '';
        
        modalTitle.textContent = 'Edit Organization';
        submitBtn.textContent = 'Save Changes';
        openModal(true);
      }
    }
    if (e.target.matches('.delete-organization')) {
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this organization? This will unassign its members.')) return;
      const id = e.target.dataset.id;
      
      // Update all members in this organization to have no organization
      const allMembers = await window.MemberDB.getAll();
      for (const member of allMembers) {
        if (member.organizationId === id) {
          member.organizationId = null;
          member.organizationName = '';
          await window.MemberDB.update(member);
        }
      }
      
      await window.OrganizationDB.delete(id);
      window.showToast('Organization deleted and members unassigned.');
      await loadOrganizations();
    }
  });

  await loadOrganizations();
};
