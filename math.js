
// https://github.com/MikeMcl/decimal.js
var Decimal = require('decimal.js');




const distance = (p1, p2) => Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);

const degToRad = (deg) =>  {
  return deg * (Math.PI/180);
}




/**
 * 
 * @param {float} pivotX 
 * @param {float} pivotY 
 * @param {float} angle  rad
 * @param {float[]} point 
 * @returns {float[]} point 
 */
function rotatePoint(pivot, angle, point)
{
  const s = Math.sin(angle);
  const c = Math.cos(angle);

  // console.log(typeof s)


  const pointOriginX = point[0] - pivot[0];
  const pointOriginY = point[1] - pivot[1];


  // rotate point


  // const xNew = c.times(pointOriginX).minus(s.times(pointOriginY));
  // const yNew = s.times(pointOriginX).add(c.times(pointOriginY));
  const xNew = (pointOriginX * c) - (pointOriginY * s);
  const yNew = (pointOriginX * s) + (pointOriginY * c);

  // console.log('new things')
  // console.log(xNew)
  // console.log(yNew)

  const newPoint = [
    pivot[0] + xNew,
    pivot[1] + yNew,
  ]

  return newPoint;
}

/*
  normal
    -   -1,
    -   -1,
    +   -1.0000000000000002,
    +   -0.9999999999999999,
 */

    //   Array [ Decimal
    // -   -1,
    // -   -1,
    // +   "0-1.0000000000000002385",
    // +   "0-0.99999999999999976154",

module.exports = {
  distance,
  degToRad,
  rotatePoint
}