// members.js – handles member CRUD UI and interactions with modal dialog
const memberTemplate = () => `
  <div class="card" style="width: 100%;">
    <div class="card-header-flex" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 1.25rem;">
      <h2 style="margin: 0; border: none; padding: 0;">Members Directory</h2>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        ${!window.isViewOnly() ? `<button id="btn-open-register-modal" class="btn-primary">+ Register New Member</button>` : ''}
        <button id="print-members-btn" class="btn-secondary">🖨️ Print List</button>
      </div>
    </div>
    
    <div class="member-filter-bar">
      <div class="filter-organization">
        <label class="filter-label">
          <span class="filter-icon">👨‍👩‍👧‍👦</span> Filter by Family
        </label>
        <select id="filter-family" class="filter-select">
          <option value="">All Families</option>
        </select>
      </div>
      <div class="filter-organization">
        <label class="filter-label">
          <span class="filter-icon">📍</span> Filter by Address
        </label>
        <select id="filter-address" class="filter-select">
          <option value="">All Addresses</option>
        </select>
      </div>
      <div class="filter-organization">
        <label class="filter-label">
          <span class="filter-icon">🏛️</span> Filter by Org
        </label>
        <select id="filter-org" class="filter-select">
          <option value="">All Organizations</option>
        </select>
      </div>
      <div class="filter-organization">
        <label class="filter-label">
          <span class="filter-icon">🔍</span> Search by Name
        </label>
        <input type="text" id="filter-name" class="filter-input" placeholder="Type a name…" />
      </div>
      <div class="filter-results" id="filter-results-count"></div>
    </div>

    <div class="table-responsive">
      <table id="member-table" class="data-table">
        <thead>
          <tr>
            <th>Member Details</th>
            <th>Family</th>
            <th>Birthdate</th>
            <th>Contact</th>
            <th>Organization</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </div>

  <!-- Modal Form: Register / Edit Member -->
  <div id="member-register-modal" class="modal" style="display: none;">
    <div class="modal-card">
      <div class="modal-header-flex">
        <h2 id="form-title" style="margin: 0; border: none; padding: 0;">Register New Member</h2>
        <button type="button" id="close-register-modal" class="modal-close-btn">&times;</button>
      </div>
      <form id="member-form">
        <input type="hidden" name="id" id="member-id" />
        <label>Full Name
          <input type="text" name="name" id="member-name" placeholder="Enter full name" required />
        </label>
        <label>Profile Image
          <div style="display: flex; align-items: center; gap: 12px; margin-top: 5px;">
            <img id="profile-preview" src="" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; display: none; border: 2px solid var(--primary, #31a38c);" />
            <input type="file" name="profileImage" id="member-profile-image" accept="image/*" />
          </div>
        </label>
        <label>Family Name
          <div class="family-input-wrapper">
            <input type="text" name="family" id="member-family" list="family-suggestions" placeholder="e.g. Dela Cruz Family" required />
            <datalist id="family-suggestions"></datalist>
          </div>
        </label>
        <label>Birthdate
          <input type="date" name="birthdate" id="member-birthdate" required />
        </label>
        <label>Contact Number (11 Digits)
          <input type="text" name="contact" id="member-contact" placeholder="09xxxxxxxxx (Optional)" />
        </label>
        <label>Complete Address
          <div class="address-input-wrapper">
            <input type="text" name="address" id="member-address" list="address-suggestions" placeholder="Enter residential address" required />
            <datalist id="address-suggestions"></datalist>
          </div>
        </label>
        <label>Organization Assignment
          <select name="organizationId" id="member-organization">
            <option value="">-- No Organization --</option>
          </select>
        </label>
        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 1.25rem;">
          <button type="button" class="btn-secondary" id="cancel-edit-btn">Cancel</button>
          <button type="submit" id="submit-btn" class="btn-primary">Add Member</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Member ID Modal -->
  <div id="member-id-modal" class="modal" style="display:none;">
    <div id="id-card" style="background:#fff; margin: auto; width: 550px; max-width:95%; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.2); overflow:hidden; position:relative; font-family:sans-serif;">
      <!-- Watermark Background -->
      <div style="position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; z-index: 0; pointer-events: none;">
        <img src="logo.png" onerror="this.onerror=null;this.src='assets/logo.png';" style="width: 250px; height: auto;" />
      </div>

      <!-- Top Color Banner -->
      <div style="background: linear-gradient(135deg, var(--primary, #31a38c), var(--accent, #73cda3)); height: 60px; width: 100%; display:flex; align-items:center; justify-content:space-between; padding: 0 20px; position: relative; z-index: 1;">
        <h3 style="color:#fff; margin:0; font-size:1.2rem;">FAFB LP Member</h3>
        <button id="close-id-modal" style="background:rgba(255,255,255,0.2); border:none; color:#fff; font-size:1.5rem; cursor:pointer; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;">&times;</button>
      </div>

      <!-- Card Body -->
      <div style="display:flex; padding: 25px; gap: 20px; align-items: flex-start; position: relative; z-index: 1;">
        <div style="flex-shrink:0; text-align:center;">
          <img id="id-photo" src="" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #f0f0f0; box-shadow: 0 4px 10px rgba(0,0,0,0.1); background:#eee;" />
          <div style="margin-top:10px; font-weight:bold; color:var(--primary, #31a38c); font-size:0.9rem;">MEMBER</div>
        </div>

        <div style="flex-grow:1; display:flex; flex-direction:column; gap:8px;">
          <h2 id="id-name" style="margin:0; font-size:1.6rem; color:#333; border-bottom:2px solid #f0f0f0; padding-bottom:5px;">Name Here</h2>
          
          <div style="display:grid; grid-template-columns: 100px 1fr; align-items:start; gap:8px; font-size:0.95rem; margin-top:10px;">
            <span style="color:#777; font-weight:bold;">Family:</span>
            <span id="id-family" style="color:#333;">-</span>

            <span style="color:#777; font-weight:bold;">Birthdate:</span>
            <span id="id-birthdate" style="color:#333;">-</span>

            <span style="color:#777; font-weight:bold;">Contact:</span>
            <span id="id-contact" style="color:#333;">-</span>

            <span style="color:#777; font-weight:bold;">Address:</span>
            <span id="id-address" style="color:#333;">-</span>

            <span style="color:#777; font-weight:bold;">Organization:</span>
            <span id="id-org" style="color:#333;">-</span>
          </div>
        </div>
      </div>
      
      <!-- Footer Print Button -->
      <div style="background:#f9f9f9; padding:10px 20px; text-align:right; border-top:1px solid #eee; position: relative; z-index: 1;">
        <button id="print-id-btn" class="btn-secondary" style="font-size:0.9rem;">🖨️ Print ID</button>
      </div>
    </div>
  </div>
`;

window.renderMembersView = async function(container, orgFilterId = null) {
  if (!container) return;
  container.innerHTML = memberTemplate();

  const modal = container.querySelector('#member-register-modal');
  const form = container.querySelector('#member-form');
  const openModalBtn = container.querySelector('#btn-open-register-modal');
  const closeModalBtn = container.querySelector('#close-register-modal');
  const cancelEditBtn = container.querySelector('#cancel-edit-btn');
  const formTitle = container.querySelector('#form-title');
  const submitBtn = container.querySelector('#submit-btn');

  const organizationSelect = form.querySelector('#member-organization');
  const tableBody = container.querySelector('#member-table tbody');
  const filterFamily = container.querySelector('#filter-family');
  const filterAddress = container.querySelector('#filter-address');
  const filterOrg = container.querySelector('#filter-org');
  const filterName = container.querySelector('#filter-name');
  const filterResultsCount = container.querySelector('#filter-results-count');
  const familySuggestions = container.querySelector('#family-suggestions');
  const addressSuggestions = container.querySelector('#address-suggestions');
  
  const profileInput = form.querySelector('#member-profile-image');
  const profilePreview = form.querySelector('#profile-preview');
  let currentProcessedImageBase64 = null;

  // Process, convert (including iPhone HEIC/HEIF), and compress image to universal JPEG
  async function processProfileImage(file) {
    if (!file) return null;
    
    let blobToProcess = file;
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                   (file.name && (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')));
    
    if (isHeic && typeof window.heic2any === 'function') {
      try {
        const converted = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
        blobToProcess = Array.isArray(converted) ? converted[0] : converted;
      } catch (err) {
        console.warn('heic2any conversion notice:', err);
      }
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 320;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => {
          resolve(e.target.result);
        };
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blobToProcess);
    });
  }

  function openModal(isEdit = false) {
    if (!isEdit) {
      form.reset();
      form.querySelector('#member-id').value = '';
      currentProcessedImageBase64 = null;
      profileInput.value = '';
      profilePreview.src = '';
      profilePreview.style.display = 'none';
      formTitle.textContent = 'Register New Member';
      submitBtn.textContent = 'Add Member';
    }
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    form.reset();
    form.querySelector('#member-id').value = '';
    currentProcessedImageBase64 = null;
    profilePreview.src = '';
    profilePreview.style.display = 'none';
  }

  if (openModalBtn) openModalBtn.addEventListener('click', () => openModal(false));
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  profileInput.addEventListener('change', async () => {
    if (profileInput.files && profileInput.files[0]) {
      profilePreview.style.display = 'block';
      profilePreview.style.opacity = '0.5';
      const file = profileInput.files[0];
      try {
        currentProcessedImageBase64 = await processProfileImage(file);
        if (currentProcessedImageBase64) {
          profilePreview.src = currentProcessedImageBase64;
          profilePreview.style.opacity = '1';
        }
      } catch (err) {
        console.error('Error processing profile image:', err);
      }
    } else {
      currentProcessedImageBase64 = null;
      profilePreview.src = '';
      profilePreview.style.display = 'none';
    }
  });

  // Populate organization dropdowns
  const organizations = await window.OrganizationDB.getAll();
  organizationSelect.innerHTML = '<option value="">-- No Organization --</option>';
  filterOrg.innerHTML = '<option value="">All Organizations</option>';
  (organizations || []).forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    organizationSelect.appendChild(opt);
    filterOrg.appendChild(opt.cloneNode(true));
  });

  if (orgFilterId) {
    filterOrg.value = orgFilterId;
  }

  // Build unique family names and addresses for datalist suggestions + filter
  async function refreshFilterOptions() {
    const allMembers = await window.MemberDB.getAll();
    const membersList = Array.isArray(allMembers) ? allMembers : [];
    
    // Families
    const families = [...new Set(membersList.map(m => m.family).filter(Boolean))].sort();

    familySuggestions.innerHTML = '';
    families.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      familySuggestions.appendChild(opt);
    });

    const currentFilter = filterFamily.value;
    filterFamily.innerHTML = '<option value="">All Families</option>';
    families.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      filterFamily.appendChild(opt);
    });

    const noFamOpt = document.createElement('option');
    noFamOpt.value = '__none__';
    noFamOpt.textContent = '— No Family Assigned —';
    filterFamily.appendChild(noFamOpt);
    filterFamily.value = currentFilter;

    // Addresses
    const addresses = [...new Set(membersList.map(m => m.address).filter(Boolean))].sort();
    addressSuggestions.innerHTML = '';
    addresses.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      addressSuggestions.appendChild(opt);
    });

    const currentAddr = filterAddress.value;
    filterAddress.innerHTML = '<option value="">All Addresses</option>';
    addresses.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      filterAddress.appendChild(opt);
    });
    filterAddress.value = currentAddr;
  }

  await refreshFilterOptions();

  async function loadMembers() {
    const allMembersList = await window.MemberDB.getAll();
    const totalMembers = Array.isArray(allMembersList) ? allMembersList.length : 0;
    let members = Array.isArray(allMembersList) ? [...allMembersList] : [];

    const familyFilter = filterFamily.value;
    if (familyFilter === '__none__') {
      members = members.filter(m => !m.family);
    } else if (familyFilter) {
      members = members.filter(m => m.family === familyFilter);
    }

    const addressFilter = filterAddress.value;
    if (addressFilter) {
      members = members.filter(m => m.address === addressFilter);
    }

    const orgFilter = filterOrg.value;
    if (orgFilter) {
      members = members.filter(m => m.organizationId === orgFilter);
    }

    const nameFilter = filterName.value.trim().toLowerCase();
    if (nameFilter) {
      members = members.filter(m => (m.name || '').toLowerCase().includes(nameFilter));
    }

    members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    if (familyFilter || addressFilter || orgFilter || nameFilter) {
      filterResultsCount.textContent = `Showing ${members.length} of ${totalMembers} members`;
      filterResultsCount.style.display = 'block';
    } else {
      filterResultsCount.textContent = '';
      filterResultsCount.style.display = 'none';
    }

    tableBody.innerHTML = '';

    if (members.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" class="text-muted text-center" style="padding: 2rem;">No members found.</td>`;
      tableBody.appendChild(tr);
      return;
    }

    members.forEach(m => {
      const org = (organizations || []).find(o => o.id === m.organizationId);
      const orgName = org ? org.name : (m.organizationName || '-');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            ${m.profileImage ? `<img src="${m.profileImage}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--primary, #31a38c);" /><div style="width: 40px; height: 40px; border-radius: 50%; background: #eee; display: none; align-items: center; justify-content: center; font-size: 1.2rem; color: #999;">👤</div>` : `<div style="width: 40px; height: 40px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #999;">👤</div>`}
            <strong>${m.name}</strong>
          </div>
        </td>
        <td>${m.family ? `<span class="family-badge">${m.family}</span>` : '<span class="text-muted">—</span>'}</td>
        <td>${window.formatDate(m.birthdate)}</td>
        <td>${m.contact || '-'}</td>
        <td>${orgName}</td>
        <td class="actions-cell" style="white-space: nowrap;">
          <button class="view-member btn-secondary" data-id="${m.id}" style="padding: 4px 8px; font-size: 0.85em; margin-right: 5px;">👀 View ID</button>
          ${!window.isViewOnly() ? `<button class="edit-member btn-edit-text" data-id="${m.id}">✏ Edit</button><button class="delete-member btn-danger-text" data-id="${m.id}" style="margin-left: 5px;">&times; Remove</button>` : ''}
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  filterFamily.addEventListener('change', loadMembers);
  filterAddress.addEventListener('change', loadMembers);
  filterOrg.addEventListener('change', loadMembers);
  filterName.addEventListener('input', loadMembers);

  const printMembersBtn = container.querySelector('#print-members-btn');
  if (printMembersBtn) {
    printMembersBtn.addEventListener('click', () => {
      const printWindow = window.open('', '_blank');
      const tableHtml = container.querySelector('#member-table').outerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>Members Directory</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #333; }
              h1 { text-align: center; margin-bottom: 5px; }
              .filter-info { text-align: center; color: #666; margin-bottom: 20px; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #f8f9fa; font-weight: bold; }
              th:last-child, td:last-child { display: none; }
              .family-badge { background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
            </style>
          </head>
          <body>
            <h1>FAFB LP - Members Directory</h1>
            <div class="filter-info">${filterResultsCount.textContent}</div>
            ${tableHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const data = new FormData(form);
      
      const contactInput = (data.get('contact') || '').trim();
      if (contactInput !== '') {
        if (!/^\d+$/.test(contactInput)) {
          if (window.showToast) window.showToast('Contact number must contain only digits.', 'error');
          return;
        }
        if (contactInput.length < 11) {
          if (window.showToast) window.showToast('Contact number must be exactly 11 digits.', 'error');
          return;
        }
        if (contactInput.length > 11) {
          if (window.showToast) window.showToast('Contact number cannot exceed 11 digits.', 'error');
          return;
        }
      }

      const id = data.get('id');
      const isEditing = !!id;
      
      let profileImageBase64 = null;
      if (profileInput.files && profileInput.files[0]) {
        const file = profileInput.files[0];
        profileImageBase64 = currentProcessedImageBase64 || (await processProfileImage(file));
      }
      
      let member;
      if (isEditing) {
        member = await window.MemberDB.get(id);
        if (!member) return;
        member.name = data.get('name');
        member.family = data.get('family').trim() || null;
        member.birthdate = data.get('birthdate');
        member.contact = data.get('contact');
        member.address = data.get('address');
        member.organizationId = data.get('organizationId') || null;
        if (profileImageBase64) {
          member.profileImage = profileImageBase64;
        }
      } else {
        member = {
          id: window.uuid(),
          name: data.get('name'),
          family: data.get('family').trim() || null,
          birthdate: data.get('birthdate'),
          contact: data.get('contact'),
          address: data.get('address'),
          organizationId: data.get('organizationId') || null,
          profileImage: profileImageBase64 || null,
        };
      }
      
      if (isEditing) {
        await window.MemberDB.update(member);
        window.showToast('Member updated successfully', 'success');
      } else {
        await window.MemberDB.add(member);
        window.showToast('Member registered successfully', 'success');
      }
      
      closeModal();
      await refreshFilterOptions();
      await loadMembers();
    } catch (err) {
      console.error("Error saving member:", err);
      window.showToast('Failed to save member: ' + (err.message || err), 'error');
    }
  });

  tableBody.addEventListener('click', async e => {
    if (e.target.matches('.view-member')) {
      const id = e.target.dataset.id;
      const member = await window.MemberDB.get(id);
      if (member) {
        const org = (organizations || []).find(o => o.id === member.organizationId);
        const orgName = org ? org.name : (member.organizationName || '-');

        const setName = container.querySelector('#id-name');
        if (setName) setName.textContent = member.name || '-';
        const setFam = container.querySelector('#id-family');
        if (setFam) setFam.textContent = member.family || '-';
        const setBdate = container.querySelector('#id-birthdate');
        if (setBdate) setBdate.textContent = window.formatDate(member.birthdate) || '-';
        const setContact = container.querySelector('#id-contact');
        if (setContact) setContact.textContent = member.contact || '-';
        const setAddr = container.querySelector('#id-address');
        if (setAddr) setAddr.textContent = member.address || '-';
        const setOrg = container.querySelector('#id-org');
        if (setOrg) setOrg.textContent = orgName;
        
        const photoEl = container.querySelector('#id-photo');
        if (photoEl) {
          photoEl.onerror = () => {
            photoEl.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23eee"/><text x="50" y="65" font-size="40" text-anchor="middle" fill="%23999">👤</text></svg>';
          };
          if (member.profileImage) {
            photoEl.src = member.profileImage;
          } else {
            photoEl.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23eee"/><text x="50" y="65" font-size="40" text-anchor="middle" fill="%23999">👤</text></svg>';
          }
        }
        
        const idModal = container.querySelector('#member-id-modal');
        if (idModal) idModal.style.display = 'flex';
      }
    }
    if (e.target.matches('.edit-member')) {
      const id = e.target.dataset.id;
      const member = await window.MemberDB.get(id);
      if (member) {
        form.querySelector('#member-id').value = member.id;
        form.querySelector('#member-name').value = member.name || '';
        form.querySelector('#member-family').value = member.family || '';
        form.querySelector('#member-birthdate').value = member.birthdate || '';
        form.querySelector('#member-contact').value = member.contact || '';
        form.querySelector('#member-address').value = member.address || '';
        form.querySelector('#member-organization').value = member.organizationId || '';
        
        if (member.profileImage) {
          profilePreview.src = member.profileImage;
          profilePreview.style.display = 'block';
        } else {
          profilePreview.src = '';
          profilePreview.style.display = 'none';
        }
        profileInput.value = '';
        
        formTitle.textContent = 'Edit Member';
        submitBtn.textContent = 'Save Changes';
        openModal(true);
      }
    }
    if (e.target.matches('.delete-member')) {
      if (!confirm('Are you sure you want to remove this member?')) return;
      const id = e.target.dataset.id;
      await window.MemberDB.delete(id);
      window.showToast('Member removed');
      await refreshFilterOptions();
      loadMembers();
    }
  });

  // Modal logic for Member ID card
  const idModal = container.querySelector('#member-id-modal');
  container.querySelector('#close-id-modal').addEventListener('click', () => {
    idModal.style.display = 'none';
  });
  idModal.addEventListener('click', (e) => {
    if (e.target === idModal) idModal.style.display = 'none';
  });
  
  container.querySelector('#print-id-btn').addEventListener('click', () => {
    const printWindow = window.open('', '_blank');
    const cardHtml = container.querySelector('#id-card').outerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print ID</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; padding: 40px; margin: 0; }
            #id-card { box-shadow: none !important; border: 2px solid #ccc !important; max-width: none !important; width: 600px !important; margin: 0 !important; }
            #print-id-btn { display: none !important; }
            #close-id-modal { display: none !important; }
          </style>
        </head>
        <body>
          ${cardHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  });

  await loadMembers();
};
