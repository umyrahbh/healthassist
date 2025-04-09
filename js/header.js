/**
 * Common header loading functionality
 */

/**
 * Load the header for the specified user type
 * @param {string} userType - The type of user (admin or normal)
 */
function loadHeader(userType) {
    fetch("/header.html")
        .then(function(response) {
            if (!response.ok) {
                throw new Error("Failed to load header.");
            }
            return response.text();
        })
        .then(function(html) {
            document.getElementById("header-placeholder").innerHTML = html;

            // Dynamically load dynamicbutton.js AFTER header is loaded
            var script = document.createElement("script");
            script.src = "js/dynamicbutton.js";
            script.onload = function() {
                console.log("DynamicButton.js loaded successfully.");
            };
            script.onerror = function() {
                console.error("Failed to load DynamicButton.js.");
            };
            document.body.appendChild(script);
        })
        .catch(function(error) {
            console.error("Error loading header:", error);
        });
}
