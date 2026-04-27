const gridContainer = document.getElementById('grid-container');
const pathLengthElement = document.getElementById('pathLength');
const visitedCountElement = document.getElementById('visitedCount');
const speedRange = document.getElementById('speedRange');
const algoSelect = document.getElementById('algoSelect');
const dynamicCheck = document.getElementById('dynamicCheck');

const ROWS = 20; const COLS = 20;
let startNode = null; let endNode = null; 
let isMoving = false;
let obstacleTimer = null;

// Գլոբալ հաշվիչներ
let totalVisitedSet = new Set();
let realPathCost = 0;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, type, duration, vol = 0.05) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

function createGrid() {
    gridContainer.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const node = document.createElement('div');
            node.className = 'node'; node.id = `node-${r}-${c}`;
            node.addEventListener('mousedown', (e) => {
                if (isMoving) return;
                if (!startNode) { startNode = {r,c}; node.classList.add('node-start'); }
                else if (!endNode && (r!==startNode.r || c!==startNode.c)) { endNode = {r,c}; node.classList.add('node-end'); }
                else {
                    if (e.shiftKey) { node.classList.remove('node-wall'); node.classList.toggle('node-weight'); }
                    else { node.classList.remove('node-weight'); node.classList.toggle('node-wall'); }
                    playSound(150, 'square', 0.05);
                }
            });
            gridContainer.appendChild(node);
        }
    }
}

function moveObstacles() {
    if (!dynamicCheck.checked) return;
    const walls = Array.from(document.querySelectorAll('.node-wall'));
    walls.forEach(wall => {
        if (Math.random() > 0.3) return;
        const [_, r, c] = wall.id.split('-').map(Number);
        const dirs = [{r:1,c:0}, {r:-1,c:0}, {r:0,c:1}, {r:0,c:-1}];
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        const nr = r + d.r, nc = c + d.c;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            const target = document.getElementById(`node-${nr}-${nc}`);
            if (target && !target.classList.contains('node-wall') && !target.classList.contains('node-start') && !target.classList.contains('node-end')) {
                wall.classList.remove('node-wall');
                target.classList.add('node-wall');
            }
        }
    });
}

async function startSim() {
    if (!startNode || !endNode || isMoving) return;
    isMoving = true;
    
    // Զրոյացում
    totalVisitedSet.clear();
    realPathCost = 0;
    pathLengthElement.innerText = "0";
    visitedCountElement.innerText = "0";
    document.querySelectorAll('.node-path, .node-visited').forEach(n => n.classList.remove('node-path', 'node-visited'));

    if (dynamicCheck.checked) obstacleTimer = setInterval(moveObstacles, 600);

    while (startNode.r !== endNode.r || startNode.c !== endNode.c) {
        // Մաքրել միայն մանուշակագույն վիզուալը ամեն քայլի որոնման ժամանակ
        document.querySelectorAll('.node-visited').forEach(n => n.classList.remove('node-visited'));

        const path = findPath();
        if (!path || path.length === 0) {
            await new Promise(r => setTimeout(r, 200));
            continue;
        }

        const nextId = path[0];
        const nextNode = document.getElementById(nextId);

        if (nextNode.classList.contains('node-wall')) {
            playSound(100, 'sawtooth', 0.1);
            await new Promise(r => setTimeout(r, 150));
            continue; 
        }

        // Հաշվարկներ
        realPathCost += nextNode.classList.contains('node-weight') ? 3 : 1;
        pathLengthElement.innerText = realPathCost;
        visitedCountElement.innerText = totalVisitedSet.size;

        // Ռոբոտի շարժ
        document.querySelector('.node-start').classList.remove('node-start');
        document.getElementById(`node-${startNode.r}-${startNode.c}`).classList.add('node-path');
        
        let [_, nr, nc] = nextId.split('-').map(Number);
        startNode = {r: nr, c: nc};
        nextNode.classList.add('node-start');

        playSound(800, 'sine', 0.02, 0.02);
        await new Promise(r => setTimeout(r, 250 - speedRange.value * 2));
