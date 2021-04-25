
const { distance, degToRad, rotatePoint } = require('../math')

describe('math', () => {
  it('distance', () => {

    const dist = distance([0,0], [0,1]);

    expect(dist).toEqual(1);

    const dist2 = distance([34,55], [0,1]);
  
    expect(dist2).toEqual(63.81222453417527);
  })

  it('degToRad', () => {

    const rad = degToRad(90);


    expect(rad).toEqual(Math.PI/2);


    const rad2 = degToRad(180);


    expect(rad2).toEqual(Math.PI);


    const rad3 = degToRad(79);

    expect(rad3).toEqual(1.3788101090755203);

  })

  it('rotatePoint', () => {

    const res = rotatePoint([0,0], Math.PI,[1,1]);
    
    expect(res).toEqual([-1,-1])
  })
})