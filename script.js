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

// Վիճակագրության գլոբալ փոփոխականներ
let totalPathCost = 0;
let totalVisitedNodes = new Set();

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
    totalVisitedNodes.clear();
    pathLengthElement.innerText = "0";
    visitedCountElement.innerText = "0";

    if (dynamicCheck.checked) {
        if (obstacleTimer) clearInterval(obstacleTimer);
        obstacleTimer = setInterval(moveObstacles, 600);
    }

    while (startNode.r !== endNode.r || startNode.c !== endNode.c) {
        // Մաքրել միայն նախորդ քայլի "մանուշակագույն" վանդակները
        document.querySelectorAll('.node-visited').forEach(n => n.classList.remove('node-visited'));

        const path = findPathStep();
        
        if (!path || path.length === 0) {
            isMoving = false;
            if (obstacleTimer) clearInterval(obstacleTimer);
            return;
        }

        const nextId = path[0];
        const nextNode = document.getElementById(nextId);

        if (nextNode.classList.contains('node-wall')) {
            await new Promise(r => setTimeout(r, 100));
            continue; 
        }

        // Ծախսի հաշվարկ
        totalPathCost += nextNode.classList.contains('node-weight') ? 3 : 1;
        pathLengthElement.innerText = totalPathCost;
        visitedCountElement.innerText = totalVisitedNodes.size;

        // Ռոբոտի շարժ
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

function findPathStep() {
    let openList = [{...startNode}];
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

        if (currId !== `node-${startNode.r}-${startNode.c}` && currId !== `node-${endNode.r}-${endNode.c}`) {
