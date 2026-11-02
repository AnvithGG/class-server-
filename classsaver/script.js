// Replace this with your ESP32 IP from Serial Monitor
const ESP32_URL = "http://192.168.1.100";

async function updateDashboard() {
  try {
    const response = await fetch(`${ESP32_URL}/api/telemetry`);
    if (!response.ok) throw new Error("ESP32 connection failed");

    const data = await response.json();

    console.log("ESP32 data:", data);

    // Use these values to update your dashboard
    // Example: data.temperature, data.humidity
    // Match the property names to your ESP32 JSON response.

  } catch (error) {
    console.error("ESP32 connection error:", error);
  }
}

setInterval(updateDashboard, 2000);
updateDashboard();