/**
 * Appointments management functionality
 */
document.addEventListener("DOMContentLoaded", function () {
    // Initialize appointments page functionality
    if (document.getElementById("appointments-management")) {
        loadAppointments();
        loadDoctors();
        loadPatients();
        
        // Set up event listeners
        document.getElementById("search-appointments-input").addEventListener("input", filterAppointments);
        document.getElementById("date-filter").addEventListener("change", filterAppointments);
        document.getElementById("add-appointment-btn").addEventListener("click", openAddAppointmentModal);
        document.getElementById("appointment-form").addEventListener("submit", handleAppointmentFormSubmit);
        document.getElementById("confirm-delete-appointment").addEventListener("click", confirmDeleteAppointment);
    }
    
    /**
     * Load appointments data
     */
    function loadAppointments() {
        const loadingIndicator = document.getElementById("appointments-loading");
        const errorMessage = document.getElementById("appointments-error");
        
        if (loadingIndicator) loadingIndicator.style.display = "block";
        if (errorMessage) errorMessage.style.display = "none";
        
        fetch("/api/appointments")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to load appointments");
                }
                return response.json();
            })
            .then(data => {
                window.appointmentsData = data;
                
                // Combine with patient data if available
                if (window.patientsData) {
                    window.appointmentsData = window.appointmentsData.map(appointment => {
                        const patient = window.patientsData.find(p => p.user_id === appointment.user_id);
                        return {
                            ...appointment,
                            patient_name: patient ? patient.user_name : "Unknown",
                            patient_email: patient ? patient.email : "Unknown"
                        };
                    });
                }
                
                renderAppointmentsTable();
                
                if (loadingIndicator) loadingIndicator.style.display = "none";
            })
            .catch(error => {
                console.error("Error loading appointments:", error);
                if (loadingIndicator) loadingIndicator.style.display = "none";
                if (errorMessage) {
                    errorMessage.style.display = "block";
                    errorMessage.textContent = "Failed to load appointments. Please try again.";
                }
            });
    }
    
    /**
     * Load doctors data
     */
    function loadDoctors() {
        fetch("/api/users?user_type=Admin")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to load doctors");
                }
                return response.json();
            })
            .then(data => {
                // For demo, we'll just use admins as doctors
                window.doctorsData = data.filter(user => user.user_type === "Admin");
                
                // Populate doctor dropdown
                const doctorSelect = document.getElementById("appointment-doctor");
                if (doctorSelect) {
                    doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
                    window.doctorsData.forEach(doctor => {
                        const option = document.createElement("option");
                        option.value = doctor.user_id;
                        option.textContent = doctor.user_name;
                        doctorSelect.appendChild(option);
                    });
                }
            })
            .catch(error => {
                console.error("Error loading doctors:", error);
            });
    }
    
    /**
     * Load patients data
     */
    function loadPatients() {
        fetch("/api/users?user_type=Normal")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to load patients");
                }
                return response.json();
            })
            .then(data => {
                // For demo, we'll use normal users as patients
                window.patientsData = data.filter(user => user.user_type === "Normal");
                
                // Populate patient dropdown
                const patientSelect = document.getElementById("appointment-patient");
                if (patientSelect) {
                    patientSelect.innerHTML = '<option value="">Select Patient</option>';
                    window.patientsData.forEach(patient => {
                        const option = document.createElement("option");
                        option.value = patient.user_id;
                        option.textContent = patient.user_name;
                        patientSelect.appendChild(option);
                    });
                }
                
                // If appointments data is already loaded, enrich it with patient info
                if (window.appointmentsData) {
                    window.appointmentsData = window.appointmentsData.map(appointment => {
                        const patient = window.patientsData.find(p => p.user_id === appointment.user_id);
                        return {
                            ...appointment,
                            patient_name: patient ? patient.user_name : "Unknown",
                            patient_email: patient ? patient.email : "Unknown"
                        };
                    });
                    
                    renderAppointmentsTable();
                }
            })
            .catch(error => {
                console.error("Error loading patients:", error);
            });
    }
    
    /**
     * Filter appointments based on search and dropdown filters
     */
    function filterAppointments() {
        const searchTerm = document.getElementById("search-appointments-input").value.toLowerCase().trim();
        const dateFilter = document.getElementById("date-filter").value;
        
        if (!window.appointmentsData) return;
        
        // Apply filters
        const filteredAppointments = window.appointmentsData.filter(appointment => {
            // Date filter
            if (dateFilter) {
                if (dateFilter === "today") {
                    const today = new Date().toISOString().split("T")[0];
                    if (appointment.appointment_date !== today) return false;
                } else if (dateFilter === "upcoming") {
                    const today = new Date().toISOString().split("T")[0];
                    if (appointment.appointment_date <= today) return false;
                } else if (dateFilter === "past") {
                    const today = new Date().toISOString().split("T")[0];
                    if (appointment.appointment_date >= today) return false;
                }
            }
            
            // Search filter (check in patient name, appointment type, etc.)
            if (searchTerm) {
                const matchesSearch = 
                    (appointment.patient_name && appointment.patient_name.toLowerCase().includes(searchTerm)) ||
                    (appointment.checkup_name && appointment.checkup_name.toLowerCase().includes(searchTerm));
                
                if (!matchesSearch) return false;
            }
            
            return true;
        });
        
        // Store filtered results and render
        window.filteredAppointmentsData = filteredAppointments;
        renderAppointmentsTable();
    }
    
    /**
     * Render the appointments table with pagination
     */
    function renderAppointmentsTable() {
        const tableBody = document.querySelector("#appointments-table tbody");
        if (!tableBody) return;
        
        const appointmentsToDisplay = window.filteredAppointmentsData || window.appointmentsData;
        if (!appointmentsToDisplay || appointmentsToDisplay.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No appointments found</td>
                </tr>
            `;
            return;
        }
        
        // Clear previous content
        tableBody.innerHTML = "";
        
        // Sort appointments by date and time
        const sortedAppointments = [...appointmentsToDisplay].sort((a, b) => {
            const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
            const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
            return dateA - dateB;
        });
        
        // Add appointments to table
        sortedAppointments.forEach(appointment => {
            const row = document.createElement("tr");
            
            // Format date and time
            const formattedDate = formatDate(appointment.appointment_date);
            const formattedTime = formatTime(appointment.appointment_time);
            
            // Determine status based on date
            const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
            const today = new Date();
            let status, statusClass;
            
            if (appointmentDate < today) {
                status = "Completed";
                statusClass = "badge-success";
            } else if (appointmentDate.toDateString() === today.toDateString()) {
                status = "Today";
                statusClass = "badge-warning";
            } else {
                status = "Upcoming";
                statusClass = "badge-info";
            }
            
            row.innerHTML = `
                <td>${appointment.appointment_id}</td>
                <td>
                    <div class="patient-info">
                        <div class="patient-name">${appointment.patient_name || "Unknown"}</div>
                        <div class="patient-email">${appointment.patient_email || "N/A"}</div>
                    </div>
                </td>
                <td>${formattedDate}</td>
                <td>${formattedTime}</td>
                <td>${appointment.checkup_name}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-icon btn-edit" onclick="openEditAppointmentModal(${appointment.appointment_id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-delete" onclick="openDeleteAppointmentModal(${appointment.appointment_id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Open modal for adding a new appointment
     */
    function openAddAppointmentModal() {
        // Reset form
        document.getElementById("appointment-form").reset();
        clearFormErrors(document.getElementById("appointment-form"));
        
        // Set current date as minimum date
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("appointment-date").setAttribute("min", today);
        
        // Set form mode to "add"
        document.getElementById("appointment-form").setAttribute("data-mode", "add");
        document.getElementById("appointment-form").removeAttribute("data-appointment-id");
        
        // Update modal title
        document.querySelector("#appointment-modal .modal-title").textContent = "Add New Appointment";
        
        // Show the modal
        openModal("appointment-modal");
    }
    
    /**
     * Open modal for editing an appointment
     * @param {number} appointmentId - The ID of the appointment to edit
     */
    window.openEditAppointmentModal = function(appointmentId) {
        // Find appointment data
        const appointment = window.appointmentsData.find(a => a.appointment_id === appointmentId);
        if (!appointment) {
            showNotification("Appointment not found", "error");
            return;
        }
        
        // Reset form and clear errors
        document.getElementById("appointment-form").reset();
        clearFormErrors(document.getElementById("appointment-form"));
        
        // Set form mode to "edit" and store appointment ID
        document.getElementById("appointment-form").setAttribute("data-mode", "edit");
        document.getElementById("appointment-form").setAttribute("data-appointment-id", appointmentId);
        
        // Update modal title
        document.querySelector("#appointment-modal .modal-title").textContent = "Edit Appointment";
        
        // Fill form with appointment data
        document.getElementById("appointment-patient").value = appointment.user_id;
        document.getElementById("appointment-date").value = appointment.appointment_date;
        
        // Convert time format if needed (HH:MM:SS to HH:MM)
        const timeValue = appointment.appointment_time.split(":").slice(0, 2).join(":");
        document.getElementById("appointment-time").value = timeValue;
        
        document.getElementById("appointment-type").value = appointment.checkup_name;
        
        // Show the modal
        openModal("appointment-modal");
    };
    
    /**
     * Open delete confirmation modal
     * @param {number} appointmentId - The ID of the appointment to delete
     */
    window.openDeleteAppointmentModal = function(appointmentId) {
        // Find appointment data
        const appointment = window.appointmentsData.find(a => a.appointment_id === appointmentId);
        if (!appointment) {
            showNotification("Appointment not found", "error");
            return;
        }
        
        // Store appointment ID for deletion
        document.getElementById("delete-appointment-modal").setAttribute("data-appointment-id", appointmentId);
        
        // Get patient name
        const patientName = appointment.patient_name || "Unknown";
        
        // Format date
        const formattedDate = formatDate(appointment.appointment_date);
        
        // Set confirmation message
        document.getElementById("delete-appointment-details").textContent = 
            `${patientName} on ${formattedDate} for ${appointment.checkup_name}`;
        
        // Show the modal
        openModal("delete-appointment-modal");
    };
    
    /**
     * Handle appointment form submission (add/edit)
     * @param {Event} e - Form submit event
     */
    function handleAppointmentFormSubmit(e) {
        e.preventDefault();
        
        // Get form data
        const form = e.target;
        const mode = form.getAttribute("data-mode");
        const formData = new FormData(form);
        
        // Validate form data
        let isValid = true;
        
        const patientId = formData.get("appointment-patient");
        if (!patientId) {
            showFieldError("appointment-patient", "Patient is required");
            isValid = false;
        }
        
        const date = formData.get("appointment-date");
        if (!date) {
            showFieldError("appointment-date", "Date is required");
            isValid = false;
        }
        
        const time = formData.get("appointment-time");
        if (!time) {
            showFieldError("appointment-time", "Time is required");
            isValid = false;
        }
        
        const type = formData.get("appointment-type");
        if (!type) {
            showFieldError("appointment-type", "Appointment type is required");
            isValid = false;
        }
        
        if (!isValid) return;
        
        // First, fetch checkup types to get the ID
        fetch("/api/checkup-types")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to load checkup types");
                }
                return response.json();
            })
            .then(checkupTypes => {
                // Find matching checkup type
                const matchingCheckup = checkupTypes.find(
                    checkup => checkup.name === type
                );
                
                if (!matchingCheckup) {
                    throw new Error(`Checkup type '${type}' not found`);
                }
                
                // Prepare appointment data with checkup_id instead of checkup_name
                const appointmentData = {
                    user_id: parseInt(patientId),
                    appointment_date: date,
                    appointment_time: time + ":00", // Add seconds for consistency
                    checkup_id: matchingCheckup.checkup_id,
                };
                
                // Submit based on mode
                if (mode === "add") {
                    addAppointment(appointmentData);
                } else {
                    const appointmentId = parseInt(form.getAttribute("data-appointment-id"));
                    updateAppointment(appointmentId, appointmentData);
                }
            })
            .catch(error => {
                console.error("Error processing appointment:", error);
                showNotification(error.message || "Failed to process appointment", "danger");
            });
    }
    
    /**
     * Add a new appointment
     * @param {Object} appointmentData - The appointment data to add
     */
    function addAppointment(appointmentData) {
        // In a real application, this would be a POST request to the server
        // For demo purposes, we'll simulate it
        
        fetch("/api/appointments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(appointmentData)
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || "Failed to add appointment");
                    });
                }
                return response.json();
            })
            .then(data => {
                // Close modal
                closeModal("appointment-modal");
                
                // Show success message
                showNotification("Appointment added successfully", "success");
                
                // Reload appointments data
                loadAppointments();
            })
            .catch(error => {
                console.error("Error adding appointment:", error);
                showNotification("Failed to add appointment. Please try again.", "danger");
            });
    }
    
    /**
     * Update an existing appointment
     * @param {number} appointmentId - The ID of the appointment to update
     * @param {Object} appointmentData - The updated appointment data
     */
    function updateAppointment(appointmentId, appointmentData) {
        // In a real application, this would be a PUT request to the server
        // For demo purposes, we'll simulate it
        
        fetch(`/api/appointments/${appointmentId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(appointmentData)
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || "Failed to update appointment");
                    });
                }
                return response.json();
            })
            .then(data => {
                // Close modal
                closeModal("appointment-modal");
                
                // Show success message
                showNotification("Appointment updated successfully", "success");
                
                // Reload appointments data
                loadAppointments();
            })
            .catch(error => {
                console.error("Error updating appointment:", error);
                showNotification("Failed to update appointment. Please try again.", "danger");
            });
    }
    
    /**
     * Delete an appointment
     */
    function confirmDeleteAppointment() {
        const appointmentId = parseInt(document.getElementById("delete-appointment-modal").getAttribute("data-appointment-id"));
        
        // In a real application, this would be a DELETE request to the server
        // For demo purposes, we'll simulate it
        
        fetch(`/api/appointments/${appointmentId}`, {
            method: "DELETE"
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to delete appointment");
                }
                return response.json();
            })
            .then(data => {
                // Close modal
                closeModal("delete-appointment-modal");
                
                // Show success message
                showNotification("Appointment deleted successfully", "success");
                
                // Reload appointments data
                loadAppointments();
            })
            .catch(error => {
                console.error("Error deleting appointment:", error);
                showNotification("Failed to delete appointment. Please try again.", "danger");
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
