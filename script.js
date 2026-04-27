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

// Վիճակագրության գլոբալ բազա
let globalVisitedSet = new Set();
let totalPathCost = 0;

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
                }
            });
            gridContainer.appendChild(node);
        }
    }
}

const h = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

async function startSim() {
    if (!startNode || !endNode || isMoving) return;
    isMoving = true;
    
    totalPathCost = 0;
    globalVisitedSet.clear();
    pathLengthElement.innerText = "0";
    visitedCountElement.innerText = "0";
    document.querySelectorAll('.node-path, .node-visited').forEach(n => n.classList.remove('node-path', 'node-visited'));

    if (dynamicCheck.checked) {
        if (obstacleTimer) clearInterval(obstacleTimer);
        obstacleTimer = setInterval(moveObstacles, 600);
    }

    let currentPos = { ...startNode };

    while (currentPos.r !== endNode.r || currentPos.c !== endNode.c) {
        // Վիզուալ մաքրում նոր քայլից առաջ
        document.querySelectorAll('.node-visited').forEach(n => n.classList.remove('node-visited'));

        const path = findPath(currentPos);
        
        if (!path || path.length === 0) {
            isMoving = false;
            clearInterval(obstacleTimer);
            return;
        }

        const nextId = path[0];
        const nextNode = document.getElementById(nextId);

        // Ճշգրիտ հաշվարկների թարմացում
        totalPathCost += nextNode.classList.contains('node-weight') ? 3 : 1;
        pathLengthElement.innerText = totalPathCost;
        visitedCountElement.innerText = globalVisitedSet.size;

        // Ռոբոտի վիզուալ շարժ
        const prevNode = document.getElementById(`node-${currentPos.r}-${currentPos.c}`);
        prevNode.classList.remove('node-start');
        prevNode.classList.add('node-path');

        let [_, nr, nc] = nextId.split('-').map(Number);
        currentPos = { r: nr, c: nc };
        nextNode.classList.add('node-start');

        await new Promise(r => setTimeout(r, 250 - speedRange.value * 2));
    }

    if (obstacleTimer) clearInterval(obstacleTimer);
    isMoving = false;
}

function findPath(start) {
    let openList = [start];
    let prev = {};
    let gScore = { [`node-${start.r}-${start.c}`]: 0 };
    let fScore = { [`node-${start.r}-${start.c}`]: h(start, endNode) };
    let closedSet = new Set();

    while (openList.length > 0) {
        openList.sort((a, b) => fScore[`node-${a.r}-${a.c}`] - fScore[`node-${b.r}-${b.c}`]);
        let curr = openList.shift();
        let currId = `node-${curr.r}-${curr.c}`;

        if (curr.r === endNode.r && curr.c === endNode.c) {
            let p = []; let t = currId;
            while (prev[t]) { p.push(t); t = prev[t]; }
            return p.reverse();
        }

        closedSet.add(currId);
        globalVisitedSet.add(currId); // Գրանցում ենք գլոբալ հաշվիչի մեջ

        if (currId !== `node-${start.r}-${start.c}` && currId !== `node-${endNode.r}-${endNode.c}`) {
            document.getElementById(currId).classList.add('node-visited');
        }

        let neighbors = [{r:curr.r-1, c:curr.c}, {r:curr.r+1, c:curr.c}, {r:curr.r, c:curr.c-1}, {r:curr.r, c:curr.c+1}];
        for (let n of neighbors) {
            let nId = `node-${n.r}-${n.c}`;
            const nEl = document.getElementById(nId);
            if (!nEl || nEl.classList.contains('node-wall') || closedSet.has(nId)) continue;

            let weight = nEl.classList.contains('node-weight') ? 3 : 1;
            let tentativeG = gScore[currId] + weight;

            if (tentativeG < (gScore[nId] ?? Infinity)) {
                prev[nId] = currId;
                gScore[nId] = tentativeG;
                fScore[nId] = algoSelect.value === 'astar' ? tentativeG + h(n, endNode) : tentativeG;
                if (!openList.some(o => o.r === n.r && o.c === n.c)) openList.push(n);
            }
        }
    }
    return null;
}

function moveObstacles() {
    const walls = Array.from(document.querySelectorAll('.node-wall'));
    walls.forEach(wall => {
        if (Math.random() > 0.1) return;
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

document.getElementById('startBtn').addEventListener('click', startSim);
document.getElementById('mazeBtn').addEventListener('click', () => {
    if (isMoving) return;
    document.querySelectorAll('.node').forEach(n => {
        n.className = 'node';
        let r = Math.random();
        if (r < 0.2) n.classList.add('node-wall');
        else if (r < 0.3) n.classList.add('node-weight');
    });
    startNode = null; endNode = null;
});
document.getElementById('clearBtn').addEventListener('click', () => location.reload());
createGrid();
