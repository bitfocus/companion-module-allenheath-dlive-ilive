const { getEasing } = require("./easings")

/**
 * Returns the fade duration choice fields for Companion module UI.
 * @param {string} [isVisibleExpression]
 * @returns {Array<Object>} Array of input field definitions
 */
const FadeDurationChoice = function (isVisibleExpression) {
  return [
    {
      type: "number",
      label: "Fade Duration (ms)",
      id: "fadeDuration",
      default: 0,
      min: 0,
      step: 10,
      max: 60000,
      tooltip:
        "Set the desired duration of the transition in milliseconds. Be aware that the minimal temporal resolution is defined by the Fader Update Rate setting of the module.",
      isVisibleExpression: isVisibleExpression,
    },
    {
      type: "dropdown",
      label: "Algorithm",
      id: "fadeAlgorithm",
      default: "linear",
      choices: [
        { id: "linear", label: "Linear" },
        { id: "quadratic", label: "Quadratic" },
        { id: "cubic", label: "Cubic" },
        { id: "quartic", label: "Quartic" },
        { id: "quintic", label: "Quintic" },
        { id: "sinusoidal", label: "Sinusoidal" },
        { id: "exponential", label: "Exponential" },
        { id: "circular", label: "Circular" },
        { id: "elastic", label: "Elastic" },
        { id: "back", label: "Back" },
        { id: "bounce", label: "Bounce" },
      ],
      isVisibleExpression: `$(options:fadeDuration) > 0 && (${
        isVisibleExpression ?? "true"
      })`,
      tooltip: "Select the algorithm with which the fade is performed.",
    },
    {
      type: "dropdown",
      label: "Fade type",
      id: "fadeType",
      default: "ease-in-out",
      choices: [
        { id: "ease-in", label: "Ease-In" },
        { id: "ease-out", label: "Ease-Out" },
        { id: "ease-in-out", label: "Ease-In-Out" },
      ],
      isVisibleExpression: `$(options:fadeDuration) > 0 && $(options:fadeAlgorithm) != 'linear' && (${
        isVisibleExpression ?? "true"
      })`,
      tooltip:
        "Select how to ease your algorithm. Easing avoids abrupt changes in value",
    },
  ];
};

module.exports = {
  FadeDurationChoice,
};


function runTransition(
  cmd,
  valueId,
  action,
  state,
  transitions,
  targetValue,
  mapLinearToDb,
) {
  const current = StateUtils.getNumberFromState(cmd, state)
  const target = targetValue ?? getNumber(action, valueId)
  transitions.run(
    cmd,
    current,
    target,
    getNumber(action, 'fadeDuration'),
    getAlgorithm(action, 'fadeAlgorithm'),
    getCurve(action, 'fadeType'),
    mapLinearToDb,
  )
  state.set(cmd, [{ type: 'f', value: target }])
}

class FadingWorker {
  constructor(instance) {
    this.transitions = new Map()
    this.instance = instance
    this.fadeUpdateRate = 50
    this.tickInterval = undefined
  }

  setUpdateRate(rate) {
    this.fadeUpdateRate = rate
  }

  sendCommand(cmd, arg) {
    if (this.instance.config.host) {
      this.instance.sendValueByPath(cmd, arg, true)
    }
  }

  stopAll() {
    this.transitions.clear()

    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      delete this.tickInterval
    }
  }

  /**
   * Run a single tick of all pending transitions.
   */
  runTick() {
    const completedPaths = []
    for (const [path, info] of this.transitions.entries()) {
      const newValue = info.steps.shift()
      if (newValue !== undefined) {
        this.sendCommand(path, newValue)
      }
      if (info.steps.length === 0) {
        completedPaths.push(path)
      }
    }

    // Remove any completed transitions
    for (const path of completedPaths) {
      this.transitions.delete(path)
    }

    // If nothing is left, stop the timer
    if (this.transitions.size === 0) {
      this.stopAll()
    }
  }

  /**
   * Schedule a transition between to values using an OSC command to be executed.
   * @param {string} path The command to execute the transition with
   * @param {number|undefined} from Value to start the transition from
   * @param {number} to Value to end the transition with
   * @param {number} duration Duration of the transition
   * @param {string} [algorithm] The fade-curve to use for the transition
   * @param {string} [curve] The easing to use for the transition start and end
   * @param {boolean} [mapLinearToDb] Whether to map linear to dB
   */
  run(path, from, to, duration, algorithm, curve, mapLinearToDb) {
    const interval = this.fadeUpdateRate
    const stepCount = Math.ceil(duration / interval)

    if (stepCount <= 1 || typeof from !== 'number') {
      this.transitions.delete(path)
      this.sendCommand(path, to)
    } else {
      // Map the transition in dB to a linear scale (=linear fader movement)
      if (mapLinearToDb != false) {
        from = dbToFloat(from)
        to = dbToFloat(to)
      }
      const diff = to - from
      const steps = []
      
      const easing = getEasing(algorithm, curve)
      for (let i = 1; i <= stepCount; i++) {
        const fraction = easing(i / stepCount)
        if (mapLinearToDb == false) {
          steps.push(from + diff * fraction)
        } else {
          steps.push(floatToDb(from + diff * fraction)) // map back to dB
        }
      }

      this.transitions.set(path, { steps })

      // Start the tick if not already running
      if (!this.tickInterval) {
        this.tickInterval = setInterval(() => this.runTick(), this.fadeUpdateRate)
      }
    }
  }
}

let maxDb = 10
let minDb = -58.5
let dbInterval = maxDb - minDb
let dbHexMax = 0x7F

function floatToDb(f) {
  const value = (floatToDbAbs(f) - minDb) / dbInterval * dbHexMax

  return Math.max(0, Math.min(Math.floor(value), 0x7F))
}

/**
 * Converts a fader position to the value of that fader in dB
 * @param {number} f Fader position between 0.0 and 1.0
 * @returns {number} Value of the fader position in dB
 */
function floatToDbAbs(f) {
  if (f > 1.0 || f < 0.0) {
    console.error(`Illegal value for fader float ([0.0, 1.0]) = ${f}`)
  }
  if (f >= 0.5) {
    return f * 40 - 30
  } else if (f >= 0.25) {
    return f * 80 - 50
  } else if (f >= 0.0625) {
    return f * 160 - 70
  } else if (f >= 0.0) {
    return f * 480 - 90
  } else {
    return Number.NEGATIVE_INFINITY
  }
}

/**
 * Converts a fader value in dB to a fader position
 * @param {number} d A value of a fader in dB according to the A&H Midi Protocol (0x00: -Inf, 0x7F: +10dB)
 * @returns {number} The fader position between 0.0 and 1.0
 */
function dbToFloat(d) {
  // convert the dB value from the byte encoding of the midi protocol to an actual value 
  d = minDb + d / dbHexMax * dbInterval

  let f
  if (d < -60) {
    f = (d + 90) / 480
  } else if (d < -30) {
    f = (d + 70) / 160
  } else if (d < -10) {
    f = (d + 50) / 80
  } else if (d <= 10) {
    f = (d + 30) / 40
  } else {
    f = 1
  }
  return f
}

module.exports = {
  FadeDurationChoice,
  FadingWorker
}
