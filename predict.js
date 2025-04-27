function longTillDone(timeArray, internalTempArray, externalTempArray, targetTemp) {
    if (timeArray.length !== internalTempArray.length || timeArray.length !== externalTempArray.length) {
        throw new Error("All input arrays must have the same length.");
    }
    if (timeArray.length < 2) {
        throw new Error("Not enough data points to make a prediction.");
    }

    const currentTime = timeArray[timeArray.length - 1];
    const currentTemp = internalTempArray[internalTempArray.length - 1];
    const currentExternalTemp = externalTempArray[externalTempArray.length - 1];

    if (currentTemp >= targetTemp) {
        return 0; // Already done
    }

    // We'll model temp as: T(t) = T_ext + (T0 - T_ext) * exp(-k * t)
    // Estimate k using linear regression on ln((T - T_ext) / (T0 - T_ext))

    const T0 = internalTempArray[0];
    const T_ext0 = externalTempArray[0];

    // Normalize times to start at zero
    const t0 = timeArray[0];
    const times = timeArray.map(t => t - t0);

    const lnTemps = [];
    const validTimes = [];

    for (let i = 0; i < times.length; i++) {
        const T_ext = externalTempArray[i];
        const T = internalTempArray[i];
        const numerator = T - T_ext;
        const denominator = T0 - T_ext;

        if (numerator > 0 && denominator > 0) {
            const lnVal = Math.log(numerator / denominator);
            lnTemps.push(lnVal);
            validTimes.push(times[i]);
        }
    }

    if (lnTemps.length < 2) {
        throw new Error("Not enough valid data points to fit model.");
    }

    // Simple linear regression: lnTemps = -k * times
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    for (let i = 0; i < validTimes.length; i++) {
        const x = validTimes[i];
        const y = lnTemps[i];
        sumX += x;
        sumY += y;
        sumXX += x * x;
        sumXY += x * y;
    }

    const n = validTimes.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    const k = -slope; // because lnTemps = -k * t

    if (k <= 0) {
        throw new Error("Invalid model: k must be positive.");
    }

    // Solve for the future time t_done when T(t_done) = targetTemp
    const T_ext_now = currentExternalTemp; // assume external temp stays constant
    const numerator = targetTemp - T_ext_now;
    const denominator = T0 - T_ext_now;

    if (numerator <= 0 || denominator <= 0) {
        throw new Error("Target temperature out of valid range.");
    }

    const tDone = -Math.log(numerator / denominator) / k;

    const elapsedTime = times[times.length - 1];
    const timeRemaining = tDone - elapsedTime;

    return timeRemaining > 0 ? timeRemaining : 0;
}

