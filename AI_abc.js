// abc_graph_coloring_random_start.js
// ABC for graph coloring, random start (like your original)
// Run: node abc_graph_coloring_random_start.js

const fs = require('fs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// ---------------- CONFIG ----------------
const N = 250;
const MIN_DEG = 2;
const MAX_DEG = 25;

const FOOD_SOURCES = 16;
const EMPLOYED = 16;
const ONLOOKERS = 16;
const SCOUTS = 3;

const ITERATIONS = 1000;
const RECORD_STEP = 20;
const TRIAL_LIMIT = 100;

const MAX_COLORS = 12; // як у оригінальній версії

// ---------------- GRAPH GENERATION ----------------
function generateGraph(n, minDeg, maxDeg) {
    const edges = Array.from({ length: n }, () => new Set());
    for (let v = 0; v < n; v++) {
        const degree = Math.floor(Math.random() * (maxDeg - minDeg + 1)) + minDeg;
        while (edges[v].size < degree) {
            let u = Math.floor(Math.random() * n);
            if (u !== v && !edges[v].has(u)) {
                edges[v].add(u);
                edges[u].add(v);
            }
        }
    }
    return edges.map(s => Array.from(s));
}

// ---------------- SOLUTION UTILS ----------------
function randomColoring() {
    const colors = new Array(N);
    const maxColors = MAX_COLORS;
    for (let i = 0; i < N; i++) {
        colors[i] = Math.floor(Math.random() * maxColors);
    }
    return colors;
}

function evaluate(colors, graph) {
    let conflicts = 0;
    for (let v = 0; v < N; v++) {
        for (let u of graph[v]) {
            if (colors[v] === colors[u]) conflicts++;
        }
    }
    conflicts /= 2;
    const usedColors = new Set(colors).size;
    return conflicts * 100 + usedColors;
}

function clone(arr) { return arr.slice(); }

// ---------------- NEIGHBOR MUTATION ----------------
function mutate(colors) {
    const v = Math.floor(Math.random() * N);
    const newColors = clone(colors);
    newColors[v] = Math.floor(Math.random() * MAX_COLORS);
    return newColors;
}

// ---------------- ABC ALGORITHM ----------------
async function runABC() {
    const graph = generateGraph(N, MIN_DEG, MAX_DEG);

    let solutions = Array.from({ length: FOOD_SOURCES }, () => ({
        colors: randomColoring(),
        fitness: Infinity,
        trials: 0
    }));
    
    solutions.forEach(s => s.fitness = evaluate(s.colors, graph));
    let best = solutions.reduce((a, b) => a.fitness < b.fitness ? a : b);

    const history = [];

    console.log("Starting ABC...");
    console.log("Initial best =", best.fitness);

    for (let iter = 1; iter <= ITERATIONS; iter++) {

        // EMPLOYED bees
        for (let i = 0; i < EMPLOYED; i++) {
            const s = solutions[i];
            const newColors = mutate(s.colors);
            const newFitness = evaluate(newColors, graph);
            if (newFitness < s.fitness) {
                s.colors = newColors;
                s.fitness = newFitness;
                s.trials = 0;
                if (newFitness < best.fitness) best = s;
            } else {
                s.trials++;
            }
        }

        // ONLOOKER bees
        for (let i = 0; i < ONLOOKERS; i++) {
            const pick = Math.floor(Math.random() * FOOD_SOURCES);
            const s = solutions[pick];
            const newColors = mutate(s.colors);
            const newFitness = evaluate(newColors, graph);
            if (newFitness < s.fitness) {
                s.colors = newColors;
                s.fitness = newFitness;
                s.trials = 0;
                if (newFitness < best.fitness) best = s;
            } else {
                s.trials++;
            }
        }

        // SCOUT bees
        for (let i = 0; i < SCOUTS; i++) {
            let worst = solutions.reduce((a, b) => a.fitness > b.fitness ? a : b);
            if (worst.trials >= TRIAL_LIMIT) {
                worst.colors = randomColoring();
                worst.fitness = evaluate(worst.colors, graph);
                worst.trials = 0;
            }
        }

        // record
        if (iter % RECORD_STEP === 0) {
            history.push({ iter, fitness: best.fitness });
            console.log(`Iter ${iter} → best = ${best.fitness}`);
        }
    }

    console.log("\n=========== RESULT ===========");
    const conflicts = Math.floor(best.fitness / 100);
    const colorsUsed = best.fitness - conflicts * 100;
    console.log("Best solution fitness =", best.fitness);
    console.log("Colors used =", colorsUsed);
    console.log("Conflicts =", conflicts);
    console.log("\nCollected metrics:", history);
    console.log("==============================");

    // побудова графіка
    await buildChart(history);
}

// ---------------- CHART ----------------
async function buildChart(history) {
    const width = 1200;
    const height = 600;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

    const labels = history.map(h => h.iter.toString());
    const fitnessValues = history.map(h => h.fitness);

    const config = {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Fitness',
                    data: fitnessValues,
                    fill: false,
                    borderColor: 'blue',
                    tension: 0.2
                }
            ]
        },
        options: {
            plugins: { title: { display: true, text: 'ABC Fitness over Iterations' } },
            scales: { x: { title: { display: true, text: 'Iteration' } }, y: { title: { display: true, text: 'Fitness' } } }
        }
    };

    const buffer = await chartJSNodeCanvas.renderToBuffer(config);
    fs.writeFileSync('abc_fitness_chart_random.png', buffer);
    console.log("Chart saved to abc_fitness_chart_random.png");
}

// ---------------- RUN ----------------
(async () => {
    await runABC();
})();
