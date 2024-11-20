const canvas = document.getElementById('myCanvas')
const ctx = canvas.getContext('2d')

let running = true;

// TODO: Deal with the button after race is over
// TODO: Make number of lanes configurable
const LINE = 100;
const BRAKING_ACCELERATION = -0.5;

// TODO: Make these parameateres configurable
const MIN_SAFE_DISTANCE = 15;
const MAX_SAFE_DISTANCE = 20;

// Configure the start/stop button
const pause = document.getElementById('pause')
pause.addEventListener('click', function () {
  running = !running;
  if (running) {
    pause.innerHTML = 'Pause';
  } else {
    pause.innerHTML = 'Resume';
  }
})

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

function smallCarAt(x, y) {
  return new Car(x, y, 22, 0, 2.5, 6, 'green');
}

function bigCarAt(x, y) {
  return new Car(x, y, 280, 0, 1.8, 3, 'red');
}

class CarLane {
  constructor(cars_in_lane) {
    this.cars = cars_in_lane;
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

const line1 = new CarLane([
  bigCarAt(100, 400),
  smallCarAt(100, 700),
]);

const line2 = new CarLane([
  smallCarAt(500, 400),
  smallCarAt(500, 425),
  smallCarAt(500, 450),
  smallCarAt(500, 475),
  smallCarAt(500, 500),
  smallCarAt(500, 525),
  smallCarAt(500, 550),
  smallCarAt(500, 575),
  smallCarAt(500, 600),
  smallCarAt(500, 625),
  smallCarAt(500, 650),
  smallCarAt(500, 675),
  smallCarAt(500, 700),
]);

function drawLine () {
  ctx.fillStyle = 'black'
  ctx.beginPath() // Start a new path
  ctx.moveTo(50, LINE);
  ctx.lineTo(canvas.width - 50, LINE);
  ctx.stroke();
}

function drawBox () {
  ctx.clearRect(0, 0, canvas.width, canvas.height) // Clear canvas
  drawLine()
  line1.move();
  line1.redraw();
  line2.move();
  line2.redraw();

  requestAnimationFrame(drawBox) // Call the function again for animation
}

drawBox() // Start the animation
