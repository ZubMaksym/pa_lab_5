// ---------------------------------------------
//  ABC Graph Coloring
//  250 vertices, degree <= 25 >= 2
//  35 bees: 3 scouts, others employed + onlooker
// ---------------------------------------------

const N = 250;
const MAX_DEG = 25;
const MIN_DEG = 2;
const FOOD_SOURCES = 16;
const EMPLOYED = 16;
const ONLOOKERS = 16;
const SCOUTS = 3;
const ITERATIONS = 1000;
const RECORD_STEP = 20;
const TRIAL_LIMIT = 100;


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

    return edges.map(e => Array.from(e));
}

const graph = generateGraph(N, MIN_DEG, MAX_DEG);


function randomColoring() {
    const colors = new Array(N);
    const maxColors = Math.floor(Math.random() * 10) + 3;

    for (let i = 0; i < N; i++) {
        colors[i] = Math.floor(Math.random() * maxColors);
    }
    return colors;
}

function evaluate(colors) {
    let conflicts = 0;
    let usedColors = new Set(colors);

    for (let v = 0; v < N; v++) {
        for (let u of graph[v]) {
            if (colors[v] === colors[u]) conflicts++;
        }
    }
    conflicts /= 2;

    return conflicts * 100 + usedColors.size;
}

function clone(arr) {
    return arr.slice();
}


function mutate(colors) {
    const v = Math.floor(Math.random() * N);
    const newColors = clone(colors);
    newColors[v] = Math.floor(Math.random() * 10);
    return newColors;
}

let solutions = Array.from({ length: FOOD_SOURCES }, () => ({
    colors: randomColoring(),
    fitness: Infinity,
    trials: 0
}));

solutions.forEach(s => s.fitness = evaluate(s.colors));
let best = solutions.reduce((a, b) => a.fitness < b.fitness ? a : b);

let history = [];

console.log("Starting ABC...");
console.log("Initial best =", best.fitness);

for (let iter = 1; iter <= ITERATIONS; iter++) {

    for (let i = 0; i < EMPLOYED; i++) {
        const s = solutions[i];
        const newColors = mutate(s.colors);
        const newFitness = evaluate(newColors);

        if (newFitness < s.fitness) {
            s.colors = newColors;
            s.fitness = newFitness;
            s.trials = 0;
            if (newFitness < best.fitness) best = s;
        } else {
            s.trials++;
        }
    }

    for (let i = 0; i < ONLOOKERS; i++) {
        const pick = Math.floor(Math.random() * FOOD_SOURCES);
        const s = solutions[pick];

        const newColors = mutate(s.colors);
        const newFitness = evaluate(newColors);

        if (newFitness < s.fitness) {
            s.colors = newColors;
            s.fitness = newFitness;
            s.trials = 0;
            if (newFitness < best.fitness) best = s;
        } else {
            s.trials++;
        }
    }

    for (let i = 0; i < SCOUTS; i++) {
        let worst = solutions.reduce((a, b) => a.fitness > b.fitness ? a : b);
        if (worst.trials >= TRIAL_LIMIT) {
            worst.colors = randomColoring();
            worst.fitness = evaluate(worst.colors);
            worst.trials = 0;
        }
    }

    if (iter % RECORD_STEP === 0) {
        history.push({ iter, fitness: best.fitness });
        console.log(`Iter ${iter} → best = ${best.fitness}`);
    }
}

console.log("\n=========== RESULT ===========");
console.log("Best solution fitness =", best.fitness);
console.log("Colors used =", new Set(best.colors).size);
console.log("Conflicts =", Math.floor(best.fitness / 100));
console.log("\nCollected metrics:", history);
console.log("==============================");

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');

async function buildChart() {
    const width = 1000;
    const height = 600;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

    const labels = history.map(h => h.iter);
    const values = history.map(h => h.fitness);

    const configuration = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Fitness over iterations',
                data: values,
                borderWidth: 2,
                tension: 0.2
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: "Залежність значення цільової функції від кількості ітерацій"
                }
            },
            scales: {
                x: {
                    title: { display: true, text: "Ітерація" }
                },
                y: {
                    title: { display: true, text: "Фітнес (якість розвʼязку)" }
                }
            }
        }
    };

    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    fs.writeFileSync("abc_fitness_chart.png", buffer);

    console.log("Графік збережено у файлі abc_fitness_chart.png");
}

buildChart();