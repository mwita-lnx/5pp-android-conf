const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const csv = require('csv-parser');
const { exec } = require('child_process');



// Function to execute the ADB setup script (Windows only)
const isWindows = process.platform === 'win32';

function executeAdbSetupScript() {
    // Skip script execution on Linux - ADB is already in platform-tools
    if (!isWindows) {
        console.log('Linux platform detected. ADB available in platform-tools/adb');
        return;
    }

    const scriptPath = path.join(__dirname, 'adb.bat');
    exec(scriptPath, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing ADB setup script: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}

// Execute the ADB setup script
executeAdbSetupScript();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true, // Enable Node.js integration
      contextIsolation: false, // Disable context isolation
      enableRemoteModule: false,
      webSecurity: false,
    },
  });

  mainWindow.loadFile("index.html");

  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();
}
app.whenReady().then(() => {
  createWindow();

  // Define the directory and file path
  const apkDirectory = path.join(__dirname, "src/json");
  const apkFilePath = path.join(apkDirectory, "apks.json");
  const csvFilePath = path.join(__dirname, "src/csv/sup_disable.csv");

  // Ensure the directory exists, if not, create it
  function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  // Ensure the file exists, if not, create it
  function ensureFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf-8"); // Write an empty array if file doesn't exist
    }
  }

  // IPC Handlers
  ipcMain.handle("getApks", async () => {
    // Ensure directory and file exist
    ensureDirectoryExists(apkDirectory);
    ensureFileExists(apkFilePath);
    console.log(JSON.parse(fs.readFileSync(apkFilePath, "utf-8")));
    // Load APKs from file
    return JSON.parse(fs.readFileSync(apkFilePath, "utf-8"));
  });

  ipcMain.handle("updateApks", async (event, updatedApks) => {
    // Ensure directory and file exist
    ensureDirectoryExists(apkDirectory);
    ensureFileExists(apkFilePath);

    // Read existing APKs from the file
    let currentApks = {};
    try {
      const fileContent = fs.readFileSync(apkFilePath, "utf-8");
      currentApks = JSON.parse(fileContent); // Parse existing JSON content
    } catch (err) {
      console.error("Error reading APK file:", err);
    }

   

    // Merge the existing APKs with the updated APKs
    const mergedApks = { ...currentApks, ...updatedApks };

    // Save the merged APKs back to the file
    fs.writeFileSync(apkFilePath, JSON.stringify(mergedApks, null, 2), "utf-8");

    console.log("APKs updated:", mergedApks);
  });

  ipcMain.handle("delete-apk", async (event, apkName) => {
    // Ensure directory and file exist
    ensureDirectoryExists(apkDirectory);
    ensureFileExists(apkFilePath);

    // Read existing APKs from the file
    let currentApks = {};
    try {
      const fileContent = fs.readFileSync(apkFilePath, "utf-8");
      currentApks = JSON.parse(fileContent);
      delete currentApks[apkName]; // Parse existing JSON content
    } catch (err) {
      console.error("Error reading APK file:", err);
    }

   

    // Merge the existing APKs with the updated APKs
    const mergedApks = currentApks

    // Save the merged APKs back to the file
    fs.writeFileSync(apkFilePath, JSON.stringify(mergedApks, null, 2), "utf-8");

    console.log("APKs updated:", mergedApks);
  });



  ipcMain.handle("openFileDialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile", "multiSelections"], // Enable multiple selections
      filters: [{ name: "APK Files", extensions: ["apk"] }],
    });
    return result.filePaths;
  });
});

function readPackagesFromCsv(filePath) {
  return new Promise((resolve, reject) => {
      const packages = [];
      fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
              // Check if the action is "disable"
              if (row.Action === 'disable') {
                  packages.push(row['Package Name']);
              }
          })
          .on('end', () => {
              resolve(packages);
          })
          .on('error', (error) => {
              reject(error);
          });
  });
}

// Listen for 'getDisabledApps' event from renderer process
ipcMain.handle('getDisabledApps', async () => {
  try {
      // Update with your actual CSV file path
      const csvFilePath = path.join(__dirname, 'src','csv','sup_disable.csv');
      const packages = await readPackagesFromCsv(csvFilePath);
      console.log('Packages:', packages)
      return packages;
  } catch (error) {
      console.error('Error reading packages from CSV:', error);
      throw error;
  }
});



function addCountryCode(phoneNumber,countryCode) {
  return phoneNumber.startsWith(countryCode) ? phoneNumber : `${countryCode}${phoneNumber}`;
}

async function createVCF(csvFilename, vcfFilename,countryCode) {
  console.log(countryCode,csvFilename,vcfFilename)
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(vcfFilename);
    fs.createReadStream(csvFilename)
      .pipe(csv())
      .on('data', (row) => {
        const name = row[Object.keys(row)[0]];
        const phone = row[Object.keys(row)[1]];
        const phoneWithCountryCode = addCountryCode(phone,countryCode);
        const vcfData = `BEGIN:VCARD\nVERSION:3.0\nN:${name}\nTEL;TYPE=CELL:${phoneWithCountryCode}\nEND:VCARD\n`;
        writeStream.write(vcfData);
      })
      .on('end', () => {
        writeStream.end();
        resolve();
      })
      .on('error', reject);
  });
}

ipcMain.handle('select-csv', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-vcf', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'VCF Files', extensions: ['vcf'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-contact-vcfs', async () => {
  const vcfDirectory = path.join(__dirname, 'src', 'vcf');
  const vcfFiles = fs.readdirSync(vcfDirectory);
  return vcfFiles;
});

ipcMain.handle('save-vcf', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'VCF Files', extensions: ['vcf'] }]
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('convert', async (event, csvFilename, vcfFilename,countryCode) => {
  try {
    const savepath = vcfFilename
    await createVCF(csvFilename, savepath,countryCode);
    return { success: true, message: `VCF file created successfully: ${savepath}` };
  } catch (error) {
    return { success: false, message: `An error occurred: ${error.message}` };
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
