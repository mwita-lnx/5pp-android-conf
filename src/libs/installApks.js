const { exec } = require("child_process");

// Use the adbpath already defined in renderer.js (works for both Windows and Linux)
const adbExecutablePath = adbpath;

// Define the list of permissions
const generalPermissions = [
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.CAMERA",
  "android.permission.READ_CONTACTS",
  "android.permission.WRITE_CONTACTS",
  "android.permission.GET_ACCOUNTS",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.INTERNET",
  "android.permission.READ_PHONE_STATE",
  "android.permission.CALL_PHONE",
  "android.permission.READ_CALL_LOG",
  "android.permission.WRITE_CALL_LOG",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  "android.permission.VIBRATE",
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.WAKE_LOCK",
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.CHANGE_NETWORK_STATE",
  "android.permission.ACCESS_WIFI_STATE",
  "android.permission.CHANGE_WIFI_STATE",
  "android.permission.BLUETOOTH",
  "android.permission.BLUETOOTH_ADMIN",
  "android.permission.NFC",
  "android.permission.USE_FINGERPRINT",
  "android.permission.USE_BIOMETRIC",
];

// Load APK configuration
async function loadApks() {
  const apkDict = await ipcRenderer.invoke("getApks");
  return apkDict;
}

// Function to grant permissions to a single device
async function grantPermissions(deviceId) {
  try {
    for (const permission of generalPermissions) {
      await client.shell(deviceId, `pm grant ${permission}`);
      console.log(`Permission ${permission} granted on device ${deviceId}`);
      terminal(`Permission ${permission} granted on device ${deviceId}`);
    }
  } catch (error) {
    console.error(`Failed to grant permissions on device ${deviceId}:`, error);
    terminal(`Failed to grant permissions on device ${deviceId}: ${error}`);
  }
}

// Function to install APKs on a single device
async function installApksOnDevice(deviceId, apkObject) {
  try {
    // Ensure deviceId is a string
    const deviceIdString =
      typeof deviceId === "string" ? deviceId : deviceId.id;

    // Grant permissions before installing APKs
    await grantPermissions(deviceIdString);

    for (const [name, apkData] of Object.entries(apkObject)) {
      if (apkData.checked) {
        if (apkData.path.length > 1) {
          // If there are multiple APKs (including split APKs)
          // Convert relative paths to absolute paths
          const absolutePaths = apkData.path.map(p => {
            if (p.startsWith('/') || p.match(/^[A-Z]:/)) return p; // Already absolute
            return path.join(__dirname, p); // Make relative paths absolute
          });

          const adbCommand = [
            `"${adbExecutablePath}"`,
            "-s",
            deviceIdString,
            "install-multiple",
            ...absolutePaths.map(p => `"${p}"`), // Quote paths for spaces
          ].join(" ");
          console.log(`Executing command: ${adbCommand}`);

          exec(adbCommand, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error executing command: ${error.message}`);
              terminal(`Error executing command: ${error.message}`);
              return;
            }

            if (stderr) {
              console.error(`stderr: ${stderr}`);
              terminal(`stderr: ${stderr}`);
              return;
            }

            console.log(`stdout: ${stdout}`);
            terminal(`stdout: ${stdout}`);
          });

          console.log(
            `Successfully installed APKs for ${name} on device ${deviceIdString}`
          );
          terminal(
            `Successfully installed APKs for ${name} on device ${deviceIdString}`
          );
        } else {
          // If there's only one APK
          // Convert relative path to absolute
          let apkPath = apkData.path[0];
          if (!apkPath.startsWith('/') && !apkPath.match(/^[A-Z]:/)) {
            apkPath = path.join(__dirname, apkPath);
          }

          console.log(`Installing main APK ${name} from ${apkPath}`);
          await client.install(deviceIdString, apkPath);
          console.log(
            `Successfully installed ${name} from ${apkData.path[0]} on device ${deviceIdString}`
          );
          terminal(
            `Successfully installed ${name} from ${apkData.path[0]} on device ${deviceIdString}`
          );
        }
      } else {
        console.log(`Skipping installation of ${name}, not checked.`);
        terminal(`Skipping installation of ${name}, not checked.`);
      }
    }
  } catch (error) {
    console.error(`Failed to install APKs on device ${deviceId}:`, error);
    terminal(`Failed to install APKs on device ${deviceId}: ${error}`);
  }
}

// Function to install APKs on all connected devices concurrently
async function installApks() {
  try {
    const apkDict = await loadApks();
    const devices = await client.listDevices();

    // Ensure devices is an array of device IDs
    const deviceIds = devices.map((device) =>
      typeof device === "string" ? device : device.id
    );

    // Map each device to an installation promise
    const installPromises = deviceIds.map((deviceId) => {
      return installApksOnDevice(deviceId, apkDict);
    });

    // Execute all installation promises concurrently
    await Promise.all(installPromises);
    console.log("APK installation completed on all devices.");
    Alert.success('APK installation completed on all devices.','Success',{displayDuration: 3000, pos: 'top'})
    terminal("APK installation completed on all devices.");
  } catch (error) {
    console.error("Failed to install APKs:", error);
    terminal(`Failed to install APKs: ${error}`);
    Alert.error(`Failed to install APKs: ${error}`,'',{displayDuration: 0})
  }
}

// DOM loaded event
document.addEventListener("DOMContentLoaded", async () => {
  const installApksBtn = document.getElementById("installApks");
  installApksBtn.addEventListener("click", installApks);
});
