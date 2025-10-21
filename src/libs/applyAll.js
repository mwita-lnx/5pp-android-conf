const setupbtn = document.getElementById("setupbtn")

document.addEventListener("DOMContentLoaded", () => {
    setupbtn.addEventListener("click", () => {
        disable()
        installApks()
        console.log("Setup button clicked")
    })
    })