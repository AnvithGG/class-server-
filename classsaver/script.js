(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const state = {
    mode: 'demo',
    controlMode: 'auto',
    occupancy: 18,
    temperature: 34.2,
    brightness: 38,
    lights: [true, true, false],
    fan: true,
    energyConsumed: 24.6,
    energySaved: 6.8,
    moneySaved: 186,
    switchOffs: 14,
    timeout: 5,
    endpoint: '',
    liveTimer: null,
    emptySince: null,
    vacancyCutoffApplied: false
  };

  const refs = {
    modeLabel: $('#modeLabel'), modeChip: $('.mode-chip'), modeToggle: $('#modeToggle'),
    lastSync: $('#lastSync'), sceneClock: $('#sceneClock'), espStatus: $('#espStatus'),
    energyConsumed: $('#energyConsumed'), energySaved: $('#energySaved'), moneySaved: $('#moneySaved'),
    switchOffs: $('#switchOffs'), savedPct: $('#savedPct'), lastEvent: $('#lastEvent'),
    occupancyValue: $('#occupancyValue'), lightsState: $('#lightsState'), fanState: $('#fanState'),
    pirValue: $('#pirValue'), brightnessValue: $('#brightnessValue'), temperatureValue: $('#temperatureValue'),
    allLightsCopy: $('#allLightsCopy'), fanCopy: $('#fanCopy'), allLightsToggle: $('#allLightsToggle'), fanToggle: $('#fanToggle'),
    timeoutRange: $('#timeoutRange'), timeoutValue: $('#timeoutValue'),
    toast: $('#toast'), toastText: $('#toastText'), endpointInput: $('#endpointInput'),
    connectionTitle: $('#connectionTitle'), connectionCopy: $('#connectionCopy'), connectionTags: $('.connection-tags'),
    sceneWrap: $('#sceneWrap'), sceneLoader: $('#sceneLoader'), fullscreenBtn: $('#fullscreenBtn'), resetCamera: $('#resetCamera'),
    rulesModal: $('#rulesModal'), refreshBtn: $('#refreshBtn'), connectBtn: $('#connectBtn')
  };

  let toastTimer;
  function showToast(message, tone = 'success') {
    refs.toastText.textContent = message;
    refs.toast.classList.toggle('warning', tone === 'warning');
    refs.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => refs.toast.classList.remove('show'), 2700);
  }

  function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  function animateNumber(element, next, suffix = '', duration = 500, prefix = '') {
    if (!element) return;
    const raw = String(element.textContent).replace(/[^0-9.]/g, '');
    const start = Number.parseFloat(raw) || 0;
    const target = Number(next);
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + (target - start) * eased;
      element.textContent = `${prefix}${value.toFixed(Number.isInteger(target) ? 0 : 1)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function renderState() {
    animateNumber(refs.energyConsumed, state.energyConsumed);
    animateNumber(refs.energySaved, state.energySaved);
    animateNumber(refs.moneySaved, state.moneySaved, '', 500, '₹');
    animateNumber(refs.switchOffs, state.switchOffs);
    animateNumber(refs.occupancyValue, state.occupancy);
    animateNumber(refs.pirValue, state.occupancy);
    animateNumber(refs.brightnessValue, state.brightness);
    animateNumber(refs.temperatureValue, state.temperature);
    refs.lastSync.textContent = formatTime();
    refs.sceneClock.textContent = formatTime();
    refs.occupancyValue.innerHTML = `${state.occupancy} <i>/ 30</i>`;
    refs.pirValue.innerHTML = `${state.occupancy} <small>people</small>`;
    refs.brightnessValue.innerHTML = `${Math.round(state.brightness)} <small>%</small>`;
    refs.temperatureValue.innerHTML = `${state.temperature.toFixed(1)} <small>°C</small>`;
    const lightsOn = state.lights.filter(Boolean).length;
    refs.lightsState.innerHTML = `${lightsOn} <i>/ 3 ON</i>`;
    refs.fanState.innerHTML = `${state.fan ? 'ON' : 'OFF'} <i>· ${state.temperature.toFixed(0)}°C</i>`;
    refs.allLightsCopy.textContent = `${lightsOn} of 3 active · ${state.controlMode === 'auto' ? 'Auto-managed' : 'Manual control'}`;
    refs.fanCopy.textContent = `${state.fan ? 'Running' : 'Stopped'} · threshold 30°C`;
    refs.allLightsToggle.classList.toggle('active', lightsOn === 3 || lightsOn > 0);
    refs.fanToggle.classList.toggle('active', state.fan);
    $$('.light-control').forEach((button, index) => {
      const on = state.lights[index];
      button.classList.toggle('active', on);
      const status = button.querySelector('span');
      if (status) status.textContent = on ? 'ON' : 'OFF';
    });
    refs.timeoutValue.textContent = String(state.timeout).padStart(2, '0');
    if (window.classroomScene) window.classroomScene.update(state);
  }

  function runAutomation(source = 'demo') {
    if (state.controlMode !== 'auto') return;
    if (source === 'demo') {
      const occupied = state.occupancy > 0;
      const dark = state.brightness < 55;
      if (occupied) {
        state.emptySince = null;
        state.vacancyCutoffApplied = false;
        state.lights = dark ? [true, true, state.brightness < 28] : [false, false, false];
        if (state.temperature >= 30) state.fan = true;
        if (state.temperature <= 28) state.fan = false;
      } else {
        if (!state.emptySince) state.emptySince = Date.now();
        const vacancyMs = Date.now() - state.emptySince;
        if (vacancyMs >= state.timeout * 60000) {
          state.lights = [false, false, false];
          state.fan = false;
          if (!state.vacancyCutoffApplied) {
            state.switchOffs += 1;
            state.vacancyCutoffApplied = true;
            showToast(`Empty-room timeout reached · outputs switched OFF`);
          }
        }
      }
    }
    renderState();
  }

  function simulateTelemetry() {
    if (state.mode !== 'demo') return;
    const wave = Math.sin(Date.now() / 34000);
    state.temperature = Math.max(27.8, Math.min(35.5, 31.6 + wave * 2.8 + (Math.random() - .5) * .35));
    state.brightness = Math.max(24, Math.min(68, 43 + Math.sin(Date.now() / 19000) * 12 + (Math.random() - .5) * 4));
    state.occupancy = Math.max(0, Math.min(26, Math.round(17 + Math.sin(Date.now() / 28000) * 3 + (Math.random() - .5) * 2)));
    state.energyConsumed = Math.max(22, state.energyConsumed + (Math.random() - .46) * .1);
    state.energySaved = Math.max(5.9, state.energySaved + (Math.random() - .35) * .045);
    state.moneySaved = Math.round(state.energySaved * 27.35);
    if (chart && chart.data.labels.length === 7) {
      chart.data.datasets[0].data[6] = Number(state.energyConsumed.toFixed(1));
      chart.data.datasets[1].data[6] = Number(state.energySaved.toFixed(1));
      chart.update('none');
    }
    runAutomation('demo');
  }

  function setMode(mode) {
    state.mode = mode;
    const live = mode === 'live';
    refs.modeChip.classList.toggle('live', live);
    refs.modeLabel.textContent = live ? 'LIVE MODE' : 'DEMO MODE';
    refs.modeToggle.textContent = live ? 'Return to DEMO ' : 'Switch to LIVE ';
    const arrow = document.createElement('span'); arrow.textContent = '→'; refs.modeToggle.appendChild(arrow);
    refs.espStatus.textContent = live ? (state.endpoint ? 'LIVE ENDPOINT · CONNECTING…' : 'LIVE · ENDPOINT REQUIRED') : 'DEMO TELEMETRY ACTIVE · 2.4 GHz';
    refs.connectionTitle.textContent = live ? (state.endpoint ? 'Live endpoint requested' : 'Live endpoint required') : 'Demo telemetry stream';
    refs.connectionCopy.textContent = live ? (state.endpoint ? 'Waiting for a valid ESP32 response. The dashboard will not fall back to simulated values.' : 'No ESP32 endpoint is configured. The dashboard remains clearly labeled LIVE and keeps the last known values separate from a real connection.') : 'Simulated data is active for presentation. Connect an ESP32 endpoint to switch to LIVE mode.';
    if (!live && state.liveTimer) { clearInterval(state.liveTimer); state.liveTimer = null; }
    if (!live) { renderState(); showToast('Returned to clearly labeled DEMO mode'); }
  }

  async function connectLive() {
    const endpoint = refs.endpointInput.value.trim().replace(/\/$/, '');
    if (!endpoint) { showToast('Enter the ESP32 /status endpoint first', 'warning'); refs.endpointInput.focus(); return; }
    state.endpoint = endpoint;
    setMode('live');
    if (state.liveTimer) { clearInterval(state.liveTimer); state.liveTimer = null; }
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 4200);
      const response = await fetch(`${endpoint}/status`, { signal: controller.signal, headers: { Accept: 'application/json' } });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (typeof payload.occupancy !== 'number' || typeof payload.temperature !== 'number' || typeof payload.brightness !== 'number') throw new Error('Response missing required sensor fields');
      state.occupancy = payload.occupancy; state.temperature = payload.temperature; state.brightness = payload.brightness;
      if (Array.isArray(payload.lights)) state.lights = payload.lights.slice(0, 3).map(Boolean);
      if (typeof payload.fan === 'boolean') state.fan = payload.fan;
      if (typeof payload.energyConsumed === 'number') state.energyConsumed = payload.energyConsumed;
      if (typeof payload.energySaved === 'number') state.energySaved = payload.energySaved;
      if (typeof payload.moneySaved === 'number') state.moneySaved = payload.moneySaved;
      if (typeof payload.switchOffs === 'number') state.switchOffs = payload.switchOffs;
      if (chart && chart.data.labels.length === 7) {
        chart.data.datasets[0].data[6] = state.energyConsumed;
        chart.data.datasets[1].data[6] = state.energySaved;
        chart.update('none');
      }
      refs.espStatus.textContent = `LIVE · ${endpoint} · HTTP OK`;
      refs.connectionTitle.textContent = 'ESP32 connected';
      refs.connectionCopy.textContent = 'Authenticated by a live /status response. Commands can now be sent to the control surface.';
      refs.connectionTags.innerHTML = '<span class="tag active">LIVE</span><span class="tag active">HTTP API</span><span class="tag">2.4 GHz</span>';
      renderState(); showToast('Live ESP32 telemetry received');
      state.liveTimer = setInterval(connectLive, 12000);
    } catch (error) {
      if (timeout) clearTimeout(timeout);
      refs.espStatus.textContent = `LIVE · NO RESPONSE · ${error.name === 'AbortError' ? 'TIMEOUT' : 'UNREACHABLE'}`;
      refs.connectionTitle.textContent = 'Live connection unavailable';
      refs.connectionCopy.textContent = 'No simulated fallback was used. Check that the ESP32 is on the same network and exposes GET /status.';
      refs.connectionTags.innerHTML = '<span class="tag active" style="color:#ffb86b;border-color:rgba(255,184,107,.3)">LIVE</span><span class="tag">NO RESPONSE</span><span class="tag">CHECK NETWORK</span>';
      showToast('ESP32 did not respond — LIVE mode remains honest', 'warning');
    }
  }

  async function sendLiveCommand(target, value) {
    if (state.mode !== 'live' || !state.endpoint) return;
    try {
      const response = await fetch(`${state.endpoint}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ target, value })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showToast('Live command acknowledged by ESP32');
    } catch (error) {
      showToast(`Live command not acknowledged · ${error.message}`, 'warning');
    }
  }

  function installControls() {
    refs.refreshBtn?.addEventListener('click', () => { simulateTelemetry(); showToast('Demo telemetry refreshed'); });
    refs.modeToggle.addEventListener('click', () => {
      if (state.mode === 'demo') {
        if (refs.endpointInput.value.trim()) connectLive();
        else { setMode('live'); showToast('LIVE mode selected — enter an ESP32 endpoint to connect', 'warning'); }
      } else setMode('demo');
    });
    refs.connectBtn?.addEventListener('click', connectLive);
    refs.timeoutRange.addEventListener('input', (event) => { state.timeout = Number(event.target.value); renderState(); });
    refs.allLightsToggle.addEventListener('click', () => {
      const shouldTurnOn = state.lights.some((light) => !light);
      state.lights = [shouldTurnOn, shouldTurnOn, shouldTurnOn];
      state.controlMode = 'manual';
      setControlMode('manual');
      renderState();
      sendLiveCommand('lights', state.lights);
      showToast(`All lights manually switched ${shouldTurnOn ? 'ON' : 'OFF'}`);
    });
    refs.fanToggle.addEventListener('click', () => { state.fan = !state.fan; state.controlMode = 'manual'; setControlMode('manual'); renderState(); sendLiveCommand('fan', state.fan); showToast(`Fan manually switched ${state.fan ? 'ON' : 'OFF'}`); });
    $$('.light-control').forEach((button, index) => button.addEventListener('click', () => { state.lights[index] = !state.lights[index]; state.controlMode = 'manual'; setControlMode('manual'); renderState(); sendLiveCommand(`light_${index + 1}`, state.lights[index]); showToast(`Light ${index + 1} manually switched ${state.lights[index] ? 'ON' : 'OFF'}`); }));
    $$('.segmented button').forEach((button) => button.addEventListener('click', () => setControlMode(button.dataset.mode)));
    $('#viewRules')?.addEventListener('click', () => refs.rulesModal.classList.add('open'));
    $('#closeRules')?.addEventListener('click', () => refs.rulesModal.classList.remove('open'));
    refs.rulesModal.addEventListener('click', (event) => { if (event.target === refs.rulesModal) refs.rulesModal.classList.remove('open'); });
    refs.fullscreenBtn.addEventListener('click', () => { if (!document.fullscreenElement) refs.sceneWrap.requestFullscreen?.(); else document.exitFullscreen?.(); });
    refs.resetCamera.addEventListener('click', () => window.classroomScene?.reset());
    $$('.chart-tab').forEach((tab) => tab.addEventListener('click', () => { $$('.chart-tab').forEach((t) => t.classList.remove('active')); tab.classList.add('active'); updateChart(Number(tab.dataset.range)); }));
  }

  function setControlMode(mode) {
    state.controlMode = mode;
    $$('.segmented button').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
    renderState();
  }

  let chart;
  function updateChart(range = 7) {
    if (!chart) return;
    const labels = range === 7 ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : range === 30 ? ['W1', 'W2', 'W3', 'W4'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const consumed = range === 7 ? [31, 27, 30, 25, 28, 21, 24.6] : range === 30 ? [121, 109, 96, 102] : [138, 126, 119, 105, 98, 89];
    const saved = range === 7 ? [4, 5.8, 4.8, 6.1, 5.2, 7.4, 6.8] : range === 30 ? [19, 22, 26, 28] : [16, 19, 24, 28, 31, 35];
    chart.data.labels = labels; chart.data.datasets[0].data = consumed; chart.data.datasets[1].data = saved; chart.update();
  }

  function initChart() {
    if (!window.Chart) return;
    const canvas = $('#energyChart');
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 240); gradient.addColorStop(0, 'rgba(82,229,244,.28)'); gradient.addColorStop(1, 'rgba(82,229,244,0)');
    chart = new Chart(ctx, { type: 'line', data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ label: 'Consumed', data: [31, 27, 30, 25, 28, 21, 24.6], borderColor: '#52e5f4', backgroundColor: gradient, fill: true, borderWidth: 2, tension: .4, pointRadius: 0, pointHoverRadius: 4 }, { label: 'Saved', data: [4, 5.8, 4.8, 6.1, 5.2, 7.4, 6.8], borderColor: '#77e39c', borderWidth: 2, borderDash: [4, 5], tension: .4, pointRadius: 0, pointHoverRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#10182b', borderColor: 'rgba(82,229,244,.35)', borderWidth: 1, titleFont: { family: 'DM Mono' }, bodyFont: { family: 'DM Mono' }, padding: 10, displayColors: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#65718d', font: { family: 'DM Mono', size: 9 } } }, y: { beginAtZero: true, grid: { color: 'rgba(130,155,207,.09)' }, ticks: { color: '#65718d', font: { family: 'DM Mono', size: 9 }, callback: (value) => `${value} kWh` }, border: { display: false } } } } });
  }

  function createClassroom() {
    const wrap = refs.sceneWrap;
    if (!window.THREE || !wrap) { refs.sceneLoader?.classList.add('hidden'); return; }
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x09121e, 14, 27);
    const camera = new THREE.PerspectiveCamera(38, wrap.clientWidth / wrap.clientHeight, .1, 100);
    camera.position.set(10, 8.6, 12.8);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(wrap.clientWidth, wrap.clientHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    wrap.appendChild(renderer.domElement);
    const controls = window.THREE.OrbitControls ? new THREE.OrbitControls(camera, renderer.domElement) : null;
    camera.lookAt(0, 1.8, 0);
    if (controls) { controls.enableDamping = true; controls.dampingFactor = .06; controls.target.set(0, 1.8, 0); controls.minDistance = 8; controls.maxDistance = 20; controls.maxPolarAngle = Math.PI * .47; controls.minPolarAngle = Math.PI * .22; controls.update(); }
    const classroom = new THREE.Group(); scene.add(classroom);
    const mats = { floor: new THREE.MeshStandardMaterial({ color: 0x172238, roughness: .82, metalness: .12 }), wall: new THREE.MeshStandardMaterial({ color: 0x26334b, roughness: .84 }), trim: new THREE.MeshStandardMaterial({ color: 0x5a6a87, roughness: .45, metalness: .45 }), desk: new THREE.MeshStandardMaterial({ color: 0x6b4d45, roughness: .68 }), deskTop: new THREE.MeshStandardMaterial({ color: 0x9b7160, roughness: .55 }), chair: new THREE.MeshStandardMaterial({ color: 0x303b57, roughness: .72 }), blackboard: new THREE.MeshStandardMaterial({ color: 0x0b2630, roughness: .95 }), white: new THREE.MeshStandardMaterial({ color: 0xd7e2ec, roughness: .45 }), esp: new THREE.MeshStandardMaterial({ color: 0x1b3555, roughness: .45, metalness: .4 }), wire: new THREE.MeshStandardMaterial({ color: 0x2bdebd, emissive: 0x0a806e, emissiveIntensity: .6 }) };
    const addBox = (name, size, pos, mat, parent = classroom) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); mesh.name = name; mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    addBox('floor', [14, .25, 9], [0, -.15, 0], mats.floor); addBox('back-wall', [14, 5.5, .22], [0, 2.65, -4.4], mats.wall); addBox('left-wall', [.22, 5.5, 9], [-6.9, 2.65, 0], mats.wall); addBox('right-wall', [.22, 5.5, 9], [6.9, 2.65, 0], mats.wall); addBox('ceiling-beam', [14, .22, .32], [0, 5.38, 0], mats.trim);
    for (let x = -5; x <= 5; x += 2) addBox('floor-line', [.04, .01, 8.7], [x, .01, 0], new THREE.MeshBasicMaterial({ color: 0x27405a, transparent: true, opacity: .5 }));
    addBox('board-frame', [5.1, 2.2, .13], [0, 2.65, -4.23], mats.trim); addBox('blackboard', [4.8, 1.9, .09], [0, 2.65, -4.14], mats.blackboard);
    const boardLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.7, 2.7, -4.08), new THREE.Vector3(-.6, 3.15, -4.08), new THREE.Vector3(.5, 2.72, -4.08), new THREE.Vector3(1.7, 3.1, -4.08)]), new THREE.LineBasicMaterial({ color: 0x54d8d8 })); classroom.add(boardLine);
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x173f61, emissive: 0x0d365c, emissiveIntensity: .7, transparent: true, opacity: .85 });
    [-4.8, -2.4, 2.4, 4.8].forEach((x) => { addBox('window', [1.5, 2.0, .08], [x, 2.85, -4.1], windowMat); addBox('window-bar', [.05, 2, .11], [x, 2.85, -4.0], mats.trim); addBox('window-bar', [1.5, .05, .11], [x, 2.85, -4.0], mats.trim); });
    addBox('door', [1.35, 3.8, .15], [5.65, 1.85, -4.1], new THREE.MeshStandardMaterial({ color: 0x344767, roughness: .7 })); addBox('door-handle', [.08, .08, .09], [5.15, 1.85, -4.0], new THREE.MeshStandardMaterial({ color: 0xe0b964, metalness: .8, roughness: .25 }));
    function makeDesk(x, z) { const group = new THREE.Group(); group.position.set(x, 0, z); const top = addBox('desk-top', [1.45, .16, .72], [0, 1.42, 0], mats.deskTop, group); top.rotation.y = .02; [[-.57, .65], [.57, .65], [-.57, -.65], [.57, -.65]].forEach(([lx, lz]) => addBox('desk-leg', [.09, 1.35, .09], [lx, .25, lz], mats.desk, group)); addBox('chair-seat', [1.0, .12, .85], [0, .83, .95], mats.chair, group); addBox('chair-back', [1.0, .75, .1], [0, 1.18, 1.33], mats.chair, group); classroom.add(group); }
    [[-3.4,-1.55], [0,-1.55], [3.4,-1.55], [-3.4,1.45], [0,1.45], [3.4,1.45]].forEach(([x,z]) => makeDesk(x,z));
    const lightGroups = [];
    function makeTubeLight(x) { const group = new THREE.Group(); group.position.set(x, 5.05, .2); const housing = new THREE.Mesh(new THREE.BoxGeometry(2.4, .12, .24), mats.trim); const tubeMat = new THREE.MeshStandardMaterial({ color: 0xd7f6ff, emissive: 0x49ddff, emissiveIntensity: 4, toneMapped: false }); const tube = new THREE.Mesh(new THREE.BoxGeometry(1.95, .06, .1), tubeMat); group.add(housing, tube); classroom.add(group); const glow = new THREE.PointLight(0x55e9ff, 3.1, 6, 2); glow.position.set(0, -.18, 0); group.add(glow); lightGroups.push({ group, tube, glow }); }
    [-4.1, 0, 4.1].forEach(makeTubeLight);
    const fan = new THREE.Group(); fan.position.set(0, 4.7, 2.15); classroom.add(fan); fan.add(new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .1, 24), new THREE.MeshStandardMaterial({ color: 0x6a7899, metalness: .7, roughness: .35 }))); const fanBlades = new THREE.Group(); fan.add(fanBlades); for (let i=0;i<4;i++){ const blade=addBox('fan-blade',[.16, .06, 1.45],[0,0,-.72],mats.trim,fanBlades); blade.rotation.y=i*Math.PI/2; } const fanGlow = new THREE.PointLight(0x9b7bff, 1.2, 3); fanGlow.position.y=-.2; fan.add(fanGlow);
    function makeSensor(name, pos, color, label) { const group = new THREE.Group(); group.position.set(...pos); const base = new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,.08,16), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .35 })); const dome = new THREE.Mesh(new THREE.SphereGeometry(.11,12,8), new THREE.MeshBasicMaterial({ color })); dome.position.y=.12; group.add(base,dome); const ring = new THREE.Mesh(new THREE.TorusGeometry(.28,.012,6,32), new THREE.MeshBasicMaterial({color, transparent:true, opacity:.65})); ring.rotation.x=Math.PI/2; group.add(ring); group.userData.label=label; classroom.add(group); return group; }
    const sensors = { pir: makeSensor('pir', [-5.8, 4.75, -3.3], 0xffb86b, 'PIR'), ldr: makeSensor('ldr', [5.7, 4.8, -2.9], 0x9b7bff, 'LDR'), dht: makeSensor('dht', [5.9, 2.25, -3.95], 0x52e5f4, 'DHT22') };
    const esp = new THREE.Group(); esp.position.set(5.72, .75, -3.5); classroom.add(esp); addBox('esp-body',[1.15,.65,.32],[0,0,0],mats.esp,esp); addBox('esp-screen',[.5,.28,.02],[0,.04,-.18],new THREE.MeshBasicMaterial({color:0x57e4ed}),esp); for(let i=0;i<4;i++) addBox('esp-pin',[.05,.05,.42],[-.35+i*.22,-.43,0],mats.trim,esp); const espLight=new THREE.PointLight(0x77e39c,1.2,2.8); espLight.position.set(0,.18,.2); esp.add(espLight);
    const ambient = new THREE.HemisphereLight(0x5574bd,0x10111e,1.7); scene.add(ambient); const key=new THREE.DirectionalLight(0x9dc3ff,2.4); key.position.set(5,10,7); key.castShadow=true; key.shadow.mapSize.set(1024,1024); scene.add(key); const cyanLight=new THREE.PointLight(0x3fe6ff,3.8,10); cyanLight.position.set(-5,4,-1); scene.add(cyanLight); const purpleLight=new THREE.PointLight(0x6d45ff,3.2,10); purpleLight.position.set(5,4,3); scene.add(purpleLight);
    const originalPosition = camera.position.clone();
    function update(nextState) { lightGroups.forEach((light, i) => { const on=nextState.lights[i]; light.glow.intensity=on?3.1:.12; light.tube.material.emissiveIntensity=on?4:.12; light.tube.material.color.setHex(on?0xd7f6ff:0x4d596c); }); fanGlow.intensity=nextState.fan?1.2:.1; fan.userData.on=nextState.fan; sensors.pir.children[1].material.color.setHex(nextState.occupancy?0xffb86b:0x4c5a70); sensors.ldr.children[1].material.color.setHex(nextState.brightness<55?0x9b7bff:0x55627b); }
    function reset() { camera.position.copy(originalPosition); controls?.target.set(0,1.8,0); controls?.update(); }
    window.classroomScene = { update, reset };
    const resize = () => { camera.aspect=wrap.clientWidth/wrap.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(wrap.clientWidth,wrap.clientHeight); }; window.addEventListener('resize',resize);
    function animate(){ requestAnimationFrame(animate); if (state.fan) fanBlades.rotation.y += .085; if (controls) controls.update(); renderer.render(scene,camera); } animate(); refs.sceneLoader.classList.add('hidden'); update(state);
  }

  installControls(); initChart(); createClassroom(); renderState();
  setInterval(simulateTelemetry, 5000);
  setInterval(() => { refs.sceneClock.textContent = formatTime(); }, 1000);
})();
