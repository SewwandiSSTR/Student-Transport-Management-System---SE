// ===== INSPECTION STATE (app.js lines 16-17) =====
let driverInspectionCertified = false;
let driverInspection = { brakes: true, tyres: true, doors: true, firstaid: true, seatbelts: true, lights: true };

// ===== INSPECTION VIEW: inspection() DVIR form (app.js 1058-1134) =====
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


// ===== INSPECTION HANDLERS: certify / toggle (app.js 2049-2063) =====
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
