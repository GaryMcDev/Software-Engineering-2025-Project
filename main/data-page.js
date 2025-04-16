/**
 * Main initialization function that runs when the page loads
 */
window.onload = function() {
    initializeUI();
    // Don't check auth or start logging automatically
    document.getElementById('deviceData').textContent = "Logging stopped. Click 'Start Logging' to begin.";
};

/**
 * UI Initialization
 * Sets up event listeners and initial UI state
 */
function initializeUI() {
    const startButton = document.getElementById("startButton");
    const stopButton = document.getElementById("stopButton");
    const deviceDataDiv = document.getElementById("deviceData");

    // Initialize file tracking
    let loggingInterval;
    let fileIndex = parseInt(localStorage.getItem('fileIndex')) || 1;
    let fileContent = `${new Date().toISOString()}\nElapsed Time, Internal, External\n`;

    // Start button event listener
    startButton.addEventListener("click", async function() {
        if (!startButton.classList.contains('active')) {
            startButton.classList.add('active');
            stopButton.classList.remove('active');
            await startLogging(startButton, stopButton, deviceDataDiv, loggingInterval, fileContent);
        }
    });

    // Stop button event listener
    stopButton.addEventListener("click", function() {
        if (!stopButton.classList.contains('active')) {
            stopButton.classList.add('active');
            startButton.classList.remove('active');
            stopLogging(startButton, stopButton, deviceDataDiv, loggingInterval, fileIndex, fileContent);
        }
    });
}

/**
 * Authentication Check
 * Verifies user session and redirects if not authenticated
 */
function checkAuth() {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        alert("No valid session found. Please log in.");
        window.location.href = "index.html";
        return;
    }
    return token;
}

/**
 * Start Logging Process
 * Initiates data logging from the device
 */
async function startLogging(startButton, stopButton, deviceDataDiv, loggingInterval, fileContent) {
    // Ask user if they want to recover old data
    const recoverOldData = confirm("Do you want to recover old data?");
    
    if (recoverOldData) {
        const previousData = localStorage.getItem('deviceDataLog');
        if (previousData) {
            console.log("Retrieved previous data from localStorage:", previousData);
            deviceDataDiv.textContent = `Previous Data: ${previousData}`;
            
            // Parse and add previous data to the chart
            const lines = previousData.split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    const [time, internalTemp, externalTemp] = line.split(',').map(val => val.trim());
                    if (time && internalTemp && externalTemp && 
                        internalTemp !== "N/A" && externalTemp !== "N/A") {
                        addData(parseInt(time), parseFloat(internalTemp), parseFloat(externalTemp));
                    }
                }
            });
        } else {
            deviceDataDiv.textContent = "No previous data found.";
        }
    }

    const token = checkAuth();
    if (!token) return;

    const deviceID = await getDeviceID(token);
    if (!deviceID) {
        deviceDataDiv.textContent = "No device found.";
        stopButton.click(); // Automatically stop logging if no device found
        return;
    }

    deviceDataDiv.textContent = "Logging started...";

    loggingInterval = setInterval(async () => {
        await logDeviceData(token, deviceID, deviceDataDiv, fileContent);
    }, 10000);
}

/**
 * Stop Logging Process
 * Stops data logging and saves the collected data
 */
function stopLogging(startButton, stopButton, deviceDataDiv, loggingInterval, fileIndex, fileContent) {
    clearInterval(loggingInterval);
    const filename = `data${fileIndex}.dat`;
    createFile(filename, fileContent);
    
    fileIndex += 1;
    localStorage.setItem('fileIndex', fileIndex);
    
    fileContent = `${new Date().toISOString()}\nElapsed Time, Internal, External\n`;
    deviceDataDiv.textContent = "Logging stopped. Data downloaded.";
}

/**
 * Device Data Logging
 * Fetches and logs device data
 */
async function logDeviceData(token, deviceID, deviceDataDiv, fileContent) {
    const timestamp = new Date().toISOString();
    const deviceData = await fetchDeviceData(token, deviceID);

    if (deviceData) {
        const elapsedTime = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        const internalTemp = deviceData.temperature.internal || "N/A";
        const externalTemp = deviceData.temperature.ambient || "N/A";

        const logData = `${elapsedTime}, ${internalTemp}, ${externalTemp}\n`;
        fileContent += logData;
        deviceDataDiv.textContent = `Logging Data: ${logData}`;
        storeDataToLocalStorage(logData);
        hideError();

        // Add data to the chart
        if (internalTemp !== "N/A" && externalTemp !== "N/A") {
            addData(elapsedTime, internalTemp, externalTemp);
        }
    } else {
        showError("Failed to fetch device data. Please check your connection and try again.");
    }
}

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
    let existingData = localStorage.getItem('deviceDataLog') || '';
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
 * Error Handling
 * Hides error message
 */
function hideError() {
    const errorElement = document.getElementById('errorMessage');
    errorElement.classList.remove('show');
}

/**
 * Connection Retry
 * Attempts to reconnect to the device
 */
function retryConnection() {
    hideError();
    document.getElementById('deviceData').textContent = 'Loading device data...';
    window.location.reload();
}

// Initialize empty arrays for data
let timeData = [];
let temperatureData = [];
let externalTempData = [];
let targetPoint = { time: null, temperature: null }; // Store target point data

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
    
    updateChart();
    hideError();
}

// Function to update the chart
function updateChart() {
    lineChart.data.labels = timeData;
    
    // Convert temperatures based on selected unit
    const displayTempData = convertTemperatureData(temperatureData, selectedTempUnit === 'F');
    const displayExternalTempData = convertTemperatureData(externalTempData, selectedTempUnit === 'F');
    
    lineChart.data.datasets[0].data = displayTempData;
    lineChart.data.datasets[1].data = displayExternalTempData;
    
    // Update target point if it exists
    if (targetPoint.time !== null && targetPoint.temperature !== null) {
        const displayTargetTemp = selectedTempUnit === 'F' ? 
            celsiusToFahrenheit(targetPoint.temperature) : targetPoint.temperature;
        lineChart.data.datasets[2].data = [{ x: targetPoint.time, y: displayTargetTemp }];
    } else {
        lineChart.data.datasets[2].data = [];
    }
    
    // Update y-axis label based on temperature unit
    lineChart.options.scales.y.title.text = `Temperature (${selectedTempUnit})`;
    
    lineChart.update();
}

// Function to set target point
function setTargetPoint(time, temperature) {
    targetPoint.time = time;
    targetPoint.temperature = temperature;
    updateChart();
}

// Target temperatures for different meat types (in Fahrenheit)
const MEAT_TARGET_TEMPS = {
    0: 145, // Pork
    1: 135, // Steak
    2: 165, // Chicken
    3: 145, // Fish
    4: 145  // Lamb
};

function longTillDone() {
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