const adb = require("adbkit");
const path = require("path");

// Detect platform and set correct ADB path
const isWindows = process.platform === 'win32';
const adb_path = isWindows ? path.join("platform-tools", "adb.exe") : path.join("platform-tools", "adb");

const adbpath = path.join(__dirname, adb_path);
console.log(`ADB path: ${adbpath}`);
const client = adb.createClient({ bin: adbpath });


let jsonObject = {};

// These elements only exist on manage-apps.html, check before adding listeners
const openJsonDisable = document.getElementById('openJsonDisable');
const jsonModal = document.getElementById('jsonModal');
const closeModalBtn = document.getElementById('closeModalBtn');

if (openJsonDisable && jsonModal) {
  // Open the modal
  openJsonDisable.addEventListener('click', function() {
    jsonModal.style.display = 'block';
  });
}

if (closeModalBtn && jsonModal) {
  // Close the modal when the close button is clicked
  closeModalBtn.addEventListener('click', function() {
    jsonModal.style.display = 'none';
  });
}

// Close the modal if the user clicks outside of it
if (jsonModal) {
  window.onclick = function(event) {
    if (event.target == jsonModal) {
      jsonModal.style.display = 'none';
    }
  };
}

// Add a key-value pair to the JSON object
function addKeyValue() {
  const key = document.getElementById('key').value;
  const value = document.getElementById('value').value;

  if (key === "" || value === "") {
    alert("Both key and value must be filled!");
    return;
  }

  jsonObject[key] = value;

  updateJsonOutput();
  clearInputFields();
}

// Update the JSON output area
function updateJsonOutput() {
  const jsonOutput = document.getElementById('json-output');
  jsonOutput.value = JSON.stringify(jsonObject, null, 2);
}

// Clear the input fields
function clearInputFields() {
  document.getElementById('key').value = "";
  document.getElementById('value').value = "";
}

// Clear the JSON object and update the output
function clearJson() {
  jsonObject = {};
  updateJsonOutput();
}





var Alert = undefined;

(function(Alert) {
  var alert, error, info, success, warning, _container;
  info = function(message, title, options) {
    return alert("info", message, title, "icon-info-sign", options);
  };
  warning = function(message, title, options) {
    return alert("warning", message, title, "icon-warning-sign", options);
  };
  error = function(message, title, options) {
    return alert("error", message, title, "icon-minus-sign", options);
  };
  success = function(message, title, options) {
    return alert("success", message, title, "icon-ok-sign", options);
  };
  alert = function(type, message, title, icon, options) {
    var alertElem, messageElem, titleElem, iconElem, innerElem, _container;
    if (typeof options === "undefined") {
      options = {};
    }
    options = $.extend({}, Alert.defaults, options);
    if (!_container) {
      _container = $("#alerts");
      if (_container.length === 0) {
        _container = $("<ul>").attr("id", "alerts").appendTo($("body"));
      }
    }
    if (options.width) {
      _container.css({
        width: options.width
      });
    }
      alertElem = $("<li>").addClass("alert").addClass("alert-" + type);
      setTimeout(function() {
         alertElem.addClass('open');
      }, 1);
    if (icon) {
      iconElem = $("<i>").addClass(icon);
      alertElem.append(iconElem);
    }
    innerElem = $("<div>").addClass("alert-block");
    alertElem.append(innerElem);
    if (title) {
      titleElem = $("<div>").addClass("alert-title").append(title);
      innerElem.append(titleElem);
    }
    if (message) {
      messageElem = $("<div>").addClass("alert-message").append(message);
      innerElem.append(messageElem);
    }
    if (options.displayDuration > 0) {
      setTimeout((function() {
        leave();
      }), options.displayDuration);
    } else {
      innerElem.append("<em>Click to Dismiss</em>");
    }
    alertElem.on("click", function() {
      leave();
    });
     function leave() {
         alertElem.removeClass('open');
          alertElem.one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',  function() { return alertElem.remove(); });
    }
    return _container.prepend(alertElem);
  };
  Alert.defaults = {
    width: "",
    icon: "",
    displayDuration: 3000,
    pos: ""
  };
  Alert.info = info;
  Alert.warning = warning;
  Alert.error = error;
  Alert.success = success;
  return _container = void 0;
    
   
})(Alert || (Alert = {}));

this.Alert = Alert;

$('#test').on('click', function() {
  Alert.info('Message');
  });

function terminal(message) {
  const terminalBody = document.getElementById("terminal-body");
  const term = document.getElementById("terminal"); 
  const newLine = document.createElement("div");
  newLine.innerHTML = `<div class="prompt">${message}</div>`;
  terminalBody.appendChild(newLine);

  // Scroll to the bottom of the terminal
  term.scrollTop = term.scrollHeight;
}

const POLL_INTERVAL = 3000; // Poll every 3 seconds

let currentDevices = new Set(); // Maintain a set of currently connected devices

// Function to render or update a device card dynamically
function addOrUpdateDevice(device) {
  const deviceList = document.getElementById("device-list");

  // Check if the device is already listed in the DOM
  let existingDeviceElement = document.getElementById(`device-${device.id}`);

  const deviceCard = `
    <div class="card ${device.authorized ? "green" : "red"}">
      <span>${device.manufacturer} ${device.model}</span>
      <span>${device.id}</span>
    </div>
    <div class="device-details">
      <h3>${device.authorized ? "Authorized" : "Unauthorized"}</h3>
      <div>
        <span>ID: ${device.id}</span>
        <span>Version: ${device.version}</span>
        <button class="icon-button">
          <i class="ph-caret-right-bold"></i>
        </button>
      </div>
    </div>
  `;

  if (existingDeviceElement) {
    // Update the existing device card
    existingDeviceElement.innerHTML = deviceCard;
  } else {
    // Create a new device card
    const deviceElement = document.createElement("div");
    deviceElement.className = "device";
    deviceElement.id = `device-${device.id}`;
    deviceElement.innerHTML = deviceCard;
    deviceList.appendChild(deviceElement);
  }
}

// Function to remove a device from the DOM
function removeDevice(deviceId) {
  const deviceElement = document.getElementById(`device-${deviceId}`);
  if (deviceElement) {
    deviceElement.remove();
  }
}

// Function to handle device properties with retry logic
async function handleDeviceProperties(device) {
  const retryAttempts = 5; // Increase retry attempts
  const retryDelay = 2000; // Wait 2 seconds between retries

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const properties = await client.getProperties(device.id);
      return {
        id: device.id,
        manufacturer: properties["ro.product.manufacturer"],
        model: properties["ro.product.model"],
        authorized: device.type === "device",
        version: properties["ro.build.version.release"],
      };
    } catch (error) {
      if (error.message.includes("device still authorizing")) {
        console.warn(
          `Device ${device.id} is still authorizing. Retrying... (${attempt}/${retryAttempts})`
        );
        terminal(
          `Device ${device.id} is still authorizing. Retrying... (${attempt}/${retryAttempts})`
        );
        if (attempt === retryAttempts) {
          console.error(
            `Device ${device.id} is still authorizing and could not be retrieved.`
          );
          terminal(
            `Device ${device.id} is still authorizing and could not be retrieved.`
          );
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait before retrying
      } else if (error.message.includes("device unauthorized")) {
        console.warn(
          `Device ${device.id} is unauthorized. Please authorize the device.`
        );
        terminal(
          `Device ${device.id} is unauthorized. Please authorize the device.`
        );
       
        return null; // Return null if the device is unauthorized
      } else {
        throw error; // Rethrow other errors
      }
    }
  }
}

// Function to list devices and add them to the DOM
async function listDevices() {
  try {
    const devices = await client.listDevices();
    const newDevices = new Set();
    for (const device of devices) {
      const deviceInfo = await handleDeviceProperties(device);
      if (deviceInfo) {
        newDevices.add(deviceInfo.id);
        addOrUpdateDevice(deviceInfo); // Add or update the device in the UI
      }
    }

    // Remove devices that are no longer connected
    currentDevices.forEach((deviceId) => {
      if (!newDevices.has(deviceId)) {
        console.log(`Device ${deviceId} was unplugged`);
        terminal(`Device ${deviceId} was unplugged`);
        Alert.error(`Device ${deviceId} was unplugged`,{displayDuration: 3000});
        removeDevice(deviceId); // Remove the device from the UI
      }
    });

    // Update the currentDevices set
    currentDevices = newDevices;
  } catch (error) {
    console.error("Error listing devices:", error);
  }
}

// Poll for devices periodically
setInterval(listDevices, POLL_INTERVAL);

// On page load, list devices
document.addEventListener("DOMContentLoaded", () => {
  listDevices(); // List devices on page load
});
