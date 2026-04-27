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
    
    let totalPathCost = 0;
    let totalVisited = new Set();

    if (dynamicCheck.checked) obstacleTimer = setInterval(moveObstacles, 600);

    while (startNode.r !== endNode.r || startNode.c !== endNode.c) {
        // Մաքրել հին վիզուալ հետքերը նոր որոնումից առաջ
        document.querySelectorAll('.node-visited').forEach(n => n.classList.remove('node-visited'));
        
        const result = findPathSync(startNode);
        const path = result.path;
        
        // Գրանցել ստուգված վանդակները վիճակագրության մեջ
        result.visited.forEach(id => totalVisited.add(id));
        visitedCountElement.innerText = totalVisited.size;

        if (!path || path.length === 0) break;

        const nextId = path[0];
        const nextNode = document.getElementById(nextId);

        if (nextNode.classList.contains('node-wall')) {
            await new Promise(r => setTimeout(r, 100));
            continue; 
        }

        // Հաշվարկել ծախսը
        totalPathCost += nextNode.classList.contains('node-weight') ? 3 : 1;
        pathLengthElement.innerText = totalPathCost;

        // Շարժվել
        document.querySelector('.node-start').classList.remove('node-start');
        document.getElementById(`node-${startNode.r}-${startNode.c}`).classList.add('node-path');
        
        let [_, nr, nc] = nextId.split('-').map(Number);
        startNode = {r: nr, c: nc};
        nextNode.classList.add('node-start');

        await new Promise(r => setTimeout(r, 250 - speedRange.value * 2));
    }

    if (obstacleTimer) clearInterval(obstacleTimer);
    isMoving = false;
}

function findPathSync(current) {
    let openList = [current];
    let prev = {};
    let gScore = { [`node-${current.r}-${current.c}`]: 0 };
    let fScore = { [`node-${current.r}-${current.c}`]: h(current, endNode) };
    let visitedInStep = new Set();

    while (openList.length > 0) {
        openList.sort((a, b) => fScore[`node-${a.r}-${a.c}`] - fScore[`node-${b.r}-${b.c}`]);
        let curr = openList.shift();
        let currId = `node-${curr.r}-${curr.c}`;

        if (curr.r === endNode.r && curr.c === endNode.c) {
            let p = []; let t = currId;
            while (prev[t]) { p.push(t); t = prev[t]; }
            return { path: p.reverse(), visited: visitedInStep };
        }

        visitedInStep.add(currId);
        if (currId !== `node-${current.r}-${current.c}`) {
            document.getElementById(currId).classList.add('node-visited');
        }

        let neighbors = [{r:curr.r-1, c:curr.c}, {r:curr.r+1, c:curr.c}, {r:curr.r, c:curr.c-1}, {r:curr.r, c:curr.c+1}];
        for (let n of neighbors) {
            let nId = `node-${n.r}-${n.c}`;
            if (n.r<0 || n.r>=ROWS || n.c<0 || n.c>=COLS || document.getElementById(nId).classList.contains('node-wall') || visitedInStep.has(nId)) continue;

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
    return { path: null, visited: visitedInStep };
}

function moveObstacles() {
    const walls = Array.from(document.querySelectorAll('.node
