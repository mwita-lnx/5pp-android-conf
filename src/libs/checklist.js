const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', async () => {
    var modal = document.getElementById('modal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const checkboxGroup = document.getElementById('checkbox-group');
    const addApkBtn = document.getElementById('addApkBtn');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const apkNameInput = document.getElementById('apkNameInput');

    // Dictionary to store APKs
    let apkDict = {};

    // Load APKs from the main process and display them
    async function loadApks() {
        apkDict = await ipcRenderer.invoke('getApks');
        console.log(apkDict);
        checkboxGroup.innerHTML = Object.keys(apkDict).map(apkName => `
            <div class="apk-item">
                <label>
                    <input type="checkbox" data-name="${apkName}" ${apkDict[apkName].checked ? 'checked' : ''}>
                    ${apkName} - Paths: ${apkDict[apkName].path.join(', ')}
                </label>
                <button class="delete-btn" data-name="${apkName}">Delete</button>
            </div>
        `).join('');

    }

    async function deleteApk(apkName) {
        
        await ipcRenderer.invoke('delete-apk',apkName);
        loadApks(); // Refresh the APK list
    }

    // Event listener for the delete button (event delegation)
    checkboxGroup.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const apkName = event.target.getAttribute('data-name');
            deleteApk(apkName);
        }
    });

    // Save APKs to the main process
    async function saveApks() {
        const updatedApkDict = { ...apkDict }; // Create a copy of the current APK dictionary
        const appName = document.getElementById('apkNameInput').value;
        const appPaths = await addApk(); // Get paths from file dialog

        if (appName && appPaths.length > 0) {
            updatedApkDict[appName] = { path: appPaths, checked: true };
        }

        console.log(updatedApkDict);
        await ipcRenderer.invoke('updateApks', updatedApkDict);
    }

    // Open file dialog and add APK paths (supports multiple APK files)
    async function addApk() {
        const filePaths = await ipcRenderer.invoke('openFileDialog');
        return filePaths;  // Return all selected APK file paths
    }

    

    // Event listeners for modal and button actions
    openModalBtn.addEventListener('click', () => {
        modal.style.display = 'block';  // Ensure modal is shown as block
        loadApks();
    });

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    saveChangesBtn.addEventListener('click', () => {
        saveApks();
        modal.style.display = 'none';
    });

    // Handle delete button clicks
    checkboxGroup.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const apkName = event.target.getAttribute('data-name');
            deleteApk(apkName);
        }
    });

});
