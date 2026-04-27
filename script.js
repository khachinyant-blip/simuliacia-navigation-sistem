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
let totalVisitedSet = new Set();
let totalPathCost = 0;

function createGrid() {
    gridContainer.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const node = document.createElement('div');
            node.className = 'node'; node.id = `node-${r}-${c}`;
            node.addEventListener('mousedown', (e) => {
                if (isMoving) return;
                const target = e.target;
                if (!startNode) { startNode = {r,c}; target.classList.add('node-start'); }
                else if (!endNode && (r!==startNode.r || c!==startNode.c)) { endNode = {r,c}; target.classList.add('node-end'); }
                else {
                    if (e.shiftKey) { target.classList.remove('node-wall'); target.classList.toggle('node-weight'); }
                    else { target.classList.remove('node-weight'); target.classList.toggle('node-wall'); }
                }
            });
            gridContainer.appendChild(node);
        }
    }
}

function h(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); }

async function startSim() {
    if (!startNode || !endNode || isMoving) return;
    isMoving = true;
    totalPathCost = 0;
    totalVisitedSet.clear();
    
    document.querySelectorAll('.node-path, .node-visited').forEach(n => n.classList.remove('node-path', 'node-visited'));

    while (startNode.r !== endNode.r || startNode.c !== endNode.c) {
        // Հեռացնում ենք միայն վիզուալ մանուշակագույնը նոր որոնումից առաջ
        document.querySelectorAll('.node-visited').forEach(n => n.classList.remove('node-visited'));
        
        let path = await findPathAnimated();
        
        if (!path || path.length === 0) {
            isMoving = false;
            alert("Ճանապարհ չգտնվեց:");
            return;
        }

        const nextId = path[0];
        const nextNode = document.getElementById(nextId);
        
        // Ծախսի հաշվարկ
        totalPathCost += nextNode.classList.contains('node-weight') ? 3 : 1;
        pathLengthElement.innerText = totalPathCost;
        visitedCountElement.innerText = totalVisitedSet.size;

        // Վիզուալ շարժ
        document.querySelector('.node-start').classList.remove('node-start');
        document.getElementById(`node-${startNode.r}-${startNode.c}`).classList.add('node-path');
        
        let [_, nr, nc] = nextId.split('-').map(Number);
        startNode = {r: nr, c: nc};
        nextNode.classList.add('node-start');

        await new Promise(r => setTimeout(r, 50)); // Շարժման արագություն
        
        if (dynamicCheck.checked) moveObstacles();
    }
    isMoving = false;
}

async function findPathAnimated() {
    let openList = [{...startNode}];
    let prev = {};
    let gScore = {}; 
    let fScore = {};
    let startId = `node-${startNode.r}-${startNode.c}`;
    
    gScore[startId] = 0;
    fScore[startId] = algoSelect.value === 'astar' ? h(startNode, endNode) : 0;
    
    let closedSet = new Set();

    while (openList.length > 0) {
        openList.sort((a, b) => {
            let aId = `node-${a.r}-${a.c}`, bId = `node-${b.r}-${b.c}`;
            return (fScore[aId] || 0) - (fScore[bId] || 0);
        });

        let curr = openList.shift();
        let currId = `node-${curr.r}-${curr.c}`;

        if (curr.r === endNode.r && curr.c === endNode.c) {
            let p = []; let t = currId;
            while (prev[t]) { p.push(t); t = prev[t]; }
            return p.reverse();
        }

        closedSet.add(currId);
        totalVisitedSet.add(currId);

        if (currId !== startId && currId !== `node-${endNode.r}-${endNode.c}`) {
            document.getElementById(currId).classList.add('node-visited');
            // Սա ստեղծում է անիմացիոն էֆեկտը
            if (totalVisitedSet.size % 5 === 0) await new Promise(r => setTimeout(r, 1)); 
        }

        let neighbors = [{r:curr.r-1, c:curr.c}, {r:curr.r+1, c:curr.c}, {r:curr.r, c:curr.c-1}, {r:curr.r, c:curr.c+1}];
        for (let n of neighbors) {
            let nId = `node-${n.r}-${n.c}`;
            if (n.r<0 || n.r>=ROWS || n.c<0 || n.c>=COLS || document.getElementById(nId).classList
