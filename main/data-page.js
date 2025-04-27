// Initialize empty arrays for data
let timeData = [];
let temperatureData = [];
let externalTempData = [];
let targetPoint = { time: null, temperature: null }; // Store target point data

let selectedMeatValue = 0; // Store the selected meat value (0 for pork by default)
let selectedWeight = 1.0; // Store the selected weight value
let selectedTempUnit = 'C'; // Store the selected temperature unit

// Add variable to track if target has been reached
let hasReachedTarget = false;
/**
 * Main initialization function that runs when the page loads
 */
window.onload = function() {
    const startButton = document.getElementById("startButton");
    const stopButton = document.getElementById("stopButton");
    const deviceDataDiv = document.getElementById("deviceData");

    let loggingInterval;
    let fileIndex = parseInt(localStorage.getItem('fileIndex')) || 1;
    let fileContent = `${new Date().toISOString()}\nElapsed Time, Internal, External\n`;

    startButton.addEventListener("click", async function() {
        // Ask user if they want to recover old data
        const previousData = localStorage.getItem('deviceDataLog');
        if (previousData && confirm("Recover previous data?")) {
            deviceDataDiv.textContent = `Previous Data: ${previousData}`;
        } else {
            deviceDataDiv.textContent = "No previous data found.";
        }


        // Retrieve the token from sessionStorage
        const token = sessionStorage.getItem('authToken');
        if (!token) {
            alert("No valid session found. Please log in.");
            window.location.href = "index.html";
            return;
        }

        // Start logging new device data
        const deviceID = await getDeviceID(token);
        if (!deviceID) {
            deviceDataDiv.textContent = "No device found.";
            return;
        }

        // Show feedback that logging is starting
        deviceDataDiv.textContent = "Logging started...";
        const timestamp = new Date().toISOString(); // Update timestamp each interval
        // Start logging data every 10 seconds
        loggingInterval = setInterval(async () => {
            const deviceData = await fetchDeviceData(token, deviceID);

            if (deviceData) {
                const elapsedTime = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
                const internalTemp = deviceData.temperature.internal || "N/A";
                const externalTemp = deviceData.temperature.ambient || "N/A";
                
                const logData = `${elapsedTime}, ${internalTemp}, ${externalTemp}\n`;
                fileContent += logData; // Append new data to file content
                deviceDataDiv.textContent = `Logging Data: ${logData}`;

                // Store the new log data in localStorage
                storeDataToLocalStorage(logData);

                // Add data to the chart
                if (isGood(timeData, temperatureData, externalTempData, [elapsedTime, internalTemp, externalTemp])) {
                    addData(elapsedTime, internalTemp, externalTemp);
                }
            }
        }, 10000); // Log every 10 seconds

        // Show the stop button after starting
        startButton.style.display = "none";
        stopButton.style.display = "inline";
    });

    // Stop logging and download the file when the stop button is pressed
    stopButton.addEventListener("click", function() {
        // Clear the interval to stop logging
        clearInterval(loggingInterval);

        // Trigger file download
        const filename = `data${fileIndex}.dat`;
        createFile(filename, fileContent);

        // Reset file content and increment fileIndex
        fileIndex += 1;
        localStorage.setItem('fileIndex', fileIndex);

        // Show the start button again
        startButton.style.display = "inline";
        stopButton.style.display = "none";

        // Optionally, reset fileContent if needed or keep it to log in future
        fileContent = `${new Date().toISOString()}\nElapsed Time, Internal, External\n`; // Reset if needed
        deviceDataDiv.textContent = "Logging stopped. Data downloaded.";
    });
};

/**
 * Device ID Retrieval
 * Fetches the device ID from the API
 */
async function getDeviceID(token) {
    const url = 'https://public-api.cloud.meater.com/v1/devices';
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        });

        const data = await response.json();
        return data.status === "OK" && data.data.devices.length > 0 ? data.data.devices[0].id : null;
    } catch (error) {
        console.error("Error fetching devices:", error);
        return null;
    }
}

/**
 * Device Data Fetching
 * Retrieves current device data from the API
 */
async function fetchDeviceData(token, deviceID) {
    const url = `https://public-api.cloud.meater.com/v1/devices/${deviceID}`;
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        });

        const data = await response.json();
        return data.status === "OK" ? data.data : null;
    } catch (error) {
        console.error("Error fetching device data:", error);
        return null;
    }
}

/**
 * Local Storage Management
 * Stores device data in local storage
 */
function storeDataToLocalStorage(data) {
    let existingData = localStorage.getItem('deviceDataLog');
    if (!existingData) {
        existingData = '';
    }
    existingData += data;
    localStorage.setItem('deviceDataLog', existingData);
}

/**
 * File Creation
 * Creates a downloadable file with the collected data
 */
function createFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

/**
 * Error Handling
 * Shows error message to the user
 */
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.add('show');
}


/**
 * Connection Retry
 * Attempts to reconnect to the device
 */
function retryConnection() {
    document.getElementById('deviceData').textContent = 'Loading device data...';
    window.location.reload();
}


// Function to add new data points
function addData(time, temperature, externalTemp) {
    timeData.push(time);
    temperatureData.push(temperature);
    externalTempData.push(externalTemp);
    
    // Update target point based on longTillDone
    const doneInfo = longTillDone();
    if (doneInfo.time > 0) {
        setTargetPoint(time + doneInfo.time, doneInfo.targetTemp);
    }
    
    // Check if temperature has reached target and trigger confetti
    const targetTemp = MEAT_TARGET_TEMPS[selectedMeatValue];
    const currentTemp = selectedTempUnit === 'C' ? temperature : fahrenheitToCelsius(temperature);
    if (currentTemp >= targetTemp && !hasReachedTarget) {
        hasReachedTarget = true;
        triggerConfetti();
    }
    
    // Update the chart with new data
    updateChart();
    
    // Log the data to console
    console.log(`Time: ${time}, Internal Temp: ${temperature}, External Temp: ${externalTemp}`);
}

// Function to format time based on elapsed time
function formatTime(seconds) {
    if (seconds >= 7200) { // 2 hours = 7200 seconds
        return `${(seconds / 3600).toFixed(1)}h`; // Convert to hours
    } else if (seconds >= 120) { // 2 minutes = 120 seconds
        return `${(seconds / 60).toFixed(1)}m`; // Convert to minutes
    } else {
        return `${seconds}s`; // Keep in seconds
    }
}

// Function to update the chart
function updateChart() {
    // Format time labels based on elapsed time
    const formattedTimeLabels = timeData.map(time => formatTime(time));
    lineChart.data.labels = formattedTimeLabels;
    
    // Convert temperatures based on selected unit
    const displayTempData = convertTemperatureData(temperatureData, selectedTempUnit === 'F');
    const displayExternalTempData = convertTemperatureData(externalTempData, selectedTempUnit === 'F');
    
    lineChart.data.datasets[0].data = displayTempData;
    lineChart.data.datasets[1].data = displayExternalTempData;
    
    // Update target point if it exists
    if (targetPoint.time !== null && targetPoint.temperature !== null) {
        const displayTargetTemp = selectedTempUnit === 'F' ? 
            celsiusToFahrenheit(targetPoint.temperature) : targetPoint.temperature;
        lineChart.data.datasets[2].data = [{ x: formatTime(targetPoint.time), y: displayTargetTemp }];
    } else {
        lineChart.data.datasets[2].data = [];
    }
    
    // Update y-axis label based on temperature unit
    lineChart.options.scales.y.title.text = `Temperature (${selectedTempUnit})`;
    
    // Update x-axis label based on time unit
    const maxTime = Math.max(...timeData);
    
    lineChart.update();
}

// Function to set target point
function setTargetPoint(time, temperature) {
    targetPoint.time = time;
    targetPoint.temperature = temperature;
    updateChart();
}

// Target temperatures for different meat types (in Celsius)
const MEAT_TARGET_TEMPS = {
    0: 145, // Pork
    1: 135, // Steak
    2: 165, // Chicken
    3: 145, // Fish
    4: 145  // Lamb
};


function longTillDone() {
    return{
        time: 100,
        targetTemp: 60
    };

    /*
    // Get the target temperature based on selected meat type
    const targetTemp = MEAT_TARGET_TEMPS[selectedMeatValue];
    
    // If we don't have enough data points, return a simple estimate
    if (timeData.length < 2) {
        const currentTemp = temperatureData.length > 0 ? 
            (selectedTempUnit === 'C' ? celsiusToFahrenheit(temperatureData[temperatureData.length - 1]) : temperatureData[temperatureData.length - 1]) : 70;
        const tempDiff = targetTemp - currentTemp;
        return {
            time: Math.max(0, tempDiff * 2),
            targetTemp: targetTemp,
            currentTemp: currentTemp
        };
    }

    // Convert temperatures to Fahrenheit if needed
    const internalTempF = selectedTempUnit === 'C' ? 
        temperatureData.map(t => celsiusToFahrenheit(t)) : temperatureData;
    const externalTempF = selectedTempUnit === 'C' ? 
        externalTempData.map(t => celsiusToFahrenheit(t)) : externalTempData;

    // Define the exponential model with variable external temp
    const model = (k) => (t) => {
        const i = timeData.findIndex(val => val >= t);
        const Text = externalTempF[i] ?? externalTempF[externalTempF.length - 1];
        return Text + (internalTempF[0] - Text) * Math.exp(-k * (t - timeData[0]));
    };

    // Prepare data for fitting
    const data = {
        x: timeData,
        y: internalTempF
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

    // Predict time when internalTemp reaches target
    const lastTime = timeData[timeData.length - 1];
    let t = lastTime;
    let T = internalTempF[internalTempF.length - 1];

    // Forward simulate until we reach the target
    const dt = 0.1;
    while (T < targetTemp && t - lastTime < 100000) { // safeguard
        const i = timeData.findIndex(val => val >= t);
        const Text = externalTempF[i] ?? externalTempF[externalTempF.length - 1];
        T = Text + (internalTempF[0] - Text) * Math.exp(-k * (t - timeData[0]));
        t += dt;
    }

    const deltaTime = t - lastTime;
    
    return {
        time: deltaTime > 0 ? deltaTime : 0,
        targetTemp: targetTemp,
        currentTemp: internalTempF[internalTempF.length - 1]
    };
    */
}

// Meat selection button functionality
const meatButtons = document.querySelectorAll('.meat-button');
meatButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all meat buttons
        meatButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');

        // Store the selected meat value
        selectedMeatValue = parseInt(button.dataset.value);
        console.log(`Selected meat value: ${selectedMeatValue}`);
        
        // Update target point based on new meat selection
        if (timeData.length > 0) {
            const doneInfo = longTillDone();
            if (doneInfo.time > 0) {
                setTargetPoint(timeData[timeData.length - 1] + doneInfo.time, doneInfo.targetTemp);
            }
        }
        updateChart();
    });
});

// Weight slider functionality
const weightSlider = document.getElementById('weightSlider');
const weightValue = document.getElementById('weightValue');

weightSlider.addEventListener('input', function() {
    selectedWeight = parseFloat(this.value);
    weightValue.textContent = selectedWeight.toFixed(1) + ' lbs';
    console.log('Selected weight:', selectedWeight);
});

// Function to convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

// Function to convert Fahrenheit to Celsius
function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
}

// Function to convert temperature data for display
function convertTemperatureData(data, toFahrenheit) {
    return data.map(temp => toFahrenheit ? celsiusToFahrenheit(temp) : temp);
}

const ctx = document.getElementById('lineChart').getContext('2d');
const lineChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: timeData,
        datasets: [
            {
                label: 'Internal Temperature',
                data: temperatureData,
                borderColor: 'blue',
                borderWidth: 2,
                fill: false,
                pointRadius: 5,
                pointBackgroundColor: 'blue'
            },
            {
                label: 'External Temperature',
                data: externalTempData,
                borderColor: 'green',
                borderWidth: 2,
                fill: false,
                pointRadius: 5,
                pointBackgroundColor: 'green'
            },
            {
                label: 'Target Point',
                data: [],
                borderColor: 'red',
                borderWidth: 0,
                fill: true,
                pointRadius: 8,
                pointBackgroundColor: 'red',
                pointStyle: 'circle',
                pointBorderWidth: 2,
                pointBorderColor: 'red',
                pointHoverRadius: 10
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Temperature (C)'
                },
                beginAtZero: true
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'rect',
                    padding: 20
                }
            }
        }
    }
});

// Update weight slider to trigger heat transfer calculation
weightSlider.addEventListener('input', function() {
    selectedWeight = parseFloat(this.value);
    weightValue.textContent = selectedWeight.toFixed(1) + ' lbs';
    console.log('Selected weight:', selectedWeight);
    
    // Update predictions based on new weight
    if (timeData.length > 1) {
        predictedTempData = fitExponentialDecay(timeData, temperatureData, externalTempData);
        updateChart();
    }
});

// Temperature unit toggle button functionality
const tempUnitButtons = document.querySelectorAll('.temp-unit-button');
tempUnitButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all temp unit buttons
        tempUnitButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');

        // Update selected temperature unit
        selectedTempUnit = button.dataset.unit;
        console.log(`Selected temperature unit: ${selectedTempUnit}`);
        
        // Update the chart with converted temperatures
        updateChart();
    });
});

// Make pork selected by default
document.addEventListener('DOMContentLoaded', function() {
    const porkButton = document.querySelector('[data-meat="pork"]');
    if (porkButton) {
        porkButton.classList.add('active');
        selectedMeatValue = 0;
        console.log('Pork selected by default');
    }
});

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

// Function to trigger confetti animation
function triggerConfetti() {
    const duration = 3 * 1000; // 3 seconds
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
    }, 250);
}