/*
Constants
*/
const canvas = document.getElementById('myCanvas')
const ctx = canvas.getContext('2d')
ctx.translate(0.5, 0.5)

// Set display size (vw/vh).
const sizeWidth = 98 * window.innerWidth / 100
const sizeHeight = 80 * window.innerHeight / 100

// Setting the canvas site and width to be responsive
canvas.width = sizeWidth
canvas.height = sizeHeight
canvas.style.width = sizeWidth
canvas.style.height = sizeHeight

let state = 'NOT_STARTED'

// TODO: Deal with the button after race is over
// TODO: Make number of lanes configurable
const LINE_MARGIN = 100
const LINE = canvas.width - LINE_MARGIN
const BRAKING_ACCELERATION = -0.5

// TODO: Make these parameateres configurable
const MIN_STANDING_DISTANCE = 10
const MIN_SAFE_DISTANCE = 15
const MAX_SAFE_DISTANCE = 20
const CAR_WIDTH = 20
const SMALL_CAR_LENGTH = 22
const BIG_CAR_LENGTH = 280

// Configure the start/stop button
const controlButton = document.getElementById('controlButton')
controlButton.disabled = true

/*
Definitions
*/

class Car {
  constructor (x, y, length, current_speed, top_speed, top_acceleration, color) {
    this.x = x
    this.y = y
    this.length = length
    this.width = CAR_WIDTH

    this.current_speed = 0
    this.current_acceleration = 0
    this.top_speed = top_speed
    this.top_acceleration = top_acceleration
    this.color = color
  }

  clone () {
    return new Car(this.x, this.y, this.length, this.current_speed, this.top_speed, this.top_acceleration, this.color)
  }
}

class CarLane {
  constructor (y, cars_in_lane) {
    this.y = y
    this.cars = cars_in_lane
  }

  addCar (car) {
    this.cars.push(car)
    controlButton.disabled = false
  }

  size () {
    return this.cars.length
  }

  clone () {
    return new CarLane(this.y, this.cars.map(car => car.clone()))
  }

  move () {
    if (state !== 'RUNNING') {
      return
    }

    if (this.cars.length === 0) {
      return
    }

    this.cars.sort((c1, c2) => {
      // Sort by x position, right to left
      return c2.x - c1.x
    })

    // Stop when the last car crosses the line
    const lastIndex = this.cars.length - 1
    if (this.cars[lastIndex].x + this.cars[lastIndex].length >= LINE) {
      state = 'STOPPED'
      controlButton.innerHTML = 'Back to start'
      return
    }

    // Try to make every car move forward as fast as possible
    for (let i = 0; i < this.cars.length; i++) {
      const curr = this.cars[i]

      // update location based on speed
      curr.x += curr.current_speed

      // update speed based on acceleration
      curr.current_speed = Math.max(0, Math.min(curr.top_speed, curr.current_speed + curr.current_acceleration))

      if (i === 0) {
        this.cars[0].current_speed = this.cars[0].top_speed
        continue
      }

      const prev = this.cars[i - 1]

      if (curr.x + curr.length >= prev.x) {
        // you hit the car in front
        prev.current_speed = 0
        prev.current_acceleration = 0
        curr.current_speed = 0
        curr.current_acceleration = 0

        state = 'STOPPED'
        controlButton.innerHTML = 'Back to start'
      } else if (curr.x >= prev.x - MIN_SAFE_DISTANCE - curr.length) {
        // slow down if too close to the car in front
        curr.current_acceleration = BRAKING_ACCELERATION
      } else if (curr.y < prev.x - MAX_SAFE_DISTANCE - curr.length) {
        // accelerate if car in front is far away
        curr.current_acceleration = curr.top_acceleration
      } else {
        curr.current_acceleration = 0
      }
    }
  }

  redraw () {
    this.cars.forEach((car) => {
      ctx.fillStyle = car.color
      ctx.fillRect(car.x, car.y, car.length, car.width)
    })
  }
}

/*

Interactions

*/
const LANE_1_CENTER = (canvas.height - 2 * LINE_MARGIN) * 0.25 + LINE_MARGIN - CAR_WIDTH
const LANE_2_CENTER = (canvas.height - 2 * LINE_MARGIN) * 0.75 + LINE_MARGIN - CAR_WIDTH
const START_LANES = [new CarLane(LANE_1_CENTER, []), new CarLane(LANE_2_CENTER, [])]

let LANES = START_LANES.map(lane => lane.clone())
let SAVED_LANES = []

function smallCarAt (x, y) {
  return new Car(x, y, SMALL_CAR_LENGTH, 0, 1.2, 6, 'green')
}

function bigCarAt (x, y) {
  return new Car(x, y, BIG_CAR_LENGTH, 0, 1, 3, 'red')
}

function addSmallCar (laneIndex) {
  const laneToAdd = LANES[laneIndex]
  if (laneToAdd.size() === 0) {
    laneToAdd.addCar(smallCarAt(LINE - SMALL_CAR_LENGTH, laneToAdd.y))
  } else {
    const lastCar = laneToAdd.cars[laneToAdd.size() - 1]
    laneToAdd.addCar(smallCarAt(lastCar.x - MIN_STANDING_DISTANCE - SMALL_CAR_LENGTH, laneToAdd.y))
  }
}

function addBigCar (laneIndex) {
  const laneToAdd = LANES[laneIndex]
  if (laneToAdd.size() === 0) {
    laneToAdd.addCar(bigCarAt(LINE - BIG_CAR_LENGTH, laneToAdd.y))
  } else {
    const lastCar = laneToAdd.cars[laneToAdd.size() - 1]
    laneToAdd.addCar(bigCarAt(lastCar.x - MIN_STANDING_DISTANCE - BIG_CAR_LENGTH, laneToAdd.y))
  }
}

function start_pause () {
  if (state === 'NOT_STARTED') {
    // to start
    SAVED_LANES = LANES.map(lane => lane.clone())
    state = 'RUNNING'
    controlButton.innerHTML = 'Pause'
  } else if (state === 'PAUSED') {
    // to resume
    state = 'RUNNING'
    controlButton.innerHTML = 'Pause'
  } else if (state === 'RUNNING') {
    // to pause
    state = 'PAUSED'
    controlButton.innerHTML = 'Resume'
  } else if (state === 'STOPPED') {
    // to reset
    state = 'NOT_STARTED'
    controlButton.innerHTML = 'Start'
    LANES = SAVED_LANES.map(lane => lane.clone())
  }
}

function reset () {
  state = 'NOT_STARTED'
  controlButton.innerHTML = 'Start'
  controlButton.disabled = true
  LANES = START_LANES.map(lane => lane.clone())
}

function drawFinishingLine () {
  ctx.fillStyle = 'black'
  ctx.beginPath() // Start a new path
  ctx.moveTo(LINE, LINE_MARGIN)
  ctx.lineTo(LINE, canvas.height - LINE_MARGIN)
  ctx.stroke()
}

function drawLaneSeparator () {
  ctx.fillStyle = 'black'
  ctx.beginPath() // Start a new path
  ctx.moveTo(LINE_MARGIN, canvas.height / 2)
  ctx.lineTo(LINE, canvas.height / 2)
  ctx.stroke()
}

function drawBox () {
  ctx.clearRect(0, 0, canvas.width, canvas.height) // Clear canvas
  drawFinishingLine()
  drawLaneSeparator()
  for (let lane of LANES) {
    lane.move()
    lane.redraw()
  }

  requestAnimationFrame(drawBox) // Call the function again for animation
}

drawBox() // Start the animation
