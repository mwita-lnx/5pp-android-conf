const adb = require("adbkit");
const path = require("path");
const { execFile } = require("child_process");

// Setup ADB client with Linux binary
const adbPath = path.join(__dirname, "platform-tools", "adb");
const client = adb.createClient({ bin: adbPath });

console.log("ADB Path:", adbPath);
console.log("Starting APK installation test...\n");

async function installApks() {
  try {
    // Get list of devices
    const devices = await client.listDevices();
    console.log(`Found ${devices.length} device(s):`);
    devices.forEach(device => {
      console.log(`  - ${device.id} (${device.type})`);
    });

    if (devices.length === 0) {
      console.log("No devices connected. Please connect a device and try again.");
      return;
    }

    const deviceId = devices[0].id;
    console.log(`\nUsing device: ${deviceId}\n`);

    // Test 1: Install split APKs (echis)
    console.log("=== Test 1: Installing split APKs (echis) ===");
    const splitApks = [
      path.join(__dirname, "src/apks/base.apk"),
      path.join(__dirname, "src/apks/split_config.xxhdpi.apk")
    ];

    console.log("APKs to install:");
    splitApks.forEach(apk => console.log(`  - ${apk}`));

    const args1 = ["-s", deviceId, "install-multiple", ...splitApks];
    console.log(`\nExecuting: ${adbPath} ${args1.join(" ")}\n`);

    await new Promise((resolve, reject) => {
      execFile(adbPath, args1, (error, stdout, stderr) => {
        if (error) {
          console.error("Error:", error.message);
          reject(error);
        } else {
          console.log("Output:", stdout);
          if (stderr) console.log("Stderr:", stderr);
          console.log("✓ Split APKs installed successfully!\n");
          resolve();
        }
      });
    });

    // Test 2: Install single APK (WhatsApp)
    console.log("=== Test 2: Installing single APK (WhatsApp) ===");
    const whatsappApk = path.join(__dirname, "src/apks/WhatsApp Messenger_2.24.9.20_Apkpure.apk");

    console.log("APK to install:");
    console.log(`  - ${whatsappApk}`);
    console.log(`\nUsing adbkit client.install()\n`);

    await client.install(deviceId, whatsappApk);
    console.log("✓ WhatsApp installed successfully!\n");

    // Test 3: Grant permissions
    console.log("=== Test 3: Granting permissions ===");
    const testPermissions = [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.CAMERA"
    ];

    for (const permission of testPermissions) {
      try {
        const result = await client.shell(deviceId, `pm grant com.whatsapp ${permission}`);
        console.log(`✓ Granted: ${permission}`);

        // Consume the stream
        result.on('data', () => {});
        await new Promise((resolve) => result.on('end', resolve));
      } catch (error) {
        console.log(`⚠ Could not grant ${permission}: ${error.message}`);
      }
    }

    console.log("\n=== All tests completed successfully! ===");

  } catch (error) {
    console.error("\n❌ Error during installation:", error);
    process.exit(1);
  }
}

// Run the installation
installApks();
