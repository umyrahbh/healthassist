/**
 * Users management functionality
 */
document.addEventListener("DOMContentLoaded", function () {
    // Initialize users page functionality
    if (document.getElementById("users-management")) {
        loadUsers();
        
        // Set up event listeners
        document.getElementById("search-users-input").addEventListener("input", filterUsers);
        document.getElementById("user-type-filter").addEventListener("change", filterUsers);
        document.getElementById("add-user-btn").addEventListener("click", openAddUserModal);
        document.getElementById("user-form").addEventListener("submit", handleUserFormSubmit);
        document.getElementById("confirm-delete-user").addEventListener("click", confirmDeleteUser);
    }
    
    /**
     * Load users data
     */
    function loadUsers() {
        const loadingIndicator = document.getElementById("users-loading");
        const errorMessage = document.getElementById("users-error");
        
        if (loadingIndicator) loadingIndicator.style.display = "block";
        if (errorMessage) errorMessage.style.display = "none";
        
        fetch("/api/users")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to load users");
                }
                return response.json();
            })
            .then(data => {
                window.usersData = data;
                renderUsersTable();
                
                if (loadingIndicator) loadingIndicator.style.display = "none";
            })
            .catch(error => {
                console.error("Error loading users:", error);
                if (loadingIndicator) loadingIndicator.style.display = "none";
                if (errorMessage) {
                    errorMessage.style.display = "block";
                    errorMessage.textContent = "Failed to load users. Please try again.";
                }
            });
    }
    
    /**
     * Filter users based on search and dropdown filters
     */
    function filterUsers() {
        const searchTerm = document.getElementById("search-users-input").value.toLowerCase().trim();
        const userTypeFilter = document.getElementById("user-type-filter").value;
        
        if (!window.usersData) return;
        
        // Apply filters
        const filteredUsers = window.usersData.filter(user => {
            // User type filter
            if (userTypeFilter && userTypeFilter !== "all" && user.user_type.toLowerCase() !== userTypeFilter.toLowerCase()) {
                return false;
            }
            
            // Search filter (check in name, email, etc.)
            if (searchTerm) {
                const matchesSearch = 
                    user.user_name.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm) ||
                    user.username.toLowerCase().includes(searchTerm);
                
                if (!matchesSearch) return false;
            }
            
            return true;
        });
        
        // Store filtered results and render
        window.filteredUsersData = filteredUsers;
        renderUsersTable();
    }
    
    /**
     * Render the users table with pagination
     */
    function renderUsersTable() {
        const tableBody = document.querySelector("#users-table tbody");
        if (!tableBody) return;
        
        const usersToDisplay = window.filteredUsersData || window.usersData;
        if (!usersToDisplay || usersToDisplay.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No users found</td>
                </tr>
            `;
            return;
        }
        
        // Clear previous content
        tableBody.innerHTML = "";
        
        // Add users to table
        usersToDisplay.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.user_id}</td>
                <td>
                    <div class="user-info">
                        <div class="user-name">${user.user_name}</div>
                        <div class="user-email">${user.email}</div>
                    </div>
                </td>
                <td>${user.gender}</td>
                <td>${user.username}</td>
                <td>
                    <span class="badge ${user.user_type.toLowerCase() === 'admin' ? 'badge-admin' : 'badge-normal'}">
                        ${user.user_type}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn btn-icon btn-edit" onclick="openEditUserModal(${user.user_id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-delete" onclick="openDeleteUserModal(${user.user_id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Open modal for adding a new user
     */
    function openAddUserModal() {
        // Reset form
        document.getElementById("user-form").reset();
        clearFormErrors(document.getElementById("user-form"));
        
        // Set form mode to "add"
        document.getElementById("user-form").setAttribute("data-mode", "add");
        document.getElementById("user-form").removeAttribute("data-user-id");
        
        // Update modal title
        document.querySelector("#user-modal .modal-title").textContent = "Add New User";
        
        // Set password field as required
        document.getElementById("user-password").setAttribute("required", "required");
        document.getElementById("password-field-container").style.display = "block";
        
        // Show the modal
        openModal("user-modal");
    }
    
    /**
     * Open modal for editing a user
     * @param {number} userId - The ID of the user to edit
     */
    window.openEditUserModal = function(userId) {
        // Find user data
        const user = window.usersData.find(u => u.user_id === userId);
        if (!user) {
            showNotification("User not found", "error");
            return;
        }
        
        // Reset form and clear errors
        document.getElementById("user-form").reset();
        clearFormErrors(document.getElementById("user-form"));
        
        // Set form mode to "edit" and store user ID
        document.getElementById("user-form").setAttribute("data-mode", "edit");
        document.getElementById("user-form").setAttribute("data-user-id", userId);
        
        // Update modal title
        document.querySelector("#user-modal .modal-title").textContent = "Edit User";
        
        // Password is optional when editing
        document.getElementById("user-password").removeAttribute("required");
        document.getElementById("password-field-container").style.display = "none";
        
        // Fill form with user data
        document.getElementById("user-name").value = user.user_name;
        document.getElementById("user-email").value = user.email;
        document.getElementById("user-username").value = user.username;
        document.getElementById("user-gender").value = user.gender;
        document.getElementById("user-type").value = user.user_type;
        
        // Show the modal
        openModal("user-modal");
    };
    
    /**
     * Open delete confirmation modal
     * @param {number} userId - The ID of the user to delete
     */
    window.openDeleteUserModal = function(userId) {
        // Find user data
        const user = window.usersData.find(u => u.user_id === userId);
        if (!user) {
            showNotification("User not found", "error");
            return;
        }
        
        // Store user ID for deletion
        document.getElementById("delete-user-modal").setAttribute("data-user-id", userId);
        
        // Set confirmation message
        document.getElementById("delete-user-name").textContent = user.user_name;
        
        // Show the modal
        openModal("delete-user-modal");
    };
    
    /**
     * Handle user form submission (add/edit)
     * @param {Event} e - Form submit event
     */
    function handleUserFormSubmit(e) {
        e.preventDefault();
        
        // Get form data
        const form = e.target;
        const mode = form.getAttribute("data-mode");
        const formData = new FormData(form);
        
        // Validate form data
        let isValid = true;
        
        const name = formData.get("user-name");
        if (isEmpty(name)) {
            showFieldError("user-name", "Name is required");
            isValid = false;
        }
        
        const email = formData.get("user-email");
        if (isEmpty(email)) {
            showFieldError("user-email", "Email is required");
            isValid = false;
        } else if (!isValidEmail(email)) {
            showFieldError("user-email", "Please enter a valid email");
            isValid = false;
        }
        
        const username = formData.get("user-username");
        if (isEmpty(username)) {
            showFieldError("user-username", "Username is required");
            isValid = false;
        }
        
        // Password is only required for new users
        const password = formData.get("user-password");
        if (mode === "add" && isEmpty(password)) {
            showFieldError("user-password", "Password is required");
            isValid = false;
        } else if (!isEmpty(password) && !isValidPassword(password)) {
            showFieldError("user-password", "Password must be at least 8 characters with at least one letter and one number");
            isValid = false;
        }
        
        if (!isValid) return;
        
        // Prepare user data
        const userData = {
            user_name: name,
            email: email,
            username: username,
            gender: formData.get("user-gender"),
            user_type: formData.get("user-type"),
        };
        
        // Only include password if it's provided
        if (!isEmpty(password)) {
            userData.password = password;
        }
        
        // Submit based on mode
        if (mode === "add") {
            addUser(userData);
        } else {
            const userId = parseInt(form.getAttribute("data-user-id"));
            updateUser(userId, userData);
        }
    }
    
    /**
     * Add a new user
     * @param {Object} userData - The user data to add
     */
    function addUser(userData) {
        // In a real application, this would be a POST request to the server
        // For demo purposes, we'll simulate it
        
        fetch("/api/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to add user");
                }
                return response.json();
            })
            .then(data => {
                // Close modal
                closeModal("user-modal");
                
                // Show success message
                showNotification("User added successfully", "success");
                
                // Reload users data
                loadUsers();
            })
            .catch(error => {
                console.error("Error adding user:", error);
                showNotification("Failed to add user. Please try again.", "danger");
            });
    }
    
    /**
     * Update an existing user
     * @param {number} userId - The ID of the user to update
     * @param {Object} userData - The updated user data
     */
    function updateUser(userId, userData) {
        // In a real application, this would be a PUT request to the server
        // For demo purposes, we'll simulate it
        
        fetch(`/api/users/${userId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to update user");
                }
                return response.json();
            })
            .then(data => {
                // Close modal
                closeModal("user-modal");
                
                // Show success message
                showNotification("User updated successfully", "success");
                
                // Reload users data
                loadUsers();
            })
            .catch(error => {
                console.error("Error updating user:", error);
                showNotification("Failed to update user. Please try again.", "danger");
            });
    }
    
    /**
     * Delete a user
     */
    function confirmDeleteUser() {
        const userId = parseInt(document.getElementById("delete-user-modal").getAttribute("data-user-id"));
        
        // In a real application, this would be a DELETE request to the server
        // For demo purposes, we'll simulate it
        
        fetch(`/api/users/${userId}`, {
            method: "DELETE"
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to delete user");
                }
                return response.json();
            })
            .then(data => {
                // Close modal
                closeModal("delete-user-modal");
                
                // Show success message
                showNotification("User deleted successfully", "success");
                
                // Reload users data
                loadUsers();
            })
            .catch(error => {
                console.error("Error deleting user:", error);
                showNotification("Failed to delete user. Please try again.", "danger");
            });
    }
});

// Add event listeners for modal close buttons when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get all elements with the data-dismiss="modal" attribute
    const modalCloseButtons = document.querySelectorAll('[data-dismiss="modal"]');
    
    // Add click event listeners to close the parent modal
    modalCloseButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const modalElement = this.closest('.modal');
            if (modalElement) {
                closeModal(modalElement.id);
            }
        });
    });
});
