window.onload = function() {
    const startButton = document.getElementById("startButton");
    const stopButton = document.getElementById("stopButton");
    const deviceDataDiv = document.getElementById("deviceData");

    let loggingInterval;
    let fileIndex = parseInt(localStorage.getItem('fileIndex')) || 1;
    let fileContent = `${new Date().toISOString()}\nElapsed Time, Internal, External\n`;

    startButton.addEventListener("click", async function() {
        // Ask user if they want to recover old data
        const recoverOldData = confirm("Do you want to recover old data?");
        
        if (recoverOldData) {
            const previousData = localStorage.getItem('deviceDataLog');
            if (previousData) {
                console.log("Retrieved previous data from localStorage:", previousData);
                deviceDataDiv.textContent = `Previous Data: ${previousData}`;
            } else {
                deviceDataDiv.textContent = "No previous data found.";
            }
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

        // Start logging data every 10 seconds
        loggingInterval = setInterval(async () => {
            const timestamp = new Date().toISOString(); // Update timestamp each interval
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

// Function to store the data into localStorage
function storeDataToLocalStorage(data) {
    let existingData = localStorage.getItem('deviceDataLog');
    if (!existingData) {
        existingData = '';
    }
    existingData += data;
    localStorage.setItem('deviceDataLog', existingData);
}

async function getDeviceID(token) {
    const url = 'https://public-api.cloud.meater.com/v1/devices';
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` },
        });

        const data = await response.json();
        if (data.status === "OK" && data.data.devices.length > 0) {
            return data.data.devices[0].id;
        }
        return null;
    } catch (error) {
        console.error("Error fetching devices:", error);
        return null;
    }
}

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

// Create a downloadable file (Blob API)
function createFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

