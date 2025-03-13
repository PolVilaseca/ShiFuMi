// Get references to canvas and control elements
const simulationCanvas = document.getElementById("simulationCanvas");
const simCtx = simulationCanvas.getContext("2d");

const playPauseBtn = document.getElementById("playPauseBtn");
const stepBtn = document.getElementById("stepBtn");
const resetBtn = document.getElementById("resetBtn");
const gridSizeInput = document.getElementById("gridSizeInput");
const stepsPerFrameInput = document.getElementById("stepsPerFrameInput");

// Plotly graph elements
const graphDiv = document.getElementById("graph");
const stackedGraphDiv = document.getElementById("stackedGraph");

// Simulation parameters
const canvasSize = simulationCanvas.width; // constant 600 pixels square
let gridSize = parseInt(gridSizeInput.value) || 100;  // dynamic grid size (N x N)
let cellSize = canvasSize / gridSize; // recalc cell size to fill canvas
let stepsPerFrame = parseInt(stepsPerFrameInput.value) || 1000; // simulation steps per frame

// Species colors (0: Rock, 1: Paper, 2: Scissors)
const speciesColors = {
  0: "#FF5733",  // Rock (reddish)
  1: "#33C1FF",  // Paper (blueish)
  2: "#75FF33"   // Scissors (greenish)
};

// Global simulation state
let grid = [];
let initialGrid = [];
let running = true;  // simulation running by default

// Graph data arrays for population counts and time steps
let rockHistory = [];
let paperHistory = [];
let scissorsHistory = [];
let timeSteps = [];
let timeCounter = 0;
const maxHistoryLength = 600; // maximum number of points stored

// Initialize grid with random species and store initial state
function initializeGrid() {
  grid = [];
  for (let y = 0; y < gridSize; y++) {
    grid[y] = [];
    for (let x = 0; x < gridSize; x++) {
      grid[y][x] = Math.floor(Math.random() * 3);
    }
  }
  // Save the initial board (deep copy)
  initialGrid = grid.map(row => row.slice());
  // Reset population history and time counter
  rockHistory = [];
  paperHistory = [];
  scissorsHistory = [];
  timeSteps = [];
  timeCounter = 0;
}

// Update grid parameters based on input widget values
function updateGridParameters() {
  gridSize = parseInt(gridSizeInput.value) || 100;
  cellSize = canvasSize / gridSize;
  stepsPerFrame = parseInt(stepsPerFrameInput.value) || 1000;
}

// Initial setup
updateGridParameters();
initializeGrid();

// Winning rule: species A beats species B if (A - B + 3) % 3 === 1.
function winsOver(a, b) {
  return ((a - b + 3) % 3) === 1;
}

// Utility: random integer from min (inclusive) to max (exclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// Get a random neighbor (von Neumann: up, down, left, right)
function getRandomNeighbor(x, y) {
  const moves = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
  ];
  const move = moves[randomInt(0, moves.length)];
  let nx = (x + move.dx + gridSize) % gridSize;
  let ny = (y + move.dy + gridSize) % gridSize;
  return { nx, ny };
}

// Perform simulation updates (random interactions)
function updateSimulation() {
  // Update stepsPerFrame in case it was changed
  stepsPerFrame = parseInt(stepsPerFrameInput.value) || 1000;
  for (let i = 0; i < stepsPerFrame; i++) {
    let x = randomInt(0, gridSize);
    let y = randomInt(0, gridSize);
    let attacker = grid[y][x];
    const { nx, ny } = getRandomNeighbor(x, y);
    let defender = grid[ny][nx];
    if (winsOver(attacker, defender)) {
      grid[ny][nx] = attacker;
    }
  }
}

// Draw the simulation grid on the canvas
function drawGrid() {
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      let species = grid[y][x];
      simCtx.fillStyle = speciesColors[species];
      simCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
}

// Count populations of each species in the grid
function countPopulations() {
  let counts = { 0: 0, 1: 0, 2: 0 };
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      counts[grid[y][x]]++;
    }
  }
  return counts;
}

// Update graph data arrays with current population counts
function updateGraphData() {
  const counts = countPopulations();
  rockHistory.push(counts[0]);
  paperHistory.push(counts[1]);
  scissorsHistory.push(counts[2]);
  timeSteps.push(timeCounter);
  timeCounter++;

  // Limit history length
  if (rockHistory.length > maxHistoryLength) {
    rockHistory.shift();
    paperHistory.shift();
    scissorsHistory.shift();
    timeSteps.shift();
  }
  updatePlot();
  updateStackedPlot();
}

// Initialize Plotly graph for absolute populations
function initPlot() {
  const traceRock = {
    x: timeSteps,
    y: rockHistory,
    mode: 'lines',
    name: 'Rock',
    line: { color: speciesColors[0] }
  };

  const tracePaper = {
    x: timeSteps,
    y: paperHistory,
    mode: 'lines',
    name: 'Paper',
    line: { color: speciesColors[1] }
  };

  const traceScissors = {
    x: timeSteps,
    y: scissorsHistory,
    mode: 'lines',
    name: 'Scissors',
    line: { color: speciesColors[2] }
  };

  const layout = {
    title: 'Population Over Time',
    xaxis: { title: 'Time Steps' },
    yaxis: { title: 'Population (cells)', range: [0, gridSize * gridSize] },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    dragmode: 'zoom'
  };

  Plotly.newPlot(graphDiv, [traceRock, tracePaper, traceScissors], layout, {responsive: true});
}

// Update the absolute population Plotly graph
function updatePlot() {
  Plotly.update(graphDiv, {
    x: [timeSteps, timeSteps, timeSteps],
    y: [rockHistory, paperHistory, scissorsHistory]
  });
}

// Initialize the stacked area Plotly graph for relative percentages
function initStackedPlot() {
  const totalCells = gridSize * gridSize;
  const relativeRock = rockHistory.map(count => (count / totalCells) * 100);
  const relativePaper = paperHistory.map(count => (count / totalCells) * 100);
  const relativeScissors = scissorsHistory.map(count => (count / totalCells) * 100);

  const traceRock = {
    x: timeSteps,
    y: relativeRock,
    mode: 'lines',
    name: 'Rock',
    stackgroup: 'one',
    groupnorm: 'percent',
    line: { color: speciesColors[0] }
  };

  const tracePaper = {
    x: timeSteps,
    y: relativePaper,
    mode: 'lines',
    name: 'Paper',
    stackgroup: 'one',
    line: { color: speciesColors[1] }
  };

  const traceScissors = {
    x: timeSteps,
    y: relativeScissors,
    mode: 'lines',
    name: 'Scissors',
    stackgroup: 'one',
    line: { color: speciesColors[2] }
  };

  const layout = {
    title: 'Relative Population Composition Over Time',
    xaxis: { title: 'Time Steps' },
    yaxis: { title: 'Percentage (%)', range: [0, 100] },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    dragmode: 'zoom'
  };

  Plotly.newPlot(stackedGraphDiv, [traceRock, tracePaper, traceScissors], layout, {responsive: true});
}

// Update the stacked area graph with new relative data
function updateStackedPlot() {
  const totalCells = gridSize * gridSize;
  const relativeRock = rockHistory.map(count => (count / totalCells) * 100);
  const relativePaper = paperHistory.map(count => (count / totalCells) * 100);
  const relativeScissors = scissorsHistory.map(count => (count / totalCells) * 100);

  Plotly.update(stackedGraphDiv, {
    x: [timeSteps, timeSteps, timeSteps],
    y: [relativeRock, relativePaper, relativeScissors]
  });
}

// Main animation loop
function animate() {
  if (running) {
    updateSimulation();
    updateGraphData();
    drawGrid();
  }
  requestAnimationFrame(animate);
}

// Control button event listeners

// Toggle play/pause
playPauseBtn.addEventListener("click", function() {
  running = !running;
  this.textContent = running ? "Pause" : "Play";
});

// Discrete simulation step when paused
stepBtn.addEventListener("click", function() {
  if (!running) {
    updateSimulation();
    updateGraphData();
    drawGrid();
  }
});

// Reset board (with new grid size and steps per frame)
resetBtn.addEventListener("click", function() {
  updateGridParameters();
  initializeGrid();
  drawGrid();
  initPlot();
  initStackedPlot();
});

// Initialize Plotly graphs and start simulation loop
initPlot();
initStackedPlot();
animate();
