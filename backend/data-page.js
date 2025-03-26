window.onload = async function() {
    // Retrieve the token from sessionStorage
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        alert("No valid session found. Please log in.");
        window.location.href = "login.html";
        return;
    }

    // Retrieve previously stored data from localStorage (if any)
    const previousData = localStorage.getItem('deviceDataLog');
    const deviceDataDiv = document.getElementById("deviceData");

    if (previousData) {
        console.log("Retrieved previous data from localStorage:", previousData);
        deviceDataDiv.textContent = `Previous Data: ${previousData}`;
    } else {
        deviceDataDiv.textContent = "No previous data found.";
    }

    // Start logging new device data
    const deviceID = await getDeviceID(token);
    if (!deviceID) {
        deviceDataDiv.textContent = "No device found.";
        return;
    }

    let fileIndex = 1;
    const filename = `data${fileIndex}.dat`;
    const newFile = createFile(filename);
    const timestamp = new Date().toISOString();

    writeToFile(newFile, `${timestamp}\nElapsed Time, Internal, External\n`);

    // Start logging data every 60 seconds
    setInterval(async () => {
        const deviceData = await fetchDeviceData(token, deviceID);

        if (deviceData) {
            const elapsedTime = Math.floor((Date.now() - new Date(timestamp)) / 1000);
            const internalTemp = deviceData.temperature.internal || "N/A";
            const externalTemp = deviceData.temperature.ambient || "N/A";

            const logData = `${elapsedTime}, ${internalTemp}, ${externalTemp}\n`;
            writeToFile(newFile, logData);
            deviceDataDiv.textContent = `Logging Data: ${logData}`;

            // Store the new log data in localStorage
            storeDataToLocalStorage(logData);

            // Log the pulled data to the console
            console.log("Device Data Pulled:", deviceData);
            console.log("Elapsed Time:", elapsedTime);
            console.log("Internal Temp:", internalTemp);
            console.log("External Temp:", externalTemp);
        }
    }, 10000); // Log every 60 seconds
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

function createFile(filename) {
    const fileContent = "";
    return { filename, content: fileContent };
}

function writeToFile(file, data) {
    console.log(`Writing to file: ${file.filename}`);
    file.content += data;
    console.log(data); // Simulate the file logging process
}
