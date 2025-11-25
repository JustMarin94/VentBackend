function calculateDewPoint(t, h) {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * t) / (b + t) + Math.log(h / 100);
  return (b * alpha) / (a - alpha);
}

function calculateHeatIndex(t, h) {
  return (
    -8.784695 +
    1.61139411 * t +
    2.338549 * h -
    0.14611605 * t * h -
    0.012308094 * t * t -
    0.016424828 * h * h +
    0.002211732 * t * t * h +
    0.00072546 * t * h * h -
    0.000003582 * t * t * h * h
  );
}

module.exports = {
  calculateDewPoint,
  calculateHeatIndex,
};
