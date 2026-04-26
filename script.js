const gridContainer = document.getElementById('grid-container');
const pathLengthElement = document.getElementById('pathLength');
const visitedCountElement = document.getElementById('visitedCount');
const speedRange = document.getElementById('speedRange');
const algoSelect = document.getElementById('algoSelect');

const ROWS = 20; const COLS = 20;
let startNode = null; let endNode = null; let isRunning = false;

// --- Web Audio API (Աուդիո հետադարձ կապ) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type, duration, vol = 0.06) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

const clickSound = () => playSound(400, 'triangle', 0.1);
const wallSound = () => playSound(150, 'square', 0.05, 0.04);
const successSound = () => {
    playSound(523, 'sine', 0.2); 
    setTimeout(() => playSound(659, 'sine', 0.4), 150);
};

// --- Գրադի ստեղծում ---
function createGrid() {
    gridContainer.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const node = document.createElement('div');
            node.className = 'node';
            node.id = `node-${r}-${c}`;
            node.addEventListener('mousedown', (e) => {
                if (isRunning) return;
                if (audioCtx.state === 'suspended') audioCtx.resume();
                
                if (!startNode) { 
                    startNode = {r,c}; node.classList.add('node-start'); clickSound();
                } else if (!endNode && (r!==startNode.r || c!==startNode.c)) { 
                    endNode = {r,c}; node.classList.add('node-end'); clickSound();
                } else {
                    wallSound();
                    if (e.shiftKey) { 
                        node.classList.remove('node-wall'); 
                        node.classList.toggle('node-weight'); 
                    } else { 
                        node.classList.remove('node-weight'); 
                        node.classList.toggle('node-wall'); 
                    }
                }
            });
            gridContainer.appendChild(node);
        }
    }
}

function generateRandomMaze() {
    if (isRunning) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    clickSound();
    document.querySelectorAll('.node').forEach(n => {
        if (!n.classList.contains('node-start') && !n.classList.contains('node-end')) {
            n.classList.remove('node-wall', 'node-weight', 'node-visited', 'node-path');
            let r = Math.random();
            if (r < 0.25) n.classList.add('node-wall');
            else if (r < 0.12) n.classList.add('node-weight');
        }
    });
}

function getHeuristic(r, c) {
    let dx = Math.abs(r - endNode.r);
    let dy = Math.abs(c - endNode.c);
    // Diagonal distance էվրիստիկա
    return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
}

async function startSearch() {
    if (isRunning || !startNode || !endNode) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isRunning = true;
    pathLengthElement.innerText = "0"; 
    visitedCountElement.innerText = "0";
    document.querySelectorAll('.node').forEach(n => n.classList.remove('node-visited', 'node-path'));

    let dist = {}; let fScore = {}; let prev = {}; let unvisited = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let id = `node-${r}-${c}`;
            dist[id] = Infinity; fScore[id] = Infinity; unvisited.push(id);
        }
    }

    const startId = `node-${startNode.r}-${startNode.c}`;
    dist[startId] = 0;
    fScore[startId] = getHeuristic(startNode.r, startNode.c);

    let vCount = 0;
    while (unvisited.length > 0) {
        unvisited.sort((a, b) => algoSelect.value === 'astar' ? fScore[a] - fScore[b] : dist[a] - dist[b]);
        let currId = unvisited.shift();
        if (dist[currId] === Infinity) break;
        if (document.getElementById(currId).classList.contains('node-wall')) continue;

        if (currId === `node-${endNode.r}-${endNode.c}`) {
            successSound(); await drawPath(prev);
            isRunning = false; return;
        }

        if (currId !== startId) {
            document.getElementById(currId).classList.add('node-visited');
            vCount++; visitedCountElement.innerText = vCount;
        }

        await new Promise(r => setTimeout(r, 101 - speedRange.value));

        let [_, r, c] = currId.split('-').map(Number);
        let neighbors = [
            {r:r-1, c, w:1}, {r:r+1, c, w:1}, {r, c:c-1, w:1}, {r, c:c+1, w:1},
            {r:r-1, c:c-1, w:1.414}, {r:r-1, c:c+1, w:1.414}, {r:r+1, c:c-1, w:1.414}, {r:r+1, c:c+1, w:1.414}
        ];

        for (let n of neighbors) {
            let nId = `node-${n.r}-${n.c}`;
            if (n.r>=0 && n.r<ROWS && n.c>=0 && n.c<COLS && unvisited.includes(nId)) {
                let cellW = document.getElementById(nId).classList.contains('node-weight') ? 3 : 1;
                let gScore = dist[currId] + (n.w * cellW);
                if (gScore < dist[nId]) {
                    dist[nId] = gScore; prev[nId] = currId;
                    fScore[nId] = gScore + getHeuristic(n.r, n.c);
                }
            }
        }
    }
    isRunning = false;
}

async function drawPath(prev) {
    let curr = `node-${endNode.r}-${endNode.c}`;
    let total = 0; let path = [];
    while (prev[curr]) {
        path.push(curr);
        let [_, r, c] = curr.split('-').map(Number);
        let [__, pr, pc] = prev[curr].split('-').map(Number);
        let step = (r !== pr && c !== pc) ? 1.414 : 1;
        let weight = document.getElementById(curr).classList.contains('node-weight') ? 3 : 1;
        total += step * weight;
        curr = prev[curr];
    }
    for (let i = path.length - 1; i >= 0; i--) {
        if (path[i] !== `node-${endNode.r}-${endNode.c}`) {
            document.getElementById(path[i]).classList.add('node-path');
            await new Promise(r => setTimeout(r, 25));
        }
    }
    pathLengthElement.innerText = total.toFixed(2);
}

document.getElementById('startBtn').addEventListener('click', startSearch);
document.getElementById('mazeBtn').addEventListener('click', generateRandomMaze);
document.getElementById('clearBtn').addEventListener('click', () => location.reload());
createGrid();