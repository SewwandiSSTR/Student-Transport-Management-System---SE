'use strict';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

let db = {}, me = null, view = '', csrf = '';
let activePortalTab = 'login'; // 'login', 'register', 'routes'
let registerRole = 'parent'; // 'parent', 'driver'
let searchQuery = ''; // Global search query (FR12)

// Driver Operations State
let driverActiveStopIdx = 1;
let driverInspectionCertified = false;
let driverInspection = { brakes: true, tyres: true, doors: true, firstaid: true, seatbelts: true, lights: true };
let driverDelayAlert = null;
let manifestSearch = '';
let driverBoardingTimes = {};
let driverChildCheckmateVerified = false;
let driverSimSpeed = 38;

// Live Transit Checkpoints Preview State
let previewRouteId = 1; // 1 = Negombo - Seeduwa, 2 = Ja-Ela - Wattala
let previewShift = 'morning'; // 'morning' or 'afternoon'
let previewActiveStopIndex = 2; // Katana Junction is approaching now
let previewSelectedCheckpoint = 2; // Currently selected in detail inspector

const PREVIEW_ROUTES = {
  1: {
    id: 1,
    name: 'Negombo – Seeduwa Express Route',
    vehiclePlate: 'NB-4821',
    vehicleCap: 30,
    driverName: 'Sunil Perera',
    driverPhone: '077 123 4567',
    driverLicense: 'B1234567',
    stops: [
      {
        name: 'Negombo Town Terminal',
        landmark: 'Central Bus Stand, Clock Tower Bay',
        suburb: 'Negombo Central',
        icon: '📍',
        timeMorning: '06:45 AM',
        timeAfternoon: '02:40 PM',
        desc: 'Primary fleet terminal checkpoint. Comprehensive pre-trip driver checklist (tyres, brakes, safety belts, first-aid kit) and route commencement.',
        students: ['Pre-Trip Inspection Logged', 'Fleet Master Roster Sync'],
        safetyBadges: ['Depot CCTV Sync', 'GPS Ping Calibrated', '35m Verified Safety Zone'],
        guardianProtocol: 'Automated fleet launch broadcast dispatched to all registered guardians.',
        coordinates: '7.2084° N, 79.8358° E'
      },
      {
        name: 'Kochchikade Suburb Hub',
        landmark: 'St. Anthony’s Highway Pavilion',
        suburb: 'Kochchikade North',
        icon: '🎒',
        timeMorning: '06:58 AM',
        timeAfternoon: '02:25 PM',
        desc: 'Student boarding zone. High-visibility zebra crossing with sheltered curb bay. Verified manifest check-in for registered pupils.',
        students: ['Dineth Fernando (Gr. 5)', 'Sasha Fernando (Gr. 2)'],
        safetyBadges: ['Sheltered Pavement Bay', 'High-Vis Zebra Zone', 'QR Boarding Scan'],
        guardianProtocol: 'Real-time SMS alert sent to guardian Nimali Fernando upon child boarding.',
        coordinates: '7.2612° N, 79.8624° E'
      },
      {
        name: 'Katana Junction Crossroad',
        landmark: 'Katana Community Safety Refuge',
        suburb: 'Katana South',
        icon: '🛡️',
        timeMorning: '07:12 AM',
        timeAfternoon: '02:10 PM',
        desc: 'Designated safe pavement waiting shelter with traffic warden supervision. Geo-fenced perimeter triggers proximity alert when bus is 500m away.',
        students: ['Ravindu Jayasuriya (Gr. 8)'],
        safetyBadges: ['Traffic Warden On-Duty', 'Pedestrian Guardrail', '25m Speed-Calmed Bay'],
        guardianProtocol: 'Proximity push notification sent to guardian Ruwan Jayasuriya (bus 2 mins away).',
        coordinates: '7.1824° N, 79.8890° E'
      },
      {
        name: 'Seeduwa Bypass Interchange',
        landmark: 'A3 Expressway Interchange Feeder Bay',
        suburb: 'Seeduwa Town',
        icon: '⚡',
        timeMorning: '07:22 AM',
        timeAfternoon: '01:58 PM',
        desc: 'Expressway corridor transit station. Automated bus telemetry verification (speed compliance log capped at 45 km/h, passenger manifest lock).',
        students: ['Express Corridor Transit (All Aboard)'],
        safetyBadges: ['Telemetry Speed Monitor', 'HD Dual Dashcam', 'Overload Sensor Clear'],
        guardianProtocol: 'Highway corridor transit progress sync logged to central school portal.',
        coordinates: '7.1325° N, 79.8712° E'
      },
      {
        name: 'School',
        landmark: 'Main School North Gate & Safe Reception',
        suburb: 'School Grounds',
        icon: '🏫',
        timeMorning: '07:25 AM',
        timeAfternoon: '01:45 PM',
        desc: 'Final arrival gate. Safe perimeter barrier, teacher supervision, driver student headcount reconciliation, and electronic attendance sign-off.',
        students: ['All 30 Seats Cleared', '100% Manifest Reconciled'],
        safetyBadges: ['Dedicated Drop-Off Loop', 'School Security Staff', 'Electronic Gate Log'],
        guardianProtocol: 'Safe Arrival SMS broadcast dispatched to all registered parents.',
        coordinates: '7.1005° N, 79.8821° E'
      }
    ]
  },
  2: {
    id: 2,
    name: 'Ja-Ela – Wattala Feeder Route',
    vehiclePlate: 'NC-7305',
    vehicleCap: 4,
    driverName: 'Kamal Silva',
    driverPhone: '071 987 6543',
    driverLicense: 'B7654321',
    stops: [
      {
        name: 'Ja-Ela Central Station',
        landmark: 'Ja-Ela Railway Approach Bay',
        suburb: 'Ja-Ela Urban Bay',
        icon: '📍',
        timeMorning: '07:00 AM',
        timeAfternoon: '02:30 PM',
        desc: 'Feeder van departure terminal. Driver vehicle readiness check and initial route activation.',
        students: ['Pre-Trip Readiness Verified'],
        safetyBadges: ['Depot GPS Sync', 'Driver Breathalyzer Check', 'First Aid Checked'],
        guardianProtocol: 'Feeder shuttle launch notification sent.',
        coordinates: '7.0782° N, 79.8920° E'
      },
      {
        name: 'Ekala Industrial Crossway',
        landmark: 'Ekala Clock Tower Shelter',
        suburb: 'Ekala Industrial Area',
        icon: '🎒',
        timeMorning: '07:12 AM',
        timeAfternoon: '02:15 PM',
        desc: 'Sheltered pickup station with wide walkway for safe pupil passenger boarding.',
        students: ['Local Feeder Cluster Pupils'],
        safetyBadges: ['Covered Waiting Bay', 'CCTV Monitored', 'Low Speed Corridor'],
        guardianProtocol: 'Station arrival timestamp recorded.',
        coordinates: '7.0945° N, 79.9215° E'
      },
      {
        name: 'Kandana Crossroad',
        landmark: 'Near St. Sebastian’s Gate Bay',
        suburb: 'Kandana',
        icon: '🛡️',
        timeMorning: '07:22 AM',
        timeAfternoon: '02:00 PM',
        desc: 'Pavement shelter boarding point. Direct student boarding verification with driver checklist.',
        students: ['Ishara Wijesinghe (Gr. 6)'],
        safetyBadges: ['Pedestrian Traffic Signals', 'Guard Rail Refuge', 'Speed Warden Active'],
        guardianProtocol: 'Boarding confirmation sent to Chamari Wijesinghe.',
        coordinates: '7.0514° N, 79.8985° E'
      },
      {
        name: 'School',
        landmark: 'Junior School South Gate & Security Barrier',
        suburb: 'School Grounds',
        icon: '🏫',
        timeMorning: '07:25 AM',
        timeAfternoon: '01:45 PM',
        desc: 'Dedicated arrival terminal. Pupil handover to junior school staff and van safety checklist sign-off.',
        students: ['Van Passengers Handed Over'],
        safetyBadges: ['Staff Handover Protocol', 'Off-Street Drop Zone', 'Security Guarded'],
        guardianProtocol: 'Final arrival verified SMS alert sent.',
        coordinates: '7.1005° N, 79.8821° E'
      }
    ]
  }
};

function msg(text, bad) {
  const e = $('#toast');
  if (!e) return;
  e.textContent = text;
  e.className = bad ? 'bad' : '';
  e.style.display = 'block';
  clearTimeout(msg.t);
  msg.t = setTimeout(() => { e.style.display = 'none'; }, 3800);
}

async function api(action, body) {
  const options = body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF': csrf },
    body: JSON.stringify(body)
  } : {};

  try {
    const res = await fetch('api.php?a=' + action, options);
    const json = await res.json();
    if (!res.ok) {
      msg(json.error || 'Request failed.', 1);
      return null;
    }
    return json;
  } catch (err) {
    msg('Cannot reach the server. Make sure Apache & MySQL are running in XAMPP.', 1);
    return null;
  }
}

async function refresh() {
  const data = await api('state');
  if (!data) return;
  csrf = data.csrf;
  me = data.me;
  db = data;
  render();
}

const opts = (arr, fn) => (arr || []).map(x => `<option value="${esc(x.id)}">${esc(fn(x))}</option>`).join('');
const R = id => (db.routes || []).find(r => r.id == id) || {};
const V = id => (db.vehicles || []).find(v => v.id == id) || {};
const D = id => (db.drivers || []).find(d => d.id == id) || {};
const loadCount = r => (db.students || []).filter(s => s.routeId == r.id).length;

const lineTimeline = (r, hl = []) => `
  <ol class="line">${(r.stops || []).map(s => {
    const count = (db.students || []).filter(x => x.routeId == r.id && x.stop === s).length;
    const isHl = hl.includes(s);
    return `
      <li class="${isHl ? 'me' : ''}">
        <b>${esc(s)}</b>
        ${count && me && me.role !== 'parent' ? `<small>${count} pick-up${count > 1 ? 's' : ''}</small>` : ''}
        ${isHl ? `<small style="color:var(--bad);font-weight:700;">★ Your Child's Stop</small>` : ''}
      </li>
    `;
  }).join('')}</ol>
`;

const meterBar = r => {
  const cap = V(r.vehicleId).capacity || 0;
  const count = loadCount(r);
  const pct = cap ? Math.min(100, Math.round((count / cap) * 100)) : 0;
  return `
    <div class="bar ${count >= cap ? 'full' : ''}" role="img" aria-label="${count} of ${cap} seats used">
      <span style="width:${pct}%"></span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:0.85rem;" class="muted">
      <span><b>${count}</b> / ${cap} seats occupied</span>
      <span style="color:var(--primary-orange);font-weight:700;">${pct}% used</span>
    </div>
  `;
};

const tagStatus = status => {
  if (!status) return `<span class="tag">Pending pickup</span>`;
  return `<span class="tag ${status === 'boarded' ? 'ok' : 'bad'}">${status === 'boarded' ? '✓ Boarded' : '✕ Absent'}</span>`;
};

const delBtn = (kind, id) => `
  <button class="btn s" data-a="del" data-k="${kind}" data-id="${id}" title="Remove record">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:2px"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
    Remove
  </button>
`;

// Simplified Nav definitions based on Proposal Roles & Modules (No 3D)
const NAV = {
  admin: [
    ['dash', 'Overview', '📊'],
    ['students', 'Students & Allocation', '🎓'],
    ['routes', 'Routes & Schedules', '🗺️'],
    ['fleet', 'Vehicles & Drivers', '🚐'],
    ['reports', 'Transport Reports', '📄']
  ],
  driver: [
    ['run', "Active Run Cockpit", '🚍'],
    ['manifest', "Passenger Manifest", '👥'],
    ['inspection', "Pre-Trip Inspection (DVIR)", '🔍'],
    ['safety', "Safety & Emergency Dispatch", '🛡️']
  ],
  parent: [
    ['kids', 'My Children Transport', '👨‍👩‍👧']
  ]
};

// =============================================================
// Inner Pages Views Dictionary (Simplified Flow + Clean Theme)
// =============================================================
const V_ = {
  // 1. Admin Overview / Dashboard
  dash() {
    const attList = Object.values(db.att || {});
    const boarded = attList.filter(a => a === 'boarded').length;
    const absent = attList.filter(a => a === 'absent').length;

    const q = searchQuery.toLowerCase().trim();
    const filteredRoutes = (db.routes || []).filter(r =>
      !q || r.name.toLowerCase().includes(q) || (r.stops || []).some(s => s.toLowerCase().includes(q))
    );

    return `
      <div class="page-header-row">
        <div class="page-titles">
          <h2>Transport Operations Overview</h2>
          <p>Real-time school shuttle dispatching, seat capacity and passenger check-in</p>
        </div>
        <div class="page-header-actions">
          <button class="pill-btn-orange" data-a="nav" data-id="students">
            + Allocate Student
          </button>
          <button class="pill-btn-dark" data-a="nav" data-id="reports">
            📄 View Reports
          </button>
        </div>
      </div>

      <!-- Stats Grid matching bottom section of reference photo -->
      <div class="inner-stats-grid">
        <div class="dark-stat-card">
          <div class="stat-dot-head">Registered Students</div>
          <div class="stat-big-val">${db.students.length}</div>
          <div class="stat-sub">Allocated across active routes</div>
        </div>
        <div class="dark-stat-card">
          <div class="stat-dot-head">Active Routes</div>
          <div class="stat-big-val">${db.routes.length}</div>
          <div class="stat-sub">Scheduled morning & afternoon shuttles</div>
        </div>
        <div class="dark-stat-card">
          <div class="stat-dot-head">Today's Boarded</div>
          <div class="stat-big-val" style="color:#34d399;">${boarded}</div>
          <div class="stat-sub">Verified safe check-ins today</div>
        </div>
        <div class="dark-stat-card">
          <div class="stat-dot-head">Reported Absent</div>
          <div class="stat-big-val" style="color:#f87171;">${absent}</div>
          <div class="stat-sub">Excused or pending check-ins</div>
        </div>
      </div>

      <!-- Active Routes Grid -->
      <div class="card-title-row">
        <h3>Active School Transport Routes & Seat Availability</h3>
        <span style="font-size:0.88rem;color:var(--text-muted);">${filteredRoutes.length} route${filteredRoutes.length === 1 ? '' : 's'} running</span>
      </div>

      <div class="grid">
        ${filteredRoutes.map(r => {
          const cap = V(r.vehicleId).capacity || 0;
          const count = loadCount(r);
          const available = Math.max(0, cap - count);
          return `
            <div class="card highlight">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.4rem;">
                <b>${esc(r.name)}</b>
                <span class="tag ${count >= cap ? 'bad' : 'ok'}">${count >= cap ? 'Full' : `${available} seats left`}</span>
              </div>
              <div style="font-size:0.88rem;color:var(--text-muted);margin-bottom:0.8rem;">
                ⏰ Departs <b>${esc(r.time)}</b> · 🚐 ${esc(V(r.vehicleId).plate || 'Unassigned')} · 👤 ${esc(D(r.driverId).name || 'Unassigned')}
              </div>
              ${meterBar(r)}
              <div style="margin-top:1.1rem;display:flex;gap:0.6rem;align-items:center;">
                <button class="pill-btn-orange" style="padding:0.4rem 1.1rem;font-size:0.82rem;" data-a="nav" data-id="routes">
                  View Stops & Schedule →
                </button>
              </div>
            </div>
          `;
        }).join('') || '<p class="muted">No matching routes found.</p>'}
      </div>
    `;
  },

  // 2. Students & Allocation (FR03, FR04, FR09)
  students() {
    const q = searchQuery.toLowerCase().trim();
    const filtered = (db.students || []).filter(s =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.grade || '').toLowerCase().includes(q) ||
      (s.stop || '').toLowerCase().includes(q) ||
      (R(s.routeId).name || '').toLowerCase().includes(q)
    );

    return `
      <div class="page-header-row">
        <div class="page-titles">
          <h2>Student Transportation Management</h2>
          <p>Register students, assign designated pick-up stops, and verify seat allocation</p>
        </div>
        <button class="pill-btn-orange" onclick="document.getElementById('quickStudentBox').scrollIntoView({behavior:'smooth'})">
          + Register New Student
        </button>
      </div>

      <!-- Quick Add Student Form Card with Live Capacity Feedback -->
      <div id="quickStudentBox" class="quick-action-box">
        <h3 style="margin-bottom:0.4rem;">Register Student & Assign Transport Route</h3>
        <p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:1.2rem;">
          Assign the student to an available route. The system automatically validates vehicle capacity to prevent overcrowding.
        </p>

        <form data-f="addStudent">
          <div class="row">
            <div>
              <label for="sn">Student Full Name</label>
              <input id="sn" name="name" required maxlength="60" placeholder="e.g. Dineth Fernando">
            </div>
            <div>
              <label for="sg">Grade</label>
              <select id="sg" name="grade">
                ${[...Array(13).keys()].map(g => `<option>Grade ${g + 1}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="sp">Guardian Login Account</label>
              <select id="sp" name="parent">
                ${(db.parents || []).map(p => `<option>${esc(p)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="sr">Transport Route</label>
              <select id="sr" name="routeId" onchange="window.updateCapacityPreview()">
                ${opts(db.routes, r => r.name)}
              </select>
            </div>
            <div>
              <label for="ss">Pick-up Stop</label>
              <select id="ss" name="stop"></select>
            </div>
          </div>

          <!-- Real-Time Capacity Preview for selected route -->
          <div id="routeCapacityPreview" class="live-capacity-indicator capacity-ok">
            <span>Checking route capacity...</span>
          </div>

          <div style="margin-top:1.2rem;display:flex;gap:0.75rem;">
            <button class="pill-btn-orange">
              Confirm & Register Student
            </button>
          </div>
        </form>
      </div>

      <!-- Students Table -->
      <div class="card scroll">
        <div class="card-title-row">
          <h3>Registered Students (${filtered.length})</h3>
          <span style="font-size:0.85rem;color:var(--text-muted);">Instant search applied: "${esc(q || 'All')}"</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Grade</th>
              <th>Assigned Route</th>
              <th>Pick-up Stop</th>
              <th>Parent / Guardian</th>
              <th>Today's Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(s => `
              <tr>
                <td><b>${esc(s.name)}</b></td>
                <td><span class="tag">${esc(s.grade)}</span></td>
                <td><b>${esc(R(s.routeId).name || 'Unassigned')}</b></td>
                <td>📍 ${esc(s.stop)}</td>
                <td>👤 ${esc(s.parent)}</td>
                <td>${tagStatus(db.att[s.id])}</td>
                <td>${delBtn('student', s.id)}</td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">No students found matching your criteria.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  },

  // 3. Routes & Schedules (FR07, FR08, FR10, FR11)
  routes() {
    return `
      <div class="page-header-row">
        <div class="page-titles">
          <h2>Routes & Schedules Management</h2>
          <p>Organize bus corridors, departure timetables, vehicle allocation and certified drivers</p>
        </div>
        <button class="pill-btn-orange" onclick="document.getElementById('quickRouteBox').scrollIntoView({behavior:'smooth'})">
          + Add New Route
        </button>
      </div>

      <div class="grid">
        ${db.routes.map(r => `
          <div class="card highlight">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.4rem;">
              <h3>${esc(r.name)}</h3>
              <span class="tag ok">Active Corridor</span>
            </div>
            <div style="font-size:0.88rem;color:var(--text-muted);margin-bottom:0.8rem;">
              ⏰ Departs <b>${esc(r.time)}</b> · 🚐 ${esc(V(r.vehicleId).plate || 'No vehicle')} · 👤 ${esc(D(r.driverId).name || 'No driver')}
            </div>
            ${lineTimeline(r)}
            ${meterBar(r)}
            <div style="margin-top:1.2rem;display:flex;gap:0.6rem;align-items:center;">
              ${delBtn('route', r.id)}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Add Route Drawer -->
      <div id="quickRouteBox" class="quick-action-box" style="margin-top:2rem;">
        <h3 style="margin-bottom:0.3rem;">Create New Transport Route & Assign Resources</h3>
        <p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:1.2rem;">
          Assign a dedicated vehicle and certified driver to ensure accountability.
        </p>
        <form data-f="addRoute">
          <div class="row">
            <div>
              <label for="rn">Route Name</label>
              <input id="rn" name="name" required maxlength="60" placeholder="e.g. Negombo – Seeduwa">
            </div>
            <div>
              <label for="rt">Departure Time</label>
              <input id="rt" name="time" type="time" required value="06:45">
            </div>
            <div>
              <label for="rv">Assigned Vehicle</label>
              <select id="rv" name="vehicleId">${opts(db.vehicles, v => v.plate + ' (' + v.capacity + ' seats)')}</select>
            </div>
            <div>
              <label for="rd">Assigned Driver</label>
              <select id="rd" name="driverId">${opts(db.drivers, d => d.name)}</select>
            </div>
          </div>
          <label for="rs">Pick-up Stops in Order (Separated by Commas)</label>
          <textarea id="rs" name="stops" rows="2" required placeholder="Negombo Town, Kochchikade, Katana, Seeduwa"></textarea>
          <small style="color:var(--text-muted);display:block;margin-top:0.3rem;">Note: "School" will automatically be appended as the destination stop.</small>
          <button class="pill-btn-orange" style="margin-top:1.2rem;">Save Route & Schedule</button>
        </form>
      </div>
    `;
  },

  // 4. Vehicles & Drivers (FR05, FR06)
  fleet() {
    return `
      <div class="page-header-row">
        <div class="page-titles">
          <h2>Fleet Vehicles & Certified Drivers</h2>
          <p>Maintain vehicle safety records, seating capacities and licensed driver contacts</p>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr;">
        <!-- Vehicles Column -->
        <div>
          <div class="card scroll">
            <h3>Registered Vehicles (${db.vehicles.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Capacity</th>
                  <th>Assigned Route</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${db.vehicles.map(v => {
                  const assigned = (db.routes || []).find(r => r.vehicleId == v.id);
                  return `
                    <tr>
                      <td><b>${esc(v.plate)}</b></td>
                      <td>${v.capacity} seats</td>
                      <td>${assigned ? `<span class="tag ok">${esc(assigned.name)}</span>` : '<span class="tag">Available</span>'}</td>
                      <td>${delBtn('vehicle', v.id)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <h4 style="margin-top:1.5rem;color:var(--deep-navy);">Register Vehicle</h4>
            <form data-f="addVehicle" class="row">
              <div>
                <label for="vp">Plate Number</label>
                <input id="vp" name="plate" required placeholder="NB-1234" pattern="^[A-Za-z]{2,3}-\\d{4}$">
              </div>
              <div>
                <label for="vc">Seats</label>
                <input id="vc" name="capacity" type="number" min="1" max="60" required placeholder="30">
              </div>
              <div style="display:flex;align-items:flex-end;">
                <button class="pill-btn-orange" style="width:100%;padding:0.7rem;">+ Add</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Drivers Column -->
        <div>
          <div class="card scroll">
            <h3>Licensed Drivers (${db.drivers.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Phone</th>
                  <th>License</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${db.drivers.map(d => `
                  <tr>
                    <td><b>${esc(d.name)}</b></td>
                    <td>📞 ${esc(d.phone)}</td>
                    <td><code>${esc(d.license)}</code></td>
                    <td>${delBtn('driver', d.id)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <h4 style="margin-top:1.5rem;color:var(--deep-navy);">Register Driver</h4>
            <form data-f="addDriver" class="row">
              <div>
                <label for="dn">Full Name</label>
                <input id="dn" name="name" required maxlength="60" placeholder="e.g. Sunil Perera">
              </div>
              <div>
                <label for="dp">Phone</label>
                <input id="dp" name="phone" required inputmode="numeric" placeholder="0771234567" pattern="^0\\d{9}$">
              </div>
              <div>
                <label for="dl">License</label>
                <input id="dl" name="license" required placeholder="B1234567" pattern="^[A-Za-z]\\d{7}$">
              </div>
              <div style="display:flex;align-items:flex-end;">
                <button class="pill-btn-orange" style="width:100%;padding:0.7rem;">+ Add</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  // 5. Basic Reports (FR15 - Clean Printable & PDF Export)
  reports() {
    const totalStudents = db.students.length;
    const totalCap = db.vehicles.reduce((sum, v) => sum + (v.capacity || 0), 0);
    const boardedToday = Object.values(db.att || {}).filter(a => a === 'boarded').length;

    return `
      <div class="page-header-row">
        <div class="page-titles">
          <h2>School Transportation Reports & Audit</h2>
          <p>Export official daily transport manifest and seat occupancy statistics</p>
        </div>
        <button class="pill-btn-orange" onclick="window.print()">
          🖨️ Print / Save Report (PDF)
        </button>
      </div>

      <div class="report-sheet">
        <div class="report-header">
          <div>
            <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.3rem;">
              <span class="logo-badge" style="width:32px;height:32px;font-size:1rem;">🚌</span>
              <span style="font-family:var(--font-head);font-size:1.6rem;font-weight:800;color:var(--deep-navy);">SafeRide Transport Report</span>
            </div>
            <div style="font-size:0.88rem;color:var(--text-muted);">
              Official School Transport Operations Summary · Generated on ${new Date().toLocaleDateString()}
            </div>
          </div>
          <div style="text-align:right;">
            <div class="tag ok">Status: Verified</div>
          </div>
        </div>

        <div class="row" style="margin-bottom:1.8rem;background:#f8fafc;padding:1.2rem;border-radius:var(--radius-sm);border:1px solid var(--line-light);">
          <div>
            <span style="color:var(--text-muted);font-size:0.85rem;">Total Allocated Students</span>
            <div style="font-size:1.6rem;font-weight:800;color:var(--deep-navy);">${totalStudents}</div>
          </div>
          <div>
            <span style="color:var(--text-muted);font-size:0.85rem;">Fleet Total Capacity</span>
            <div style="font-size:1.6rem;font-weight:800;color:var(--deep-navy);">${totalCap} seats</div>
          </div>
          <div>
            <span style="color:var(--text-muted);font-size:0.85rem;">Boarded Today</span>
            <div style="font-size:1.6rem;font-weight:800;color:var(--ok);">${boardedToday}</div>
          </div>
          <div>
            <span style="color:var(--text-muted);font-size:0.85rem;">Active Corridors</span>
            <div style="font-size:1.6rem;font-weight:800;color:var(--deep-navy);">${db.routes.length}</div>
          </div>
        </div>

        <h4 style="margin-bottom:0.8rem;color:var(--deep-navy);">Route Occupancy & Resource Allocation</h4>
        <table>
          <thead>
            <tr>
              <th>Route Name</th>
              <th>Departure Time</th>
              <th>Assigned Vehicle</th>
              <th>Assigned Driver</th>
              <th>Capacity Usage</th>
              <th>Available Seats</th>
            </tr>
          </thead>
          <tbody>
            ${db.routes.map(r => {
              const cap = V(r.vehicleId).capacity || 0;
              const count = loadCount(r);
              const avail = Math.max(0, cap - count);
              return `
                <tr>
                  <td><b>${esc(r.name)}</b></td>
                  <td>${esc(r.time)}</td>
                  <td>${esc(V(r.vehicleId).plate || 'None')} (${cap} seats)</td>
                  <td>${esc(D(r.driverId).name || 'None')} (${esc(D(r.driverId).phone || '-')})</td>
                  <td><b>${count}</b> / ${cap} seats (${cap ? Math.round(count / cap * 100) : 0}%)</td>
                  <td><span class="tag ${avail > 0 ? 'ok' : 'bad'}">${avail > 0 ? `${avail} seats free` : 'Route Full'}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <h4 style="margin-top:2rem;margin-bottom:0.8rem;color:var(--deep-navy);">Student Manifest & Checkpoint Allocation</h4>
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Grade</th>
              <th>Route</th>
              <th>Pick-up Stop</th>
              <th>Guardian Contact</th>
              <th>Status Today</th>
            </tr>
          </thead>
          <tbody>
            ${db.students.map(s => `
              <tr>
                <td><b>${esc(s.name)}</b></td>
                <td>${esc(s.grade)}</td>
                <td>${esc(R(s.routeId).name || '-')}</td>
                <td>📍 ${esc(s.stop)}</td>
                <td>${esc(s.parent)}</td>
                <td>${tagStatus(db.att[s.id])}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // 6. Driver Active Cockpit & Live Checkpoints (Advanced Suite)
  run() {
    const r = (db.routes || [])[0];
    if (!r) {
      return `
        <div class="page-header-row">
          <div class="page-titles">
            <h2>Today's Route Schedule</h2>
            <p>No route is currently assigned to your driver account.</p>
          </div>
        </div>
      `;
    }

    const stops = r.stops || [];
    if (driverActiveStopIdx >= stops.length) driverActiveStopIdx = 0;
    const activeStopName = stops[driverActiveStopIdx] || stops[0] || 'School';
    const isFirstStop = driverActiveStopIdx === 0;
    const isLastStop = driverActiveStopIdx === stops.length - 1;

    // Student counts
    const routeStudents = (db.students || []).filter(s => s.routeId == r.id);
    const stopStudents = routeStudents.filter(s => s.stop === activeStopName);
    const boardedCount = routeStudents.filter(s => db.att[s.id] === 'boarded').length;
    const absentCount = routeStudents.filter(s => db.att[s.id] === 'absent').length;
    const pendingCount = routeStudents.filter(s => !db.att[s.id]).length;
    const cap = V(r.vehicleId).capacity || 30;
    const occPct = Math.min(100, Math.round((boardedCount / cap) * 100));

    return `
      <!-- Driver Mission Control Bar -->
      <div class="driver-mission-card">
        <div class="driver-mission-top">
          <div>
            <div class="driver-badge-row">
              <span class="driver-beacon">
                <span class="driver-pulse-dot"></span>
                <span>Active Live Cockpit</span>
              </span>
              <span class="tag" style="background:rgba(255,255,255,0.12);color:#fff;border-color:rgba(255,255,255,0.2);">
                Shift: Morning Inbound (${esc(r.time)})
              </span>
              <span class="tag ok">GPS Ping Active</span>
              <span class="tag" style="background:rgba(249,115,22,0.2);color:#fdba74;border-color:var(--primary-orange);">
                Speed Limit: 40 km/h Zone
              </span>
            </div>
            <h2 style="color:#ffffff;margin:0 0 0.5rem;font-size:2.1rem;font-weight:800;letter-spacing:-0.02em;text-shadow:0 2px 10px rgba(0,0,0,0.5);">
              ${esc(r.name)} · <span class="bus-plate-badge">${esc(V(r.vehicleId).plate || 'NB-4821')}</span>
            </h2>
            <div style="font-size:0.95rem;color:#cbd5e1;line-height:1.6;">
              <span style="color:#94a3b8;">Driver:</span> <strong style="color:#ffffff;">${esc(me.name)}</strong> · 
              <span style="color:#94a3b8;">Scheduled Departure:</span> <strong style="color:#38bdf8;">${esc(r.time)}</strong> · 
              <span style="color:#94a3b8;">Next Stop:</span> <strong style="color:#fbbf24;background:rgba(245,158,11,0.2);padding:0.15rem 0.5rem;border-radius:4px;border:1px solid rgba(245,158,11,0.4);">${esc(activeStopName)}</strong>
            </div>
          </div>

          <div class="driver-controls-row">
            <button type="button" class="driver-advance-btn" data-a="driver-next-stop" title="Advance to next checkpoint">
              <span>${isLastStop ? '🏁 Complete Route Run' : '▶ Next Checkpoint ➔'}</span>
            </button>
            <button type="button" class="btn bad" data-a="driver-sos" title="Dispatch emergency SOS">
              🚨 SOS
            </button>
          </div>
        </div>

        ${driverDelayAlert ? `
          <div class="driver-alert-bar">
            <div style="display:flex;align-items:center;gap:0.6rem;">
              <span>⚠️</span>
              <b>Delay Broadcast Active:</b> ${esc(driverDelayAlert)}
            </div>
            <button type="button" class="btn s" data-a="driver-clear-delay" style="background:#fff;color:#ef4444;">Dismiss</button>
          </div>
        ` : ''}

        <!-- Live Seat Meter & Occupancy Stats Inside Mission Card -->
        <div style="background:rgba(15,23,42,0.85);padding:1.1rem 1.3rem;border-radius:var(--radius-md);margin-top:1.2rem;border:1px solid rgba(255,255,255,0.15);box-shadow:inset 0 2px 4px rgba(0,0,0,0.3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;font-size:0.92rem;">
            <span style="color:#ffffff;font-weight:600;"><strong style="color:#ffffff;">Bus Passenger Occupancy:</strong> <span style="color:#38bdf8;font-weight:800;font-size:1.05rem;">${boardedCount}</span> / <span style="color:#e2e8f0;">${cap} seats</span></span>
            <span style="color:#fb923c;font-weight:800;background:rgba(249,115,22,0.25);padding:0.2rem 0.6rem;border-radius:4px;border:1px solid rgba(249,115,22,0.4);">${occPct}% Capacity</span>
          </div>
          <div class="bar" style="height:10px;background:rgba(255,255,255,0.15);margin-bottom:0.9rem;border-radius:999px;overflow:hidden;">
            <span style="width:${occPct}%;background:var(--orange-gradient);display:block;height:100%;border-radius:999px;"></span>
          </div>
          <div style="display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.88rem;">
            <span style="color:#e2e8f0;">✓ Boarded: <b style="color:#34d399;font-weight:800;font-size:0.95rem;">${boardedCount}</b></span>
            <span style="color:#e2e8f0;">✕ Absent: <b style="color:#f87171;font-weight:800;font-size:0.95rem;">${absentCount}</b></span>
            <span style="color:#e2e8f0;">⏳ Pending Pickup: <b style="color:#fbbf24;font-weight:800;font-size:0.95rem;">${pendingCount}</b></span>
            <span style="color:#e2e8f0;">Total Manifest: <b style="color:#ffffff;font-weight:800;">${routeStudents.length} Students</b></span>
          </div>
        </div>
      </div>

      <!-- Route Stepper Timeline -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
        <h4 style="margin:0;color:var(--deep-navy);">Route Checkpoint Progression</h4>
        <span style="font-size:0.82rem;color:var(--text-muted);">Checkpoint ${driverActiveStopIdx + 1} of ${stops.length}</span>
      </div>
      <div class="driver-stepper-container">
        ${stops.map((s, idx) => {
          const isCurrent = idx === driverActiveStopIdx;
          const isPassed = idx < driverActiveStopIdx;
          const count = routeStudents.filter(x => x.stop === s).length;
          return `
            <button type="button" class="driver-step-chip ${isCurrent ? 'active' : (isPassed ? 'passed' : '')}" data-a="driver-select-stop" data-idx="${idx}">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span class="step-seq">${isPassed ? '✓' : (idx + 1)}</span>
                ${isCurrent ? `<span class="tag ok" style="font-size:0.68rem;padding:0.1rem 0.4rem;">Approaching</span>` : ''}
              </div>
              <span class="step-name">${esc(s)}</span>
              <span class="step-meta">${count ? `${count} pupil${count > 1 ? 's' : ''}` : 'Terminal'}</span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Active Checkpoint Spotlight Card -->
      <div class="driver-stop-spotlight">
        <div class="stop-spotlight-head">
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
              <span class="tag-orange" style="font-size:0.75rem;padding:0.15rem 0.5rem;">Current Station Focus</span>
              <span style="font-size:0.84rem;color:var(--text-muted);">Stop #${driverActiveStopIdx + 1}</span>
            </div>
            <h3 style="margin:0;font-size:1.55rem;color:var(--deep-navy);">📍 ${esc(activeStopName)}</h3>
            <p style="margin:0.25rem 0 0;color:var(--text-muted);font-size:0.88rem;">
              Designated safe pick-up bay. Verify boarding manifest before departing.
            </p>
          </div>

          <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;">
            ${stopStudents.length > 1 ? `
              <button type="button" class="pill-btn-orange" style="padding:0.5rem 1.1rem;font-size:0.85rem;" data-a="driver-mark-all-stop" data-stop="${esc(activeStopName)}">
                ✓ Mark All Boarded Here
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Student Boarding Cards at This Stop -->
        ${stopStudents.length ? `
          <div style="margin-bottom:0.6rem;font-size:0.88rem;color:var(--text-muted);">
            <b>${stopStudents.length} Student${stopStudents.length > 1 ? 's' : ''}</b> scheduled for this stop:
          </div>
          ${stopStudents.map(st => {
            const status = db.att[st.id];
            return `
              <div class="driver-pupil-card ${status || ''}">
                <div style="display:flex;align-items:center;gap:0.9rem;">
                  <div class="pupil-avatar">
                    ${esc(st.name[0].toUpperCase())}
                  </div>
                  <div>
                    <div style="font-size:1.1rem;font-weight:800;color:var(--deep-navy);">
                      ${esc(st.name)}
                    </div>
                    <div style="font-size:0.84rem;color:var(--text-muted);display:flex;gap:0.5rem;align-items:center;margin-top:0.2rem;">
                      <span class="tag ok">${esc(st.grade)}</span>
                      <span>Guardian: <b>${esc(st.parent)}</b></span>
                      <a href="tel:0771234567" style="color:var(--primary-orange);text-decoration:none;font-weight:700;margin-left:0.5rem;">📞 Call</a>
                    </div>
                  </div>
                </div>

                <div class="driver-board-actions">
                  ${status ? `
                    <span class="tag ${status === 'boarded' ? 'ok' : 'bad'}" style="font-size:0.9rem;padding:0.4rem 0.8rem;">
                      ${status === 'boarded' ? '✓ Boarded' : '✕ Absent'}
                    </span>
                  ` : ''}
                  <button type="button" class="btn-board-big ${status === 'boarded' ? 'active' : ''}" data-a="att" data-id="${st.id}" data-v="boarded" title="Mark child boarded">
                    ✓ Boarded
                  </button>
                  <button type="button" class="btn-absent-big ${status === 'absent' ? 'active' : ''}" data-a="att" data-id="${st.id}" data-v="absent" title="Mark child absent">
                    ✕ Absent
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        ` : `
          <div style="text-align:center;padding:2rem 1rem;background:#f8fafc;border-radius:var(--radius-md);color:var(--text-muted);">
            <div style="font-size:1.8rem;margin-bottom:0.4rem;">🏫</div>
            <b>No student pick-ups scheduled at ${esc(activeStopName)}.</b>
            <p style="margin:0.3rem 0 0;font-size:0.85rem;">Check vehicle mirrors and proceed safely to the next station.</p>
          </div>
        `}
      </div>

      <!-- Quick Action Utilities for Driver -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.2rem;margin-top:1.4rem;">
        <div class="card">
          <h4 style="margin:0 0 0.5rem;color:var(--deep-navy);">📢 Broadcast Route Delay</h4>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.9rem;">
            Instantly push SMS/system notifications to all waiting parents along the corridor.
          </p>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button type="button" class="btn s" data-a="driver-broadcast-delay" data-delay="+5 min heavy traffic">
              +5 min Traffic
            </button>
            <button type="button" class="btn s" data-a="driver-broadcast-delay" data-delay="+10 min road maintenance">
              +10 min Roadwork
            </button>
            <button type="button" class="btn s" data-a="driver-broadcast-delay" data-delay="+15 min weather delay">
              +15 min Rain
            </button>
          </div>
        </div>

        <div class="card">
          <h4 style="margin:0 0 0.5rem;color:var(--deep-navy);">🔍 Daily Vehicle Safety (DVIR)</h4>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.9rem;">
            Pre-trip inspection status for vehicle ${esc(V(r.vehicleId).plate || 'NB-4821')}:
          </p>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
            <span class="tag ${driverInspectionCertified ? 'ok' : 'bad'}">
              ${driverInspectionCertified ? '✅ Certified for Today' : '⚠️ Pending Verification'}
            </span>
            <button type="button" class="btn s" data-a="nav" data-id="inspection">
              Open Inspection Form →
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // 6b. Driver Passenger Manifest
  manifest() {
    const r = (db.routes || [])[0];
    const students = (db.students || []).filter(s => !r || s.routeId == r.id);
    const q = (manifestSearch || '').toLowerCase().trim();
    const filtered = students.filter(s =>
      !q || s.name.toLowerCase().includes(q) || s.stop.toLowerCase().includes(q) || s.parent.toLowerCase().includes(q)
    );

    return `
      <div class="page-header-row">
        <div class="page-titles">
          <h2>Passenger Manifest & Guardian Contacts</h2>
          <p>Complete roster of registered students assigned to your route corridor</p>
        </div>
        <div style="display:flex;gap:0.5rem;">
          <button type="button" class="pill-btn-orange" onclick="window.print()">
            🖨️ Print Manifest
          </button>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:1rem;">
          <div style="display:flex;align-items:center;gap:0.5rem;background:#f1f5f9;border:1px solid var(--line-light);border-radius:var(--radius-full);padding:0.4rem 1rem;flex:1;max-width:400px;">
            <span>🔍</span>
            <input type="text" id="manifestSearchInput" placeholder="Search student name, stop, or guardian..." value="${esc(manifestSearch)}" style="all:unset;width:100%;font-size:0.88rem;">
            ${manifestSearch ? `<button type="button" id="btnClearManifestSearch" style="all:unset;cursor:pointer;color:var(--text-muted);font-weight:700;">✕</button>` : ''}
          </div>
          <span style="font-size:0.88rem;color:var(--text-muted);">Total: <b>${filtered.length} Students</b></span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Grade</th>
              <th>Designated Stop</th>
              <th>Guardian Name</th>
              <th>Guardian Hotline</th>
              <th>Today's Status</th>
              <th>Check-in Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map(s => {
              const status = db.att[s.id];
              return `
                <tr>
                  <td><b>${esc(s.name)}</b></td>
                  <td><span class="tag">${esc(s.grade)}</span></td>
                  <td>📍 <b>${esc(s.stop)}</b></td>
                  <td>${esc(s.parent)}</td>
                  <td><a href="tel:0771234567" style="color:var(--primary-orange);text-decoration:none;font-weight:700;">📞 Call</a></td>
                  <td>${tagStatus(status)}</td>
                  <td>
                    <div style="display:flex;gap:0.35rem;">
                      <button class="btn s ok" data-a="att" data-id="${s.id}" data-v="boarded">✓</button>
                      <button class="btn s bad" data-a="att" data-id="${s.id}" data-v="absent">✕</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="7" class="muted" style="text-align:center;padding:2rem;">No students found matching search.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  },

  // 6c. Driver Pre-Trip Vehicle Inspection (DVIR)
  inspection() {
    const r = (db.routes || [])[0];
    const v = r ? V(r.vehicleId) : {};

    const items = [
      { key: 'brakes', title: 'Service Brakes & Emergency Air System', desc: 'Pedal firmness, brake line pressure, and emergency parking brake hold.' },
      { key: 'tyres', title: 'Tyres, Tread Depth & Wheel Lug Nuts', desc: 'No visible tears, proper inflation pressure (100 PSI), secure lug nuts.' },
      { key: 'doors', title: 'Emergency Exit Doors & Interior Buzzer', desc: 'Rear emergency door opens freely from inside and audible warning buzzer sounds.' },
      { key: 'firstaid', title: 'First Aid Kit & Certified Fire Extinguisher', desc: 'Standard school first-aid supplies stocked, 2kg ABC dry chemical extinguisher pressurized.' },
      { key: 'seatbelts', title: 'Passenger Seatbelts & Cabin Cleanliness', desc: 'All student safety belts latch properly, aisles clear of luggage/tripping hazards.' },
      { key: 'lights', title: 'Headlights, Flashers & Amber School Signal', desc: 'High/low beams, reverse warning buzzer, and front/rear hazard indicators functional.' }
    ];

    return `
      <div class="page-header-row">
        <div class="page-titles">
          <h2>Pre-Trip Vehicle Safety Inspection (DVIR)</h2>
          <p>Daily Driver Vehicle Inspection Report required prior to school passenger transit</p>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <span class="tag ${driverInspectionCertified ? 'ok' : 'bad'}" style="font-size:0.9rem;padding:0.4rem 0.9rem;">
            ${driverInspectionCertified ? '✓ Clearance Certified' : '⚠️ Pending Sign-Off'}
          </span>
        </div>
      </div>

      <div class="card highlight" style="margin-bottom:1.6rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
          <div>
            <h3 style="margin:0 0 0.3rem;">Vehicle Readiness: <b>${esc(v.plate || 'NB-4821')}</b></h3>
            <div style="font-size:0.88rem;color:var(--text-muted);">
              Assigned Route: <b>${esc(r ? r.name : 'Corridor 01')}</b> · Driver: <b>${esc(me.name)}</b> · Date: <b>${new Date().toLocaleDateString()}</b>
            </div>
          </div>
          <div>
            <button type="button" class="pill-btn-orange" data-a="driver-certify-inspection">
              🛡️ Sign & Certify Inspection
            </button>
          </div>
        </div>
      </div>

      <h4 style="margin:0 0 0.6rem;color:var(--deep-navy);">Mandatory 6-Point Safety Checklist</h4>
      <div class="dvir-grid">
        ${items.map(it => {
          const pass = driverInspection[it.key];
          return `
            <div class="dvir-item-card ${pass ? 'passed' : ''}">
              <div>
                <b style="color:var(--deep-navy);font-size:0.95rem;">${esc(it.title)}</b>
                <p style="margin:0.25rem 0 0;font-size:0.82rem;color:var(--text-muted);">${esc(it.desc)}</p>
              </div>
              <button type="button" class="dvir-toggle-btn ${pass ? 'pass' : 'defect'}" data-a="driver-toggle-inspection" data-item="${it.key}">
                ${pass ? '✓ PASS' : '✕ DEFECT'}
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <div class="card" style="margin-top:1.6rem;">
        <h4 style="margin:0 0 0.6rem;color:var(--deep-navy);">Pre-Trip Odometer & Verification Notes</h4>
        <div class="row">
          <div>
            <label>Current Odometer Reading (km)</label>
            <input type="text" value="48,210 km" readonly style="background:#f1f5f9;">
          </div>
          <div>
            <label>Fuel Tank & Battery Health</label>
            <input type="text" value="85% Fuel · Battery 12.6V OK" readonly style="background:#f1f5f9;">
          </div>
        </div>
      </div>
    `;
  },

  // 6d. Driver Safety Protocols & Emergency Dispatch
  safety() {
    return `
      <div class="page-header-row">
        <div class="page-titles">
          <h2>Safety Operations & Emergency Dispatch</h2>
          <p>Rapid emergency protocols, hotlines, and instant parent delay broadcast</p>
        </div>
      </div>

      <!-- High Priority SOS Card -->
      <div class="sos-trigger-card">
        <div>
          <div style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.82rem;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#fecaca;background:rgba(255,255,255,0.12);padding:0.25rem 0.65rem;border-radius:4px;margin-bottom:0.6rem;border:1px solid rgba(255,255,255,0.2);">
            <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;display:inline-block;box-shadow:0 0 8px #ef4444;"></span>
            Emergency Beacon Trigger
          </div>
          <h2 style="color:#ffffff;margin:0 0 0.5rem;font-size:1.95rem;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,0.4);">🚨 Instant Emergency SOS</h2>
          <p style="margin:0;color:#fee2e2;font-size:0.95rem;line-height:1.55;max-width:620px;">
            In case of accident, medical emergency, or severe vehicle breakdown, tap the SOS button to transmit GPS telemetry and notify the Central Transport Office immediately.
          </p>
        </div>
        <div>
          <button type="button" class="sos-big-btn" data-a="driver-sos">
            <span style="font-size:1.35rem;">🚨</span>
            <span>DISPATCH SOS ALERT</span>
          </button>
        </div>
      </div>

      <!-- Quick Delay Broadcast Utility -->
      <div class="card highlight" style="margin-bottom:1.6rem;">
        <h3 style="margin:0 0 0.4rem;">Corridor Delay Notification Dispatcher</h3>
        <p style="color:var(--text-muted);font-size:0.88rem;margin-bottom:1rem;">
          Encountering unexpected delays? Tap a duration below to notify school authorities and guardians.
        </p>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <button type="button" class="pill-delay-btn traffic" data-a="driver-broadcast-delay" data-delay="+5 min traffic delay">
            ⏱️ +5 min Delay (Traffic)
          </button>
          <button type="button" class="pill-delay-btn roadwork" data-a="driver-broadcast-delay" data-delay="+10 min road construction">
            🚧 +10 min Delay (Roadwork)
          </button>
          <button type="button" class="pill-delay-btn weather" data-a="driver-broadcast-delay" data-delay="+15 min inclement weather">
            🌧️ +15 min Delay (Weather)
          </button>
        </div>
      </div>

      <!-- Rapid Dispatch Hotlines Grid -->
      <h4 style="margin:0 0 0.6rem;color:var(--deep-navy);">Dedicated Operations Hotlines</h4>
      <div class="hotline-grid">
        <div class="hotline-card">
          <div>
            <div style="font-size:1.8rem;margin-bottom:0.4rem;">🚌</div>
            <h4 style="margin:0 0 0.3rem;color:var(--deep-navy);">School Transport Desk</h4>
            <p style="font-size:0.85rem;color:var(--text-muted);margin:0;">Chief Coordinator & Dispatcher</p>
          </div>
          <a href="tel:0771234567" class="pill-btn-orange" style="text-align:center;text-decoration:none;display:block;">
            📞 077 123 4567
          </a>
        </div>

        <div class="hotline-card">
          <div>
            <div style="font-size:1.8rem;margin-bottom:0.4rem;">🏫</div>
            <h4 style="margin:0 0 0.3rem;color:var(--deep-navy);">School Main Security</h4>
            <p style="font-size:0.85rem;color:var(--text-muted);margin:0;">School Gate Security Office</p>
          </div>
          <a href="tel:0112345678" class="pill-btn-dark" style="text-align:center;text-decoration:none;display:block;">
            📞 011 234 5678
          </a>
        </div>

        <div class="hotline-card">
          <div>
            <div style="font-size:1.8rem;margin-bottom:0.4rem;">🚑</div>
            <h4 style="margin:0 0 0.3rem;color:var(--deep-navy);">1990 Suwa Seriya</h4>
            <p style="font-size:0.85rem;color:var(--text-muted);margin:0;">National Ambulance Service</p>
          </div>
          <a href="tel:1990" class="btn bad" style="text-align:center;text-decoration:none;display:block;padding:0.6rem;">
            📞 Call 1990
          </a>
        </div>

        <div class="hotline-card">
          <div>
            <div style="font-size:1.8rem;margin-bottom:0.4rem;">👮</div>
            <h4 style="margin:0 0 0.3rem;color:var(--deep-navy);">119 Police Emergency</h4>
            <p style="font-size:0.85rem;color:var(--text-muted);margin:0;">Sri Lanka Emergency Police</p>
          </div>
          <a href="tel:119" class="btn bad" style="text-align:center;text-decoration:none;display:block;padding:0.6rem;">
            📞 Call 119
          </a>
        </div>
      </div>
    `;
  },

  // 7. Parent Children Transport View (FR13)
  kids() {
    const kids = db.students || [];
    return `
      <div class="page-header-row">
        <div class="page-titles">
          <h2>My Children's Transport Details</h2>
          <p>Live vehicle details, assigned stops, driver contact and boarding status</p>
        </div>
      </div>

      ${kids.map(s => {
        const r = R(s.routeId);
        const v = V(r.vehicleId);
        const d = D(r.driverId);
        const status = db.att[s.id];

        return `
          <div class="card highlight">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;">
              <div>
                <h3 style="margin-bottom:0.2rem;font-size:1.4rem;">${esc(s.name)}</h3>
                <span class="tag ok">${esc(s.grade)}</span>
              </div>
              <div>
                ${tagStatus(status)}
              </div>
            </div>

            <div class="row" style="margin-top:1.4rem;background:#f8fafc;padding:1.4rem;border-radius:var(--radius-sm);border:1px solid var(--line-light);">
              <div>
                <div class="muted">Assigned Route</div>
                <b>${esc(r.name || '-')}</b>
              </div>
              <div>
                <div class="muted">School Bus</div>
                <b>${esc(v.plate || '-')} (Departs ${esc(r.time || '-')})</b>
              </div>
              <div>
                <div class="muted">Driver Contact</div>
                <b>${esc(d.name || '-')}</b> <br>
                <a href="tel:${esc(d.phone || '')}" style="color:var(--primary-orange);text-decoration:none;font-weight:700;">📞 ${esc(d.phone || '-')}</a>
              </div>
              <div>
                <div class="muted">Designated Stop</div>
                <b style="color:var(--primary-orange);">📍 ${esc(s.stop)}</b>
              </div>
            </div>

            <h4 style="margin-top:1.6rem;">Route Stations & Child's Stop</h4>
            ${r.stops ? lineTimeline(r, [s.stop]) : ''}
          </div>
        `;
      }).join('') || '<div class="card"><p class="muted">No student profiles linked to your guardian account. Please contact the Transport Office.</p></div>'}
    `;
  }
};

// =============================================================
// Helper: Update Live Route Capacity Indicator in Form (FR09)
// =============================================================
window.updateCapacityPreview = function() {
  const rSelect = $('#sr');
  const previewEl = $('#routeCapacityPreview');
  if (!rSelect || !previewEl) return;

  const rid = rSelect.value;
  const route = R(rid);
  const cap = (V(route.vehicleId).capacity) || 0;
  const count = loadCount(route);
  const free = Math.max(0, cap - count);

  if (count >= cap) {
    previewEl.className = 'live-capacity-indicator capacity-full';
    previewEl.innerHTML = `⚠️ <b>Route is Full!</b> All ${cap} seats on vehicle ${esc(V(route.vehicleId).plate || '')} are assigned. Please choose another route.`;
  } else {
    previewEl.className = 'live-capacity-indicator capacity-ok';
    previewEl.innerHTML = `✓ <b>Route Capacity Available:</b> ${count} of ${cap} seats assigned (${free} free seats remaining on vehicle ${esc(V(route.vehicleId).plate || '')}).`;
  }
};

// =============================================================
// Helper: Render Upgraded Transit Checkpoints Preview (Public Landing)
// =============================================================
function renderTransitCheckpointsSection() {
  const route = PREVIEW_ROUTES[previewRouteId] || PREVIEW_ROUTES[1];
  const stops = route.stops;
  const isMorning = previewShift === 'morning';
  const progressPct = Math.round((previewActiveStopIndex / (stops.length - 1)) * 100);
  const activeStop = stops[previewActiveStopIndex] || stops[0];
  const selectedStop = stops[previewSelectedCheckpoint] || activeStop;

  return `
      <!-- WHITE SCHEDULES & STOPS SECTION (UPGRADED TRANSIT CHECKPOINTS) -->
      <section id="stops" class="section-white">
        <div class="section-container">
          <!-- SECTION TITLE & LIVE TELEMETRY BADGE -->
          <div class="section-head">
            <div class="tag-orange">
              <span class="live-dot"></span>
              <span>Live Fleet Telemetry · Transit Checkpoints</span>
            </div>
            <h2>Active Daily Bus Pick-Up Stations</h2>
            <p>Every stop is geo-verified in sequence with real-time ETA countdowns, automated passenger check-in alerts, and strict student safety protocols.</p>
          </div>

          <!-- INTERACTIVE TRANSIT CONTROLS TOOLBAR -->
          <div class="transit-toolbar">
            <div class="transit-route-tabs">
              <button type="button" class="transit-tab-pill ${previewRouteId === 1 ? 'active' : ''}" data-a="preview-route" data-route="1">
                <span>🚌</span>
                <span>Route 01: Negombo – Seeduwa (NB-4821)</span>
              </button>
              <button type="button" class="transit-tab-pill ${previewRouteId === 2 ? 'active' : ''}" data-a="preview-route" data-route="2">
                <span>🚐</span>
                <span>Route 02: Ja-Ela – Wattala (NC-7305)</span>
              </button>
            </div>

            <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
              <div class="transit-shift-toggles">
                <button type="button" class="shift-btn ${isMorning ? 'active' : ''}" data-a="preview-shift" data-shift="morning">
                  <span>🌅</span> Morning Inbound
                </button>
                <button type="button" class="shift-btn ${!isMorning ? 'active' : ''}" data-a="preview-shift" data-shift="afternoon">
                  <span>🌇</span> Afternoon Return
                </button>
              </div>

              <button type="button" class="simulate-btn" data-a="preview-simulate" title="Simulate bus advancing along checkpoints">
                <span>⚡</span> Simulate Next Stop
              </button>
            </div>
          </div>

          <!-- ROUTE PROGRESS RIBBON / CONNECTED STEPPER -->
          <div class="transit-ribbon-card">
            <div class="ribbon-header-row">
              <div class="ribbon-route-meta">
                <span class="route-badge-plate">${esc(route.vehiclePlate)}</span>
                <div style="font-size:0.95rem;font-weight:700;">
                  ${esc(route.name)}
                  <span style="color:var(--text-light-muted);font-weight:400;font-size:0.85rem;margin-left:0.4rem;">
                    · Capacity: ${esc(route.vehicleCap)} Seats · Driver: ${esc(route.driverName)} (${esc(route.driverPhone)})
                  </span>
                </div>
              </div>

              <div class="transit-live-pulse-badge">
                <span class="ping-dot"></span>
                <span>Bus En Route · Approaching ${esc(activeStop.name)}</span>
              </div>
            </div>

            <!-- Stepper Track -->
            <div class="stepper-track-wrap">
              <div class="stepper-track-line">
                <div class="stepper-track-progress" style="width:${progressPct}%"></div>
              </div>

              <div class="stepper-nodes-row">
                ${stops.map((s, idx) => {
                  let stateClass = 'upcoming';
                  let iconContent = idx + 1;
                  if (idx < previewActiveStopIndex) {
                    stateClass = 'passed';
                    iconContent = '✓';
                  } else if (idx === previewActiveStopIndex) {
                    stateClass = 'active';
                    iconContent = '🚌';
                  }
                  const time = isMorning ? s.timeMorning : s.timeAfternoon;

                  return `
                    <div class="stepper-node-item ${stateClass}" data-a="preview-select-stop" data-index="${idx}">
                      <div class="stepper-node-circle">${iconContent}</div>
                      <div class="stepper-node-label">${esc(s.name)}</div>
                      <div class="stepper-node-time">${esc(time)}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- CHECKPOINT CARDS GRID -->
          <div class="stops-card-grid">
            ${stops.map((s, idx) => {
              const isSelected = idx === previewSelectedCheckpoint;
              const isApproaching = idx === previewActiveStopIndex;
              const isPassed = idx < previewActiveStopIndex;
              const time = isMorning ? s.timeMorning : s.timeAfternoon;

              let statusPill = '';
              if (isPassed) {
                statusPill = `<span class="stop-status-pill departed">✓ Departed</span>`;
              } else if (isApproaching) {
                statusPill = `<span class="stop-status-pill live">● Approaching Now</span>`;
              } else {
                statusPill = `<span class="stop-status-pill scheduled">⏳ Scheduled</span>`;
              }

              return `
                <div class="stop-feature-card ${isSelected ? 'is-active-checkpoint' : ''}" data-a="preview-select-stop" data-index="${idx}">
                  <div class="stop-card-top-row">
                    <span class="stop-index-chip">Checkpoint 0${idx + 1}</span>
                    ${statusPill}
                  </div>

                  <div class="stop-header-flex">
                    <div class="stop-badge-circle">${s.icon}</div>
                    <div>
                      <h3>${idx + 1}. ${esc(s.name)}</h3>
                      <div style="font-size:0.78rem;color:var(--text-muted);">${esc(s.suburb)}</div>
                    </div>
                  </div>

                  <div class="stop-time-tag">
                    <span>🕒</span>
                    <span>${idx === stops.length - 1 ? 'Arrives' : 'Departs'} ${esc(time)}</span>
                  </div>

                  <p class="stop-desc-text">${esc(s.desc)}</p>

                  <div class="stop-manifest-box">
                    <div class="stop-manifest-title">
                      <span>🎒</span> Boarding Manifest
                    </div>
                    <div class="stop-student-chips">
                      ${s.students.map(st => `
                        <span class="student-mini-chip">
                          <span>●</span> ${esc(st)}
                        </span>
                      `).join('')}
                    </div>
                  </div>

                  <div class="stop-safety-tags-row">
                    ${s.safetyBadges.map(b => `
                      <span class="safety-micro-tag">✓ ${esc(b)}</span>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- INTERACTIVE CHECKPOINT INSPECTOR DRAWER -->
          <div class="checkpoint-detail-inspector">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;border-bottom:1px solid rgba(0,0,0,0.06);padding-bottom:1rem;">
              <div>
                <div style="font-size:0.8rem;font-weight:800;color:var(--primary-orange);text-transform:uppercase;letter-spacing:0.05em;">
                  Telemetry Inspector · Checkpoint 0${previewSelectedCheckpoint + 1} Selected
                </div>
                <h3 style="font-size:1.45rem;color:var(--deep-navy);margin:0.2rem 0 0.3rem;">
                  ${selectedStop.icon} ${esc(selectedStop.name)} · ${esc(selectedStop.landmark)}
                </h3>
                <div style="font-size:0.85rem;color:var(--text-muted);">
                  GPS Coordinates: <b style="color:var(--deep-navy);">${esc(selectedStop.coordinates)}</b> · Scheduled Time: <b style="color:var(--primary-orange);">${esc(isMorning ? selectedStop.timeMorning : selectedStop.timeAfternoon)}</b> · Vehicle: <b style="color:var(--deep-navy);">${esc(route.vehiclePlate)}</b>
                </div>
              </div>

              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button type="button" class="btn s" data-a="preview-send-alert">
                  📱 Send Guardian Test Alert
                </button>
                <button type="button" class="btn s" data-a="preview-geofence">
                  📍 Verify 25m Safe Perimeter
                </button>
              </div>
            </div>

            <div class="inspector-grid">
              <div class="inspector-col">
                <h4>🛡️ Station Safety & Infrastructure</h4>
                <ul class="inspector-list">
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span><b>Pavement Shelter:</b> Designated all-weather student waiting shelter safely separated from traffic flow.</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span><b>Geo-Fenced Radar:</b> Automated bus speed throttle log within 50 meters of the station perimeter.</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span><b>Surveillance Sync:</b> Dashcam footage & GPS ping synchronised to SafeRide school dispatch server every 10 seconds.</span>
                  </li>
                </ul>
              </div>

              <div class="inspector-col">
                <h4>👨‍👩‍👧 Guardian Telemetry & Boarding Protocol</h4>
                <ul class="inspector-list">
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span><b>Automated Parent Alert:</b> ${esc(selectedStop.guardianProtocol)}</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span><b>Passenger Roster:</b> ${selectedStop.students.join(', ')}.</span>
                  </li>
                  <li>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span><b>Driver Protocol:</b> Driver ${esc(route.driverName)} verifies attendance checklist before engaging vehicle transmission.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
  `;
}

// =============================================================
// Main Render Orchestrator
// =============================================================
function render() {
  const app = $('#app');
  if (!app) return;

  // -----------------------------------------------------------
  // 1. PUBLIC PORTAL (Unauthenticated)
  // -----------------------------------------------------------
  if (!me) {
    app.innerHTML = `
      <!-- TOP NAVIGATION BAR -->
      <header class="site-header">
        <div class="header-inner">
          <a class="logo-wrap" href="#hero">
            <span class="logo-badge">🚌</span>
            <span>SafeRide</span>
          </a>

          <ul class="nav-links">
            <li><a href="#hero">Home</a></li>
            <li><a href="#stops">Routes & Stops</a></li>
            <li><a href="#demo-widget">Portal Sign In</a></li>
            <li><a href="#stats">Safety Standards</a></li>
          </ul>

          <div class="header-actions">
            <button type="button" class="pill-btn-orange" data-a="switch-tab" data-tab="login">
              Portal Sign In →
            </button>
          </div>
        </div>
      </header>

      <!-- HERO SECTION -->
      <section id="hero" class="hero-section">
        <div class="hero-overlay-gradient"></div>

        <div class="hero-content-wrapper">
          <div class="hero-card-glass">
            <div class="hero-tag">
              <span>●</span> SafeRide Fleet Operations
            </div>
            <h1>Smart, Safe & Real-Time School Transit</h1>
            <p>
              Digitized school transportation management: verified passenger boarding, automated stop checklists and centralized route management.
            </p>

            <div class="hero-buttons-row">
              <button type="button" class="hero-btn-primary" data-a="switch-tab" data-tab="login">
                Access Portal
              </button>
              <a href="#stops" class="hero-btn-outline" style="text-decoration:none;display:inline-flex;align-items:center;">
                Live Route Stops
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- OVERLAPPING INTERACTIVE WIDGET -->
      <section id="demo-widget" class="overlapping-widget-container">
        <div class="overlapping-widget-grid">
          <!-- Left: Sunset Skyline City Adventure Card -->
          <div class="widget-skyline-card">
            <div class="skyline-card-content">
              <h3>DAILY COMMUTE</h3>
              <p>Negombo Town ➔ Kochchikade ➔ Katana ➔ Seeduwa ➔ School</p>
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <button type="button" class="pill-btn-orange" style="padding:0.5rem 1.1rem;font-size:0.82rem;" data-a="switch-tab" data-tab="routes">
                  Explore Active Run
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Dark Slate Portal Hub -->
          <div class="widget-portal-card">
            <div class="portal-tabs">
              <button type="button" class="portal-tab-btn ${activePortalTab === 'login' ? 'active' : ''}" data-a="switch-tab" data-tab="login">
                🔑 Sign In
              </button>
              <button type="button" class="portal-tab-btn ${activePortalTab === 'register' ? 'active' : ''}" data-a="switch-tab" data-tab="register">
                📝 Register Account (Parent / Driver)
              </button>
              <button type="button" class="portal-tab-btn ${activePortalTab === 'routes' ? 'active' : ''}" data-a="switch-tab" data-tab="routes">
                📍 Live Route Stops
              </button>
            </div>

            <!-- Tab 1: Direct Sign In Form -->
            <div id="tabContentLogin" style="display:${activePortalTab === 'login' ? 'block' : 'none'};">
              <form data-f="login">
                <div class="row">
                  <div>
                    <label for="u" style="color:#cbd5e1;">Username</label>
                    <input id="u" name="u" autocomplete="username" required placeholder="e.g. admin or username" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                  </div>
                  <div>
                    <label for="p" style="color:#cbd5e1;">Password</label>
                    <input id="p" name="p" type="password" autocomplete="current-password" required placeholder="Enter password" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                  </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.4rem;flex-wrap:wrap;gap:1rem;">
                  <button class="pill-btn-orange" style="padding:0.75rem 2rem;">
                    Sign In to SafeRide →
                  </button>
                  <span style="font-size:0.84rem;color:var(--text-light-muted);">
                    New parent or driver? <a href="javascript:void(0)" data-a="switch-tab" data-tab="register" style="color:var(--primary-orange);text-decoration:none;font-weight:700;">Create an account here</a>
                  </span>
                </div>
              </form>
            </div>

            <!-- Tab 2: Self-Registration for Other Roles (Parent / Driver) -->
            <div id="tabContentRegister" style="display:${activePortalTab === 'register' ? 'block' : 'none'};">
              <form data-f="register">
                <div style="margin-bottom:1.1rem;">
                  <label style="color:#cbd5e1;margin-bottom:0.4rem;display:block;">Select Your Account Role</label>
                  <div style="display:flex;gap:0.75rem;">
                    <button type="button" class="auth-role-select-btn" data-a="set-reg-role" data-role="parent" style="flex:1;padding:0.7rem;border-radius:var(--radius-sm);border:1px solid ${registerRole === 'parent' ? 'var(--primary-orange)' : 'rgba(255,255,255,0.15)'};background:${registerRole === 'parent' ? 'rgba(249,115,22,0.25)' : 'rgba(15,23,42,0.6)'};color:#fff;font-weight:700;cursor:pointer;transition:all 0.2s;">
                      👨‍👩‍👧 Parent / Guardian
                    </button>
                    <button type="button" class="auth-role-select-btn" data-a="set-reg-role" data-role="driver" style="flex:1;padding:0.7rem;border-radius:var(--radius-sm);border:1px solid ${registerRole === 'driver' ? 'var(--primary-orange)' : 'rgba(255,255,255,0.15)'};background:${registerRole === 'driver' ? 'rgba(249,115,22,0.25)' : 'rgba(15,23,42,0.6)'};color:#fff;font-weight:700;cursor:pointer;transition:all 0.2s;">
                      🚌 School Bus Driver
                    </button>
                  </div>
                  <input type="hidden" name="role" value="${esc(registerRole)}">
                </div>

                <div class="row">
                  <div>
                    <label style="color:#cbd5e1;">Your Full Name</label>
                    <input name="name" required placeholder="${registerRole === 'parent' ? 'e.g. Anura Wickramasinghe' : 'e.g. Nihal Fernando'}" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                  </div>
                  <div>
                    <label style="color:#cbd5e1;">Choose Username</label>
                    <input name="u" autocomplete="username" required placeholder="Choose a unique username" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                  </div>
                </div>

                <div class="row" style="margin-top:0.8rem;">
                  <div>
                    <label style="color:#cbd5e1;">Choose Password</label>
                    <input name="p" type="password" autocomplete="new-password" required minlength="4" placeholder="Min. 4 characters" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                  </div>
                  ${registerRole === 'driver' ? `
                    <div>
                      <label style="color:#cbd5e1;">Mobile Phone Number</label>
                      <input name="phone" required placeholder="0771234567 (10 digits)" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                    </div>
                  ` : `
                    <div>
                      <label style="color:#cbd5e1;">Child's Full Name</label>
                      <input name="childName" placeholder="e.g. Sahan Wickramasinghe" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                    </div>
                  `}
                </div>

                ${registerRole === 'driver' ? `
                  <div class="row" style="margin-top:0.8rem;">
                    <div>
                      <label style="color:#cbd5e1;">Driving License Number</label>
                      <input name="license" required placeholder="e.g. B8765432 (1 letter + 7 digits)" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                    </div>
                    <div>
                      <label style="color:#cbd5e1;">Assigned Route Corridor</label>
                      <select name="routeId" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                        <option value="1">Route 01: Negombo – Seeduwa Express</option>
                        <option value="2">Route 02: Ja-Ela – Wattala Shuttle</option>
                      </select>
                    </div>
                  </div>
                ` : `
                  <div class="row" style="margin-top:0.8rem;">
                    <div>
                      <label style="color:#cbd5e1;">Child's Grade / Class</label>
                      <select name="grade" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                        <option>Grade 1</option><option>Grade 2</option><option>Grade 3</option>
                        <option>Grade 4</option><option>Grade 5</option><option>Grade 6</option>
                        <option>Grade 7</option><option>Grade 8</option><option>Grade 9</option>
                        <option>Grade 10</option><option>Grade 11</option>
                      </select>
                    </div>
                    <div>
                      <label style="color:#cbd5e1;">Select Bus Route & Stop</label>
                      <select name="stop" style="background:#0b1320;color:#fff;border-color:rgba(255,255,255,0.15);">
                        <option value="Kochchikade">Route 1: Kochchikade</option>
                        <option value="Katana">Route 1: Katana Junction</option>
                        <option value="Seeduwa">Route 1: Seeduwa Bypass</option>
                        <option value="Negombo Town">Route 1: Negombo Town</option>
                        <option value="Ja-Ela">Route 2: Ja-Ela Central</option>
                        <option value="Ekala">Route 2: Ekala Industrial</option>
                        <option value="Kandana">Route 2: Kandana Crossroad</option>
                      </select>
                      <input type="hidden" name="routeId" value="1">
                    </div>
                  </div>
                `}

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.4rem;flex-wrap:wrap;gap:1rem;">
                  <button class="pill-btn-orange" style="padding:0.75rem 2rem;">
                    Create Account & Enter SafeRide →
                  </button>
                  <span style="font-size:0.84rem;color:var(--text-light-muted);">
                    Already registered? <a href="javascript:void(0)" data-a="switch-tab" data-tab="login" style="color:var(--primary-orange);text-decoration:none;font-weight:700;">Sign in here</a>
                  </span>
                </div>
              </form>
            </div>

            <!-- Tab 3: Route Stops Preview -->
            <div id="tabContentRoutes" style="display:${activePortalTab === 'routes' ? 'block' : 'none'};">
              <div style="font-size:0.88rem;color:var(--text-light-muted);">
                <b>Negombo – Seeduwa Route (Vehicle: NB-4821)</b>
                <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:0.6rem;">
                  <span class="tag ok">06:45 AM · Negombo Town</span>
                  <span class="tag ok">06:58 AM · Kochchikade</span>
                  <span class="tag ok">07:10 AM · Katana</span>
                  <span class="tag ok">07:22 AM · Seeduwa</span>
                  <span class="tag ok">07:25 AM · School</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      ${renderTransitCheckpointsSection()}

      <!-- DARK STATS BAND & METRICS -->
      <section id="stats" class="section-dark-stats">
        <div class="section-container">
          <div class="stats-columns-grid">
            <div class="stat-column-item">
              <div class="stat-dot-head">Safety Verification</div>
              <div class="stat-big-number">100%</div>
              <div class="stat-desc">Daily verified passenger check-in rate across all school shuttles.</div>
            </div>

            <div class="stat-column-item">
              <div class="stat-dot-head">Fleet Capacity</div>
              <div class="stat-big-number">34+</div>
              <div class="stat-desc">Dedicated seating capacity with automated overload protection.</div>
            </div>

            <div class="stat-column-item">
              <div class="stat-dot-head">Tracked Stations</div>
              <div class="stat-big-number">9+</div>
              <div class="stat-desc">Geo-monitored student pick-up & drop-off checkpoints.</div>
            </div>

            <div class="stat-column-item">
              <div class="stat-dot-head">On-Time Accuracy</div>
              <div class="stat-big-number">99.4%</div>
              <div class="stat-desc">Punctual arrival times verified through automated timestamps.</div>
            </div>
          </div>

          <div class="dark-quick-action-bar">
            <div style="font-size:0.92rem;color:var(--text-light-muted);">
              SafeRide School Transport System · Certified Fleet Operations
            </div>
            <div style="display:flex;gap:0.75rem;">
              <button type="button" class="pill-btn-orange" data-a="switch-tab" data-tab="login">
                Access Transport Portal →
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- SITE FOOTER -->
      <footer class="site-footer">
        <div class="footer-inner">
          <div style="display:flex;align-items:center;gap:0.6rem;">
            <span style="font-weight:800;color:#fff;">SafeRide</span>
            <span>· All Rights Reserved</span>
          </div>
          <div>
            Emergency Hotline: <b style="color:var(--primary-orange);">📞 077 123 4567</b>
          </div>
        </div>
      </footer>
    `;
    return;
  }

  // -----------------------------------------------------------
  // 2. AUTHENTICATED INNER PAGES (No 3D, Streamlined Workflow)
  // -----------------------------------------------------------
  const roleNav = NAV[me.role] || NAV.parent;
  if (!roleNav.some(n => n[0] === view)) {
    view = roleNav[0][0];
  }

  app.innerHTML = `
    <!-- TOP APPLICATION HEADER -->
    <header class="auth-header">
      <div class="auth-header-inner">
        <a class="logo-wrap" href="javascript:void(0)" data-a="nav" data-id="${roleNav[0][0]}">
          <span class="logo-badge">🚌</span>
          <span>SafeRide</span>
        </a>

        <!-- Global Instant Search Input (FR12) -->
        <div class="header-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);flex-shrink:0;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input id="globalSearchInput" type="text" placeholder="Search students, routes, stops, plates..." value="${esc(searchQuery)}">
          ${searchQuery ? `<button type="button" id="btnClearSearch" style="all:unset;cursor:pointer;color:var(--text-muted);font-weight:700;">✕</button>` : ''}
        </div>

        <!-- User Profile Capsule & Sign Out -->
        <div class="header-actions">
          <div class="user-profile-capsule">
            <div class="user-avatar">${esc((me.name || 'U')[0].toUpperCase())}</div>
            <div class="user-details">
              <span class="uname">${esc(me.name)}</span>
              <span class="urole">${esc(me.role)}</span>
            </div>
          </div>

          <button class="pill-btn-dark" style="padding:0.45rem 1rem;font-size:0.82rem;" data-a="out" title="Sign out of SafeRide">
            Sign Out
          </button>
        </div>
      </div>
    </header>

    <!-- SECONDARY NAV PILLS -->
    <nav class="auth-subnav-bar">
      <div class="auth-subnav-inner">
        <ul class="auth-nav-pills">
          ${roleNav.map(n => `
            <li>
              <button class="auth-nav-pill-btn ${n[0] === view ? 'active' : ''}" data-a="nav" data-id="${n[0]}">
                <span>${n[2]}</span>
                <span>${n[1]}</span>
              </button>
            </li>
          `).join('')}
        </ul>

        ${me.role === 'admin' ? `
          <div style="display:flex;gap:0.5rem;">
            <button class="btn s" data-a="nav" data-id="reports">
              📄 Export Reports
            </button>
          </div>
        ` : ''}
      </div>
    </nav>

    <!-- MAIN APPLICATION CONTAINER -->
    <main class="auth-main-container">
      ${V_[view] ? V_[view]() : '<p>View not found.</p>'}
    </main>

    <!-- FOOTER -->
    <footer class="site-footer">
      <div class="footer-inner">
        <div style="display:flex;align-items:center;gap:0.6rem;">
          <span style="font-weight:800;color:#fff;">SafeRide Transport Operations</span>
          <span>· Logged in as ${esc(me.name)} (${esc(me.role)})</span>
        </div>
        <div>
          School Dispatch Hotline: <b style="color:var(--primary-orange);">📞 077 123 4567</b>
        </div>
      </div>
    </footer>
  `;

  fillStops();

  if (view === 'students') {
    window.updateCapacityPreview();
  }
}

function fillStops() {
  const s = $('#ss'), r = $('#sr');
  if (s && r) {
    s.innerHTML = (R(r.value).stops || [])
      .filter(x => x !== 'School')
      .map(x => `<option>${esc(x)}</option>`)
      .join('');
  }
}

// -------------------------------------------------------------
// Global Event Listeners & Actions
// -------------------------------------------------------------

document.addEventListener('input', e => {
  if (e.target.id === 'globalSearchInput') {
    searchQuery = e.target.value;
    render();
    const inp = $('#globalSearchInput');
    if (inp) {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
  } else if (e.target.id === 'manifestSearchInput') {
    manifestSearch = e.target.value;
    render();
    const inp = $('#manifestSearchInput');
    if (inp) {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'sr') {
    fillStops();
    window.updateCapacityPreview();
  }
});

async function act(action, body) {
  const res = await api(action, body);
  if (res) {
    await refresh();
    msg(res.ok || 'Saved successfully');
  }
  return res;
}

document.addEventListener('click', async e => {
  // Clear manifest search
  if (e.target.id === 'btnClearManifestSearch') {
    manifestSearch = '';
    render();
    return;
  }

  // Driver Cockpit Actions
  const nextStopBtn = e.target.closest('[data-a="driver-next-stop"]');
  if (nextStopBtn) {
    const r = (db.routes || [])[0];
    const stops = (r && r.stops) || [];
    if (driverActiveStopIdx < stops.length - 1) {
      driverActiveStopIdx++;
      msg(`🚍 Advanced to Stop #${driverActiveStopIdx + 1}: ${stops[driverActiveStopIdx]}`);
    } else {
      msg(`🏁 Route Completed! All pupils safely delivered to School.`);
      driverActiveStopIdx = 0;
    }
    render();
    return;
  }

  const selectStopBtn = e.target.closest('[data-a="driver-select-stop"]');
  if (selectStopBtn) {
    driverActiveStopIdx = +selectStopBtn.dataset.idx;
    render();
    return;
  }

  const markAllStopBtn = e.target.closest('[data-a="driver-mark-all-stop"]');
  if (markAllStopBtn) {
    const stopName = markAllStopBtn.dataset.stop;
    const pendingStudents = (db.students || []).filter(s => s.stop === stopName && !db.att[s.id]);
    if (!pendingStudents.length) {
      msg('All students at this stop are already checked in.');
      return;
    }
    for (const st of pendingStudents) {
      await api('mark', { id: st.id, status: 'boarded' });
    }
    await refresh();
    msg(`✓ Marked ${pendingStudents.length} student(s) as Boarded at ${stopName}`);
    return;
  }

  const delayBtn = e.target.closest('[data-a="driver-broadcast-delay"]');
  if (delayBtn) {
    driverDelayAlert = delayBtn.dataset.delay;
    msg(`📢 Delay Broadcasted to Guardians: "${driverDelayAlert}"`);
    render();
    return;
  }

  const clearDelayBtn = e.target.closest('[data-a="driver-clear-delay"]');
  if (clearDelayBtn) {
    driverDelayAlert = null;
    msg('Delay alert cleared.');
    render();
    return;
  }

  const sosBtn = e.target.closest('[data-a="driver-sos"]');
  if (sosBtn) {
    alert('🚨 EMERGENCY SOS SENT!\n\nGPS coordinates and priority emergency alert transmitted to SafeRide Transport Desk & School Security.');
    msg('🚨 Emergency SOS Dispatched to School Dispatcher', 1);
    return;
  }

  const certifyDvirBtn = e.target.closest('[data-a="driver-certify-inspection"]');
  if (certifyDvirBtn) {
    driverInspectionCertified = true;
    msg('🛡️ Pre-Trip Vehicle Safety Inspection Certified & Signed!');
    render();
    return;
  }

  const toggleDvirBtn = e.target.closest('[data-a="driver-toggle-inspection"]');
  if (toggleDvirBtn) {
    const item = toggleDvirBtn.dataset.item;
    driverInspection[item] = !driverInspection[item];
    render();
    return;
  }

  // Tab Switcher on Public Landing
  const switchTab = e.target.closest('[data-a="switch-tab"]');
  if (switchTab) {
    activePortalTab = switchTab.dataset.tab;
    const widget = $('#demo-widget');
    if (widget) widget.scrollIntoView({ behavior: 'smooth' });
    render();
    return;
  }

  // Autofill Admin Credentials & Sign In
  const fillAdminBtn = e.target.closest('[data-a="fill-admin"]');
  if (fillAdminBtn) {
    const uInp = $('#u');
    const pInp = $('#p');
    if (uInp) uInp.value = 'admin';
    if (pInp) pInp.value = 'admin123';
    msg('⚡ Admin credentials filled! Logging in...');
    await act('login', { u: 'admin', p: 'admin123' });
    return;
  }

  // Registration Role Toggle (Parent / Driver)
  const setRegRoleBtn = e.target.closest('[data-a="set-reg-role"]');
  if (setRegRoleBtn) {
    registerRole = setRegRoleBtn.dataset.role;
    render();
    return;
  }

  // Driver Telemetry: Adjust Speed
  const adjustSpeedBtn = e.target.closest('[data-a="driver-adjust-speed"]');
  if (adjustSpeedBtn) {
    const speeds = [28, 34, 38, 42, 30];
    const curIdx = speeds.indexOf(driverSimSpeed);
    driverSimSpeed = speeds[(curIdx + 1) % speeds.length];
    msg(`⚡ Vehicle telemetry updated: Speed set to ${driverSimSpeed} km/h`);
    render();
    return;
  }

  // Driver Telemetry: Stop Arrival Announcement
  const announceBtn = e.target.closest('[data-a="driver-announce"]');
  if (announceBtn) {
    const r = (db.routes || [])[0];
    const stops = (r && r.stops) || [];
    const stopName = stops[driverActiveStopIdx] || 'Next Station';
    msg(`🔊 PA Announcement: "Attention pupils, approaching ${stopName}. Please gather your belongings."`);
    return;
  }

  // Driver Cockpit: NFC Card Scan Simulation
  const nfcBtn = e.target.closest('[data-a="driver-scan-nfc"]');
  if (nfcBtn) {
    const stId = +nfcBtn.dataset.id;
    const st = (db.students || []).find(s => s.id === stId);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    driverBoardingTimes[stId] = timeStr;
    await api('mark', { id: stId, status: 'boarded' });
    await refresh();
    msg(`💳 NFC Bus Pass verified for ${st ? st.name : 'Student'}! Boarding logged at ${timeStr}`);
    return;
  }

  // Driver Cockpit: Child Check-Mate Safety Clearance
  const checkmateBtn = e.target.closest('[data-a="driver-verify-checkmate"]');
  if (checkmateBtn) {
    driverChildCheckmateVerified = true;
    msg('🛡️ Child Check-Mate Verified: Bus cabin inspected and all pupils accounted for.');
    render();
    return;
  }

  // Transit Checkpoints Preview: Route Switcher
  const routeBtn = e.target.closest('[data-a="preview-route"]');
  if (routeBtn) {
    previewRouteId = +routeBtn.dataset.route;
    previewActiveStopIndex = 1;
    previewSelectedCheckpoint = 1;
    render();
    return;
  }

  // Transit Checkpoints Preview: Shift Switcher (Morning / Afternoon)
  const shiftBtn = e.target.closest('[data-a="preview-shift"]');
  if (shiftBtn) {
    previewShift = shiftBtn.dataset.shift;
    render();
    return;
  }

  // Transit Checkpoints Preview: Select Specific Checkpoint to Inspect
  const selectStop = e.target.closest('[data-a="preview-select-stop"]');
  if (selectStop) {
    previewSelectedCheckpoint = +selectStop.dataset.index;
    render();
    return;
  }

  // Transit Checkpoints Preview: Simulate Transit Progress
  const simBtn = e.target.closest('[data-a="preview-simulate"]');
  if (simBtn) {
    const route = PREVIEW_ROUTES[previewRouteId] || PREVIEW_ROUTES[1];
    previewActiveStopIndex = (previewActiveStopIndex + 1) % route.stops.length;
    previewSelectedCheckpoint = previewActiveStopIndex;
    const s = route.stops[previewActiveStopIndex];
    const time = previewShift === 'morning' ? s.timeMorning : s.timeAfternoon;
    msg(`🚌 Simulated Telemetry: Bus ${route.vehiclePlate} reached ${s.name} (${time})`);
    render();
    return;
  }

  // Transit Checkpoints Preview: Send Test SMS Alert
  const alertBtn = e.target.closest('[data-a="preview-send-alert"]');
  if (alertBtn) {
    const route = PREVIEW_ROUTES[previewRouteId] || PREVIEW_ROUTES[1];
    const s = route.stops[previewSelectedCheckpoint] || route.stops[0];
    msg(`📱 Test SMS Sent: "SafeRide Alert: Bus ${route.vehiclePlate} checkpoint ping at ${s.name}."`);
    return;
  }

  // Transit Checkpoints Preview: Geo-fence Verification
  const geoBtn = e.target.closest('[data-a="preview-geofence"]');
  if (geoBtn) {
    const route = PREVIEW_ROUTES[previewRouteId] || PREVIEW_ROUTES[1];
    const s = route.stops[previewSelectedCheckpoint] || route.stops[0];
    msg(`📍 Geo-Fence Calibrated: ${s.name} (${s.coordinates}) · 25m safe perimeter active`);
    return;
  }

  // Standard Navigation & Actions
  const btn = e.target.closest('[data-a]');
  if (!btn) return;
  const a = btn.dataset.a, id = btn.dataset.id;

  if (a === 'nav') {
    view = id;
    render();
  } else if (a === 'out') {
    await api('logout', {});
    me = null;
    view = '';
    searchQuery = '';
    const state = await api('state');
    csrf = (state || {}).csrf || '';
    render();
  } else if (a === 'att') {
    await act('mark', { id: +id, status: btn.dataset.v });
  } else if (a === 'del') {
    if (confirm(`Are you sure you want to remove this ${btn.dataset.k} record?`)) {
      await act('delete', { kind: btn.dataset.k, id: +id });
    }
  }
});

document.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  for (const k in data) data[k] = String(data[k]).trim();
  await act(form.dataset.f, data);
});

// Boot
refresh();
