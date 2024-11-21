/*
Constants
*/
const canvas = document.getElementById('myCanvas')
const ctx = canvas.getContext('2d')


// TODO: Deal with the button after race is over
// TODO: Make number of lanes configurable
const LINE = 100;
const BRAKING_ACCELERATION = -0.5;

// TODO: Make these parameateres configurable
const MIN_STANDING_DISTANCE = 10;
const MIN_SAFE_DISTANCE = 15;
const MAX_SAFE_DISTANCE = 20;

// Configure the start/stop button
const controlButton = document.getElementById('controlButton')

/*
Definitions
*/

class Car {
  constructor(x, y, length, current_speed, top_speed, top_acceleration, color) {
    this.x = x
    this.y = y
    this.length = length
    this.width = 20

    this.current_speed = 0;
    this.current_acceleration = 0;
    this.top_speed = top_speed;
    this.top_acceleration = top_acceleration;
    this.color = color
  }
}

class CarLane {
  constructor(x, cars_in_lane) {
    this.x = x;
    this.cars = cars_in_lane;
  }

  addCar(car) {
    this.cars.push(car);
    console.log(this.cars)
  }

  size() {
    return this.cars.length;
  }

  move() {
    if (!running) {
      return;
    }

    this.cars.sort((c1, c2) => {return c1.y - c2.y});

    // Stop when the first car crosses the line
    const lastIndex = this.cars.length - 1;
    if (this.cars[lastIndex].y <= LINE) {
      running = false;
      return;
    }

    // Try to make every car move forward as fast as possible
    for (let i = 0; i < this.cars.length; i++) {
      const curr = this.cars[i];

      // update location based on speed
      curr.y -= curr.current_speed;

      // update speed based on acceleration
      curr.current_speed = Math.max(0, Math.min(curr.top_speed, curr.current_speed + curr.current_acceleration))

      if (i === 0) {
        this.cars[0].current_speed = this.cars[0].top_speed;
        continue;
      }

      const prev = this.cars[i-1];

      if (curr.y <= prev.y + prev.length) {
        // you hit the car in front
        prev.current_speed = 0
        prev.current_acceleration = 0
        curr.current_speed = 0
        curr.current_acceleration = 0
      } else if (curr.y <= prev.y + prev.length + MIN_SAFE_DISTANCE) {
        // slow down if too close to the car in front
        curr.current_acceleration = BRAKING_ACCELERATION;
      } else if (curr.y > prev.y + prev.length + MAX_SAFE_DISTANCE) {
        // accelerate if car in front is far away
        curr.current_acceleration = curr.top_acceleration;
      } else {
        curr.current_acceleration = 0;
      }

    }
  }

  redraw() {
    this.cars.forEach((car) => {
      ctx.fillStyle = car.color;
      ctx.fillRect(car.x, car.y, car.width, car.length)
    })
  }
}

/*

Interactions

*/

const LANES = [new CarLane(100, []), new CarLane(500, [])];

function smallCarAt(x, y) {
  return new Car(x, y, 22, 0, 1.2, 6, 'green');
}

function bigCarAt(x, y) {
  return new Car(x, y, 280, 0, 1, 3, 'red');
}

function addSmallCar() {
  const laneIndex = document.getElementById("laneNumber").value - 1;
  const laneToAdd = LANES[laneIndex];
  if (laneToAdd.size() === 0) {
    laneToAdd.addCar(smallCarAt(laneToAdd.x, LINE));
  } else {
    const lastCar = laneToAdd.cars[laneToAdd.size() - 1];
    laneToAdd.addCar(smallCarAt(laneToAdd.x, lastCar.y + lastCar.length + MIN_STANDING_DISTANCE));
  }
}

function addBigCar() {
  const laneIndex = document.getElementById("laneNumber").value - 1;
  const laneToAdd = LANES[laneIndex];
  if (laneToAdd.size() === 0) {
    laneToAdd.addCar(bigCarAt(laneToAdd.x, LINE));
  } else {
    const lastCar = laneToAdd.cars[laneToAdd.size() - 1];
    laneToAdd.addCar(bigCarAt(laneToAdd.x, lastCar.y + lastCar.length + MIN_STANDING_DISTANCE));
  }
}

function start() {
  running = !running;
  if (running) {
    controlButton.innerHTML = 'Pause';
  } else {
    controlButton.innerHTML = 'Resume';
  }
}


let running = false;

function drawLine () {
  ctx.fillStyle = 'black'
  ctx.beginPath() // Start a new path
  ctx.moveTo(50, LINE);
  ctx.lineTo(canvas.width - 50, LINE);
  ctx.stroke();
}

function drawBox () {
  ctx.clearRect(0, 0, canvas.width, canvas.height) // Clear canvas
  drawLine();
  for (let lane of LANES) {
    lane.move();
    lane.redraw();
  }

  requestAnimationFrame(drawBox) // Call the function again for animation
}

drawBox() // Start the animation
