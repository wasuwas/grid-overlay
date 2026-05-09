const canvas = document.getElementById("gridCanvas");
const context = canvas.getContext("2d");

const state = {
  spacing: 40,
  color: "#00ff00",
  opacity: 0.35,
};

function resizeCanvasToViewport() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawGrid() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  context.clearRect(0, 0, width, height);

  const spacing = Math.max(4, Number(state.spacing) || 40);
  context.strokeStyle = state.color;
  context.globalAlpha = Math.max(0, Math.min(1, Number(state.opacity)));
  context.lineWidth = 1;
  context.beginPath();

  for (let x = 0.5; x <= width; x += spacing) {
    context.moveTo(x, 0);
    context.lineTo(x, height);
  }

  for (let y = 0.5; y <= height; y += spacing) {
    context.moveTo(0, y);
    context.lineTo(width, y);
  }

  context.stroke();
  context.globalAlpha = 1;
}

function redraw() {
  resizeCanvasToViewport();
  drawGrid();
}

window.gridOverlayApi.onConfig((payload) => {
  if (payload && typeof payload === "object") {
    state.spacing = payload.spacing ?? state.spacing;
    state.color = payload.color ?? state.color;
    state.opacity = payload.opacity ?? state.opacity;
  }
  redraw();
});

window.addEventListener("resize", redraw);
redraw();
