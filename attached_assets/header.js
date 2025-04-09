document.addEventListener("DOMContentLoaded", function () {
  fetch("header.html")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load header.");
      }
      return response.text();
    })
    .then((html) => {
      document.getElementById("header-placeholder").innerHTML = html;

      // Dynamically load dynamicbutton.js AFTER header is loaded
      const script = document.createElement("script");
      script.src = "js/dynamicbutton.js";
      script.onload = () => {
        console.log("DynamicButton.js loaded successfully.");
      };
      script.onerror = () => {
        console.error("Failed to load DynamicButton.js.");
      };
      document.body.appendChild(script);

      // Set the active page
      const currentPage = document.body.getAttribute("data-page");
      const navLinks = document.querySelectorAll("nav ul li a");

      navLinks.forEach((link) => {
        if (link.getAttribute("data-page") === currentPage) {
          link.classList.add("active");
        }
      });
    })
    .catch((error) => {
      console.error("Error loading header:", error);
    });
});
