            // Check slot availability when date, time and checkup type are selected
            function checkSlotAvailability() {
                const appointmentDate = document.getElementById("appointment-date").value;
                const appointmentTime = document.getElementById("appointment-time").value;
                const checkupId = document.getElementById("appointment-type").value;
                
                if (!appointmentDate || !appointmentTime || !checkupId) {
                    return; // Don't check if any values are missing
                }
                
                const url = `/api/check-slot-availability?date=${appointmentDate}&time=${appointmentTime}&checkup_id=${checkupId}`;
                
                fetch(url, {
                    method: "GET",
                    credentials: "include"
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(err.error || "Failed to check availability");
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data.is_available) {
                        showError(`This time slot is fully booked. Only ${data.slots_remaining} slots remain out of ${data.max_slots}.`);
                        document.querySelector(".btn-submit").disabled = true;
                    } else {
                        // Clear any error and enable submit button
                        document.getElementById("error-message").style.display = "none";
                        document.querySelector(".btn-submit").disabled = false;
                    }
                })
                .catch(error => {
                    console.error("Error checking slot availability:", error);
                });
            }
            
            // Add event listeners to check availability when selections change
            document.getElementById("appointment-date").addEventListener("change", checkSlotAvailability);
            document.getElementById("appointment-time").addEventListener("change", checkSlotAvailability);
            document.getElementById("appointment-type").addEventListener("change", checkSlotAvailability);
