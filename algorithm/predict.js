import LM from 'ml-levenberg-marquardt';

function predictTimeToThreshold(time, internalTemp, externalTemp, threshold = 95) {
    const t0 = time[0];
    const T0 = internalTemp[0];

    // Define the exponential model with variable external temp
    const model = (k) => (t) => {
        const i = time.findIndex(val => val >= t);
        const Text = externalTemp[i] ?? externalTemp[externalTemp.length - 1];
        return Text + (T0 - Text) * Math.exp(-k * (t - t0));
    };

    // Prepare data for fitting
    const data = {
        x: time,
        y: internalTemp
    };

    // Initial guess for parameter
    const initialValues = { k: 0.0001 };

    // Fit using Levenberg-Marquardt
    const options = {
        damping: 1.5,
        initialValues,
        gradientDifference: 1e-6,
        maxIterations: 100,
        errorTolerance: 1e-3
    };

    const fit = LM(data, model, options);
    const { k } = fit.parameterValues;

    // Predict time when internalTemp reaches threshold
    const lastTime = time[time.length - 1];
    let t = lastTime;
    let T = internalTemp[internalTemp.length - 1];

    // Forward simulate until we reach the threshold
    const dt = 0.1;
    while (T < threshold && t - lastTime < 100000) { // safeguard
        const i = time.findIndex(val => val >= t);
        const Text = externalTemp[i] ?? externalTemp[externalTemp.length - 1];
        T = Text + (T0 - Text) * Math.exp(-k * (t - t0));
        t += dt;
    }

    const deltaTime = t - lastTime;
    return deltaTime > 0 ? deltaTime : 0;
}

