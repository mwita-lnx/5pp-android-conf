
let csvFilename, vcfFilename;

document.getElementById('selectCSV').addEventListener('click', async () => {
    csvFilename = await ipcRenderer.invoke('select-csv');
    document.getElementById('status').textContent = csvFilename ? `Selected: ${csvFilename}` : 'No file selected';
});

document.getElementById('convertToVCF').addEventListener('click', async () => {
   
    if (!csvFilename) {
        alert('Please select a CSV file first');
        return;
    }
    vcfFilename = await ipcRenderer.invoke('save-vcf');
    const countryCode = document.getElementById('countryCode').value;
    if (vcfFilename) {
       
        const result = await ipcRenderer.invoke('convert', csvFilename, vcfFilename, countryCode);
        document.getElementById('status').textContent = result.message;
        terminal(result.message);
    }
});

// Get country code when the app starts
const modalcontacts = document.getElementById('modalcontacts');
const openContactsBtn = document.getElementById('openContactsBtn');


openContactsBtn.addEventListener('click', () => {
    modalcontacts.style.display = 'block';  // Ensure modal is shown as block
    loadApks();
});

let checckVcf = document.getElementById('checkbox-vcf');
async function loadVcfs() {
    vcflist = await ipcRenderer.invoke('get-contact-vcfs');
    checckVcf.innerHTML = vcflist.map(vcfName => `
        <label>
            <input type="checkbox" data-path="${''}" 'checked'}>
            ${vcfName}
        </label>
    `).join('');
    return vcflist;
}


async function uploadVcfsToDevices() {
    // Request the main process to open the file dialog
    const selectedVcf = await ipcRenderer.invoke('select-vcf');

    // Check if the user canceled the dialog or selected a file
    if (!selectedVcf) {
        alert('Please select a VCF file');
        return;
    }

    // List the connected devices
    const devices = await client.listDevices();
    if (devices.length === 0) {
        alert('No devices connected');
        return;
    }

    try {
        // Run the upload task concurrently for each device
        const uploadTasks = devices.map(device => {
            terminal(`Uploading ${selectedVcf} to device: ${device.id}`);
            return new Promise(async (resolve, reject) => {
                try {
                    const vcfFileName = selectedVcf.split('\\').pop() // Get just the filename
                    console.log(vcfFileName)
                    const destinationPath = `/storage/emulated/0/Download/${vcfFileName}`; // Set the destination path

                    const stream = await client.push(device.id, selectedVcf, destinationPath);
                    stream.on('end', () => {
                        console.log(`Uploaded ${vcfFileName} to device: ${device.id}`);
                        terminal(`Uploaded ${vcfFileName} to device: ${device.id}`);
                        resolve();
                    });

                    stream.on('error', (err) => {
                        console.error(`Failed to upload to device ${device.id}:`, err);
                        terminal(`Failed to upload to device ${device.id}: ${err}`);
                        reject(err);
                    });

                } catch (err) {
                    console.error(`Failed to upload to device ${device.id}:`, err);
                    terminal(`Failed to upload to device ${device.id}: ${err}`);
                    reject(err);
                }
            });
        });

        // Wait for all uploads to complete
        await Promise.all(uploadTasks);
        
        terminal('VCF file uploaded successfully to all devices.');
        Alert.success('VCF file uploaded successfully to all devices.','Success',{displayDuration: 3000, pos: 'top'})
    } catch (error) {
        console.error('Failed to upload VCF file:', error);
        Alert.error(`An error occurred during the upload process.`,'',{displayDuration: 0})
        terminal('An error occurred during the upload process.');
    }
}

// Trigger the function on button click
document.querySelector('#uploadcontactsbtn').addEventListener('click', uploadVcfsToDevices);



window.addEventListener('click', (event) => {
    if (event.target === modalcontacts) {
        modalcontacts.style.display = 'none';
    }
});

loadVcfs();