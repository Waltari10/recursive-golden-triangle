// https://www.geogebra.org/m/sxEMtV6q

const uniqid = require('uniqid')

global.gameObjects = {}
global.instantiate = function (classTemplate, args) {
  const id = uniqid()
  const instance = new classTemplate(Object.assign({
    id
  }, args))
  gameObjects[id] = instance
  return instance
}
global.destroy = function (instance) {
  delete gameObjects[instance.id]
}


function updateGameObjects() {
  for (const key in gameObjects) {
    gameObjects[key].update()
  }
}

function updateGameObjects() {
  for (const key in gameObjects) {
    gameObjects[key].render()
  }
}

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



// Instiate a triangle spawner
// Triangle spawner checks on every frame if new triangle needs to be spawned or old ones removed
// Adding/removing depends on if triangle would actually be visible. For example if side length is less than one pixel, or larger than screen.
// Triangle spawner rotates slowly // or camera rotates
// Triangle spawner slowly scales the existing triangles to a bigger size // or camera zooms
// The fuck is a camera?

// https://www.youtube.com/watch?v=0rlNHYHhrWs
// Thickness, color, borderRadius


function drawTriangle(posA, posB, posC, color) {
  drawLine(posA, posB, color);
  drawLine(posB, posC, color);
  drawLine(posC, posA, color);
}

function degToRad (deg) {
  return deg * (Math.PI/180);
}


function drawLine(start, end, color = [0,255,0,255]) {

  // Line is pretty much a perpendicular triangle, unless it's a straight line. Then it's a really flat one.

  const drawDensity = 1; // 1px
  // Pythagoram theorem
  // Hypotenuse
  const lineLength = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));// hypotenuse
  
  const xLength = end[0] - start[0];
  const yLength = end[1] - start[1];

  // console.log(xLength, yLength, lineLength)

  // simple atan doesn't return correct angle with negative values. Luckily atan2 takes care of it for 
  const angleRad = Math.atan2(yLength,  xLength);

  // You have a triangle
  // You know hypotenuse
  // and location of A and B 

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


/**
 * 
 * @param {float} pivotX 
 * @param {float} pivotY 
 * @param {float} angle 
 * @param {float[]} point 
 * @returns {float[]} point 
 */
function rotatePoint(pivot, angle, point)
{
  const s = Math.sin(angle);
  const c = Math.cos(angle);


  const pointOriginX = point[0] - pivot[0];
  const pointOriginY = point[1] - pivot[1];

  // rotate point
  const xNew = (pointOriginX * c) - (pointOriginY * s);
  const yNew = (pointOriginX * s) + (pointOriginY * c);

  const newPoint = [
    pivot[0] + xNew,
    pivot[1] + yNew,
  ]

  return newPoint;
}

// https://www.onlinemath4all.com/90-degree-clockwise-rotation.html
// https://stackoverflow.com/questions/2259476/rotating-a-point-about-another-point-2d
// Position is half way between points B and C 72 and 72, because AB/BC is golden ratio
function drawGoldenTriangle(pos, height, rotation, color = [0,255,0,255], pivot) {

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

  
  drawGoldenTriangle(pos, height, rotation, [0,255,0,255], pivot);
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

  // const newPivot


  // drawX(newPos, [255,255,255,255]);

  // TODO: The new pivot point probably needs to be relative to the parent triangle.
  // using the same pivot for every single triangle doesn't work.
  // Previously you were using the new relative location of the parent triangle as pivot as well
  // So that worked seamlessly, but only if pivot and pos was same.


  drawRecursiveGoldenTriangle(newPos, newHeight, newRotation, [0,255,0,255], pivot);

  
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


function updateCanvas() {
  ctx.putImageData(canvasData, 0, 0);
}

let triangleHeight = height - 50;
// let triangleLocation = [(width/2) - 70.5780300722,(height/2) + 134.2473908148];

let pivotPoint = [(width/2),(height/2) -50];
let triangleLocation = [width/2, height/2];

// console.log(triangeLocation)
// [291.5, 660]
// [362.0780300721824, 525.7526091851511]
let triangleRotation = 0;

function loop() {
  i = 0;

  const startTime = Date.now()
  wipeCanvasData();

  // triangleHeight++; 
  triangleRotation = triangleRotation + 0.005;


  // drawX(pivotPoint)
  // drawX(triangleLocation)

  

  drawRecursiveGoldenTriangle(triangleLocation, triangleHeight, triangleRotation, pivotPoint);

  updateCanvas()
  const renderTime = Date.now() - startTime
  timeDelta = renderTime < targetFrameDuration ? targetFrameDuration : renderTime
  this.setTimeout(() => {
    loop()
  }, targetFrameDuration - renderTime)
}

loop()