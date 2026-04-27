document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('grid-container');
    const pathLengthElement = document.getElementById('pathLength');
    const visitedCountElement = document.getElementById('visitedCount');
    const speedRange = document.getElementById('speedRange');
    const algoSelect = document.getElementById('algoSelect');
    const dynamicCheck = document.getElementById('dynamicCheck');

    const ROWS = 20;
    const COLS = 20;
    let startNode = null;
    let endNode = null;
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
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    function createGrid() {
        if (!gridContainer) return;
        gridContainer.innerHTML = '';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const node = document.createElement('div');
                node.className = 'node';
                node.id = `node-${r}-${c}`;
                node.addEventListener('mousedown', (e) => {
                    if (isMoving) return;
                    if (!startNode) {
                        startNode = { r, c };
                        node.classList.add('node-start');
                    } else if (!endNode && (r !== startNode.r || c !== startNode.c)) {
                        endNode = { r, c };
                        node.classList.add('node-end');
                    } else {
                        if (e.shiftKey) {
                            node.classList.remove('node-wall');
                            node.classList.toggle('node-weight');
                        } else {
                            node.classList.remove('node-weight');
                            node.classList.toggle('node-wall');
                        }
                        playSound(150, 'square', 0.05);
                    }
                });
                gridContainer.appendChild(node);
            }
        }
    }

    async function startSim() {
        if (!startNode || !endNode || isMoving) return;
        isMoving = true;

        totalVisitedSet.clear();
        realPathCost = 0;
        pathLengthElement.innerText = "0";
        visitedCountElement.innerText = "0";
        document.querySelectorAll('.node-path, .node-visited').forEach(n => n.classList.remove('node-path', 'node-visited'));

        if (dynamicCheck.checked) {
            obstacleTimer = setInterval(moveObstacles, 600);
        }

        let currentRobotPos = { ...startNode };

        while (currentRobotPos.r !== endNode.r || currentRobotPos.c !== endNode.c) {
            // Մաքրել մանուշակագույն սկանավորումը նոր քայլից առաջ
            document.querySelectorAll('.node-visited').forEach(n => n.classList.remove('node-visited'));

            const path = findPath(currentRobotPos);
            if (!path || path.length === 0) {
                await new Promise(r => setTimeout(r, 200));
                if (!dynamicCheck.checked) break;
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

            // Վիզուալ շարժ
            const prevNodeEl = document.getElementById(`node-${currentRobotPos.r}-${currentRobotPos.c}`);
            prevNodeEl.classList.remove('node-start');
            prevNodeEl.classList.add('node-path');

            let [_, nr, nc] = nextId.split('-').map(Number);
            currentRobotPos = { r: nr, c: nc };
            nextNode.classList.add('node-start');

            playSound(800, 'sine', 0.02, 0.02);
            await new Promise(r => setTimeout(r, 250 - speedRange.value * 2));
        }

        if (obstacleTimer) clearInterval(obstacleTimer);
        isMoving = false;
        playSound(523, 'sine', 0.3);
    }

    function findPath(tempStart) {
        let openList = [tempStart];
        let prev = {};
        let startId = `node-${tempStart.r}-${tempStart.c}`;
        let scores = new Map();
        scores.set(startId, { g: 0, f: algoSelect.value === 'astar' ? h(tempStart, endNode) : 0 });
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
            totalVisitedSet.add(currId); // Գումարային հաշվարկ

            if (currId !== `node-${tempStart.r}-${tempStart.c}` && currId !== `node-${endNode.r}-${endNode.c}`) {
                document.getElementById(currId).classList.add('node-visited');
            }

            let neighbors = [{ r: curr.r - 1, c: curr.c }, { r: curr.r + 1, c: curr.c }, { r: curr.r, c: curr.c - 1 }, { r: curr.r, c: curr.c + 1 }];
            for (let n of neighbors) {
                let nId = `node-${n.r}-${n.c}`;
                const nEl = document.getElementById(nId);
                if (!nEl || n.r < 0 || n.r >= ROWS || n.c < 0 || n.c >= COLS || nEl.classList.contains('node-wall') || closedSet.has(nId)) continue;

                let cost = nEl.classList.contains('node-weight') ? 3 : 1;
                let tentativeG = scores.get(currId).g + cost;
                if (!scores.has(nId) || tentativeG < scores.get(nId).g) {
                    prev[nId] = currId;
                    let f = algoSelect.value === 'astar' ? tentativeG + h(n, endNode) : tentativeG;
                    scores.set(nId, { g: tentativeG, f: f });
                    if (!openList.some(o => o.r === n.r && o.c === n.c)) openList.push(n);
                }
            }
        }
        return null;
    }

    function h(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); }

    function moveObstacles() {
        const walls = Array.from(document.querySelectorAll('.node-wall'));
        walls.forEach(wall => {
            if (Math.random() > 0.3) return;
            const [_, r, c] = wall.id.split('-').map(Number);
            const dirs = [{ r: 1, c: 0 }, { r: -1, c: 0 }, { r: 0, c: 1 }, { r: 0, c: -1 }];
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
        document.querySelectorAll('.node').forEach(n => {
            if (!n.classList.contains('node-start') && !n.classList.contains('node-end')) {
                n.className = 'node';
                let r = Math.random();
                if (r < 0.2) n.classList.add('node-wall');
                else if (r < 0.3) n.classList.add('node-weight');
            }
        });
    });
    document.getElementById('clearBtn').addEventListener('click', () => location.reload());

    createGrid();
});
