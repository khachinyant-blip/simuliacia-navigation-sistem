// ... (նախորդ փոփոխականները և createGrid-ը նույնն են)

async function startSim() {
    if (!startNode || !endNode || isMoving) return;
    isMoving = true;

    totalPathCost = 0;
    totalVisitedSet.clear();
    pathLengthElement.innerText = "0";
    visitedCountElement.innerText = "0";
    
    document.querySelectorAll('.node-path, .node-visited').forEach(n => n.classList.remove('node-path', 'node-visited'));

    if (dynamicCheck.checked) obstacleTimer = setInterval(moveObstacles, 600);

    let currentPos = { ...startNode };

    while (currentPos.r !== endNode.r || currentPos.c !== endNode.c) {
        // Մաքրում ենք միայն նախորդ քայլի ստուգվածները, որ տեսնենք նոր որոնումը
        document.querySelectorAll('.node-visited').forEach(n => n.classList.remove('node-visited'));
        
        // Կանչում ենք ալգորիթմը անիմացիայով
        const path = await findPathWithAnimation(currentPos); 
        
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

        totalPathCost += nextNode.classList.contains('node-weight') ? 3 : 1;
        pathLengthElement.innerText = totalPathCost;
        visitedCountElement.innerText = totalVisitedSet.size;

        const prevNode = document.getElementById(`node-${currentPos.r}-${currentPos.c}`);
        prevNode.classList.remove('node-start');
        prevNode.classList.add('node-path');

        let [_, nr, nc] = nextId.split('-').map(Number);
        currentPos = { r: nr, c: nc };
        nextNode.classList.add('node-start');

        playSound(800, 'sine', 0.02, 0.02);
        // Շարժման արագությունը
        await new Promise(r => setTimeout(r, 100)); 
    }

    if (obstacleTimer) clearInterval(obstacleTimer);
    isMoving = false;
    playSound(523, 'sine', 0.3);
}

async function findPathWithAnimation(currentPos) {
    let openList = [currentPos];
    let prev = {};
    let scores = new Map();
    let startId = `node-${currentPos.r}-${currentPos.c}`;
    
    scores.set(startId, { g: 0, f: algoSelect.value === 'astar' ? h(currentPos, endNode) : 0 });
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

        if (!closedSet.has(currId)) {
            closedSet.add(currId);
            totalVisitedSet.add(currId);

            if (currId !== startId) {
                const el = document.getElementById(currId);
                el.classList.add('node-visited');
                
                // Աստեղ կարող ես կարգավորել ստուգման արագությունը
                // Որքան փոքր է թիվը, այնքան արագ կլինի "մանուշակագույնը"
                await new Promise(r => setTimeout(r, 2)); 
            }
        }

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
