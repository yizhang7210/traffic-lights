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
const INFINITY = 1000000

// TODO: Make number of lanes configurable
const LINE_MARGIN = 100
const TEXT_MARGIN = 5
const LINE = canvas.width - LINE_MARGIN
const BRAKING_ACCELERATION = -0.5

// TODO: Make these parameateres configurable
const MIN_STANDING_DISTANCE = 10
const MIN_SAFE_DISTANCE = 12
const MAX_SAFE_DISTANCE = 20
const CAR_WIDTH = 20
const SMALL_CAR_LENGTH = 20
const BIG_CAR_LENGTH = 300
const SMALL_CAR_TOP_SPEED = 2.5
const BIG_CAR_TOP_SPEED = 1
const SMALL_CAR_TOP_ACCELERATION = 0.05
const BIG_CAR_TOP_ACCELERATION = 0.01

// Configure the start/stop button
const controlButton = document.getElementById('controlButton')
controlButton.disabled = true

/*
Definitions
*/

class Car {
  constructor (name, x, y, length, current_speed, top_speed, top_acceleration, color) {
    this.x = x
    this.y = y
    this.length = length
    this.width = CAR_WIDTH

    this.current_speed = 0
    this.current_acceleration = 0
    this.top_speed = top_speed
    this.top_acceleration = top_acceleration
    this.color = color
    this.name = name
  }

  clone () {
    return new Car(this.name, this.x, this.y, this.length, this.current_speed, this.top_speed, this.top_acceleration, this.color)
  }
}

class LaneChangeSituation {
  constructor (laneTo, insertAt, carSpeedInFront, distanceInFront) {
    this.laneTo = laneTo
    this.insertAt = insertAt
    this.carSpeedInFront = carSpeedInFront
    this.distanceInFront = distanceInFront
  }

}

class CarLane {
  constructor (name, y, cars_in_lane) {
    this.name = name
    this.y = y
    this.cars = cars_in_lane
    this.cars.sort((c1, c2) => {
      // Sort by x position, right to left
      return c2.x - c1.x
    })
  }

  addCar (car) {
    this.cars.push(car)
    controlButton.disabled = false
  }

  size () {
    return this.cars.length
  }

  clone () {
    return new CarLane(this.name, this.y, this.cars.map(car => car.clone()))
  }

  removeCarAt (index) {
    this.cars = this.cars.slice(0, index).concat(this.cars.slice(index + 1))
  }

  insertCarAt (car, index) {
    car.y = this.y
    this.cars = this.cars.slice(0, index).concat([car]).concat(this.cars.slice(index))
  }

  move (adjacent_lanes) {
    if (state !== 'RUNNING') {
      return
    }

    if (this.cars.length === 0) {
      return
    }

    // Stop when the last car crosses the line
    const lastIndex = this.cars.length - 1
    if (this.cars[lastIndex].x + this.cars[lastIndex].length >= LINE) {
      state = 'STOPPED'
      controlButton.innerHTML = 'Back to start'
      return
    }

    // Try to make every car move forward as fast as possible
    let i = 0
    while (i < this.cars.length) {
      const curr = this.cars[i]

      // update location based on speed
      curr.x += curr.current_speed

      // update speed based on acceleration
      curr.current_speed = Math.max(0, Math.min(curr.top_speed, curr.current_speed + curr.current_acceleration))

      // first car is always moving at top speed
      if (i === 0) {
        this.cars[0].current_speed = this.cars[0].top_speed
        i += 1
        continue
      }

      // Always an option to stay in the same lane
      const carInFront = this.cars[i - 1]
      let possibleLaneChanges = [new LaneChangeSituation(this, i, carInFront.current_speed, carInFront.x - curr.x - curr.length)]

      const canChangeLanes = document.getElementById('canChangeLanes').checked
      // Explore changing lanes
      if (canChangeLanes && curr.x < LINE) {
        for (const adjacent_lane of adjacent_lanes) {

          // if no car in the next lane, definitely change lanes
          if (adjacent_lane.size() === 0) {
            possibleLaneChanges.push(new LaneChangeSituation(adjacent_lane, 0, INFINITY, INFINITY))
            break
          }

          let j = 0
          // Go through all the cars in the adjacent lane and try to find a spot
          while (j < adjacent_lane.size()) {
            // Try to find the first car behind with enough of a gap
            if (adjacent_lane.cars[j].x + adjacent_lane.cars[j].length + MAX_SAFE_DISTANCE >= curr.x) {
              j += 1
              continue
            }

            if (j === 0) {
              // Shouldn't happen - but the first car in the other lane is really behind
              possibleLaneChanges.push(new LaneChangeSituation(adjacent_lane, 0, INFINITY, INFINITY))
              break
            }

            const nextLaneCarInFront = adjacent_lane.cars[j - 1]

            // if the car in front is far enough, there's a possibility of a lane change
            if (curr.x + curr.length + MAX_SAFE_DISTANCE < nextLaneCarInFront.x) {
              possibleLaneChanges.push(new LaneChangeSituation(adjacent_lane, j, nextLaneCarInFront.current_speed, nextLaneCarInFront.x - curr.x - curr.length))
            }

            // Either way, we won't find another spot, so will break
            break
          }

          // if we're at the very end, that's also a possibility to change lanes
          const nextLaneLastCar = adjacent_lane.cars[adjacent_lane.size() - 1]
          if (curr.x + curr.length + MAX_SAFE_DISTANCE < nextLaneLastCar.x) {
            possibleLaneChanges.push(new LaneChangeSituation(adjacent_lane, adjacent_lane.size(), nextLaneLastCar.current_speed, nextLaneLastCar.x - curr.x - curr.length))
          }
        }

        possibleLaneChanges.sort((a, b) => {
          if (a.carSpeedInFront === 0 || b.carSpeedInFront === 0) {
            return b.distanceInFront - a.distanceInFront
          }

          return b.distanceInFront / b.carSpeedInFront - a.distanceInFront / a.carSpeedInFront
        })
      }

      if (possibleLaneChanges[0].laneTo !== this) {
        // Actually Change lanes
        possibleLaneChanges[0].laneTo.insertCarAt(curr, possibleLaneChanges[0].insertAt)
        this.removeCarAt(i)
        // This car is done, move on to the next car
        // Also don't increment i, since we just removed a car
        continue
      }

      if (curr.x + curr.length >= carInFront.x) {
        // you hit the car in front
        carInFront.current_speed = 0
        carInFront.current_acceleration = 0
        curr.current_speed = 0
        curr.current_acceleration = 0

        state = 'STOPPED'
        controlButton.innerHTML = 'Back to start'
      } else if (curr.x >= carInFront.x - MIN_SAFE_DISTANCE - curr.length) {
        // slow down if too close to the car in front
        curr.current_acceleration = BRAKING_ACCELERATION
      } else if (curr.x < carInFront.x - MAX_SAFE_DISTANCE - curr.length) {
        // accelerate if car in front is far away
        curr.current_acceleration = curr.top_acceleration
      } else {
        curr.current_acceleration = 0
      }
      i += 1
    }
  }

  redraw () {
    this.cars.forEach((car, i) => {
      // Draw the car
      ctx.fillStyle = car.color
      ctx.fillRect(car.x, car.y, car.length, car.width)

      // Draw the speed
      ctx.fillStyle = '#333333'
      ctx.fillText(`@${car.current_speed.toFixed(2)}`, car.x, car.y - TEXT_MARGIN)

      // Draw the name
      ctx.fillStyle = 'black'
      ctx.fillText(car.name, car.x, car.y + CAR_WIDTH - TEXT_MARGIN)
    })
  }
}

/*

Interactions

*/
const LANE_1_CENTER = (canvas.height - 2 * LINE_MARGIN) * 0.25 + LINE_MARGIN - CAR_WIDTH
const LANE_2_CENTER = (canvas.height - 2 * LINE_MARGIN) * 0.75 + LINE_MARGIN - CAR_WIDTH
const START_LANES = [new CarLane('L', LANE_1_CENTER, []), new CarLane('R', LANE_2_CENTER, [])]

let LANES = START_LANES.map(lane => lane.clone())
let SAVED_LANES = []

function smallCarAt (name, x, y) {
  return new Car(name, x, y, SMALL_CAR_LENGTH, 0, SMALL_CAR_TOP_SPEED, SMALL_CAR_TOP_ACCELERATION, '#dc53e6')
}

function bigCarAt (name, x, y) {
  return new Car(name, x, y, BIG_CAR_LENGTH, 0, BIG_CAR_TOP_SPEED, BIG_CAR_TOP_ACCELERATION, '#5392e6')
}

function addSmallCar (laneIndex) {
  const laneToAdd = LANES[laneIndex]
  const carName = laneToAdd.name + laneToAdd.size()
  if (laneToAdd.size() === 0) {
    laneToAdd.addCar(smallCarAt(carName, LINE - SMALL_CAR_LENGTH, laneToAdd.y))
  } else {
    const lastCar = laneToAdd.cars[laneToAdd.size() - 1]
    laneToAdd.addCar(smallCarAt(carName, lastCar.x - MIN_STANDING_DISTANCE - SMALL_CAR_LENGTH, laneToAdd.y))
  }
}

function addBigCar (laneIndex) {
  const laneToAdd = LANES[laneIndex]
  const carName = laneToAdd.name + laneToAdd.size()
  if (laneToAdd.size() === 0) {
    laneToAdd.addCar(bigCarAt(carName, LINE - BIG_CAR_LENGTH, laneToAdd.y))
  } else {
    const lastCar = laneToAdd.cars[laneToAdd.size() - 1]
    laneToAdd.addCar(bigCarAt(carName, lastCar.x - MIN_STANDING_DISTANCE - BIG_CAR_LENGTH, laneToAdd.y))
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

function preset_big_vs_small () {
  reset()
  addBigCar(0)
  addSmallCar(0)

  for (let i = 0; i < 12; i++) {
    addSmallCar(1)
  }
}

function preset_all_big_vs_all_small () {
  reset()
  for (let i = 0; i < 4; i++) {
    addBigCar(0)
  }
  addSmallCar(0)

  for (let i = 0; i < 43; i++) {
    addSmallCar(1)
  }
}

function preset_small_in_big_vs_all_small () {
  reset()
  for (let i = 0; i < 4; i++) {
    addBigCar(0)
    addSmallCar(0)
    addSmallCar(0)
  }

  for (let i = 0; i < 50; i++) {
    addSmallCar(1)
  }
}

function preset_all_smalls_blocked_by_big () {
  reset()
  addBigCar(0)
  for (let i = 0; i < 30; i++) {
    addSmallCar(0)
  }

  for (let i = 0; i < 40; i++) {
    addSmallCar(1)
  }
}

function preset_big_in_small_vs_all_small () {
  reset()
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 12; j++) {
      addSmallCar(0)
    }
    addBigCar(0)
  }

  for (let i = 0; i < 45; i++) {
    addSmallCar(1)
  }
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
  for (let i = 0; i < LANES.length; i++) {
    lane = LANES[i]
    let adjacent_lanes = []
    if (i > 0) {
      adjacent_lanes.push(LANES[i - 1])
    }
    if (i < LANES.length - 1) {
      adjacent_lanes.push(LANES[i + 1])
    }
    lane.move(adjacent_lanes)
    lane.redraw()
  }

  requestAnimationFrame(drawBox) // Call the function again for animation
}

drawBox() // Start the animation
