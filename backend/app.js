// Function to handle the login and API request
document.getElementById("loginBtn").addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Please enter both username and password.");
    return;
  }

  const loginResponse = await loginUser(username, password);
  if (loginResponse.status === "OK") {
    const token = loginResponse.data.token;
    document.getElementById("statusMessage").textContent = "Login successful!";
    document.getElementById("statusMessage").classList.remove("status-error");
    document.getElementById("statusMessage").classList.add("status-success");
    startDeviceDataLogging(token);
  } else {
    document.getElementById("statusMessage").textContent = "Login failed. Please try again.";
    document.getElementById("statusMessage").classList.remove("status-success");
    document.getElementById("statusMessage").classList.add("status-error");
  }
});

// Login function to authenticate the user
async function loginUser(username, password) {
  const url = 'https://public-api.cloud.meater.com/v1/login';
  const payload = {
    email: username,
    password: password,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error during login:", error);
    return { status: "Error" };
  }
}

// Function to start the process of logging device data
async function startDeviceDataLogging(token) {
  const deviceDataDiv = document.getElementById("deviceData");
  const deviceID = await getDeviceID(token);

  if (!deviceID) {
    deviceDataDiv.textContent = "No device found.";
    return;
  }

  let fileIndex = 1;
  const filename = `data${fileIndex}.dat`;
  const newFile = createFile(filename);
  const timestamp = new Date().toISOString();

  // Write headers to the file
  writeToFile(newFile, `${timestamp}\nElapsed Time, Internal, External\n`);

  // Start logging data every 60 seconds
  setInterval(async () => {
    const deviceData = await fetchDeviceData(token, deviceID);

    if (deviceData) {
      const elapsedTime = Math.floor((Date.now() - new Date(timestamp)) / 1000); // elapsed time in seconds
      const internalTemp = deviceData.temperature.internal || "N/A";
      const externalTemp = deviceData.temperature.ambient || "N/A";

      const logData = `${elapsedTime}, ${internalTemp}, ${externalTemp}\n`;
      writeToFile(newFile, logData);
    }
  }, 10000); // Log every 60 seconds
}

// Function to get device ID
async function getDeviceID(token) {
  const url = 'https://public-api.cloud.meater.com/v1/devices';
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (data.status === "OK" && data.data.devices.length > 0) {
      return data.data.devices[0].id; // Get the first device ID
    }
    return null;
  } catch (error) {
    console.error("Error fetching devices:", error);
    return null;
  }
}

// Function to fetch device data
async function fetchDeviceData(token, deviceID) {
  const url = `https://public-api.cloud.meater.com/v1/devices/${deviceID}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data.status === "OK" ? data.data : null;
  } catch (error) {
    console.error("Error fetching device data:", error);
    return null;
  }
}

// Function to create a new file (simulated in the browser)
function createFile(filename) {
  const fileContent = "";
  return { filename, content: fileContent };
}

// Function to write data to the file (simulated in the browser)
function writeToFile(file, data) {
  console.log(`Writing to file: ${file.filename}`);
  file.content += data; // Append new data to the content of the file
  console.log(data); // Simulate the file logging process
}
