// This decouples state management and library use
const xstate = require('xstate')

/**
 * The inverse relation between state transitions and actions
 * to be dispatched to the state machine.
 */
const ACTION_STATE_TABLE = {
  accepted: 'ACCEPT',
  rejected: 'REJECT',
  waitingForCredits: 'APPROVE',
  completed: 'COMPLETE',
  minted: 'MINT',
  claimed: 'CLAIM',
  swapped: 'SWAP',
}

// Our finite state machine.
const machine =
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAnARgewHYFpYAXVIsAOgAcxcIBLXKAYgEEBhNgUQAUAVRUJWyw6ROngEgAHogCMADnnkAnACYA7AAZ5mgMwA2WZtmy1AGhABPOatXkALAFZNj2Qe3rHy2fYC+vizQsPEISMioaekYmACVOAClONn4kECERMQlUmQQFJTUtHQMjE3MrRF15e3JHfVVNezrdVUd5BUd-QIwcAmJSClRkZDBKMghWbm4YgHkANU5JdNFxXEkc+3UldXsN5XVdZUcW5X17C2tcl3J1E-lHXXtjWs8OgJAgntD+8kHh0chYgkkilBMJlllQOtNtcdjd9odjqdzohVPpHORtJoNMp7DjdNtZOpOu9uiE+uEAO6oZaMABi2HQbHQkFEsCYbGmAFluAAZTi8BapJaZVbZRBtWTXA76NGaTbqBTKZEIPbkfQPPYFPauBrEj5ksIUKk0qD0xnM+hENlxRLJRZgkVrcUmKUnWXyxXKnzorx3WQaWqyGX2XR60m9Q3kZDYAC2lAANmAxkxOQBJAByILSDpWTtyJk0Km1+JebmaytV6txN2xniMfje+oj3xjDGTbB5LFTnPtGVzYtyD0Lqnsqh8bn0WO2Z3KKvUao1NbhOobXWCzfCyHj1JjAIAygB1FjcXvg0WQuStdEjseHeS6EqafQV+dVzW1lf+N64bAQOCSJsvnCahaAYKBT0dAdRy9Ec1W0XFHB2PRKlxMN1yAgYhhGMYIP7C8EF0LEal9eR6n0e9R3VCtCz2NxEIVZRFGcIlG3DDDyGNMQ6QZJkWStXCIWkRBJzsHxmnsRRCRLGcLmUZRrjUE4TBMXRCPxNDPnJChozjRMcKFHNBJyHF5xLfRlG0U57wrSV1SMci0R0INTA0g0WzbSABPPITcnqOwdHUVQmPMhFdBshd7PkRzjEMeRXI3bTtzoXcIC8vMfHsWzNBxFSsW8VRwrsp8otaGKXNY9CtPIWAqUoahUoMvsjLkciaNMAxFD2LFHEKh9iui5zlHi9jmQAKzAZB9NBJrvOMjZyDMiyooksLZ2ODF1HVZxEJMTL9GGrS0oHBQvTir8gA */
  xstate.createMachine({
    states: {
      pending: {
        on: {
          ACCEPT: {
            target: 'accepted',
          },
          REJECT: {
            target: 'rejected',
          },
        },
      },
      accepted: {
        on: {
          APPROVE: {
            target: 'waitingForCredits',
          },
          REJECT: {
            target: 'rejected',
          },
        },
      },
      waitingForCredits: {
        on: {
          COMPLETE: {
            target: 'completed',
          },
          REJECT: {
            target: 'rejected',
          },
        },
      },
      completed: {
        on: {
          MINT: {
            target: 'minted',
          },
        },
      },
      minted: {
        on: {
          CLAIM: {
            target: 'claimed',
          },
        },
      },
      claimed: {
        on: {
          SWAP: {
            target: 'swapped',
          },
        },
      },
      swapped: {
        type: 'final',
      },
      rejected: {
        type: 'final',
      },
    },
    id: 'carbon-state',
    initial: 'pending',
  })

/**
 * The decoupled version of the state machine.
 */
class State {
  /**
   * @param {ReturnType<typeof xstate.interpret>} state
   */
  constructor(state) {
    this.state = state
  }

  /**
   * Attempts to switch to the next state, if possible.
   * @param {string} next The next state.
   */
  next(next) {
    if (!(next in ACTION_STATE_TABLE)) {
      throw strapi.errors.badRequest(`Could not transition to ${next}, no action found for this state.`)
    }
    const old = this.state.id
    const action = ACTION_STATE_TABLE[next]
    const result = this.state.send({ type: action })
    if (!result.changed) {
      throw strapi.errors.badRequest(`Cannot transition state from ${old} to ${next}. No valid action routes found.`)
    }
  }
}

/**
 * A singleton-like service.
 */
class StateProvider {
  /** Class reference. */
  StateProvider = StateProvider
  State = State

  /**
   * Recovers the state, if possible. Throws if the entity
   * was stored with an invalid state.
   * @param {{status: string}} entity The model entry to recover state from.
   */
  recover(entity) {
    const { status } = entity
    try {
      return new State(xstate.interpret(machine).start(status))
    } catch (err) {
      throw strapi.errors.badRequest(`State "${status}" is not valid! Caused by: ${err}`)
    }
  }
}

module.exports = new StateProvider()
