const gridContainer = document.getElementById('grid-container');
const pathLengthElement = document.getElementById('pathLength');
const speedRange = document.getElementById('speedRange');
const algoSelect = document.getElementById('algoSelect');

const ROWS = 20; const COLS = 20;
let startNode = null; let endNode = null; 
let isMoving = false;
let obstacleTimer = null;

function createGrid() {
    gridContainer.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const node = document.createElement('div');
            node.className = 'node'; node.id = `node-${r}-${c}`;
            node.addEventListener('mousedown', () => {
                if (isMoving) return;
                if (!startNode) { startNode = {r,c}; node.classList.add('node-start'); }
                else if (!endNode && (r!==startNode.r || c!==startNode.c)) { endNode = {r,c}; node.classList.add('node-end'); }
                else { node.classList.toggle('node-wall'); }
            });
            gridContainer.appendChild(node);
        }
    }
}

// --- ՊԱՏԵՐԻ ՇԱՐԺՈՒՄ ---
function moveObstacles() {
    const walls = Array.from(document.querySelectorAll('.node-wall'));
    walls.forEach(wall => {
        if (Math.random() > 0.4) return; // Շարժվելու հավանականություն
        const [_, r, c] = wall.id.split('-').map(Number);
        const dirs = [{r:1,c:0}, {r:-1,c:0}, {r:0,c:1}, {r:0,c:-1}];
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        const nr = r + d.r, nc = c + d.c;

        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            const target = document.getElementById(`node-${nr}-${nc}`);
            if (target && !target.classList.contains('node-wall') && 
                !target.classList.contains('node-start') && 
                !target.classList.contains('node-end')) {
                wall.classList.remove('node-wall');
                target.classList.add('node-wall');
            }
        }
    });
}

// --- ԳԼԽԱՎՈՐ ՇԱՐԺԻՉ ---
async function startSim() {
    if (!startNode || !endNode || isMoving) return;
    isMoving = true;

    // Միացնել պատերի շարժը
    if (obstacleTimer) clearInterval(obstacleTimer);
    obstacleTimer = setInterval(moveObstacles, 600);

    while (startNode.r !== endNode.r || startNode.c !== endNode.c) {
        const path = findPath(); 
        if (!path || path.length === 0) {
            await new Promise(r => setTimeout(r, 200));
            continue; 
        }

        const nextId = path[0];
        const nextNode = document.getElementById(nextId);

        if (nextNode.classList.contains('node-wall')) {
            await new Promise(r => setTimeout(r, 100));
            continue; 
        }

        // ՌՈԲՈՏԻ ՇԱՐԺՈՒՄ ՎԱՆԴԱԿ ԱՌ ՎԱՆԴԱԿ
        document.querySelector('.node-start').classList.remove('node-start');
        let [_, nr, nc] = nextId.split('-').map(Number);
        startNode = {r: nr, c: nc};
        nextNode.classList.add('node-start');
        nextNode.classList.add('node-path');

        pathLengthElement.innerText = document.querySelectorAll('.node-path').length;
        await new Promise(r => setTimeout(r, 250 - speedRange.value * 2));
    }

    clearInterval(obstacleTimer);
    isMoving = false;
    alert("Հասանք!");
}

function findPath() {
    let openList = [startNode];
    let prev = {};
    let gScore = {};
    let fScore = {};
    let startId = `node-${startNode.r}-${startNode.c}`;
    
    gScore[startId] = 0;
    fScore[startId] = algoSelect.value === 'astar' ? h(startNode, endNode) : 0;

    let scores = new Map();
    scores.set(startId, {g: 0, f: fScore[startId]});
    let closedSet = new Set();

    while (openList.length > 0) {
        openList.sort((a, b) => scores.get(`node-${a.r}-${a.c}`).f - scores.get(`node-${b.r}-${b.c}`).f);
        let curr = openList.shift();
        let currId = `node-${curr.r}-${curr.c}`;

        if (curr.r === endNode.r && curr.c === endNode.c) {
            let p = []; let t = currId;
            while (prev[t]) { p.push(t); t = prev[t]; }
            return p.reverse();
        }
        closedSet.add(currId);

        let neighbors = [{r:curr.r-1, c:curr.c}, {r:curr.r+1, c:curr.c}, {r:curr.r, c:curr.c-1}, {r:curr.r, c:curr.c+1}];
        for (let n of neighbors) {
            let nId = `node-${n.r}-${n.c}`;
            if (n.r<0 || n.r>=ROWS || n.c<0 || n.c>=COLS || 
                document.getElementById(nId).classList.contains('node-wall') || 
                closedSet.has(nId)) continue;

            let tentativeG = scores.get(currId).g + 1;
            if (!scores.has(nId) || tentativeG < scores.get(nId).g) {
                prev[nId] = currId;
                let f = algoSelect.value === 'astar' ? tentativeG + h(n, endNode) : tentativeG;
                scores.set(nId, {g: tentativeG, f: f});
                if (!openList.some(o => o.r === n.r && o.c === n.c)) openList.push(n);
            }
        }
    }
    return null;
}

function h(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); }

document.getElementById('startBtn').addEventListener('click', startSim);
document.getElementById('mazeBtn').addEventListener('click', () => {
    document.querySelectorAll('.node').forEach(n => {
        if (!n.classList.contains('node-start') && !n.classList.contains('node-end')) {
            n.className = 'node';
            if (Math.random() < 0.25) n.classList.add('node-wall');
        }
    });
});
document.getElementById('clearBtn').addEventListener('click', () => location.reload());
createGrid();
