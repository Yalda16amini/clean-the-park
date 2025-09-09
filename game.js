const messageEl = document.getElementById('message');
const levelEl = document.getElementById('level');
const scoreEl = document.getElementById('score');
const binEl = document.getElementById('bin');
const pawEl = document.getElementById('paw');

const trashTypes = ["🍌", "🍕", "💩", "🥑", "🤡"];

let level = 1;
let recycled = 0;
let trashCount = 3;
let items = [];
let started = false;


function paramsForLevel(l) {
  return {
    minSize: Math.max(18, 36 - l * 2),
    maxSize: Math.max(28, 56 - l * 3),
    wiggleMag: Math.min(2 + l * 0.4, 6),
    escapeRadius: Math.max(60, 160 - l * 6),
    speed: Math.min(1.6 + l * 0.12, 3.4)
  }
}


let audioCtx; let masterGain; let startedMusic = false; let musicInterval;
function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.25;
  masterGain.connect(audioCtx.destination);
}


function playCatch() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(660, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.08);
  g.gain.value = 0.4; g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  o.connect(g); g.connect(masterGain); o.start(); o.stop(audioCtx.currentTime + 0.13);
}


function startMusic() {
  if (startedMusic || !audioCtx) return; startedMusic = true;
  const scale = [0, 2, 4, 7, 9];
  const base = 220;
  musicInterval = setInterval(() => {
    const step = scale[Math.floor(Math.random() * scale.length)];
    const freq = base * Math.pow(2, step / 12);
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.value = 0.08; g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
    o.connect(g); g.connect(masterGain); o.start(); o.stop(audioCtx.currentTime + 0.62);
  }, 480);
}


const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function placeWithin(el) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const size = parseFloat(getComputedStyle(el).fontSize);
  const x = rand(size, vw - size * 1.5);
  const y = rand(size * 2, vh - size * 2.5);
  el.style.left = x + "px";
  el.style.top = y + "px";
}

function createTrash(num) {
  const p = paramsForLevel(level);
  for (let i = 0; i < num; i++) {
    const el = document.createElement('div');
    el.className = 'trash';
    el.textContent = trashTypes[Math.floor(Math.random() * trashTypes.length)];
    const size = Math.round(rand(p.minSize, p.maxSize));
    el.style.fontSize = size + "px";
    placeWithin(el);
    el.dataset.vx = rand(-p.speed, p.speed);
    el.dataset.vy = rand(-p.speed, p.speed);
    enableDrag(el);
    enableCatch(el);
    document.body.appendChild(el);
    items.push(el);
  }
  updateHUD();
}

function enableCatch(el) {
  el.addEventListener('click', (e) => {

    el.style.transform = 'translate(-50%,-50%) scale(1.1)';
    setTimeout(() => el.style.transform = 'translate(-50%,-50%)', 100);
  }, { passive: true });
}


function enableDrag(el) {
  let dragging = false; let offsetX = 0, offsetY = 0;
  const down = (e) => {
    const pt = e.touches ? e.touches[0] : e;
    dragging = true; el.style.transition = 'none';
    const rect = el.getBoundingClientRect();
    offsetX = pt.clientX - rect.left; offsetY = pt.clientY - rect.top;
    el.style.transform = 'translate(-50%,-50%) scale(1.06)';
  }
  const move = (e) => {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    const x = pt.clientX - offsetX + el.offsetWidth / 2;
    const y = pt.clientY - offsetY + el.offsetHeight / 2;
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  const up = () => {
    if (!dragging) return; dragging = false; el.style.transform = 'translate(-50%,-50%)'; el.style.transition = '';
    checkDrop(el);
  }
  el.addEventListener('mousedown', down);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);

  el.addEventListener('touchstart', down, { passive: true });
  window.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', up);
}

function checkDrop(el) {
  const bin = binEl.getBoundingClientRect();
  const it = el.getBoundingClientRect();
  const overlap = !(it.right < bin.left || it.left > bin.right || it.bottom < bin.top || it.top > bin.bottom);
  if (overlap) {

    playCatch();
    binEl.classList.add('pop'); setTimeout(() => binEl.classList.remove('pop'), 180);
    el.remove();
    items = items.filter(n => n !== el);
    recycled++;
    message(`Nice catch! ♻️`);
    updateHUD();
    if (items.length === 0) {
      levelUp();
    }
  }
}

function levelUp() {
  level++; trashCount = Math.min(20, trashCount + 2);
  message(`Level up! New trash incoming...`);
  updateHUD();
  setTimeout(() => createTrash(trashCount), 600);
}

function updateHUD() {
  levelEl.textContent = `Level: ${level}`;
  scoreEl.textContent = `Recycled: ${recycled}`;
}

function message(text) {
  messageEl.textContent = text;
}

let mouse = { x: -9999, y: -9999 };
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('touchmove', e => { const t = e.touches[0]; mouse.x = t.clientX; mouse.y = t.clientY; }, { passive: false });

function chaosLoop() {
  const p = paramsForLevel(level);
  for (const el of items) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2; const cy = rect.top + rect.height / 2;
    const dx = cx - mouse.x; const dy = cy - mouse.y;
    const dist = Math.hypot(dx, dy);

    let vx = parseFloat(el.dataset.vx) || 0; let vy = parseFloat(el.dataset.vy) || 0;
    if (dist < p.escapeRadius) {
      const awayX = dx / (dist || 1); const awayY = dy / (dist || 1);
      vx += awayX * 0.5; vy += awayY * 0.5;
    }

    vx += (Math.random() - 0.5) * (p.wiggleMag * 0.04);
    vy += (Math.random() - 0.5) * (p.wiggleMag * 0.04);


    const sp = Math.hypot(vx, vy);
    const maxSp = p.speed;
    if (sp > maxSp) { vx = vx / sp * maxSp; vy = vy / sp * maxSp; }


    let nx = rect.left + vx; let ny = rect.top + vy;
    if (nx < 0 || nx > window.innerWidth - rect.width) { vx *= -0.8; nx = clamp(nx, 0, window.innerWidth - rect.width); }
    if (ny < 0 || ny > window.innerHeight - rect.height) { vy *= -0.8; ny = clamp(ny, 0, window.innerHeight - rect.height); }

    el.style.left = (nx + rect.width / 2) + 'px';
    el.style.top = (ny + rect.height / 2) + 'px';
    el.dataset.vx = vx; el.dataset.vy = vy;
  }


  if (Math.random() < 0.003 && items.length) {
    pawEl.classList.add('show');
    setTimeout(() => pawEl.classList.remove('show'), 450);
    for (const el of items) { placeWithin(el); }
    message('Chaos! 🐾 The paw shuffled the park!');
  }

  requestAnimationFrame(chaosLoop);
}


function startGame() {
  if (started) return; started = true;
  ensureAudio(); audioCtx.resume(); startMusic();
  message('Catch & drag trash into the bin!');
  createTrash(trashCount);
  chaosLoop();
  spawnLeaves();
}

window.addEventListener('pointerdown', startGame, { once: true });

function spawnLeaves() {
  const leaves = ['🍃', '🍂', '🍁'];
  for (let i = 0; i < 16; i++) {
    const l = document.createElement('div'); l.className = 'leaf'; l.textContent = leaves[Math.floor(Math.random() * leaves.length)];
    l.style.left = Math.round(Math.random() * 100) + 'vw';
    l.style.animationDuration = (8 + Math.random() * 10) + 's';
    l.style.animationDelay = (-Math.random() * 12) + 's';
    document.body.appendChild(l);
  }
}


window.addEventListener('keydown', (e) => {
  if (!items.length) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    const el = items[Math.floor(Math.random() * items.length)];
    const rect = el.getBoundingClientRect();
    const step = 12;
    let x = rect.left, y = rect.top;
    if (e.key === 'ArrowUp') y -= step; if (e.key === 'ArrowDown') y += step; if (e.key === 'ArrowLeft') x -= step; if (e.key === 'ArrowRight') x += step;
    el.style.left = (x + rect.width / 2) + 'px'; el.style.top = (y + rect.height / 2) + 'px';
  }
});