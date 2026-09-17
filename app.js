/**
 * DIANA — NEURAL MAP // AGENT HANDLER HUD
 * 
 * Visual Architecture: Cold, surgical Hitman-esque agent handler HUD.
 * Core Philosophy: Zero layout thrashing, 60 FPS requestAnimationFrame loops,
 * modular data seams cleanly prepared for future backend/WebSocket wiring.
 */

'use strict';

// Track session start time immediately for real-time uptime ticker
const SESSION_START_TIME = Date.now();
let totalCyclesCompleted = 0;

// =============================================================================
// SECTION 1: GLOBAL STATE & AGENT REGISTRY
// =============================================================================

// MOCK — agent registry is local state only, wire to backend agent list when ready
const AGENT_REGISTRY = [
  {
    id: 'mail',
    name: 'MAIL AGENT',
    status: 'IDLE', // 'IDLE' | 'ACTIVE' | 'OFFLINE'
    task: 'INBOX SEC-MONITOR // IMAP IDLE',
    description: 'Encrypted relay monitor and automated ICA transmission handler.',
    cycles: 184,
    threads: '4 THREADS // SYNC',
    active: false
  },
  {
    id: 'calendar',
    name: 'CALENDAR AGENT',
    status: 'IDLE',
    task: 'TEMPORAL DISPATCH // AGENDA SYNC',
    description: 'Mission timeline synchronization and safehouse rendezvous scheduler.',
    cycles: 312,
    threads: '2 THREADS // SYNC',
    active: false
  },
  {
    id: 'files',
    name: 'FILES AGENT',
    status: 'IDLE',
    task: 'ICA VAULT AUDIT // SHA-256 HASH',
    description: 'Classified dossier vault audit, integrity verification, and asset hashing.',
    cycles: 94,
    threads: '8 THREADS // SYNC',
    active: false
  },
  {
    id: 'voice',
    name: 'VOICE AGENT',
    status: 'IDLE',
    task: 'AUDIO SPECTRUM // VAD STANDBY',
    description: 'Real-time biometric voiceprint surveillance and acoustic signal processing.',
    cycles: 57,
    threads: '2 THREADS // SYNC',
    active: false
  }
];

const HUD_STATE = {
  coreState: 'idle', // 'idle' | 'processing'
  coreProcessingTimer: null,
  activeAgent: null, // null (Diana Core) | string agent ID
  metrics: {
    sysHealth: {
      current: 98.4,
      history: new Array(60).fill(98.4),
      min: 90,
      max: 100,
      unit: '%',
      elementVal: null,
      canvas: null,
      ctx: null,
      color: '#00d9ff'
    },
    neuralBandwidth: {
      current: 142.8,
      history: new Array(60).fill(142.8),
      min: 50,
      max: 250,
      unit: ' KB/s',
      elementVal: null,
      canvas: null,
      ctx: null,
      color: '#ff8c42'
    }
  },
  audioEnabled: false,
  commandHistory: [],
  historyIndex: -1
};

// =============================================================================
// SECTION 2: AUDIO ENGINE (Subtle Web Audio API Synthesis)
// Default: MUTED. No external audio files needed.
// =============================================================================

class TacticalAudioEngine {
  constructor() {
    this.ctx = null;
    this.ambientOsc = null;
    this.ambientGain = null;
    this.masterGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Low whisper ambient hum (~55 Hz base frequency, extremely quiet)
      this.ambientOsc = this.ctx.createOscillator();
      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

      this.ambientOsc.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);
      this.ambientOsc.start();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  setMuted(muted) {
    if (!this.initialized && !muted) {
      this.init();
    }
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }

    const targetGain = muted ? 0.0001 : 0.45;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(targetGain, this.ctx.currentTime + 0.1);
  }

  playKeyTick() {
    if (!HUD_STATE.audioEnabled || !this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400 + Math.random() * 200, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.035);
  }

  playAgentPing(isActivating = true) {
    if (!HUD_STATE.audioEnabled || !this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = isActivating ? 880 : 440;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.23);
  }

  playCorePulse() {
    if (!HUD_STATE.audioEnabled || !this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.26);
  }
}

const audioEngine = new TacticalAudioEngine();

// =============================================================================
// SECTION 3: CYCLES & UPTIME LIVE COUNTERS
// =============================================================================

function incrementCycles(amount = 1) {
  totalCyclesCompleted += amount;
  const cyclesEl = document.getElementById('active-agent-cycles');
  if (cyclesEl) {
    cyclesEl.textContent = String(totalCyclesCompleted).padStart(4, '0');
  }
}

function updateSessionUptime() {
  const elapsedMs = Math.max(0, Date.now() - SESSION_START_TIME);
  const s = Math.floor((elapsedMs / 1000) % 60);
  const m = Math.floor((elapsedMs / (1000 * 60)) % 60);
  const h = Math.floor((elapsedMs / (1000 * 60 * 60)));
  const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  
  const uptimeEl = document.getElementById('active-agent-uptime');
  if (uptimeEl) {
    uptimeEl.textContent = formatted;
  }
}

// =============================================================================
// SECTION 4: CORE ROTATION & STATE CONTROLLER
// Concentric rings, multi-speed counter-rotation, idle pulse vs processing burst
// =============================================================================

function setCoreState(state, autoResetMs = 4000) {
  const coreEl = document.getElementById('diana-core');
  if (!coreEl) return;

  HUD_STATE.coreState = state;
  coreEl.setAttribute('data-state', state);

  const statusVal = document.getElementById('system-status-val');
  if (statusVal) {
    if (state === 'processing') {
      statusVal.textContent = 'PROCESSING';
      statusVal.style.color = 'var(--accent-orange)';
      audioEngine.playCorePulse();
      incrementCycles(Math.floor(Math.random() * 3) + 1);
    } else {
      statusVal.textContent = 'OPTIMAL';
      statusVal.style.color = 'var(--accent-cyan)';
    }
  }

  if (state === 'processing') {
    if (HUD_STATE.coreProcessingTimer) {
      clearTimeout(HUD_STATE.coreProcessingTimer);
    }
    if (autoResetMs > 0) {
      HUD_STATE.coreProcessingTimer = setTimeout(() => {
        setCoreState('idle');
      }, autoResetMs);
    }
  }
}

// =============================================================================
// SECTION 5: AGENT REGISTRY & ACTIVE READOUT
// Modal slide-in panel, local registry state, status toggles, add agent
// =============================================================================

/**
 * Render the Agent Registry modal list
 */
function renderAgentRegistry() {
  const listEl = document.getElementById('agent-registry-list');
  const countBadge = document.getElementById('reg-count-badge');
  const modalCount = document.getElementById('registry-modal-count');

  if (countBadge) countBadge.textContent = AGENT_REGISTRY.length;
  if (modalCount) modalCount.textContent = `${AGENT_REGISTRY.length} UNITS`;

  if (!listEl) return;
  listEl.innerHTML = '';

  AGENT_REGISTRY.forEach(agent => {
    const row = document.createElement('div');
    row.className = `registry-agent-row ${agent.active ? 'is-active' : ''}`;
    row.setAttribute('data-agent-id', agent.id);

    row.innerHTML = `
      <div class="agent-row-header">
        <div class="agent-row-title">
          <span class="agent-row-name">${escapeHtml(agent.name)}</span>
        </div>
        <div class="agent-row-actions">
          <span class="agent-status-tag ${agent.active ? 'active' : ''}">${agent.active ? 'ACTIVE' : 'IDLE'}</span>
          <button class="btn-row-toggle" type="button">${agent.active ? '[STANDBY]' : '[DISPATCH]'}</button>
        </div>
      </div>
      <div class="agent-row-desc">${escapeHtml(agent.description || agent.task)}</div>
      <div class="agent-row-meta">
        <span>TASK: ${escapeHtml(agent.task)}</span>
        <span>${escapeHtml(agent.threads || 'SYNC')}</span>
      </div>
    `;

    // Clicking row or toggle button flips status
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAgentState(agent.id);
    });

    listEl.appendChild(row);
  });
}

/**
 * Open Agent Registry modal
 */
function openAgentRegistry() {
  const overlay = document.getElementById('agent-registry-overlay');
  if (overlay) {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    renderAgentRegistry();
    audioEngine.playKeyTick();
  }
}

/**
 * Close Agent Registry modal
 */
function closeAgentRegistry() {
  const overlay = document.getElementById('agent-registry-overlay');
  if (overlay) {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    // Hide add agent form if open
    hideAddAgentForm();
    audioEngine.playKeyTick();
  }
}

function showAddAgentForm() {
  const collapsed = document.getElementById('add-agent-collapsed');
  const form = document.getElementById('add-agent-form');
  if (collapsed) collapsed.style.display = 'none';
  if (form) {
    form.style.display = 'flex';
    const nameInput = document.getElementById('new-agent-name');
    if (nameInput) nameInput.focus();
  }
}

function hideAddAgentForm() {
  const collapsed = document.getElementById('add-agent-collapsed');
  const form = document.getElementById('add-agent-form');
  if (collapsed) collapsed.style.display = 'block';
  if (form) {
    form.style.display = 'none';
    form.reset();
  }
}

/**
 * Toggle agent active state
 * @param {string} agentId
 * @param {boolean} [forceState]
 */
function toggleAgentState(agentId, forceState) {
  const agent = AGENT_REGISTRY.find(a => a.id === agentId);
  if (!agent) return;

  // MOCK — replace with real agent status from backend
  const newState = forceState !== undefined ? forceState : !agent.active;
  agent.active = newState;
  agent.status = newState ? 'ACTIVE' : 'IDLE';

  // Update quick route buttons in bottom-right if present
  const chipBtn = document.querySelector(`.btn-tactical-chip[data-agent-trigger="${agentId}"]`);
  if (chipBtn) {
    if (newState) chipBtn.classList.add('active');
    else chipBtn.classList.remove('active');
  }

  // Increment cycle counter on agent interaction
  incrementCycles(1);

  // Audio cue
  audioEngine.playAgentPing(newState);

  // Re-render registry so row styling updates immediately
  renderAgentRegistry();

  // Update Master Active Agent readout
  updateActiveAgentReadout();
}

/**
 * Update the bottom-right panel based on the active agent
 */
function updateActiveAgentReadout() {
  const nameEl = document.getElementById('active-agent-name');
  const taskEl = document.getElementById('active-agent-task');
  const modeTagEl = document.getElementById('agent-mode-tag');
  const threadsEl = document.getElementById('active-agent-threads');

  // Find currently active agents
  const activeList = AGENT_REGISTRY.filter(a => a.active);

  if (activeList.length > 0) {
    // Select the latest active agent as primary focus
    const primary = activeList[activeList.length - 1];
    HUD_STATE.activeAgent = primary.id;

    if (nameEl) {
      nameEl.textContent = primary.name;
      nameEl.className = 'agent-name-display orange-text';
    }
    if (taskEl) taskEl.textContent = primary.task;
    if (modeTagEl) {
      modeTagEl.textContent = activeList.length > 1 ? `ENGAGED (${activeList.length})` : 'ENGAGED';
      modeTagEl.style.color = 'var(--accent-orange)';
      modeTagEl.style.borderColor = 'var(--accent-orange)';
    }
    if (threadsEl) threadsEl.textContent = primary.threads;
  } else {
    // No active agent -> Diana Core Standby
    HUD_STATE.activeAgent = null;
    if (nameEl) {
      nameEl.textContent = 'DIANA CORE // STANDBY';
      nameEl.className = 'agent-name-display cyan-text';
    }
    if (taskEl) taskEl.textContent = 'AWAITING MISSION OBJECTIVE';
    if (modeTagEl) {
      modeTagEl.textContent = 'STANDBY';
      modeTagEl.style.color = 'var(--accent-cyan)';
      modeTagEl.style.borderColor = 'var(--accent-cyan-dim)';
    }
    if (threadsEl) threadsEl.textContent = '4 THREADS // SYNC';
  }
}

/**
 * Reset all active agents back to standby
 */
function resetAllAgents() {
  AGENT_REGISTRY.forEach(agent => {
    agent.active = false;
    agent.status = 'IDLE';
  });

  document.querySelectorAll('.btn-tactical-chip').forEach(btn => {
    btn.classList.remove('active');
  });

  renderAgentRegistry();
  updateActiveAgentReadout();
}

// =============================================================================
// SECTION 6: LIVE TELEMETRY GRAPHS (SYS-HLTH & NEURAL-BANDWIDTH)
// Canvas sparkline/oscilloscope style with reticle grid
// =============================================================================

function initTelemetryGraphs() {
  const canvasHealth = document.getElementById('canvas-sys-health');
  if (canvasHealth) {
    HUD_STATE.metrics.sysHealth.canvas = canvasHealth;
    HUD_STATE.metrics.sysHealth.ctx = canvasHealth.getContext('2d');
    HUD_STATE.metrics.sysHealth.elementVal = document.getElementById('val-sys-health');
  }

  const canvasBandwidth = document.getElementById('canvas-neural-bandwidth');
  if (canvasBandwidth) {
    HUD_STATE.metrics.neuralBandwidth.canvas = canvasBandwidth;
    HUD_STATE.metrics.neuralBandwidth.ctx = canvasBandwidth.getContext('2d');
    HUD_STATE.metrics.neuralBandwidth.elementVal = document.getElementById('val-neural-bandwidth');
  }
}

function updateMetric(metricName, value) {
  const metric = HUD_STATE.metrics[metricName];
  if (!metric) return;

  metric.current = value;
  metric.history.push(value);
  if (metric.history.length > 60) {
    metric.history.shift();
  }

  if (metric.elementVal) {
    metric.elementVal.textContent = `${value.toFixed(1)}${metric.unit}`;
  }
}

function renderMetricGraph(metric) {
  const ctx = metric.ctx;
  const canvas = metric.canvas;
  if (!ctx || !canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const history = metric.history;
  const len = history.length;

  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, metric.color === '#00d9ff' ? 'rgba(0, 217, 255, 0.25)' : 'rgba(255, 140, 66, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

  ctx.beginPath();
  const step = w / (len - 1);

  for (let i = 0; i < len; i++) {
    const val = history[i];
    const normalized = (val - metric.min) / (metric.max - metric.min);
    const clamped = Math.max(0, Math.min(1, normalized));
    const y = h - (clamped * (h - 8) + 4);
    const x = i * step;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.strokeStyle = metric.color;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  const lastVal = history[len - 1];
  const lastNorm = (lastVal - metric.min) / (metric.max - metric.min);
  const lastY = h - (Math.max(0, Math.min(1, lastNorm)) * (h - 8) + 4);

  ctx.fillStyle = metric.color;
  ctx.beginPath();
  ctx.arc(w - 2, lastY, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

// =============================================================================
// SECTION 7: CHROMADB "DATA FRAGMENT" MEMORY STORE
// MOCK DATA SEAM — Replace with real ChromaDB REST / WebSocket query when ready
// =============================================================================

// MOCK — replace with real ChromaDB vector store client when backend is ready
const CHROMA_MEMORY_CACHE = [
  {
    id: 'DOC-9428',
    collection: '#handler_briefings',
    distance: 0.084,
    timestamp: '14:52:19',
    text: 'PROVIDENCE DOSSIER: High-value asset tracking confirmed in Sector 4. Diana Burnwood directing surveillance vector.'
  },
  {
    id: 'DOC-8812',
    collection: '#agent_memory',
    distance: 0.119,
    timestamp: '14:48:02',
    text: 'SYSTEM ROUTING: Mail agent dispatched 3 encrypted dispatches via ICA relay proxy node 10.99.4.'
  },
  {
    id: 'DOC-7301',
    collection: '#temporal_cache',
    distance: 0.158,
    timestamp: '14:31:40',
    text: 'CALENDAR LOCK: Operative rendezvous scheduled 22:00 UTC at safehouse location Baker-9.'
  },
  {
    id: 'DOC-6190',
    collection: '#handler_briefings',
    distance: 0.192,
    timestamp: '14:15:11',
    text: 'VOICE PROTOCOL: Acoustic voiceprint verified against biometric handler signature ICA-DB-47.'
  },
  {
    id: 'DOC-5014',
    collection: '#agent_memory',
    distance: 0.221,
    timestamp: '13:58:24',
    text: 'FILE INTELLIGENCE: Decrypted archive payload contains schematic blueprints for autonomous drone interceptors.'
  },
  {
    id: 'DOC-4482',
    collection: '#temporal_cache',
    distance: 0.245,
    timestamp: '13:40:02',
    text: 'HANDLER MEMO: Standard assassination contingency rules apply. No collateral targets permitted in theater.'
  }
];

let activeMemoryFragments = [...CHROMA_MEMORY_CACHE];

function renderMemoryFragments(fragments) {
  const container = document.getElementById('fragment-stream-list');
  const counter = document.getElementById('fragment-counter');
  if (!container) return;

  if (counter) {
    counter.textContent = `${fragments.length} ENTRIES`;
  }

  container.innerHTML = '';

  if (fragments.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'fragment-item';
    emptyMsg.innerHTML = `<span class="frag-snippet" style="color: var(--text-dim);">&gt; NO MATCHING MEMORY FRAGMENTS IN CHROMADB</span>`;
    container.appendChild(emptyMsg);
    return;
  }

  fragments.forEach(frag => {
    const item = document.createElement('div');
    item.className = 'fragment-item';
    item.setAttribute('data-id', frag.id);

    item.innerHTML = `
      <div class="frag-top">
        <span class="frag-id">${frag.id}</span>
        <span class="frag-tag">${frag.collection}</span>
        <span class="frag-dist">DIST: ${frag.distance.toFixed(3)}</span>
      </div>
      <div class="frag-snippet">${escapeHtml(frag.text)}</div>
      <div class="frag-bottom">
        <span>STORE: CHROMADB_LOCAL</span>
        <span>${frag.timestamp}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      document.querySelectorAll('.fragment-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      const input = document.getElementById('command-input');
      if (input) {
        input.value = `recall ${frag.id}`;
        input.focus();
        updateApertureStatus(input.value);
      }
      audioEngine.playKeyTick();
    });

    container.appendChild(item);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function filterMemoryFragments(query) {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) {
    activeMemoryFragments = [...CHROMA_MEMORY_CACHE];
  } else {
    activeMemoryFragments = CHROMA_MEMORY_CACHE.filter(f => 
      f.id.toLowerCase().includes(cleanQ) ||
      f.collection.toLowerCase().includes(cleanQ) ||
      f.text.toLowerCase().includes(cleanQ)
    );
  }
  renderMemoryFragments(activeMemoryFragments);
}

// =============================================================================
// SECTION 8: COMMAND PROTOCOL & TYPEWRITER OUTPUT
// =============================================================================

let typewriterRunning = false;

function updateApertureStatus(text) {
  const statusEl = document.getElementById('aperture-status');
  if (!statusEl) return;

  if (!text || text.trim() === '') {
    statusEl.textContent = 'DIRECTIVE READY';
    statusEl.style.color = 'var(--accent-cyan)';
  } else {
    statusEl.textContent = `TYPING [${text.length} CH]`;
    statusEl.style.color = 'var(--accent-cyan)';
  }
}

function streamTypewriterText(text, speedMs = 12) {
  const outputEl = document.getElementById('typewriter-output');
  const indicator = document.getElementById('typewriter-indicator');
  const statusEl = document.getElementById('aperture-status');
  if (!outputEl) return;

  typewriterRunning = true;
  if (indicator) {
    indicator.textContent = '• TRANSMITTING';
    indicator.classList.add('active');
  }
  if (statusEl) {
    statusEl.textContent = 'TRANSMITTING';
    statusEl.style.color = 'var(--accent-orange)';
  }

  outputEl.innerHTML = '';
  let index = 0;

  function typeChar() {
    if (index < text.length) {
      outputEl.textContent = text.substring(0, index + 1);
      index++;

      if (index % 3 === 0) {
        audioEngine.playKeyTick();
      }

      setTimeout(typeChar, speedMs);
    } else {
      typewriterRunning = false;
      if (indicator) {
        indicator.textContent = '• STANDBY';
        indicator.classList.remove('active');
      }
      if (statusEl) {
        statusEl.textContent = 'DIRECTIVE READY';
        statusEl.style.color = 'var(--accent-cyan)';
      }
    }
  }

  typeChar();
}

async function sendCommand(rawCommand) {
  const cmd = rawCommand.trim();
  if (!cmd) return 'NO DIRECTIVE ENTERED. USE "HELP" FOR COMMAND SYNTAX.';

  setCoreState('processing', 3500);

  // MOCK — replace with real backend fetch/websocket when ready
  await new Promise(resolve => setTimeout(resolve, 600));

  const lower = cmd.toLowerCase();

  if (lower === 'help' || lower === '?') {
    return `DIANA ICA PROTOCOL COMMAND DIRECTIVES:
- AGENTS          : OPEN AGENT REGISTRY DIRECTORY
- AGENT <ID> [ON|OFF|STATUS] : TOGGLE SPECIFIC AGENT
- RECALL <QUERY>  : SEARCH CHROMADB VECTOR FRAGMENTS
- SCAN FILES      : DISPATCH FILES AGENT AUDIT
- STATUS          : GLOBAL SUBSYSTEM HEALTH CHECK
- CLEAR           : RESET TELEMETRY READOUT
- RESET           : REVERT ALL AGENTS TO STANDBY`;
  }

  if (lower === 'agents' || lower === 'registry') {
    openAgentRegistry();
    return `AGENT REGISTRY OPENED. ${AGENT_REGISTRY.length} SUB-AGENTS REGISTERED.`;
  }

  if (lower === 'status' || lower === 'sys') {
    const activeNames = AGENT_REGISTRY.filter(a => a.active).map(a => a.name).join(', ') || 'NONE [STANDBY]';
    return `GLOBAL SYSTEM TELEMETRY:
- CORE: OPTIMAL (60 FPS, LATENCY: 4.2ms)
- MEMORY STORES: CHROMADB ACTIVE (1536-D)
- ENGAGED AGENTS: ${activeNames}`;
  }

  if (lower.startsWith('recall ') || lower.startsWith('search ')) {
    const q = cmd.substring(cmd.indexOf(' ') + 1).trim();
    filterMemoryFragments(q);
    const filterInput = document.getElementById('fragment-filter-input');
    if (filterInput) filterInput.value = q;
    return `CHROMADB QUERY EXECUTED FOR "${q}". ${activeMemoryFragments.length} MATCHING FRAGMENTS RETRIEVED INTO TELEMETRY BUFFER.`;
  }

  if (lower.startsWith('agent ')) {
    const parts = lower.split(' ').filter(Boolean);
    const target = parts[1];
    const action = parts[2] || 'status';

    const ag = AGENT_REGISTRY.find(a => a.id === target || a.name.toLowerCase().includes(target));
    if (ag) {
      if (action === 'activate' || action === 'on') {
        toggleAgentState(ag.id, true);
        return `${ag.name} DIRECTED TO ACTIVE SURVEILLANCE. VECTOR ASSIGNED.`;
      } else if (action === 'deactivate' || action === 'off') {
        toggleAgentState(ag.id, false);
        return `${ag.name} DISENGAGED. RETURNING TO IDLE ORBIT.`;
      } else {
        return `${ag.name} STATUS: ${ag.active ? 'ACTIVE' : 'IDLE'} // TASK: ${ag.task} // CYCLES: ${ag.cycles}`;
      }
    } else {
      return `UNKNOWN AGENT IDENTIFIER "${target}". USE 'AGENTS' TO VIEW DIRECTORY.`;
    }
  }

  if (lower === 'scan files' || lower === 'files scan') {
    toggleAgentState('files', true);
    return `FILES AGENT ENGAGED: SCANNING ICA SECURE VAULT REPOSITORIES. INTEGRITY VERIFIED (0 TAMPERING DETECTED).`;
  }

  if (lower === 'sync calendar' || lower === 'calendar') {
    toggleAgentState('calendar', true);
    return `CALENDAR AGENT ENGAGED: SYNCHRONIZING TEMPORAL TIMELINES. 3 UPCOMING OPERATIVE BRIEFINGS LOGGED.`;
  }

  if (lower === 'check mail' || lower === 'mail') {
    toggleAgentState('mail', true);
    return `MAIL AGENT ENGAGED: FETCHING ICA ENCRYPTED RELAYS. 2 PRIORITY DISPATCHES AWAITING REVIEW.`;
  }

  if (lower === 'voice' || lower === 'listen') {
    toggleAgentState('voice', true);
    return `VOICE AGENT ENGAGED: ACOUSTIC FREQUENCY ACTIVE. LISTENING FOR HANDLER PASSCODE.`;
  }

  if (lower === 'clear' || lower === 'cls') {
    return 'TELEMETRY READOUT REFRESHED. READY FOR NEXT DIRECTIVE.';
  }

  if (lower === 'reset') {
    resetAllAgents();
    return 'ALL AGENTS REVERTED TO IDLE STATE. DIANA CORE IN STANDBY.';
  }

  return `DIRECTIVE RECEIVED: "${cmd.toUpperCase()}".
PROCESSED BY DIANA NEURAL MAP. ORCHESTRATION VECTOR INITIALIZED. PROCEED WITH CAUTION, 47.`;
}

// =============================================================================
// SECTION 9: INITIALIZATION & 60 FPS ANIMATION LOOP
// =============================================================================

function initApp() {
  // Initialize canvas telemetry viewports
  initTelemetryGraphs();

  // Render initial ChromaDB memory fragments
  renderMemoryFragments(activeMemoryFragments);

  // Render initial Agent Registry & active agent readout
  renderAgentRegistry();
  updateActiveAgentReadout();
  incrementCycles(0);

  // Setup Clock ticker & Session Uptime ticker
  function updateClocks() {
    const now = new Date();
    const utcHours = String(now.getUTCHours()).padStart(2, '0');
    const utcMins = String(now.getUTCMinutes()).padStart(2, '0');
    const utcSecs = String(now.getUTCSeconds()).padStart(2, '0');
    const clockUtcEl = document.getElementById('clock-utc');
    if (clockUtcEl) clockUtcEl.textContent = `${utcHours}:${utcMins}:${utcSecs} UTC`;

    const locHours = String(now.getHours()).padStart(2, '0');
    const locMins = String(now.getMinutes()).padStart(2, '0');
    const locSecs = String(now.getSeconds()).padStart(2, '0');
    const clockLocEl = document.getElementById('clock-local');
    if (clockLocEl) clockLocEl.textContent = `${locHours}:${locMins}:${locSecs}`;

    updateSessionUptime();
  }

  updateClocks();
  setInterval(updateClocks, 500);

  // Background heartbeat cycle
  setInterval(() => {
    incrementCycles(1);
  }, 12000);

  // Wire Audio Mute/Unmute toggle
  const audioBtn = document.getElementById('btn-audio-toggle');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      HUD_STATE.audioEnabled = !HUD_STATE.audioEnabled;
      audioEngine.setMuted(!HUD_STATE.audioEnabled);

      const icon = document.getElementById('audio-icon-state');
      const text = audioBtn.querySelector('.btn-text');

      if (HUD_STATE.audioEnabled) {
        audioBtn.classList.add('audio-active');
        if (icon) icon.textContent = '[LIVE]';
        if (text) text.textContent = 'SFX: ON';
        audioEngine.playAgentPing(true);
      } else {
        audioBtn.classList.remove('audio-active');
        if (icon) icon.textContent = '[MUTED]';
        if (text) text.textContent = 'SFX: OFF';
      }
    });
  }

  // Wire "VIEW AGENTS" Button & Registry Modal
  const openRegBtn = document.getElementById('btn-open-registry');
  if (openRegBtn) {
    openRegBtn.addEventListener('click', () => {
      openAgentRegistry();
    });
  }

  const closeRegBtn = document.getElementById('btn-close-registry');
  if (closeRegBtn) {
    closeRegBtn.addEventListener('click', () => {
      closeAgentRegistry();
    });
  }

  const regOverlay = document.getElementById('agent-registry-overlay');
  if (regOverlay) {
    regOverlay.addEventListener('click', (e) => {
      if (e.target === regOverlay) {
        closeAgentRegistry();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAgentRegistry();
    }
  });

  // Wire Add Agent Form
  const showAddBtn = document.getElementById('btn-show-add-form');
  if (showAddBtn) {
    showAddBtn.addEventListener('click', () => {
      showAddAgentForm();
    });
  }

  const cancelAddBtn = document.getElementById('btn-cancel-agent');
  if (cancelAddBtn) {
    cancelAddBtn.addEventListener('click', () => {
      hideAddAgentForm();
    });
  }

  const addAgentForm = document.getElementById('add-agent-form');
  if (addAgentForm) {
    addAgentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('new-agent-name');
      const descInput = document.getElementById('new-agent-desc');
      const nameVal = nameInput ? nameInput.value.trim() : '';
      const descVal = descInput ? descInput.value.trim() : '';

      if (!nameVal) return;

      const newId = nameVal.toLowerCase().replace(/[^a-z0-9]/g, '_') || `agt_${Date.now()}`;
      const newAgent = {
        id: newId,
        name: nameVal.toUpperCase(),
        status: 'IDLE',
        task: descVal ? descVal.toUpperCase() : 'CUSTOM SUBSYSTEM // MONITORING',
        description: descVal || 'Newly provisioned custom agent handler.',
        cycles: 0,
        threads: '2 THREADS // SYNC',
        active: false
      };

      AGENT_REGISTRY.push(newAgent);
      renderAgentRegistry();
      hideAddAgentForm();
      audioEngine.playKeyTick();
      incrementCycles(2);
    });
  }

  // Wire Quick Route buttons in bottom-right panel
  document.querySelectorAll('[data-agent-trigger]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-agent-trigger');
      if (target === 'reset') {
        resetAllAgents();
      } else {
        toggleAgentState(target);
      }
    });
  });

  // Wire ChromaDB search filter
  const filterInput = document.getElementById('fragment-filter-input');
  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      filterMemoryFragments(e.target.value);
    });
  }

  const clearFilterBtn = document.getElementById('btn-clear-filter');
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', () => {
      if (filterInput) filterInput.value = '';
      filterMemoryFragments('');
    });
  }

  // Wire Command Protocol Form & Input
  const commandForm = document.getElementById('command-form');
  const commandInput = document.getElementById('command-input');
  const commandRing = document.getElementById('command-ring');

  if (commandRing && commandInput) {
    commandRing.addEventListener('click', () => {
      commandInput.focus();
    });
  }

  if (commandForm && commandInput) {
    commandInput.addEventListener('input', (e) => {
      updateApertureStatus(e.target.value);
    });

    commandInput.addEventListener('focus', () => {
      const ring = document.getElementById('command-ring');
      if (ring) ring.classList.add('ring-focused');
    });

    commandInput.addEventListener('blur', () => {
      const ring = document.getElementById('command-ring');
      if (ring) ring.classList.remove('ring-focused');
      updateApertureStatus(commandInput.value);
    });

    commandInput.addEventListener('keydown', (e) => {
      audioEngine.playKeyTick();

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (HUD_STATE.commandHistory.length > 0) {
          if (HUD_STATE.historyIndex < HUD_STATE.commandHistory.length - 1) {
            HUD_STATE.historyIndex++;
          }
          const item = HUD_STATE.commandHistory[HUD_STATE.commandHistory.length - 1 - HUD_STATE.historyIndex];
          if (item) {
            commandInput.value = item;
            updateApertureStatus(item);
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (HUD_STATE.historyIndex > 0) {
          HUD_STATE.historyIndex--;
          const item = HUD_STATE.commandHistory[HUD_STATE.commandHistory.length - 1 - HUD_STATE.historyIndex];
          if (item) {
            commandInput.value = item;
            updateApertureStatus(item);
          }
        } else if (HUD_STATE.historyIndex === 0) {
          HUD_STATE.historyIndex = -1;
          commandInput.value = '';
          updateApertureStatus('');
        }
      }
    });

    commandForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = commandInput.value.trim();
      if (!val) return;

      HUD_STATE.commandHistory.push(val);
      HUD_STATE.historyIndex = -1;

      commandInput.value = '';
      updateApertureStatus('');

      const respEl = document.getElementById('typewriter-output');
      if (respEl) {
        respEl.textContent = `> TRANSMITTING DIRECTIVE: "${val}" ...`;
      }

      const response = await sendCommand(val);
      streamTypewriterText(response, 10);
    });
  }

  // ===========================================================================
  // MOCK TELEMETRY FEED (Periodically calls updateMetric)
  // MOCK — replace with real WebSocket messages when backend is ready
  // ===========================================================================
  setInterval(() => {
    const healthJitter = 98.2 + Math.sin(Date.now() / 3000) * 0.8 + (Math.random() - 0.5) * 0.4;
    updateMetric('sysHealth', healthJitter);

    const baseBw = HUD_STATE.coreState === 'processing' ? 210 : 140;
    const bwJitter = baseBw + Math.cos(Date.now() / 2000) * 25 + (Math.random() - 0.5) * 15;
    updateMetric('neuralBandwidth', bwJitter);
  }, 350);

  // ===========================================================================
  // 60 FPS RENDER LOOP VIA requestAnimationFrame
  // ===========================================================================
  let frameCount = 0;
  let lastFpsUpdate = performance.now();
  const fpsEl = document.getElementById('hud-fps-readout');

  function hudRenderLoop(currentTime) {
    frameCount++;
    if (currentTime - lastFpsUpdate >= 1000) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
      if (fpsEl) fpsEl.textContent = `${fps} FPS`;
      frameCount = 0;
      lastFpsUpdate = currentTime;
    }

    renderMetricGraph(HUD_STATE.metrics.sysHealth);
    renderMetricGraph(HUD_STATE.metrics.neuralBandwidth);

    requestAnimationFrame(hudRenderLoop);
  }

  requestAnimationFrame(hudRenderLoop);

  // Initial welcome readout
  setTimeout(() => {
    streamTypewriterText("DIANA // NEURAL MAP ONLINE. ALL ICA HANDLER SUBSYSTEMS NOMINAL.\nUSE 'VIEW AGENTS' OR INPUT 'AGENTS' TO OPEN THE AGENT REGISTRY.", 14);
  }, 400);
}

// Safe bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Expose testing helpers on window for developer testing & automated probes
window.DIANA_API = {
  setCoreState,
  toggleAgentState,
  updateMetric,
  sendCommand,
  filterMemoryFragments,
  resetAllAgents,
  incrementCycles,
  openAgentRegistry,
  closeAgentRegistry,
  getAgents: () => AGENT_REGISTRY
};
