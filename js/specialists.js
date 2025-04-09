/**
 * Specialists management functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Only execute if on the specialists page
    if (!document.body.matches('[data-page="specialists"]')) return;

    // Load header
    loadHeader('admin');
    
    // Variables for pagination
    const itemsPerPage = 10;
    let currentPage = 1;
    let totalPages = 1;
    let specialists = [];
    let filteredSpecialists = [];
    let specializations = new Set();
    
    // Variables for deleting
    let specialistToDelete = null;
    
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const statusFilter = document.getElementById('status-filter');
    const specializationFilter = document.getElementById('specialization-filter');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const addSpecialistBtn = document.getElementById('add-specialist-btn');
    const specialistsBody = document.getElementById('specialists-body');
    const paginationEl = document.getElementById('pagination');
    const paginationStart = document.getElementById('pagination-start');
    const paginationEnd = document.getElementById('pagination-end');
    const paginationTotal = document.getElementById('pagination-total');
    const specialistModal = document.getElementById('specialist-modal');
    const specialistModalTitle = document.getElementById('specialist-modal-title');
    const specialistForm = document.getElementById('specialist-form');
    const specialistImageInput = document.getElementById('specialist-image');
    const specialistImagePreview = document.getElementById('specialist-image-preview');
    const specialistImagePreviewContainer = document.getElementById('image-preview-container');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const specialistImagePath = document.getElementById('specialist-image-path');
    const saveSpecialistBtn = document.getElementById('save-specialist-btn');
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // Initialize the page
    init();
    
    /**
     * Initialize the page
     */
    function init() {
        // Set up event listeners
        addSpecialistBtn.addEventListener('click', openAddSpecialistModal);
        searchBtn.addEventListener('click', filterSpecialists);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') filterSpecialists();
        });
        statusFilter.addEventListener('change', filterSpecialists);
        specializationFilter.addEventListener('change', filterSpecialists);
        resetFiltersBtn.addEventListener('click', resetFilters);
        saveSpecialistBtn.addEventListener('click', handleSpecialistFormSubmit);
        confirmDeleteBtn.addEventListener('click', confirmDeleteSpecialist);
        
        // Image upload preview
        specialistImageInput.addEventListener('change', handleImagePreview);
        removeImageBtn.addEventListener('click', removeImagePreview);
        
        // Close modal buttons
        document.querySelectorAll('.close-modal, .modal-dialog .btn-secondary').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                modal.style.display = 'none';
                modal.classList.remove('show');
                
                // Remove backdrop
                var backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
            });
        });
        
        // Load specialists
        loadSpecialists();
    }
    
    /**
     * Handle image file selection and preview
     */
    function handleImagePreview() {
        const file = specialistImageInput.files[0];
        if (file) {
            // Check if file is an image
            if (!file.type.match('image.*')) {
                showFieldError('specialist-image', 'Please select an image file (JPG, PNG, etc.)');
                specialistImageInput.value = '';
                return;
            }
            
            // Clear any existing error
            clearFieldError('specialist-image');
            
            // Read and display the image
            const reader = new FileReader();
            reader.onload = function(e) {
                specialistImagePreview.src = e.target.result;
                specialistImagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }
    
    /**
     * Remove the current image preview
     */
    function removeImagePreview() {
        specialistImageInput.value = '';
        specialistImagePath.value = '';
        specialistImagePreviewContainer.style.display = 'none';
        specialistImagePreview.src = '#';
    }
    
    /**
     * Load specialists data
     */
    function loadSpecialists() {
        // Show loading indicator
        specialistsBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i> Loading specialists...
                </td>
            </tr>
        `;
        
        // Fetch specialists from API
        fetch('/api/specialists')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load specialists');
                }
                return response.json();
            })
            .then(data => {
                specialists = data;
                filteredSpecialists = [...specialists];
                
                // Extract unique specializations
                specializations = new Set();
                specialists.forEach(specialist => {
                    if (specialist.specialization) {
                        specializations.add(specialist.specialization);
                    }
                });
                
                // Populate specialization filter
                updateSpecializationFilter();
                
                renderSpecialistsTable();
            })
            .catch(error => {
                console.error('Error loading specialists:', error);
                specialistsBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="error-message">
                            <i class="fas fa-exclamation-circle"></i> Error loading specialists. Please try again.
                        </td>
                    </tr>
                `;
                showNotification('Failed to load specialists. ' + error.message, 'danger');
            });
    }
    
    /**
     * Update specialization filter with unique values
     */
    function updateSpecializationFilter() {
        // Clear existing options except "All"
        while (specializationFilter.options.length > 1) {
            specializationFilter.remove(1);
        }
        
        // Add new options
        specializations.forEach(specialization => {
            const option = document.createElement('option');
            option.value = specialization;
            option.textContent = specialization;
            specializationFilter.appendChild(option);
        });
    }
    
    /**
     * Filter specialists based on search and dropdown filters
     */
    function filterSpecialists() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const statusValue = statusFilter.value;
        const specializationValue = specializationFilter.value;
        
        filteredSpecialists = specialists.filter(specialist => {
            // Filter by search term
            const nameMatch = specialist.name.toLowerCase().includes(searchTerm);
            const titleMatch = specialist.title.toLowerCase().includes(searchTerm);
            const specializationMatch = specialist.specialization.toLowerCase().includes(searchTerm);
            const bioMatch = specialist.bio ? specialist.bio.toLowerCase().includes(searchTerm) : false;
            const searchMatch = nameMatch || titleMatch || specializationMatch || bioMatch;
            
            // Filter by status
            let statusMatch = true;
            if (statusValue !== 'all') {
                statusMatch = (statusValue === 'active' && specialist.is_active === 1) || 
                              (statusValue === 'inactive' && specialist.is_active === 0);
            }
            
            // Filter by specialization
            let specializationFilterMatch = true;
            if (specializationValue !== 'all') {
                specializationFilterMatch = specialist.specialization === specializationValue;
            }
            
            return searchMatch && statusMatch && specializationMatch;
        });
        
        // Reset to first page when filtering
        currentPage = 1;
        renderSpecialistsTable();
    }
    
    /**
     * Reset all filters
     */
    function resetFilters() {
        searchInput.value = '';
        statusFilter.value = 'all';
        specializationFilter.value = 'all';
        
        filteredSpecialists = [...specialists];
        currentPage = 1;
        renderSpecialistsTable();
    }
    
    /**
     * Render the specialists table with pagination
     */
    function renderSpecialistsTable() {
        // Calculate pagination
        totalPages = Math.ceil(filteredSpecialists.length / itemsPerPage);
        
        // Ensure current page is within bounds
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        
        // Calculate start and end indices
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredSpecialists.length);
        
        // Update pagination display
        paginationStart.textContent = filteredSpecialists.length > 0 ? startIndex + 1 : 0;
        paginationEnd.textContent = endIndex;
        paginationTotal.textContent = filteredSpecialists.length;
        
        // Clear existing content
        specialistsBody.innerHTML = '';
        
        // Check if no records found
        if (filteredSpecialists.length === 0) {
            specialistsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <i class="fas fa-info-circle"></i> No specialists found.
                    </td>
                </tr>
            `;
            renderPagination();
            return;
        }
        
        // Render table rows
        const specialistsToDisplay = filteredSpecialists.slice(startIndex, endIndex);
        
        specialistsToDisplay.forEach(specialist => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${specialist.specialist_id}</td>
                <td>${specialist.name}</td>
                <td>${specialist.title}</td>
                <td>${specialist.specialization}</td>
                <td>${specialist.image_path ? 
                    `<div class="specialist-img-container">
                        <img src="${specialist.image_path.startsWith('/') ? specialist.image_path : `/${specialist.image_path}`}" 
                             alt="${specialist.name}" 
                             class="specialist-thumbnail"
                             onerror="this.src='/assets/default-specialist.svg'">
                     </div>` : 
                    '<span class="no-image">No image</span>'}
                </td>
                <td>
                    <span class="status-badge ${specialist.is_active === 1 ? 'status-active' : 'status-inactive'}">
                        ${specialist.is_active === 1 ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon btn-edit" data-id="${specialist.specialist_id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon btn-delete" data-id="${specialist.specialist_id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            // Add event listeners for action buttons
            row.querySelector('.btn-edit').addEventListener('click', function() {
                openEditSpecialistModal(specialist.specialist_id);
            });
            
            row.querySelector('.btn-delete').addEventListener('click', function() {
                openDeleteModal(specialist.specialist_id);
            });
            
            specialistsBody.appendChild(row);
        });
        
        // Render pagination
        renderPagination();
    }
    
    /**
     * Render pagination controls
     */
    function renderPagination() {
        paginationEl.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.classList.add('pagination-btn');
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderSpecialistsTable();
            }
        });
        paginationEl.appendChild(prevButton);
        
        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.classList.add('pagination-btn');
            if (i === currentPage) pageButton.classList.add('active');
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                currentPage = i;
                renderSpecialistsTable();
            });
            paginationEl.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.classList.add('pagination-btn');
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderSpecialistsTable();
            }
        });
        paginationEl.appendChild(nextButton);
    }
    
    /**
     * Open modal for adding a new specialist
     */
    function openAddSpecialistModal() {
        // Reset form
        specialistForm.reset();
        document.getElementById('specialist-id').value = '';
        
        // Clear all error messages
        clearFormErrors(specialistForm);
        
        // Set modal title
        specialistModalTitle.textContent = 'Add New Specialist';
        
        // Set default values
        document.getElementById('specialist-active').checked = true;
        
        // Show modal
        specialistModal.style.display = 'block';
        specialistModal.classList.add('show');
        
        // Add backdrop if needed
        if (!document.querySelector('.modal-backdrop')) {
            var backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop show';
            document.body.appendChild(backdrop);
        }
    }
    
    /**
     * Open modal for editing a specialist
     * @param {number} specialistId - The ID of the specialist to edit
     */
    function openEditSpecialistModal(specialistId) {
        // Clear all error messages
        clearFormErrors(specialistForm);
        
        // Get specialist data
        fetch(`/api/specialists/${specialistId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load specialist details');
                }
                return response.json();
            })
            .then(specialist => {
                // Set form values
                document.getElementById('specialist-id').value = specialist.specialist_id;
                document.getElementById('specialist-name').value = specialist.name;
                document.getElementById('specialist-title').value = specialist.title;
                document.getElementById('specialist-specialization').value = specialist.specialization;
                document.getElementById('specialist-bio').value = specialist.bio || '';
                
                // Reset file input
                specialistImageInput.value = '';
                
                // Set image path and show preview if image exists
                if (specialist.image_path) {
                    document.getElementById('specialist-image-path').value = specialist.image_path;
                    // Add leading slash to image path if it doesn't already have one
                    specialistImagePreview.src = specialist.image_path.startsWith('/') ? 
                        specialist.image_path : `/${specialist.image_path}`;
                    specialistImagePreviewContainer.style.display = 'block';
                } else {
                    document.getElementById('specialist-image-path').value = '';
                    specialistImagePreview.src = '#';
                    specialistImagePreviewContainer.style.display = 'none';
                }
                
                // Set status radio button
                if (specialist.is_active === 1) {
                    document.getElementById('specialist-active').checked = true;
                } else {
                    document.getElementById('specialist-inactive').checked = true;
                }
                
                // Set modal title
                specialistModalTitle.textContent = 'Edit Specialist';
                
                // Show modal
                specialistModal.style.display = 'block';
        specialistModal.classList.add('show');
        
        // Add backdrop if needed
        if (!document.querySelector('.modal-backdrop')) {
            var backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop show';
            document.body.appendChild(backdrop);
        }
            })
            .catch(error => {
                console.error('Error loading specialist details:', error);
                showNotification('Failed to load specialist details. ' + error.message, 'danger');
            });
    }
    
    /**
     * Open delete confirmation modal
     * @param {number} specialistId - The ID of the specialist to delete
     */
    function openDeleteModal(specialistId) {
        specialistToDelete = specialistId;
        deleteModal.style.display = 'block';
        deleteModal.classList.add('show');
        
        // Add backdrop if needed
        if (!document.querySelector('.modal-backdrop')) {
            var backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop show';
            document.body.appendChild(backdrop);
        }
    }
    
    /**
     * Handle specialist form submission (add/edit)
     */
    function handleSpecialistFormSubmit() {
        // Clear previous error messages
        clearFormErrors(specialistForm);
        
        // Get form values
        const specialistId = document.getElementById('specialist-id').value;
        const name = document.getElementById('specialist-name').value.trim();
        const title = document.getElementById('specialist-title').value.trim();
        const specialization = document.getElementById('specialist-specialization').value.trim();
        const bio = document.getElementById('specialist-bio').value.trim();
        const existingImagePath = document.getElementById('specialist-image-path').value;
        const isActive = document.querySelector('input[name="specialist-status"]:checked').value;
        
        // Validate form
        let isValid = true;
        
        if (!name) {
            showFieldError('specialist-name', 'Name is required');
            isValid = false;
        }
        
        if (!title) {
            showFieldError('specialist-title', 'Title is required');
            isValid = false;
        }
        
        if (!specialization) {
            showFieldError('specialist-specialization', 'Specialization is required');
            isValid = false;
        }
        
        if (!isValid) return;
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('name', name);
        formData.append('title', title);
        formData.append('specialization', specialization);
        formData.append('bio', bio || '');
        formData.append('is_active', isActive);
        
        // Check if there's a new image to upload
        if (specialistImageInput.files.length > 0) {
            formData.append('image', specialistImageInput.files[0]);
        } else if (existingImagePath) {
            // Keep existing image path
            formData.append('image_path', existingImagePath);
        }
        
        // Add or update specialist
        if (specialistId) {
            updateSpecialist(specialistId, formData);
        } else {
            addSpecialist(formData);
        }
    }
    
    /**
     * Add a new specialist
     * @param {Object} specialistData - The specialist data to add
     */
    function addSpecialist(formData) {
        fetch('/api/specialists', {
            method: 'POST',
            // Don't set Content-Type header when sending FormData
            // The browser will set it automatically with the correct boundary
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to add specialist');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide modal
            specialistModal.style.display = 'none';
            specialistModal.classList.remove('show');
            
            // Remove backdrop
            var backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Show success notification
            showNotification('Specialist added successfully', 'success');
            
            // Reload specialists
            loadSpecialists();
        })
        .catch(error => {
            console.error('Error adding specialist:', error);
            showNotification(error.message, 'danger');
        });
    }
    
    /**
     * Update an existing specialist
     * @param {number} specialistId - The ID of the specialist to update
     * @param {Object} specialistData - The updated specialist data
     */
    function updateSpecialist(specialistId, formData) {
        fetch(`/api/specialists/${specialistId}`, {
            method: 'PUT',
            // Don't set Content-Type header when sending FormData
            // The browser will set it automatically with the correct boundary
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to update specialist');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide modal
            specialistModal.style.display = 'none';
            specialistModal.classList.remove('show');
            
            // Remove backdrop
            var backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Show success notification
            showNotification('Specialist updated successfully', 'success');
            
            // Reload specialists
            loadSpecialists();
        })
        .catch(error => {
            console.error('Error updating specialist:', error);
            showNotification(error.message, 'danger');
        });
    }
    
    /**
     * Delete a specialist
     */
    function confirmDeleteSpecialist() {
        if (!specialistToDelete) return;
        
        fetch(`/api/specialists/${specialistToDelete}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to delete specialist');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide modal
            deleteModal.style.display = 'none';
            deleteModal.classList.remove('show');
            
            // Remove backdrop
            var backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Show success notification
            showNotification('Specialist deleted successfully', 'success');
            
            // Reload specialists
            loadSpecialists();
            
            // Reset specialistToDelete
            specialistToDelete = null;
        })
        .catch(error => {
            console.error('Error deleting specialist:', error);
            showNotification(error.message, 'danger');
            
            // Hide modal
            deleteModal.style.display = 'none';
            deleteModal.classList.remove('show');
            
            // Remove backdrop
            var backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
        });
    }
});
