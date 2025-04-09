document.addEventListener("DOMContentLoaded", function () {
  fetch("header.html")
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

      // Set the active page
      var currentPage = document.body.getAttribute("data-page");
      var navLinks = document.querySelectorAll("nav ul li a");

      navLinks.forEach(function(link) {
        if (link.getAttribute("data-page") === currentPage) {
          link.classList.add("active");
        }
      });
    })
    .catch(function(error) {
      console.error("Error loading header:", error);
    });
});