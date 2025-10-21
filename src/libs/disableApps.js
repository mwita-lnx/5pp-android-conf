
// Logs array to store the results
let logs = [];

// Function to load disabled apps dynamically from Electron's ipcRenderer
async function loadDisabledApps() {
    const disabledApps = await ipcRenderer.invoke('getDisabledApps');
    terminal('Disabled apps loaded successfully.');

    return disabledApps;
}

// Function to disable a package on a specific device using client.shell
async function disablePackage(client, serial, packageName) {
    return new Promise((resolve, reject) => {
        console.log(`Disabling ${packageName} on device ${serial}...`);
        terminal(`Disabling ${packageName} on device ${serial}...`);
        
        // Run shell command on the specific device using its serial number
        client.shell(serial, `pm disable-user --user 0 ${packageName}`, (err, output) => {
            if (err) {
                const errMsg = `Device ${serial} - ${packageName} generated an exception: ${err.message}`;
                logs.push(errMsg);
                terminal(errMsg);
                reject(errMsg);
            } else {
                let result = '';
                output.on('data', (data) => {
                    result += data.toString();
                });
                output.on('end', () => {
                    const outputMsg = `Device ${serial} - ${packageName}: ${result.trim()}`;
                    logs.push(outputMsg);
                    terminal(outputMsg);
                    resolve(outputMsg);
                });
            }
        });
    });
}

// Function to disable packages concurrently for a specific device
async function disablePackagesForDevice(client, serial, packages) {
    const promises = packages.map((packageName) => disablePackage(client, serial, packageName));
    await Promise.all(promises); // Disable packages concurrently for a single device
}

// Function to handle multiple devices concurrently
async function disablePackagesOnMultipleDevices(client, devices, packages) {
    const promises = devices.map((device) => disablePackagesForDevice(client, device.id, packages));
    await Promise.all(promises); // Disable packages concurrently on multiple devices
}

// disable function
async function disable() {
    try {
        // Initialize ADB client
    

        // List all connected devices
        const devices = await client.listDevices();
        if (devices.length === 0) {
            terminal("No devices connected.");
            return;
        }

        // Load packages to disable dynamically via ipcRenderer
        const packages = await loadDisabledApps();

        // Disable packages concurrently on all devices
        await disablePackagesOnMultipleDevices(client, devices, packages);

        // Log final message
        terminal("Packages disabled successfully on all devices.");
        Alert.success('Packages disabled successfully on all devices.','Success',{displayDuration: 3000, pos: 'top'})
        logs.forEach(log => terminal(log));
    } catch (error) {
        terminal(`An error occurred: ${error.message}`);
        Alert.error(`An error occurred: ${error.message}`,'',{displayDuration: 0})
    }
}

// Mock terminal function for logging to the terminal


// Ensure DOM is fully loaded before adding the event listener
document.addEventListener('DOMContentLoaded', () => {
    const disableAppsBtn = document.getElementById('disableApps');
    
    // Check if button exists before adding event listener
    if (disableAppsBtn) {
        disableAppsBtn.addEventListener('click', disable);
    } else {
        console.error('Button "disableApps" not found in the DOM.');
    }
});
