const { registerLatticeMock } = require('./plugins/lattice_mock');
const logger = require('./logger');

function registerListeners(lifecycle) {
  // Example:
  // lifecycle.on('points.awarded', async (event) => {
  //   console.log('Awarded points', event);
  // });
  registerLatticeMock(lifecycle, { logger });
}

module.exports = { registerListeners };
