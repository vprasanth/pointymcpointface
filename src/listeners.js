const { registerLatticeMock } = require('./plugins/latticeMock');

function registerListeners(lifecycle) {
  // Example:
  // lifecycle.on('points.awarded', async (event) => {
  //   console.log('Awarded points', event);
  // });
  registerLatticeMock(lifecycle);
}

module.exports = { registerListeners };
