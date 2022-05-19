const util = require('util')

const consoleDeep = {
  log: (object) => {
    console.log(util.inspect(object, {showHidden: false, depth: null}))
  }
}

module.exports = {
  consoleDeep
}