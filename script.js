// ... (նախորդ փոփոխականները նույնն են)

async function startSim() {
    if (!startNode || !endNode || isMoving) return;
    isMoving = true;
    
    // Մաքրել նախորդ հետագիծը և վիճակագրությունը սկսելուց առաջ
    document.querySelectorAll('.node-path, .node-visited').forEach(n => {
        n.classList.remove('node-path', 'node-visited');
    });
    let totalPathCost = 0;

    if (dynamicCheck.checked) obstacleTimer = setInterval(moveObstacles, 600);

    while (startNode.r !== endNode.r || startNode.c !== endNode.c) {
        const path = findPath(); // Այստեղ կթարմացվի "Ստուգված վանդակներ"-ը
        
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

        // Հաշվարկել ճանապարհի իրական ծախսը
        const stepCost = nextNode.classList.contains('node-weight') ? 3 : 1;
        totalPathCost += stepCost;
        pathLengthElement.innerText = totalPathCost;

        // Ռոբոտի տեղաշարժ
        document.querySelector('.node-start').classList.remove('node-start');
        let [_, nr, nc] = nextId.split('-').map(Number);
        startNode = {r: nr, c: nc};
        nextNode.classList.add('node-start');
        nextNode.classList.add('node-path');

        playSound(800, 'sine', 0.02, 0.02);
        await new Promise(r => setTimeout(r, 250 - speedRange.value * 2));
    }

    if (obstacleTimer) clearInterval(obstacleTimer);
    isMoving = false;
    playSound(523, 'sine', 0.3);
}

function findPath() {
    let openList = [startNode];
    let prev = {};
    let scores = new Map();
    let startId = `node-${startNode.r}-${startNode.c}`;
    
    scores.set(startId, {
        g: 0, 
        f: algoSelect.value === 'astar' ? h(startNode, endNode) : 0
    });

    let closedSet = new Set();
    let visitedCount = 0;

    while (openList.length > 0) {
        openList.sort((a, b) => scores.get(`node-${a.r}-${a.c}`).f - scores.get(`node-${b.r}-${b.c}`).f);
        let curr = openList.shift();
        let currId = `node-${curr.r}-${curr.c}`;

        if (curr.r === endNode.r && curr.c === endNode.c) {
            // Թարմացնում ենք էկրանին ստուգված վանդակների քանակը
            visitedCountElement.innerText = closedSet.size;
            let p = []; let t = currId;
            while (prev[t]) { p.push(t); t = prev[t]; }
            return p.reverse();
        }

        closedSet.add(currId);
        // Վիզուալ նշում ենք ստուգված վանդակը
        if (currId !== startId) document.getElementById(currId).classList.add('node-visited');

        let neighbors = [{r:curr.r-1, c:curr.c}, {r:curr.r+1, c:curr.c}, {r:curr.r, c:curr.c-1}, {r:curr.r, c:curr.c+1}];
        for (let n of neighbors) {
            let nId = `node-${n.r}-${n.c}`;
            if (n.r<0 || n.r>=ROWS || n.c<0 || n.c>=COLS || document.getElementById(nId).classList.contains('node-wall') || closedSet.has(nId)) continue;

            let weight = document.getElementById(nId).classList.contains('node-weight') ? 3 : 1;
            let tentativeG = scores.get(currId).g + weight;

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
