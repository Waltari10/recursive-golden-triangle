(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
// https://www.youtube.com/watch?v=EK32jo7i5LQ

const targetFPS = 60
const targetFrameDuration = (1000 / targetFPS)
const hueCache = {};

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


function getXOnCircle(radius, radian, x) {
  return radius * Math.cos(radian) + x;
};

function getYOnCircle(radius, radian, y) {
  return radius * Math.sin(radian) + y;
}


const dots = 1000;


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
  var index = (x + y * width) * 4;

  if (isOutsideOfCanvas(x, y)) {
    return;
  }


  canvasData.data[index + 0] = r;
  canvasData.data[index + 1] = g;
  canvasData.data[index + 2] = b;
  canvasData.data[index + 3] = a;
}

// That's how you update the canvas, so that your //
// modification are taken in consideration //
function updateCanvas() {
  ctx.putImageData(canvasData, 0, 0);
}


let rotation = 0;

const modifier = 0.09; // 0.01 - 1 reasonable

function spiral(start) {

  let hue = 0;

  rotation += -0.002;

  for (let i = 0; i < dots; i += modifier) {

    const x = Math.floor(getXOnCircle(i, i + rotation + start, width / 2));
    const y = Math.floor(getYOnCircle(i, i + rotation + start, height / 2));

    if (!isOutsideOfCanvas(x, y)) {

      hue = (hue + 0.5) % 360

      const [r, g, b] = hsv2rgb(hue, 1, 1)

      drawPixel(x, y, r, g, b, 255);
    }
  }
}

function loop() {

  const startTime = Date.now()
  wipeCanvasData();
  spiral(0);
  spiral(Math.PI);
  updateCanvas();
  const renderTime = Date.now() - startTime
  timeDelta = renderTime < targetFrameDuration ? targetFrameDuration : renderTime
  this.setTimeout(() => {
    loop()
  }, targetFrameDuration - renderTime)
}

loop()

// hue in range [0, 360]
// saturation, value in range [0,1]
// return [r,g,b] each in range [0,255]
// See: https://en.wikipedia.org/wiki/HSL_and_HSV#From_HSV
function hsv2rgb(hue, saturation, value) {

  const key = `${hue}${saturation}${value}`;
  if (hueCache[key]) {
    return hueCache[key];
  }

  let chroma = value * saturation;
  let hue1 = hue / 60;
  let x = chroma * (1 - Math.abs((hue1 % 2) - 1));
  let r1, g1, b1;
  if (hue1 >= 0 && hue1 <= 1) {
    ([r1, g1, b1] = [chroma, x, 0]);
  } else if (hue1 >= 1 && hue1 <= 2) {
    ([r1, g1, b1] = [x, chroma, 0]);
  } else if (hue1 >= 2 && hue1 <= 3) {
    ([r1, g1, b1] = [0, chroma, x]);
  } else if (hue1 >= 3 && hue1 <= 4) {
    ([r1, g1, b1] = [0, x, chroma]);
  } else if (hue1 >= 4 && hue1 <= 5) {
    ([r1, g1, b1] = [x, 0, chroma]);
  } else if (hue1 >= 5 && hue1 <= 6) {
    ([r1, g1, b1] = [chroma, 0, x]);
  }

  let m = value - chroma;
  let [r, g, b] = [r1 + m, g1 + m, b1 + m];

  // Change r,g,b values from [0,1] to [0,255]
  const res = [255 * r, 255 * g, 255 * b];

  hueCache[key] = res;

  return res;
}
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);
