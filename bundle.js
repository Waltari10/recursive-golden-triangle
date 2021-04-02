(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (process,global){(function (){
/* jshint node: true */
'use strict';

var os = require('os');

var lib = {};

function parallel(tasks, done) {
    var results = [];
    var errs = [];
    var length = 0;
    var doneLength = 0;
    function doneIt(ix, err, result) {
        if (err) {
            errs[ix] = err;
        } else {
            results[ix] = result;
        }
        doneLength += 1;
        if (doneLength >= length) {
            done(errs.length > 0 ? errs : errs, results);
        }
    }
    Object.keys(tasks).forEach(function (key) {
        length += 1;
        var task = tasks[key];
        (process.nextTick || global.setImmediate || global.setTimeout)(function () {
            task(doneIt.bind(null, key), 1);
        });
    });
}

lib.networkInterfaces = function () {
    var allAddresses = {};

    try {
        var ifaces = os.networkInterfaces();
    } catch (e) {
      // At October 2016 WSL does not support os.networkInterfaces() and throws
      // Return empty object as if no interfaces were found
      // https://github.com/Microsoft/BashOnWindows/issues/468
        if (e.syscall === 'uv_interface_addresses') {
            return allAddresses;
        } else {
            throw e;
        };
    };

    Object.keys(ifaces).forEach(function (iface) {
        var addresses = {};
        var hasAddresses = false;
        ifaces[iface].forEach(function (address) {
            if (!address.internal) {
                addresses[(address.family || "").toLowerCase()] = address.address;
                hasAddresses = true;
                if (address.mac) {
                    addresses.mac = address.mac;
                }
            }
        });
        if (hasAddresses) {
            allAddresses[iface] = addresses;
        }
    });
    return allAddresses;
};

var _getMacAddress;
switch (os.platform()) {

    case 'win32':
        _getMacAddress = require('./lib/windows.js');
        break;

    case 'linux':
        _getMacAddress = require('./lib/linux.js');
        break;

    case 'darwin':
    case 'sunos':
    case 'freebsd':
        _getMacAddress = require('./lib/unix.js');
        break;

    default:
        console.warn("node-macaddress: Unknown os.platform(), defaulting to 'unix'.");
        _getMacAddress = require('./lib/unix.js');
        break;

}

lib.one = function (iface, callback) {
    if (typeof iface === 'function') {
        callback = iface;

        var ifaces = lib.networkInterfaces();
        var alleged = [ 'eth0', 'eth1', 'en0', 'en1' ];
        iface = Object.keys(ifaces)[0];
        for (var i = 0; i < alleged.length; i++) {
            if (ifaces[alleged[i]]) {
                iface = alleged[i];
                break;
            }
        }
        if (!ifaces[iface]) {
            if (typeof callback === 'function') {
                process.nextTick(function() {
                    callback(new Error("no interfaces found"), null);
                });
            }
            return null;
        }
        if (ifaces[iface].mac) {
            if (typeof callback === 'function') {
                process.nextTick(function() {
                    callback(null, ifaces[iface].mac);
                });
            }
            return ifaces[iface].mac;
        }
    }
    if (typeof callback === 'function') {
        _getMacAddress(iface, callback);
    }
    return null;
};

lib.all = function (callback) {

    var ifaces = lib.networkInterfaces();
    var resolve = {};

    Object.keys(ifaces).forEach(function (iface) {
        if (!ifaces[iface].mac) {
            resolve[iface] = _getMacAddress.bind(null, iface);
        }
    });

    if (Object.keys(resolve).length === 0) {
        if (typeof callback === 'function') {
            process.nextTick(function(){
                callback(null, ifaces);
            });
        }
        return ifaces;
    }

    parallel(resolve, function (err, result) {
        Object.keys(result).forEach(function (iface) {
            ifaces[iface].mac = result[iface];
        });
        if (typeof callback === 'function') {
            callback(null, ifaces);
        }
    });
    return null;
};

module.exports = lib;

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/linux.js":3,"./lib/unix.js":4,"./lib/windows.js":5,"_process":7,"os":6}],3:[function(require,module,exports){
var execFile = require('child_process').execFile;

module.exports = function (iface, callback) {
    execFile("cat", ["/sys/class/net/" + iface + "/address"], function (err, out) {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, out.trim().toLowerCase());
    });
};
},{"child_process":1}],4:[function(require,module,exports){
var execFile = require('child_process').execFile;

module.exports = function (iface, callback) {
    execFile("ifconfig", [iface], function (err, out) {
        if (err) {
            callback(err, null);
            return;
        }
        var match = /[a-f0-9]{2}(:[a-f0-9]{2}){5}/.exec(out.toLowerCase());
        if (!match) {
            callback("did not find a mac address", null);
            return;
        }
        callback(null, match[0].toLowerCase());
    });
};

},{"child_process":1}],5:[function(require,module,exports){
var execFile = require('child_process').execFile;

var regexRegex = /[-\/\\^$*+?.()|[\]{}]/g;

function escape(string) {
    return string.replace(regexRegex, '\\$&');
}

module.exports = function (iface, callback) {
    execFile("ipconfig", ["/all"], function (err, out) {
        if (err) {
            callback(err, null);
            return;
        }
        var match = new RegExp(escape(iface)).exec(out);
        if (!match) {
            callback("did not find interface in `ipconfig /all`", null);
            return;
        }
        out = out.substring(match.index + iface.length);
        match = /[A-Fa-f0-9]{2}(\-[A-Fa-f0-9]{2}){5}/.exec(out);
        if (!match) {
            callback("did not find a mac address", null);
            return;
        }
        callback(null, match[0].toLowerCase().replace(/\-/g, ':'));
    });
};

},{"child_process":1}],6:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

exports.homedir = function () {
	return '/'
};

},{}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],8:[function(require,module,exports){
(function (process){(function (){
/* 
(The MIT License)
Copyright (c) 2014 Halász Ádám <mail@adamhalasz.com>
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

//  Unique Hexatridecimal ID Generator
// ================================================

//  Dependencies
// ================================================
var pid = process && process.pid ? process.pid.toString(36) : '' ;
var mac = typeof __webpack_require__ !== 'function' ? require('macaddress').one(macHandler) : null ;
var address = mac ? parseInt(mac.replace(/\:|\D+/gi, '')).toString(36) : '' ;

//  Exports
// ================================================
module.exports         = function(prefix){ return (prefix || '') + address + pid + now().toString(36); }
module.exports.process = function(prefix){ return (prefix || '')           + pid + now().toString(36); }
module.exports.time    = function(prefix){ return (prefix || '')                 + now().toString(36); }

//  Helpers
// ================================================
function now(){
    var time = Date.now();
    var last = now.last || time;
    return now.last = time > last ? time : last + 1;
}

function macHandler(error){
    if(module.parent && module.parent.uniqid_debug){
        if(error) console.error('Info: No mac address - uniqid() falls back to uniqid.process().', error)
        if(pid == '') console.error('Info: No process.pid - uniqid.process() falls back to uniqid.time().')
    }
}

}).call(this)}).call(this,require('_process'))
},{"_process":7,"macaddress":2}],9:[function(require,module,exports){
(function (global){(function (){
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
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"uniqid":8}]},{},[9]);
