function isGood(time, internal_temp, external_temp, newData) {
    // Check if arrays are empty
    if (time.length === 0 || internal_temp.length === 0 || external_temp.length === 0) {
        return true;
    }

    const [newTime, newInternal, newExternal] = newData;

    // Check for "N/A" in any new data
    if (newTime === "N/A" || newInternal === "N/A" || newExternal === "N/A") {
        return false;
    }

    // Get the most recent data
    const lastInternal = internal_temp[internal_temp.length - 1];
    const lastExternal = external_temp[external_temp.length - 1];

    // Check if new internal and external temps match the last recorded ones
    if (newInternal === lastInternal && newExternal === lastExternal) {
        return false;
    }

    // If all checks passed, the data is good
    return true;
}

