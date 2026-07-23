import { MoltenDb } from '@moltendb-web/core';

// ── DB init ──────────────────────────────────────────────────────────────────
let db = null;
const status = document.getElementById('status');
const runBtn = document.getElementById('runBtn');
const seedBtn = document.getElementById('seedBtn');
const clearBtn = document.getElementById('clearBtn');
const logEntries = document.getElementById('logEntries');
const eventEntries = document.getElementById('eventEntries');

document.getElementById('logClearBtn').addEventListener('click', () => {
  logEntries.innerHTML = '';
});
document.getElementById('eventsClearBtn').addEventListener('click', () => {
  eventEntries.innerHTML =
    '<div class="event-placeholder">Cleared. Run a mutation to see events.</div>';
});

function addLog(msg, type = 'info') {
  const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-ts">[${ts}]</span><span class="log-${type}">${escapeHtml(msg)}</span>`;
  logEntries.appendChild(entry);
  logEntries.scrollTop = logEntries.scrollHeight;
  console.log(`[MoltenDb ${type.toUpperCase()}] ${msg}`);
}

function addEventEntry(ts, type, collection, key, newV) {
  const entry = document.createElement('div');
  entry.className = 'event-entry';
  const badgeClass =
    type === 'change'
      ? 'event-change'
      : type === 'delete'
        ? 'event-delete'
        : type === 'system'
          ? 'event-system'
          : 'event-drop';
  const badgeLabel =
    type === 'change'
      ? 'CHANGE'
      : type === 'delete'
        ? 'DELETE'
        : type === 'system'
          ? 'SYSTEM'
          : 'DROP';
  const verStr =
    newV !== null && newV !== undefined ? ` <span class="event-ver">v${newV}</span>` : '';
  entry.innerHTML = `
      <span class="event-ts">${ts}</span>
      <span><span class="event-badge ${badgeClass}">${badgeLabel}</span><span class="event-col">${escapeHtml(collection)}</span> / <span class="event-key">${escapeHtml(String(key))}</span>${verStr}</span>
  `;
  eventEntries.appendChild(entry);
  eventEntries.scrollTop = eventEntries.scrollHeight;
}

async function initDB() {
  try {
    addLog('Initializing MoltenDb WASM worker…', 'info');
    db = new MoltenDb('moltendb_demo', { inMemory: false });

    db.subscribe((evt) => {
      const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });

      if (evt.event === 'kill') {
        // Another tab wiped the DB. Reload this tab to stay safe.
        console.debug(`DB dropped by another tab, reloading current tab`, evt);
        location.reload();
      }

      const placeholder = eventEntries.querySelector('.event-placeholder');
      if (placeholder) placeholder.remove();

      if (evt.event === 'ttl_expiry') {
        // System events — display as a special entry
        addEventEntry(ts, 'system', evt.collection, evt.event, evt.expires_at_ms);
        return;
      }

      let type = 'change';
      if (evt.new_v === null || evt.new_v === undefined) {
        type = evt.event === 'drop' ? 'drop' : 'delete';
      }

      addEventEntry(ts, type, evt.collection, evt.key, evt.new_v);
    });
    await db.init();

    addLog(
      `✅ MoltenDb ready — Running as ${db.isLeader ? 'Leader' : 'Follower Proxy'}`,
      'success'
    );
    status.textContent = '✅ Ready';
    status.className = 'ready';
    runBtn.disabled = false;
    seedBtn.disabled = false;
    clearBtn.disabled = false;
  } catch (e) {
    addLog('❌ Init failed: ' + e.message, 'error');
    console.error('[MoltenDb] Init error:', e);
    status.textContent = '❌ Init failed: ' + e.message;
    status.className = 'error';
  }
}

// ── Query definitions ────────────────────────────────────────────────────────
const QUERIES = [
  {
    group: 'Seed Data',
    num: 1,
    label: 'Seed memory collection',
    action: 'set',
    body: {
      collection: 'memory',
      data: {
        mem1: { capacity_gb: 8, type: 'LPDDR5', speed_mhz: 4266, upgradeable: false },
        mem2: { capacity_gb: 16, type: 'LPDDR5', speed_mhz: 4266, upgradeable: false },
        mem3: { capacity_gb: 32, type: 'DDR5', speed_mhz: 5600, upgradeable: true },
        mem4: { capacity_gb: 64, type: 'DDR5', speed_mhz: 5600, upgradeable: true },
        mem5: { capacity_gb: 36, type: 'Unified', speed_mhz: 6400, upgradeable: false },
      },
    },
  },
  {
    group: 'Seed Data',
    num: 2,
    label: 'Seed display collection',
    action: 'set',
    body: {
      collection: 'display',
      data: {
        dsp1: {
          size_inch: 13.3,
          resolution: '2560x1600',
          panel: 'IPS',
          refresh_hz: 60,
          touchscreen: false,
          hdr: false,
        },
        dsp2: {
          size_inch: 14.0,
          resolution: '2880x1800',
          panel: 'OLED',
          refresh_hz: 90,
          touchscreen: false,
          hdr: true,
        },
        dsp3: {
          size_inch: 15.6,
          resolution: '1920x1080',
          panel: 'IPS',
          refresh_hz: 144,
          touchscreen: false,
          hdr: false,
        },
        dsp4: {
          size_inch: 16.2,
          resolution: '3456x2234',
          panel: 'Mini-LED',
          refresh_hz: 120,
          touchscreen: false,
          hdr: true,
        },
        dsp5: {
          size_inch: 14.0,
          resolution: '2560x1600',
          panel: 'IPS',
          refresh_hz: 165,
          touchscreen: true,
          hdr: false,
        },
      },
    },
  },
  {
    group: 'Seed Data',
    num: 3,
    label: 'Seed laptops collection',
    action: 'set',
    body: {
      collection: 'laptops',
      data: {
        lp1: {
          brand: 'Lenovo',
          model: 'ThinkPad X1 Carbon',
          price: 1499,
          in_stock: true,
          memory_id: 'mem2',
          display_id: 'dsp2',
          tags: ['business', 'ultrabook', 'lightweight'],
          specs: { cpu: { brand: 'Intel', cores: 12, ghz: 3.5 }, battery_wh: 57, weight_kg: 1.12 },
        },
        lp2: {
          brand: 'Apple',
          model: 'MacBook Pro 16',
          price: 3499,
          in_stock: true,
          memory_id: 'mem5',
          display_id: 'dsp4',
          tags: ['creative', 'professional', 'macos'],
          specs: {
            cpu: { brand: 'Apple', cores: 12, ghz: 4.05 },
            battery_wh: 100,
            weight_kg: 2.15,
          },
        },
        lp3: {
          brand: 'Asus',
          model: 'ROG Zephyrus G14',
          price: 1699,
          in_stock: true,
          memory_id: 'mem3',
          display_id: 'dsp5',
          tags: ['gaming', 'amd', 'portable'],
          specs: { cpu: { brand: 'AMD', cores: 8, ghz: 4.9 }, battery_wh: 76, weight_kg: 1.65 },
        },
        lp4: {
          brand: 'Dell',
          model: 'XPS 15',
          price: 1899,
          in_stock: false,
          memory_id: 'mem3',
          display_id: 'dsp4',
          tags: ['creative', 'windows', '4k'],
          specs: { cpu: { brand: 'Intel', cores: 14, ghz: 3.8 }, battery_wh: 86, weight_kg: 1.86 },
        },
        lp5: {
          brand: 'Razer',
          model: 'Blade 15',
          price: 2499,
          in_stock: true,
          memory_id: 'mem4',
          display_id: 'dsp3',
          tags: ['gaming', 'windows', 'rgb'],
          specs: { cpu: { brand: 'Intel', cores: 14, ghz: 4.1 }, battery_wh: 80, weight_kg: 2.01 },
        },
        lp6: {
          brand: 'Framework',
          model: 'Laptop 13',
          price: 849,
          in_stock: true,
          memory_id: 'mem1',
          display_id: 'dsp1',
          tags: ['modular', 'linux', 'budget'],
          specs: { cpu: { brand: 'Intel', cores: 10, ghz: 3.3 }, battery_wh: 55, weight_kg: 1.3 },
        },
      },
    },
  },
  {
    group: 'Basic Reads',
    num: 4,
    label: 'Get single laptop (lp2)',
    action: 'get',
    body: { collection: 'laptops', keys: 'lp2' },
  },
  {
    group: 'Basic Reads',
    num: 5,
    label: 'Get all laptops',
    action: 'get',
    body: { collection: 'laptops' },
  },
  {
    group: 'Basic Reads',
    num: 6,
    label: 'Get batch of laptops',
    action: 'get',
    body: { collection: 'laptops', keys: ['lp1', 'lp3', 'lp5'] },
  },
  {
    group: 'Field Selection',
    num: 7,
    label: 'Select brand, model, price only',
    action: 'get',
    body: { collection: 'laptops', fields: ['brand', 'model', 'price'] },
  },
  {
    group: 'Field Selection',
    num: 8,
    label: 'Deep nested field (CPU specs)',
    action: 'get',
    body: { collection: 'laptops', fields: ['brand', 'model', 'specs.cpu.ghz', 'specs.cpu.cores'] },
  },
  {
    group: 'Field Selection',
    num: 9,
    label: 'Exclude price and FK fields',
    action: 'get',
    body: { collection: 'laptops', excludedFields: ['price', 'memory_id', 'display_id'] },
  },
  {
    group: 'Field Selection',
    num: 10,
    label: 'Validation: fields + excludedFields error',
    action: 'get',
    body: { collection: 'laptops', fields: ['brand'], excludedFields: ['price'] },
  },
  {
    group: 'WHERE Clause',
    num: 11,
    label: 'Exact match — Apple only',
    action: 'get',
    body: { collection: 'laptops', fields: ['brand', 'model', 'price'], where: { brand: 'Apple' } },
  },
  {
    group: 'WHERE Clause',
    num: 12,
    label: 'Numeric range $gt/$lt',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      where: { price: { $gt: 1000, $lt: 2000 } },
    },
  },
  {
    group: 'WHERE Clause',
    num: 13,
    label: 'Nested field — 12+ CPU cores',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'specs.cpu'],
      where: { 'specs.cpu.cores': { $gte: 12 } },
    },
  },
  {
    group: 'WHERE Clause',
    num: 14,
    label: 'Multiple conditions — Intel under 2kg',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'specs.cpu.brand', 'specs.weight_kg'],
      where: { 'specs.cpu.brand': 'Intel', 'specs.weight_kg': { $lt: 2.0 } },
    },
  },
  {
    group: 'WHERE Clause',
    num: 15,
    label: '$ne — not Intel',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'specs.cpu.brand'],
      where: { 'specs.cpu.brand': { $ne: 'Intel' } },
    },
  },
  {
    group: 'WHERE Clause',
    num: 16,
    label: '$contains on string — model has "Pro"',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model'],
      where: { model: { $contains: 'Pro' } },
    },
  },
  {
    group: 'WHERE Clause',
    num: 17,
    label: '$contains on array — tagged "gaming"',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'tags', 'price'],
      where: { tags: { $contains: 'gaming' } },
    },
  },
  {
    group: 'WHERE Clause',
    num: 18,
    label: '$in — Apple, Dell or Razer',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      where: { brand: { $in: ['Apple', 'Dell', 'Razer'] } },
    },
  },
  {
    group: 'WHERE Clause',
    num: 19,
    label: '$nin — exclude Framework',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      where: { brand: { $nin: ['Framework'] } },
    },
  },
  {
    group: 'WHERE Clause',
    num: 20,
    label: 'Combined — in-stock gaming under $2000',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price', 'tags'],
      where: { in_stock: true, tags: { $contains: 'gaming' }, price: { $lt: 2000 } },
    },
  },
  {
    group: 'Logical Operators',
    num: 58,
    label: '$or — Apple brand OR XPS model',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model'],
      where: { $or: [{ brand: { $ct: 'Apple' } }, { model: { $ct: 'XPS' } }] },
    },
  },
  {
    group: 'Logical Operators',
    num: 59,
    label: '$and — in stock AND price under $2000',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      where: { $and: [{ in_stock: true }, { price: { $lt: 2000 } }] },
    },
  },
  {
    group: 'Logical Operators',
    num: 60,
    label: '$or + top-level — in-stock Apple or Dell',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      where: { in_stock: true, $or: [{ brand: { $eq: 'Apple' } }, { brand: { $eq: 'Dell' } }] },
    },
  },
  {
    group: 'Sort',
    num: 21,
    label: 'Sort by price asc',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      sort: [{ field: 'price', order: 'asc' }],
    },
  },
  {
    group: 'Sort',
    num: 22,
    label: 'Sort by price desc',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      sort: [{ field: 'price', order: 'desc' }],
    },
  },
  {
    group: 'Sort',
    num: 23,
    label: 'Sort by CPU cores desc',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'specs.cpu.cores', 'specs.cpu.ghz'],
      sort: [{ field: 'specs.cpu.cores', order: 'desc' }],
    },
  },
  {
    group: 'Sort',
    num: 24,
    label: 'Multi-field sort — brand asc, price asc',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      sort: [
        { field: 'brand', order: 'asc' },
        { field: 'price', order: 'asc' },
      ],
    },
  },
  {
    group: 'Sort',
    num: 25,
    label: 'Sort + WHERE — in-stock by weight asc',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'specs.weight_kg', 'price'],
      where: { in_stock: true },
      sort: [{ field: 'specs.weight_kg', order: 'asc' }],
    },
  },
  {
    group: 'Pagination',
    num: 26,
    label: 'count — 3 cheapest',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      sort: [{ field: 'price', order: 'asc' }],
      count: 3,
    },
  },
  {
    group: 'Pagination',
    num: 27,
    label: 'offset + count — page 2 (skip 2, take 2)',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      sort: [{ field: 'price', order: 'asc' }],
      offset: 2,
      count: 2,
    },
  },
  {
    group: 'Pagination',
    num: 28,
    label: 'offset + count + WHERE — in-stock page 2',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      where: { in_stock: true },
      sort: [{ field: 'price', order: 'asc' }],
      offset: 2,
      count: 2,
    },
  },
  {
    group: 'Joins',
    num: 29,
    label: 'Join laptops → memory',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      joins: [{ ram: { from: 'memory', on: 'memory_id' } }],
    },
  },
  {
    group: 'Joins',
    num: 30,
    label: 'Join laptops → display (partial fields)',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model'],
      joins: [
        {
          screen: {
            from: 'display',
            on: 'display_id',
            fields: ['refresh_hz', 'panel', 'size_inch'],
          },
        },
      ],
    },
  },
  {
    group: 'Joins',
    num: 31,
    label: 'Double join — memory + display',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      joins: [
        { ram: { from: 'memory', on: 'memory_id', fields: ['capacity_gb', 'type'] } },
        {
          screen: {
            from: 'display',
            on: 'display_id',
            fields: ['size_inch', 'refresh_hz', 'panel'],
          },
        },
      ],
    },
  },
  {
    group: 'Joins',
    num: 32,
    label: 'Join + WHERE on main — in-stock with display',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      where: { in_stock: true },
      joins: [
        { screen: { from: 'display', on: 'display_id', fields: ['refresh_hz', 'panel', 'hdr'] } },
      ],
    },
  },
  {
    group: 'Joins',
    num: 33,
    label: 'Join + WHERE on joined — OLED or Mini-LED',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      joins: [
        { screen: { from: 'display', on: 'display_id', fields: ['panel', 'refresh_hz', 'hdr'] } },
      ],
      where: { 'screen.panel': { $in: ['OLED', 'Mini-LED'] } },
    },
  },
  {
    group: 'Joins',
    num: 34,
    label: 'Join + WHERE — 120Hz+ display',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      joins: [{ screen: { from: 'display', on: 'display_id', fields: ['refresh_hz', 'panel'] } }],
      where: { 'screen.refresh_hz': { $gte: 120 } },
    },
  },
  {
    group: 'Joins',
    num: 35,
    label: 'Join + WHERE — upgradeable RAM',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      joins: [
        {
          ram: { from: 'memory', on: 'memory_id', fields: ['capacity_gb', 'type', 'upgradeable'] },
        },
      ],
      where: { 'ram.upgradeable': true },
    },
  },
  {
    group: 'Joins',
    num: 36,
    label: 'Join + sort by display refresh rate desc',
    action: 'get',
    body: {
      collection: 'laptops',
      fields: ['brand', 'model', 'price'],
      joins: [{ screen: { from: 'display', on: 'display_id', fields: ['refresh_hz', 'panel'] } }],
      sort: [{ field: 'screen.refresh_hz', order: 'desc' }],
    },
  },
  {
    group: 'Update & Delete',
    num: 37,
    label: 'Update lp4 — back in stock, new price',
    action: 'update',
    body: { collection: 'laptops', data: { lp4: { in_stock: true, price: 1749 } } },
  },
  {
    group: 'Update & Delete',
    num: 38,
    label: 'Update multiple laptops',
    action: 'update',
    body: { collection: 'laptops', data: { lp1: { price: 1399 }, lp6: { price: 799 } } },
  },
  {
    group: 'Update & Delete',
    num: 39,
    label: 'Delete single laptop (lp6)',
    action: 'delete',
    body: { collection: 'laptops', keys: 'lp6' },
  },
  {
    group: 'Update & Delete',
    num: 40,
    label: 'Delete multiple laptops',
    action: 'delete',
    body: { collection: 'laptops', keys: ['lp4', 'lp5'] },
  },
  {
    group: 'Update & Delete',
    num: 41,
    label: 'Drop entire laptops collection',
    action: 'delete',
    body: { collection: 'laptops', drop: true },
  },
  {
    group: 'Extends',
    num: 50,
    label: 'Insert lp7 with embedded memory + display',
    action: 'set',
    body: {
      collection: 'laptops',
      data: {
        lp7: {
          brand: 'MSI',
          model: 'Titan GT77',
          price: 3299,
          in_stock: true,
          tags: ['gaming', 'desktop-replacement', 'windows'],
          specs: { cpu: { brand: 'Intel', cores: 16, ghz: 5.0 }, battery_wh: 99, weight_kg: 3.3 },
          extends: { ram: 'memory.mem4', screen: 'display.dsp3' },
        },
      },
    },
  },
  {
    group: 'Extends',
    num: 51,
    label: 'Read lp7 — ram and screen embedded',
    action: 'get',
    body: { collection: 'laptops', keys: 'lp7' },
  },
  {
    group: 'Extends',
    num: 52,
    label: 'Extends with auto-generated key (array)',
    action: 'set',
    body: {
      collection: 'laptops',
      data: [
        {
          brand: 'HP',
          model: 'Spectre x360',
          price: 1599,
          in_stock: true,
          extends: { ram: 'memory.mem2' },
        },
      ],
    },
  },
  {
    group: 'Extends',
    num: 53,
    label: 'Extends with missing reference (graceful)',
    action: 'set',
    body: {
      collection: 'laptops',
      data: {
        lp8: { brand: 'Lenovo', model: 'Legion 5', price: 1199, extend: { ram: 'memory.mem99' } },
      },
    },
  },
  {
    group: 'Versioning',
    num: 45,
    label: 'Read lp2 — see _v, createdAt, modifiedAt',
    action: 'get',
    body: { collection: 'laptops', keys: 'lp2' },
  },
  {
    group: 'Versioning',
    num: 46,
    label: 'Conflict test — stale _v:1 write skipped',
    action: 'set',
    body: {
      collection: 'laptops',
      data: { lp4: { brand: 'Dell', model: 'XPS 15 STALE', price: 999, _v: 1 } },
    },
  },
  { group: 'Maintenance', num: 99, label: 'Compact the database log', action: 'compact', body: {} },

  // ── Bulk Delete ──
  {
    group: 'Bulk Delete',
    num: 60,
    label: 'Bulk delete — all out-of-stock laptops',
    action: 'delete',
    body: {
      collection: 'laptops',
      where: { in_stock: { $eq: false } },
    },
  },
  {
    group: 'Bulk Delete',
    num: 61,
    label: 'Bulk delete — all laptops under £500',
    action: 'delete',
    body: {
      collection: 'laptops',
      where: { price: { $lt: 500 } },
    },
  },
  {
    group: 'Bulk Delete',
    num: 62,
    label: 'Bulk delete with $or — AMD or Apple laptops',
    action: 'delete',
    body: {
      collection: 'laptops',
      where: {
        $or: [{ 'specs.cpu.brand': { $eq: 'AMD' } }, { 'specs.cpu.brand': { $eq: 'Apple' } }],
      },
    },
  },
  {
    group: 'Bulk Delete',
    num: 63,
    label: 'Bulk delete with count — at most 2 gaming laptops',
    action: 'delete',
    body: {
      collection: 'laptops',
      where: { tags: { $contains: 'gaming' } },
      count: 2,
    },
  },
  {
    group: 'Bulk Delete',
    num: '63c',
    label: 'Count-only delete — remove the 2 oldest documents (no where)',
    action: 'delete',
    body: {
      collection: 'laptops',
      count: 2,
    },
  },
  {
    group: 'Bulk Delete',
    num: '63d',
    label: 'Count-only delete — remove the 2 newest documents (order=desc)',
    action: 'delete',
    body: {
      collection: 'laptops',
      count: 2,
      order: 'desc',
    },
  },
  {
    group: 'Bulk Delete',
    num: 64,
    label: 'Bulk delete all — empty collection via where: {}',
    action: 'delete',
    body: {
      collection: 'memory',
      where: {},
    },
  },

  // ── Capped Collections (maxSize) ──
  {
    group: 'Capped Collections',
    num: 65,
    label: 'maxSize — insert 3 documents (inline cap on first set)',
    action: 'set',
    body: {
      collection: 'recent_events',
      maxSize: 5,
      data: {
        evt_001: { type: 'login', user: 'alice' },
        evt_002: { type: 'view', user: 'bob' },
        evt_003: { type: 'logout', user: 'alice' },
      },
    },
  },
  {
    group: 'Capped Collections',
    num: 67,
    label: 'maxSize — insert 4 more (oldest 2 evicted, keeps 5)',
    action: 'set',
    body: {
      collection: 'recent_events',
      data: {
        evt_004: { type: 'login', user: 'carol' },
        evt_005: { type: 'view', user: 'carol' },
        evt_006: { type: 'purchase', user: 'carol' },
        evt_007: { type: 'logout', user: 'carol' },
      },
    },
  },
  {
    group: 'Capped Collections',
    num: 68,
    label: 'maxSize — inline cap + insert in one set call',
    action: 'set',
    body: {
      collection: 'top5_scores',
      maxSize: 5,
      data: {
        score_001: { player: 'alice', score: 9800 },
        score_002: { player: 'bob', score: 8700 },
        score_003: { player: 'carol', score: 7600 },
      },
    },
  },
  {
    group: 'Capped Collections',
    num: 69,
    label: 'maxSize — verify count via /get',
    action: 'get',
    body: { collection: 'recent_events' },
  },
  {
    group: 'Capped Collections',
    num: 70,
    label: 'maxSize — verify count via /stats',
    action: 'stats',
    body: { collection: 'recent_events' },
  },

  // ── TTL ──
  {
    group: 'TTL',
    num: 71,
    label: 'TTL — inline TTL on set (register + insert, 1800s sliding window)',
    action: 'set',
    body: {
      collection: 'sessions',
      ttl: 1800,
      data: {
        sess_abc: { userId: 'u1', token: 'xyz123' },
        sess_def: { userId: 'u2', token: 'abc456' },
      },
    },
  },
  {
    group: 'TTL',
    num: 72,
    label: 'TTL — inline TTL on set for cache collection (30s)',
    action: 'set',
    body: {
      collection: 'cache',
      ttl: 30,
      data: {
        hot_item: { value: 42 },
        warm_item: { value: 99 },
      },
    },
  },
  {
    group: 'TTL',
    num: 75,
    label: 'TTL — read doc (_expiresAt virtual field in response)',
    action: 'get',
    body: { collection: 'sessions', keys: 'sess_abc' },
  },
  {
    group: 'TTL',
    num: 76,
    label: 'TTL — insert more docs (sliding window resets clock)',
    action: 'set',
    body: {
      collection: 'sessions',
      data: { sess_xyz: { userId: 'u3', token: 'def789' } },
    },
  },
  {
    group: 'TTL',
    num: 77,
    label: 'TTL — update does NOT reset expiry clock',
    action: 'update',
    body: {
      collection: 'sessions',
      data: { sess_abc: { token: 'refreshed_token' } },
    },
  },
  {
    group: 'TTL',
    num: 78,
    label: 'TTL — query with where (_expiresAt on every result)',
    action: 'get',
    body: {
      collection: 'sessions',
      where: { userId: { $eq: 'u1' } },
      fields: ['userId', 'token'],
    },
  },
  {
    group: 'TTL',
    num: 79,
    label: 'TTL — check collection gone after TTL elapses',
    action: 'get',
    body: { collection: 'cache', keys: ['hot_item', 'warm_item'] },
  },
  {
    group: 'TTL',
    num: 80,
    label: 'TTL — manual per-doc expiry: insert with expires_at',
    action: 'set',
    body: {
      collection: 'password_resets',
      data: {
        token_abc: {
          userId: 'u1',
          email: 'user@example.com',
          expires_at: Date.now() - 60_000, // already expired (1 min ago)
        },
      },
    },
  },
  {
    group: 'TTL',
    num: 81,
    label: 'TTL — manual per-doc expiry: bulk delete expired entries',
    action: 'delete',
    body: {
      collection: 'password_resets',
      where: { expires_at: { $lt: Date.now() } },
    },
  },
];

// ── Render query list ────────────────────────────────────────────────────────
const queryList = document.getElementById('queryList');
const searchInput = document.getElementById('searchInput');

function badgeClass(action) {
  if (action === 'get') return 'badge-get';
  if (action === 'set') return 'badge-set';
  if (action === 'update') return 'badge-update';
  if (action === 'delete' || action === 'compact') return 'badge-delete';
  if (action === 'stats') return 'badge-update';
  return 'badge-get';
}

function badgeLabel(action) {
  if (action === 'get') return 'GET';
  if (action === 'set') return 'SET';
  if (action === 'update') return 'UPD';
  if (action === 'delete') return 'DEL';
  if (action === 'stats') return 'STS';
  if (action === 'compact') return 'OPS';
  return 'GET';
}

function renderList(filter = '') {
  queryList.innerHTML = '';
  const lower = filter.toLowerCase();
  let lastGroup = null;

  for (const q of QUERIES) {
    if (filter && !q.label.toLowerCase().includes(lower) && !q.group.toLowerCase().includes(lower))
      continue;

    if (q.group !== lastGroup) {
      const lbl = document.createElement('div');
      lbl.className = 'query-group-label';
      lbl.textContent = q.group;
      queryList.appendChild(lbl);
      lastGroup = q.group;
    }

    const item = document.createElement('div');
    item.className = 'query-item';
    item.dataset.idx = QUERIES.indexOf(q);
    item.innerHTML = `
          <span class="query-item-num">§${q.num}</span>
          <span class="query-item-badge ${badgeClass(q.action)}">${badgeLabel(q.action)}</span>
          <span class="query-item-text">${q.label}</span>
      `;
    item.addEventListener('click', () => loadQuery(q, item));
    queryList.appendChild(item);
  }
}

function loadQuery(q, itemEl) {
  document.querySelectorAll('.query-item').forEach((i) => i.classList.remove('active'));
  itemEl.classList.add('active');
  document.getElementById('actionSelect').value = q.action;
  document.getElementById('editor').value = JSON.stringify(q.body, null, 2);
  document.getElementById('result').innerHTML =
    '<div class="result-placeholder">Press ▶ Run to execute this query.</div>';
  document.getElementById('resultMeta').textContent = '';
}

searchInput.addEventListener('input', () => renderList(searchInput.value));
renderList();

// ── Run query ────────────────────────────────────────────────────────────────
const editor = document.getElementById('editor');
const resultEl = document.getElementById('result');
const resultMeta = document.getElementById('resultMeta');
const actionSelect = document.getElementById('actionSelect');

runBtn.addEventListener('click', runQuery);
editor.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runQuery();
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = editor.selectionStart,
      end = editor.selectionEnd;
    editor.value = editor.value.substring(0, s) + '  ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = s + 2;
  }
});

async function runQuery() {
  if (!db) {
    addLog('DB not ready yet', 'warn');
    return;
  }
  const action = actionSelect.value;
  const raw = editor.value.trim();

  let payload = {};
  if (action !== 'compact') {
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      addLog('Invalid JSON: ' + e.message, 'error');
      showResult({ error: 'Invalid JSON: ' + e.message }, null, true);
      return;
    }
  }

  const col = payload.collection || '';
  addLog(`→ ${action.toUpperCase()}${col ? ' [' + col + ']' : ''}`, 'info');

  const t0 = performance.now();
  try {
    let result =
      action === 'compact'
        ? await db.sendMessage('compact')
        : await db.sendMessage(action, payload);
    const ms = (performance.now() - t0).toFixed(1);
    const summary = summariseResult(result);
    addLog(
      `✅ ${action.toUpperCase()} completed in ${ms} ms${summary ? ' — ' + summary : ''}`,
      'success'
    );
    showResult(result, ms, false);
    // NOTE: We no longer manually call an emit event function here!
  } catch (e) {
    const ms = (performance.now() - t0).toFixed(1);
    addLog(`❌ ${action.toUpperCase()} failed in ${ms} ms: ${e.message}`, 'error');
    showResult({ error: e.message }, ms, true);
  }
}

function summariseResult(data) {
  if (data === null || data === undefined) return 'null';
  if (Array.isArray(data)) return `${data.length} row(s)`;
  if (typeof data === 'object') {
    if (data.error) return 'error: ' + data.error;
    if (data.status) return data.status;
    return Object.keys(data).length + ' field(s)';
  }
  return String(data);
}

function showResult(data, ms, isError) {
  if (ms !== null) resultMeta.textContent = `${ms} ms`;
  if (isError) {
    resultEl.innerHTML = `<span class="result-error">${escapeHtml(JSON.stringify(data, null, 2))}</span>`;
    return;
  }
  resultEl.innerHTML = syntaxHighlight(JSON.stringify(data, null, 2));
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function syntaxHighlight(json) {
  json = escapeHtml(json);
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span class="json-key">${match}</span>`;
        return `<span class="json-str">${match}</span>`;
      }
      if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`;
      if (/null/.test(match)) return `<span class="json-null">${match}</span>`;
      return `<span class="json-num">${match}</span>`;
    }
  );
}

// ── Seed all data at once ────────────────────────────────────────────────────
seedBtn.addEventListener('click', async () => {
  seedBtn.disabled = true;
  seedBtn.textContent = '⏳ Seeding…';
  const seedQueries = QUERIES.filter((q) => q.group === 'Seed Data');
  addLog('⚡ Seeding demo data (memory, display, laptops)…', 'info');
  try {
    for (const q of seedQueries) {
      addLog(`  → Seeding [${q.body.collection}]…`, 'info');
      await db.sendMessage(q.action, q.body);
      addLog(`  ✅ [${q.body.collection}] seeded`, 'success');
      // NOTE: We no longer manually call an emit event function here!
    }
    addLog('✅ All demo data seeded successfully!', 'success');
    seedBtn.textContent = '✅ Seeded!';
    setTimeout(() => {
      seedBtn.textContent = '⚡ Seed Demo Data';
      seedBtn.disabled = false;
    }, 2000);
  } catch (e) {
    addLog('❌ Seed failed: ' + e.message, 'error');
    seedBtn.textContent = '❌ Failed';
    seedBtn.disabled = false;
  }
});

// ── Clear OPFS data ─────────────────────────────────────────────────────────
clearBtn.addEventListener('click', async () => {
  if (!confirm('This will delete all OPFS data and reload the page. Continue?')) return;
  clearBtn.disabled = true;
  clearBtn.textContent = '⏳ Clearing…';
  addLog('🗑 Clearing OPFS data…', 'warn');
  try {
    if (db) {
      // 1. Tell Rust to flush, truncate, and CLOSE the OPFS sync handle.
      //    Without this the browser throws "No modification allowed" on removeEntry.
      await db.clearOpfs();
      // 2. Now it's safe to kill the worker thread.
      db.terminate();
      db = null;
    }
    addLog('✅ OPFS data cleared — reloading…', 'success');
    setTimeout(() => location.reload(), 800);
  } catch (e) {
    addLog('❌ Clear failed: ' + e.message, 'error');
    clearBtn.textContent = '🗑 Clear OPFS Data';
    clearBtn.disabled = false;
  }
});

// ── Boot ─────────────────────────────────────────────────────────────────────
initDB();
