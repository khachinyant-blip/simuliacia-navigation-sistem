const gridContainer = document.getElementById('grid-container');
const pathLengthElement = document.getElementById('pathLength');
const visitedCountElement = document.getElementById('visitedCount');
const algoSelect = document.getElementById('algoSelect');

const ROWS = 20; const COLS = 20;
let startNode = null; let endNode = null; 
let isMoving = false;
let totalVisitedNodes = new Set();

function createGrid() {
    gridContainer.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const node = document.createElement('div');
            node.className = 'node';
            node.id = `node-${r}-${c}`;
            node.addEventListener('mousedown', () => {
                if (isMoving) return;
                if (!startNode) { startNode = {r,c}; node.classList.add('node-start'); }
                else if (!endNode && (r!==startNode.r || c!==startNode.c)) { endNode = {r,c}; node.classList.add('node-end'); }
                else {
                    if (node.classList.contains('node-wall')) {
                        node.classList.remove('node-wall');
                        node.classList.add('node-weight');
                    } else if (node.classList.contains('node-weight')) {
                        node.classList.remove('node-weight');
                    } else {
                        node.classList.add('node-wall');
                    }
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
    let totalCost = 0;
    totalVisitedNodes.clear();

    while (startNode.r !== endNode.r || startNode.c !== endNode.c) {
        document.querySelectorAll('.node-visited').forEach(n => n.classList.remove('node-visited'));
        
        const path = findPath();
        if (!path || path.length === 0) break;

        const nextId = path[0];
        const nextNode = document.getElementById(nextId);

        totalCost += nextNode.classList.contains('node-weight') ? 3 : 1;
        pathLengthElement.innerText = totalCost;
        visitedCountElement.innerText = totalVisitedNodes.size;

        document.getElementById(`node-${startNode.r}-${startNode.c}`).classList.remove('node-start');
        document.getElementById(`node-${startNode.r}-${startNode.c}`).classList.add('node-path');
        
        let [_, nr, nc] = nextId.split('-').map(Number);
        startNode = {r: nr, c: nc};
        nextNode.classList.add('node-start');

        await new Promise(r => setTimeout(r, 100));
    }
    isMoving = false;
}

function findPath() {
    let openList = [startNode];
    let prev = {};
    let gScore = { [`node-${startNode.r}-${startNode.c}`]: 0 };
    let fScore = { [`node-${startNode.r}-${startNode.c}`]: h(startNode, endNode) };
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
        totalVisitedNodes.add(currId);
        if (currId !== `node-${startNode.r}-${startNode.c}`) {
            document.getElementById(currId).classList.add('node-visited');
        }

        let neighbors = [{r:curr.r-1, c:curr.c}, {r:curr.r+1, c:curr.c}, {r:curr.r, c:curr.c-1}, {r:curr.r, c:curr.c+1}];
        for (let n of neighbors) {
            let nId = `node-${n.r}-${n.c}`;
            if (n.r<0 || n.r>=ROWS || n.c<0 || n.c>=COLS || document.getElementById(nId).classList.contains('node-wall') || closedSet.has(nId)) continue;
            
            let weight = document.getElementById(nId).classList.contains('node-weight') ? 3 : 1;
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

document.getElementById('startBtn').addEventListener('click', startSim);
document.getElementById('clearBtn').addEventListener('click', () => location.reload());
document.getElementById('mazeBtn').addEventListener('click', () => {
    document.querySelectorAll('.node').forEach(n => {
        n.className = 'node';
        if (Math.random() < 0.2) n.classList.add('node-wall');
    });
    startNode = null; endNode = null;
});

createGrid();
