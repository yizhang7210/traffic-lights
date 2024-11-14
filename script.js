const canvas = document.getElementById('myCanvas')
const ctx = canvas.getContext('2d')

let running = true;

// TODO: Deal with the button after race is over
// TODO: Make number of lanes configurable
const LINE = 100;
const BRAKING_ACCELERATION = -3;
const FORWARD_ACCELERATION = 2;

// TODO: Make these parameateres configurable
const MIN_SAFE_DISTANCE = 30;
const MAX_SAFE_DISTANCE = 50;

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
  constructor(x, y, length, current_speed, top_speed, acceleration, color) {
    this.x = x
    this.y = y
    this.length = length
    this.width = 50

    this.current_speed = current_speed
    this.top_speed = top_speed
    this.acceleration = acceleration
    this.color = color
  }

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
    if (this.cars[0].y <= LINE) {
      running = false;
      return;
    }

    // Try to make every car move forward as fast as possible
    for (let i = 0; i < this.cars.length; i++) {
      const curr = this.cars[i];

      // update location based on speed
      curr.y -= curr.current_speed;

      // update speed based on acceleration
      curr.current_speed = Math.max(0, Math.min(curr.top_speed, curr.current_speed + curr.acceleration))

      if (i === 0) {
        this.cars[0].current_speed = this.cars[0].top_speed;
        continue;
      }

      const prev = this.cars[i-1];

      if (curr.y <= prev.y + prev.length + MIN_SAFE_DISTANCE) {
        // slow down to match car in front if too close
        curr.acceleration = BRAKING_ACCELERATION;
      } else if (curr.y > prev.y + prev.length + MAX_SAFE_DISTANCE) {
        // accelerate if car in front is far away
        curr.acceleration = FORWARD_ACCELERATION;
      } else {
        curr.acceleration = 0;
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
  new Car(100, 400, 50, 1, 2, 0, 'green'),
  new Car(100, 700, 80, 6, 5, 0, 'red')
]);

const line2 = new CarLane([
  new Car(500, 250, 50, 2, 2, 0, 'green'),
  new Car(500, 500, 80, 3, 10, 0, 'red'),
  new Car(500, 700, 100, 5, 15, 0, 'blue')
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
