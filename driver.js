// ===== DRIVER STATE (app.js lines 14-22) =====
// Driver Operations State
let driverActiveStopIdx = 1;
let driverInspectionCertified = false;
let driverInspection = { brakes: true, tyres: true, doors: true, firstaid: true, seatbelts: true, lights: true };
let driverDelayAlert = null;
let manifestSearch = '';
let driverBoardingTimes = {};
let driverChildCheckmateVerified = false;
let driverSimSpeed = 38;

// ===== DRIVER VIEWS: run(), manifest() (app.js 759-1057) =====
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


// ===== DRIVER SAFETY / SOS VIEW (app.js 1135-1233) =====
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


// ===== DRIVER ACTION HANDLERS (app.js 1987-2134) =====
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
