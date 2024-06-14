document.addEventListener("DOMContentLoaded", function() {
    var menuButton = document.querySelector(".navigatieButton")
    var hetMenu = document.querySelector(".navigatieContent")

    menuButton.onclick = toggleMenu

    function toggleMenu() {
        menuButton.classList.toggle("open")
        hetMenu.classList.toggle("open")
    }
})