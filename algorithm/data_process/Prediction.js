function fitExponentialDecay(time, internalTemp, externalTemp, points = 150) {
    // Helper: Mean
    const mean = arr => arr.reduce((sum, v) => sum + v, 0) / arr.length;

    // Step 1: Remove failed pings (where both internal & external temps are unchanged)
    const filtered = [];
    for (let i = 1; i < time.length; i++) {
        if (internalTemp[i] !== internalTemp[i - 1] || externalTemp[i] !== externalTemp[i - 1]) {
            filtered.push([time[i], internalTemp[i], externalTemp[i]]);
        }
    }

    if (filtered.length === 0) return [];

    const cleanTime = [time[0], ...filtered.map(row => row[0])];
    const cleanInternal = [internalTemp[0], ...filtered.map(row => row[1])];
    const cleanExternal = [externalTemp[0], ...filtered.map(row => row[2])];

    // Step 2: Use only the first `points` for fitting
    const tFit = cleanTime.slice(0, points);
    const TFit = cleanInternal.slice(0, points);
    const T0 = TFit[0];
    const Text = mean(cleanExternal);

    // Exponential model: T(t) = (T0 - Text) * exp(-c * t) + Text
    function model(t, c) {
        return (T0 - Text) * Math.exp(-c * t) + Text;
    }

    // Loss function (mean squared error)
    function loss(c) {
        return tFit.reduce((sum, t, i) => {
            const predicted = model(t, c);
            const actual = TFit[i];
            return sum + Math.pow(predicted - actual, 2);
        }, 0) / tFit.length;
    }

    // Simple gradient descent to find best-fit `c`
    function optimizeC(initial = 0.00007, lr = 1e-6, maxIter = 10000) {
        let c = initial;
        for (let i = 0; i < maxIter; i++) {
            // Approximate gradient
            const h = 1e-8;
            const grad = (loss(c + h) - loss(c - h)) / (2 * h);
            c -= lr * grad;
            if (Math.abs(grad) < 1e-10) break;
        }
        return c;
    }

    const cFit = optimizeC();

    // Step 3: Predict internal temperature for each time value
    const predictions = cleanTime.map(t => model(t, cFit));

    return predictions;
}

// Example usage:
const time = [0, 60, 120, 180, 240, 300, 360, 420]; // in seconds
const internalTemp = [100, 99, 98, 97.1, 96.3, 95.7, 95.1, 94.6];
const externalTemp = [90, 90, 90, 90, 90, 90, 90, 90];

const predicted = fitExponentialDecay(time, internalTemp, externalTemp);
console.log(predicted);
