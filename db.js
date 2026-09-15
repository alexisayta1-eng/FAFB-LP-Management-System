// db.js – Supabase Cloud PostgreSQL Connector for FAFB LP Church Management System
// With transparent offline IndexedDB caching & fallback

const DB_NAME = "fafb-db";
const DB_VERSION = 2;

const STORES = {
  members: "members",
  ministries: "ministries",
  organizations: "organizations",
  pledges: "pledges",
};

// -------------------------------------------------------------
// IndexedDB Engine (Local cache & offline resilience)
// -------------------------------------------------------------
let idbPromise = null;
function getIndexedDB() {
  if (!idbPromise) {
    idbPromise = new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const storeName of Object.values(STORES)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: "id" });
            if (storeName === "members") store.createIndex("byOrganization", "organizationId", { unique: false });
            if (storeName === "pledges") store.createIndex("byType", "type", { unique: false });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  return idbPromise;
}

async function idbAdd(storeName, record) {
  const db = await getIndexedDB();
  if (!db || !record) return record;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => resolve(record);
    } catch (_) {
      resolve(record);
    }
  });
}

async function idbGetAll(storeName) {
  const db = await getIndexedDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    } catch (_) {
      resolve([]);
    }
  });
}

async function idbGet(storeName, id) {
  const db = await getIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function idbDelete(storeName, id) {
  const db = await getIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch (_) {
      resolve();
    }
  });
}

// -------------------------------------------------------------
// Data Helpers
// -------------------------------------------------------------
function sanitizePledge(p) {
  if (!p) return p;
  const clone = { ...p };
  if (clone.amount !== undefined) clone.amount = parseFloat(clone.amount) || 0;
  if (clone.pledgeAmount !== undefined) clone.pledgeAmount = parseFloat(clone.pledgeAmount) || 0;
  if (clone.paidAmount !== undefined) clone.paidAmount = parseFloat(clone.paidAmount) || 0;
  if (clone.datePledged && !clone.thanksgivingDate) {
    clone.thanksgivingDate = clone.datePledged;
  }
  if (clone.thanksgivingDate && !clone.datePledged) {
    clone.datePledged = clone.thanksgivingDate;
  }
  return clone;
}

function sanitizeMinistry(m) {
  if (!m) return m;
  const clone = { ...m };
  if (Array.isArray(clone.participantIds)) {
    clone.participants = JSON.stringify(clone.participantIds);
    delete clone.participantIds;
  }
  return clone;
}

function restoreMinistry(m) {
  if (!m) return m;
  const clone = { ...m };
  if (typeof clone.participants === 'string') {
    try {
      clone.participantIds = JSON.parse(clone.participants);
    } catch (_) {
      clone.participantIds = clone.participants ? clone.participants.split(',').map(s => s.trim()) : [];
    }
  } else if (!clone.participantIds) {
    clone.participantIds = [];
  }
  return clone;
}

function getSupabase() {
  if (typeof window.getSupabaseClient === "function") {
    return window.getSupabaseClient();
  }
  return null;
}

// Generic CRUD Wrapper for Supabase + IndexedDB Sync
async function executeQuery({
  table,
  action, // 'getAll' | 'get' | 'upsert' | 'delete'
  id = null,
  data = null,
  orderBy = 'name',
  ascending = true,
  sanitizeFn = null
}) {
  const supabase = getSupabase();

  if (supabase) {
    try {
      if (action === 'getAll') {
        let query = supabase.from(table).select('*');
        if (orderBy) query = query.order(orderBy, { ascending });
        let { data: rows, error } = await query;
        if (error) {
          console.warn(`Supabase ${table} getAll with order failed (${error.message}), retrying without order...`);
          const retry = await supabase.from(table).select('*');
          rows = retry.data;
          error = retry.error;
        }
        if (!error && Array.isArray(rows)) {
          const list = sanitizeFn ? rows.map(sanitizeFn) : rows;
          // Sync to local cache in background
          list.forEach(item => idbAdd(table, item));
          return list;
        }
        if (error) console.warn(`Supabase ${table} getAll error:`, error.message);
      } else if (action === 'get') {
        const { data: row, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
        if (!error && row) {
          const result = sanitizeFn ? sanitizeFn(row) : row;
          idbAdd(table, result);
          return result;
        }
        if (error) console.warn(`Supabase ${table} get notice:`, error.message);
      } else if (action === 'upsert') {
        const payload = sanitizeFn ? sanitizeFn(data) : { ...data };
        if (table === STORES.pledges && payload) {
          if (payload.datePledged && !payload.thanksgivingDate) {
            payload.thanksgivingDate = payload.datePledged;
          }
          delete payload.datePledged;
        }
        const { data: saved, error } = await supabase.from(table).upsert(payload).select().maybeSingle();
        if (!error) {
          const result = saved ? (sanitizeFn ? sanitizeFn(saved) : saved) : payload;
          idbAdd(table, result);
          return result;
        }
        console.error(`Supabase ${table} upsert error:`, error.message);
        throw new Error(error.message);
      } else if (action === 'delete') {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) {
          await idbDelete(table, id);
          return true;
        }
        console.error(`Supabase ${table} delete error:`, error.message);
        throw new Error(error.message);
      }
    } catch (err) {
      console.warn(`Supabase query failed:`, err);
      // If we are online and Supabase returned a DB error (e.g., RLS, column error), throw it so UI notifies the user
      if (navigator.onLine && err && err.message && !err.message.includes('fetch') && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      console.warn(`Falling back to local storage:`, err);
    }
  }

  // Local Storage Fallback
  if (action === 'getAll') {
    const cached = await idbGetAll(table);
    return sanitizeFn ? cached.map(sanitizeFn) : cached;
  } else if (action === 'get') {
    const cached = await idbGet(table, id);
    return cached && sanitizeFn ? sanitizeFn(cached) : cached;
  } else if (action === 'upsert') {
    const payload = sanitizeFn ? sanitizeFn(data) : data;
    await idbAdd(table, payload);
    return payload;
  } else if (action === 'delete') {
    await idbDelete(table, id);
    return true;
  }
}

// -------------------------------------------------------------
// Global Repositories
// -------------------------------------------------------------

window.MemberDB = {
  getAll: async () => executeQuery({ table: STORES.members, action: 'getAll', orderBy: 'name', ascending: true }),
  get: async (id) => executeQuery({ table: STORES.members, action: 'get', id }),
  add: async (rec) => executeQuery({ table: STORES.members, action: 'upsert', data: rec }),
  update: async (rec) => executeQuery({ table: STORES.members, action: 'upsert', data: rec }),
  delete: async (id) => executeQuery({ table: STORES.members, action: 'delete', id }),
};

window.MinistryDB = {
  getAll: async () => {
    const list = await executeQuery({ table: STORES.ministries, action: 'getAll', orderBy: 'datetime', ascending: true, sanitizeFn: sanitizeMinistry });
    return (list || []).map(restoreMinistry);
  },
  get: async (id) => {
    const item = await executeQuery({ table: STORES.ministries, action: 'get', id, sanitizeFn: sanitizeMinistry });
    return restoreMinistry(item);
  },
  add: async (rec) => {
    const item = await executeQuery({ table: STORES.ministries, action: 'upsert', data: rec, sanitizeFn: sanitizeMinistry });
    return restoreMinistry(item);
  },
  update: async (rec) => {
    const item = await executeQuery({ table: STORES.ministries, action: 'upsert', data: rec, sanitizeFn: sanitizeMinistry });
    return restoreMinistry(item);
  },
  delete: async (id) => executeQuery({ table: STORES.ministries, action: 'delete', id }),
};

window.OrganizationDB = {
  getAll: async () => executeQuery({ table: STORES.organizations, action: 'getAll', orderBy: 'name', ascending: true }),
  get: async (id) => executeQuery({ table: STORES.organizations, action: 'get', id }),
  add: async (rec) => executeQuery({ table: STORES.organizations, action: 'upsert', data: rec }),
  update: async (rec) => executeQuery({ table: STORES.organizations, action: 'upsert', data: rec }),
  delete: async (id) => executeQuery({ table: STORES.organizations, action: 'delete', id }),
};

window.PledgeDB = {
  getAll: async () => executeQuery({ table: STORES.pledges, action: 'getAll', orderBy: 'created_at', ascending: false, sanitizeFn: sanitizePledge }),
  get: async (id) => executeQuery({ table: STORES.pledges, action: 'get', id, sanitizeFn: sanitizePledge }),
  add: async (rec) => executeQuery({ table: STORES.pledges, action: 'upsert', data: rec, sanitizeFn: sanitizePledge }),
  update: async (rec) => executeQuery({ table: STORES.pledges, action: 'upsert', data: rec, sanitizeFn: sanitizePledge }),
  delete: async (id) => executeQuery({ table: STORES.pledges, action: 'delete', id }),
};
