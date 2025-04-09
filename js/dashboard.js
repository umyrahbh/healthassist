document.addEventListener("DOMContentLoaded", function() {
    // Initialize user dropdown functionality
    const userDropdownToggle = document.getElementById("user-dropdown-toggle");
    if (userDropdownToggle) {
        userDropdownToggle.addEventListener("click", function() {
            document.getElementById("user-dropdown").classList.toggle("show");
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", function(event) {
            if (!event.target.matches("#user-dropdown-toggle") && 
                !event.target.closest("#user-dropdown-toggle") &&
                !event.target.closest("#user-dropdown")) {
                const dropdown = document.getElementById("user-dropdown");
                if (dropdown && dropdown.classList.contains("show")) {
                    dropdown.classList.remove("show");
                }
            }
        });
    }

    // Initialize notification dropdown functionality
    const notificationToggle = document.getElementById("notification-toggle");
    if (notificationToggle) {
        notificationToggle.addEventListener("click", function() {
            document.getElementById("notification-dropdown").classList.toggle("show");
        });

        // Close notifications when clicking outside
        document.addEventListener("click", function(event) {
            if (!event.target.matches("#notification-toggle") && 
                !event.target.closest("#notification-toggle") &&
                !event.target.closest("#notification-dropdown")) {
                const dropdown = document.getElementById("notification-dropdown");
                if (dropdown && dropdown.classList.contains("show")) {
                    dropdown.classList.remove("show");
                }
            }
        });
    }

    // Set up logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function(e) {
            e.preventDefault();
            
            // Clear local storage
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user_id");
            localStorage.removeItem("user_name");
            localStorage.removeItem("user_type");
            
            // Redirect to logout endpoint
            window.location.href = "/logout";
        });
    }

    // Dashboard specific functionality
    loadDashboardData();

    // Set up refresh button
    document.getElementById('refresh-dashboard').addEventListener('click', function() {
        loadDashboardData();
    });

    /**
     * Load dashboard statistics
     */
    function loadDashboardData() {
        // Show loading state for all stat cards
        document.querySelectorAll('.stat-value').forEach(el => {
            el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });

        // Show loading state for recent activity
        document.getElementById('recent-activity-list').innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i> Loading recent activity...
            </div>
        `;

        // Fetch users count
        fetch('/api/users')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch users data');
                }
                return response.json();
            })
            .then(data => {
                const users = data;
                const totalUsers = users.length;
                const doctors = users.filter(user => user.user_type === 'Doctor').length;
                const patients = users.filter(user => user.user_type === 'Normal').length;

                document.getElementById('total-users-value').textContent = totalUsers;
                document.getElementById('doctors-count-value').textContent = doctors;
                document.getElementById('patients-count-value').textContent = patients;

                // After we have users data, fetch appointments
                return fetch('/api/appointments');
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch appointments data');
                }
                return response.json();
            })
            .then(appointments => {
                const totalAppointments = appointments.length;
                
                // Calculate today's appointments
                const today = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD
                const todayAppointments = appointments.filter(appt => 
                    appt.appointment_date === today
                ).length;
                
                // Calculate upcoming appointments (future dates)
                const upcomingAppointments = appointments.filter(appt => 
                    appt.appointment_date > today
                ).length;

                document.getElementById('total-appointments-value').textContent = totalAppointments;
                document.getElementById('today-appointments-value').textContent = todayAppointments;
                document.getElementById('upcoming-appointments-value').textContent = upcomingAppointments;

                // Now load recent activity with both user and appointment data
                loadRecentActivity(appointments);
            })
            .catch(error => {
                console.error('Error loading dashboard data:', error);
                document.querySelectorAll('.stat-value').forEach(el => {
                    el.textContent = 'Error';
                });
                document.getElementById('recent-activity-list').innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i> Failed to load data. Please try again.
                    </div>
                `;
            });
    }

    /**
     * Load recent activity for the dashboard
     */
    function loadRecentActivity(appointments) {
        // Fetch users to get user details for appointments
        fetch('/api/users')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch users data');
                }
                return response.json();
            })
            .then(users => {
                displayRecentActivity(appointments, users);
            })
            .catch(error => {
                console.error('Error loading recent activity:', error);
                document.getElementById('recent-activity-list').innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i> Failed to load recent activity.
                    </div>
                `;
            });
    }

    /**
     * Display recent activity items
     * @param {Array} appointments - Recent appointments
     * @param {Array} users - User data
     */
    function displayRecentActivity(appointments, users) {
        // Sort appointments by date and time, most recent first
        const sortedAppointments = [...appointments].sort((a, b) => {
            const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
            const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
            return dateB - dateA;
        });

        // Take the 5 most recent appointments
        const recentAppointments = sortedAppointments.slice(0, 5);

        if (recentAppointments.length === 0) {
            document.getElementById('recent-activity-list').innerHTML = `
                <div class="no-activity">
                    <i class="fas fa-info-circle"></i> No recent activity to display.
                </div>
            `;
            return;
        }

        let html = '';
        
        recentAppointments.forEach(appointment => {
            // Find the user associated with this appointment
            const user = users.find(u => u.user_id === appointment.user_id);
            const userName = user ? user.user_name : 'Unknown User';
            
            // Format the date and time
            const date = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
            const formattedDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            const formattedTime = date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit'
            });

            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${userName} - ${appointment.checkup_name}</div>
                        <div class="activity-time">${formattedDate} at ${formattedTime}</div>
                    </div>
                </div>
            `;
        });

        document.getElementById('recent-activity-list').innerHTML = html;
    }
});
