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

  mainWindow.loadFile("screens/index.html");

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

  // Get all templates
  ipcMain.handle('getTemplates', async () => {
    try {
      const templatesPath = path.join(__dirname, 'models', 'templates.json');
      const templatesData = fs.readFileSync(templatesPath, 'utf-8');
      return JSON.parse(templatesData);
    } catch (error) {
      console.error('Error reading templates:', error);
      return { templates: [] };
    }
  });

  // Save new template
  ipcMain.handle('saveTemplate', async (event, template) => {
    try {
      const templatesPath = path.join(__dirname, 'models', 'templates.json');
      const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));

      // Generate ID if not provided
      if (!template.id) {
        template.id = template.name.toLowerCase().replace(/\s+/g, '-');
      }

      // Check if template exists
      const existingIndex = templatesData.templates.findIndex(t => t.id === template.id);

      if (existingIndex >= 0) {
        templatesData.templates[existingIndex] = template;
      } else {
        templatesData.templates.push(template);
      }

      fs.writeFileSync(templatesPath, JSON.stringify(templatesData, null, 2), 'utf-8');
      return { success: true, templates: templatesData.templates };
    } catch (error) {
      console.error('Error saving template:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete template
  ipcMain.handle('deleteTemplate', async (event, templateId) => {
    try {
      const templatesPath = path.join(__dirname, 'models', 'templates.json');
      const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));

      templatesData.templates = templatesData.templates.filter(t => t.id !== templateId);

      fs.writeFileSync(templatesPath, JSON.stringify(templatesData, null, 2), 'utf-8');
      return { success: true, templates: templatesData.templates };
    } catch (error) {
      console.error('Error deleting template:', error);
      return { success: false, error: error.message };
    }
  });

  // Set default template
  ipcMain.handle('setDefaultTemplate', async (event, templateId) => {
    try {
      const templatesPath = path.join(__dirname, 'models', 'templates.json');
      const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));

      // Remove isDefault from all templates
      templatesData.templates.forEach(t => {
        t.isDefault = false;
      });

      // Set the selected template as default
      const template = templatesData.templates.find(t => t.id === templateId);
      if (template) {
        template.isDefault = true;
      }

      fs.writeFileSync(templatesPath, JSON.stringify(templatesData, null, 2), 'utf-8');
      return { success: true, templates: templatesData.templates };
    } catch (error) {
      console.error('Error setting default template:', error);
      return { success: false, error: error.message };
    }
  });

  // Import template from CSV
  ipcMain.handle('importTemplateFromCsv', async (event, csvFilePath) => {
    return new Promise((resolve, reject) => {
      const packages = [];
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          // Check if the action is "disable"
          if (row.Action && row.Action.toLowerCase() === 'disable' && row['Package Name']) {
            packages.push(row['Package Name'].trim());
          }
        })
        .on('end', () => {
          // Create template name from file name
          const fileName = path.basename(csvFilePath, '.csv');
          const templateName = fileName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

          resolve({
            success: true,
            template: {
              name: templateName,
              description: `Imported from ${path.basename(csvFilePath)}`,
              apps: packages
            }
          });
        })
        .on('error', (error) => {
          reject({ success: false, error: error.message });
        });
    });
  });

  // Export template to CSV
  ipcMain.handle('exportTemplateToCsv', async (event, template, csvFilePath) => {
    try {
      // Create CSV content
      let csvContent = 'Action,Package Name\n';
      template.apps.forEach(packageName => {
        csvContent += `disable,${packageName}\n`;
      });

      // Write to file
      fs.writeFileSync(csvFilePath, csvContent, 'utf-8');

      return { success: true, message: `Template exported to ${csvFilePath}` };
    } catch (error) {
      console.error('Error exporting template to CSV:', error);
      return { success: false, error: error.message };
    }
  });

  // Select CSV file dialog
  ipcMain.handle('selectCsvFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Save CSV file dialog
  ipcMain.handle('saveCsvFile', async (event, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName || 'template.csv',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    return result.canceled ? null : result.filePath;
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
      // Load from default template
      const templatesPath = path.join(__dirname, 'models', 'templates.json');

      if (!fs.existsSync(templatesPath)) {
        console.log('No templates file found, returning empty array');
        return [];
      }

      const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));

      // Find the default template - look for isDefault flag first
      let defaultTemplate = templatesData.templates.find(t => t.isDefault === true);

      // Fallback: look for 'default' or 'sup-disable' ID, or use first template
      if (!defaultTemplate) {
        defaultTemplate = templatesData.templates.find(t => t.id === 'default');
      }

      if (!defaultTemplate) {
        defaultTemplate = templatesData.templates.find(t => t.id === 'sup-disable');
      }

      if (!defaultTemplate && templatesData.templates.length > 0) {
        defaultTemplate = templatesData.templates[0];
      }

      if (!defaultTemplate) {
        console.log('No templates found, returning empty array');
        return [];
      }

      console.log(`Using template "${defaultTemplate.name}" with ${defaultTemplate.apps.length} apps`);
      return defaultTemplate.apps;
  } catch (error) {
      console.error('Error reading packages from default template:', error);
      throw error;
  }
});

// Get installed apps from device
ipcMain.handle('getInstalledApps', async (event, serial) => {
  const adbkit = require('adbkit');
  const client = adbkit.createClient();

  try {
    let devices = await client.listDevices();

    if (devices.length === 0) {
      throw new Error('No devices connected');
    }

    // Use first device if no serial specified
    const deviceSerial = serial || devices[0].id;

    // Get packages using shell command
    return new Promise((resolve, reject) => {
      client.shell(deviceSerial, 'pm list packages', (err, output) => {
        if (err) {
          reject(err);
          return;
        }

        let result = '';
        output.on('data', (data) => {
          result += data.toString();
        });

        output.on('end', () => {
          // Parse package list
          const packages = result
            .split('\n')
            .filter(line => line.startsWith('package:'))
            .map(line => line.replace('package:', '').trim())
            .filter(pkg => pkg.length > 0);

          resolve(packages);
        });
      });
    });
  } catch (error) {
    console.error('Error getting installed apps:', error);
    throw error;
  }
});

// Get disabled apps from device
ipcMain.handle('getDeviceDisabledApps', async (event, serial) => {
  const adbkit = require('adbkit');
  const client = adbkit.createClient();

  try {
    let devices = await client.listDevices();

    if (devices.length === 0) {
      throw new Error('No devices connected');
    }

    // Use first device if no serial specified
    const deviceSerial = serial || devices[0].id;

    // Get disabled packages using shell command
    return new Promise((resolve, reject) => {
      client.shell(deviceSerial, 'pm list packages -d', (err, output) => {
        if (err) {
          reject(err);
          return;
        }

        let result = '';
        output.on('data', (data) => {
          result += data.toString();
        });

        output.on('end', () => {
          // Parse disabled package list
          const packages = result
            .split('\n')
            .filter(line => line.startsWith('package:'))
            .map(line => line.replace('package:', '').trim())
            .filter(pkg => pkg.length > 0);

          resolve(packages);
        });
      });
    });
  } catch (error) {
    console.error('Error getting disabled apps:', error);
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
  try {
    const vcfDirectory = path.join(__dirname, 'src', 'vcf');

    // Check if directory exists, if not create it
    if (!fs.existsSync(vcfDirectory)) {
      fs.mkdirSync(vcfDirectory, { recursive: true });
      return []; // Return empty array for new directory
    }

    const vcfFiles = fs.readdirSync(vcfDirectory);
    return vcfFiles;
  } catch (error) {
    console.error('Error reading VCF files:', error);
    return []; // Return empty array on error instead of throwing
  }
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
