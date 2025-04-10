/**
 * DynamicButton.js
 * A utility class for creating and managing dynamic buttons in the application
 */

class DynamicButton {
    /**
     * Create a new dynamic button
     * @param {string} text - The text to display on the button
     * @param {string} cssClass - CSS class name(s) to apply to the button
     * @param {Function} clickHandler - Function to execute when button is clicked
     * @param {string} icon - Optional FontAwesome icon class
     */
    constructor(text, cssClass, clickHandler, icon = null) {
        this.text = text;
        this.cssClass = cssClass;
        this.clickHandler = clickHandler;
        this.icon = icon;
        this.element = null;
    }

    /**
     * Render the button and attach it to a container
     * @param {HTMLElement|string} container - Container element or its ID
     * @returns {HTMLElement} - The created button element
     */
    render(container) {
        // Create button element
        this.element = document.createElement('button');
        this.element.className = this.cssClass;
        
        // Add icon if provided
        if (this.icon) {
            const iconElement = document.createElement('i');
            iconElement.className = this.icon;
            this.element.appendChild(iconElement);
            
            // Add space after icon if there's text
            if (this.text) {
                const space = document.createTextNode(' ');
                this.element.appendChild(space);
            }
        }
        
        // Add text if provided
        if (this.text) {
            const textNode = document.createTextNode(this.text);
            this.element.appendChild(textNode);
        }
        
        // Attach click handler
        if (typeof this.clickHandler === 'function') {
            this.element.addEventListener('click', this.clickHandler);
        }
        
        // Append to container
        const containerElement = typeof container === 'string' 
            ? document.getElementById(container) 
            : container;
            
        if (containerElement) {
            containerElement.appendChild(this.element);
        }
        
        return this.element;
    }
    
    /**
     * Update the button text
     * @param {string} newText - New text for the button
     */
    setText(newText) {
        if (!this.element) return;
        
        // Clear existing content
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
        
        // Re-add icon if it exists
        if (this.icon) {
            const iconElement = document.createElement('i');
            iconElement.className = this.icon;
            this.element.appendChild(iconElement);
            
            // Add space after icon if there's text
            if (newText) {
                const space = document.createTextNode(' ');
                this.element.appendChild(space);
            }
        }
        
        // Add new text
        if (newText) {
            const textNode = document.createTextNode(newText);
            this.element.appendChild(textNode);
        }
        
        this.text = newText;
    }
    
    /**
     * Update the button's CSS class
     * @param {string} newClass - New CSS class(es) for the button
     */
    setClass(newClass) {
        if (!this.element) return;
        this.element.className = newClass;
        this.cssClass = newClass;
    }
    
    /**
     * Enable or disable the button
     * @param {boolean} isDisabled - Whether the button should be disabled
     */
    setDisabled(isDisabled) {
        if (!this.element) return;
        this.element.disabled = isDisabled;
        
        // Add/remove disabled class for styling
        if (isDisabled) {
            this.element.classList.add('disabled');
        } else {
            this.element.classList.remove('disabled');
        }
    }
    
    /**
     * Remove the button from the DOM
     */
    remove() {
        if (!this.element) return;
        
        // Remove event listener to prevent memory leaks
        if (typeof this.clickHandler === 'function') {
            this.element.removeEventListener('click', this.clickHandler);
        }
        
        // Remove from DOM
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.element = null;
    }
}

// Add to window object for global access
window.DynamicButton = DynamicButton;

console.log('DynamicButton.js loaded successfully.');