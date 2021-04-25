// https://www.geogebra.org/m/sxEMtV6q

const { distance, degToRad, rotatePoint } = require('./math')

const targetFPS = 60
const targetFrameDuration = (1000 / targetFPS)

global.canvas = document.getElementById('canvas')
global.ctx = canvas.getContext('2d')
global.timeDelta = 1000 / targetFPS

function backingScale() {
  if ('devicePixelRatio' in window) {
    if (window.devicePixelRatio > 1) {
      return window.devicePixelRatio;
    }
  }
  return 1;
}

const scaleFactor = backingScale()

// Fix on retina display
if (scaleFactor > 1) {
  canvas.width = canvas.width * scaleFactor;
  canvas.height = canvas.height * scaleFactor;
  // update the context for the new canvas scale
  global.ctx = canvas.getContext("2d");

}

const width = window.innerWidth
const height = window.innerHeight

let canvasData = ctx.getImageData(0, 0, width, height);


function wipeCanvasData() {
  canvasData = ctx.createImageData(width, height);
}

function isOutsideOfCanvas(x, y) {

  return x < 0 || y < 0 || x > width || y > height;
}

// That's how you define the value of a pixel //
function drawPixel(x, y, r, g, b, a) {

  const xRounded = Math.round(x);
  const yRounded = Math.round(y);

  var index = (xRounded + yRounded * width) * 4;

  if (isOutsideOfCanvas(xRounded, yRounded)) {
    return;
  }

  canvasData.data[index + 0] = r;
  canvasData.data[index + 1] = g;
  canvasData.data[index + 2] = b;
  canvasData.data[index + 3] = a;
}


function drawTriangle(posA, posB, posC, color) {
  drawLine(posA, posB, color);
  drawLine(posB, posC, color);
  drawLine(posC, posA, color);
}


function drawLine(start, end, color = [0,255,0,255]) {

  const drawDensity = 1; // 1px
  // Pythagoram theorem
  // Hypotenuse
  const lineLength = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
  
  const xLength = end[0] - start[0];
  const yLength = end[1] - start[1];

  // simple atan doesn't return correct angle with negative values. atan2 takes care of it
  const angleRad = Math.atan2(yLength,  xLength);

  for(let i = 0; i < lineLength; i = i + drawDensity) {

    const segmentDistance = i;

    // if angle and hypotenuse, then can calculate X and Y

    // relative
    const relativeX = Math.cos(angleRad) * segmentDistance;
    const relativeY = Math.sin(angleRad) * segmentDistance;

    const absoluteX = relativeX + start[0]
    const absoluteY = relativeY + start[1]

    const [r,g,b,a] = color;
    drawPixel(absoluteX,absoluteY,r,g,b,a);
  }

}



// https://www.onlinemath4all.com/90-degree-clockwise-rotation.html
// https://stackoverflow.com/questions/2259476/rotating-a-point-about-another-point-2d
// Position is half way between points B and C 72 and 72, because AB/BC is golden ratio
function drawGoldenTriangle(pos, height, rotation, pivot) {

// golden triangle degrees 72, 72, 36
// golden gnomon 36, 36, 108
// AB/BC is the golden ratio number
// https://www.mathsisfun.com/algebra/sohcahtoa.html

  const baseLength = (Math.tan(degToRad(18)) * height) * 2;

  const pointA = rotatePoint(pos, rotation, [pos[0], pos[1] - height]); // sharpest angle
  const pointB = rotatePoint(pos, rotation, [pos[0] - (baseLength / 2), pos[1]]); 
  const pointC = rotatePoint(pos, rotation, [pos[0] + (baseLength / 2), pos[1]]);


  drawTriangle(pointA, pointB, pointC, [0,255,0,255]);

}

let i = 0;

function drawRecursiveGoldenTriangle(pos, height, rotation, pivot) {

  
  drawGoldenTriangle(pos, height, rotation, pivot);
  i++;

  if (i > 10) {
    return;
  }


  const hypotenuseLength = height / Math.cos(degToRad(18));
  const baseLength = (Math.tan(degToRad(18)) * height) * 2;
  const goldenRatio = hypotenuseLength / baseLength;

  const newHeight = height / goldenRatio;

  const newRotation = rotation - 108 * Math.PI/180

  const newPointC = rotatePoint(pos, rotation, [pos[0] + (baseLength / 2), pos[1]]);

  // Go half baselength up CA direction from pointC to get new position
  const newHypotenuseLength = baseLength;
  const newBaseLength = newHypotenuseLength / goldenRatio;

  let newPosXRelative = Math.cos(newRotation) * (newBaseLength / 2)
  let newPosYRelative = Math.sin(newRotation) * (newBaseLength / 2)
  
  const newPos = [newPointC[0] + newPosXRelative, newPointC[1] + newPosYRelative];

  drawRecursiveGoldenTriangle(newPos, newHeight, newRotation, pivot);
  
}

function drawX(pos, color = [0, 255,0,255]) {

  drawPixel(pos[0], pos[1], color[0], color[1],color[2],color[3])
  drawPixel(pos[0] -1, pos[1] -1, color[0], color[1],color[2],color[3])
  drawPixel(pos[0] +1, pos[1] + 1, color[0], color[1],color[2],color[3])
  drawPixel(pos[0] +1, pos[1] - 1, color[0], color[1],color[2],color[3])
  drawPixel(pos[0] -1, pos[1] + 1, color[0], color[1],color[2],color[3])


  drawPixel(pos[0] -2, pos[1] -2, color[0], color[1],color[2],color[3])
  drawPixel(pos[0] +2, pos[1] +2, color[0], color[1],color[2],color[3])
  drawPixel(pos[0] +2, pos[1] -2, color[0], color[1],color[2],color[3])
  drawPixel(pos[0] -2, pos[1] +2, color[0], color[1],color[2],color[3])

}


const intersection = (p1, p2, p3, p4) => {
  const l1A = (p2[1] - p1[1]) / (p2[0] - p1[0]);
  const l1B = p1[1] - l1A * p1[0]

  const l2A = (p4[1] - p3[1]) / (p4[0] - p3[0]);
  const l2B = p3[1] - l2A * p3[0];
  
  const x = (l2B - l1B) / (l1A - l2A);
  const y = x * l1A + l1B;
  
  return [x,y];
}

/**
 * 
 * @param {float[]} a point
 * @param {float[]} b point
 * @param {float[]} c point
 * @returns point
 */
const startingPoint = (a, b, c) => {
  const ac = distance(a, c);
  const ab = distance(a, b);
  const bc = distance(b, c);
  // Law of cosines
  const alpha = Math.acos((ab * ab + ac * ac - bc * bc) / (2 * ab * ac));
  const gamma = Math.acos((ac * ac + bc * bc - ab * ab) / (2 * ac * bc));
  const delta = Math.PI - alpha / 2 - gamma;
  // Law of sines
  const cd = ac * Math.sin(alpha / 2) / Math.sin(delta);
  const d = [
    cd * (b[0] - c[0]) / bc + c[0],
    cd * (b[1] - c[1]) / bc + c[1]
  ];
  const e = [
    (a[0] + c[0]) / 2,
    (a[1] + c[1]) / 2
  ]
  const f = [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ]
  return intersection(c, f, d, e);
};


function updateCanvas() {
  ctx.putImageData(canvasData, 0, 0);
}

let triangleHeight = height - 200;

let pivotPoint = [(width/2),(height/2) -50];
let triangleLocation = [width/2, height/2 + 50];


let triangleRotation = 0;

function loop() {
  i = 0;

  const startTime = Date.now()
  wipeCanvasData();

  // triangleHeight++; 
  triangleRotation = triangleRotation + 0.005;


  // drawX(pivotPoint)
  // drawX(triangleLocation)


  const baseLength = (Math.tan(degToRad(18)) * triangleHeight) * 2;

  const pointA = [triangleLocation[0], triangleLocation[1] - triangleHeight]; // sharpest angle
  const pointB = [triangleLocation[0] - (baseLength / 2), triangleLocation[1]]; 
  const pointC = [triangleLocation[0] + (baseLength / 2), triangleLocation[1]];


  const thePoint = startingPoint(pointA, pointB, pointC)

  
  drawX(pointA, [255,0,0,255])
  drawX(pointB, [0,255,0,255])
  drawX(pointC, [0,0,255,255])
  drawX(thePoint, [0,255,0,255])

  drawRecursiveGoldenTriangle(triangleLocation, triangleHeight, triangleRotation, thePoint);

  updateCanvas()
  const renderTime = Date.now() - startTime
  timeDelta = renderTime < targetFrameDuration ? targetFrameDuration : renderTime
  this.setTimeout(() => {
    loop()
  }, targetFrameDuration - renderTime)
}

loop()

