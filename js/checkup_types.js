/**
 * Checkup Types management functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Only execute if on the checkup types page
    if (!document.body.matches('[data-page="checkup_types"]')) return;

    // Load header
    loadHeader('admin');
    
    // Variables for pagination
    const itemsPerPage = 10;
    let currentPage = 1;
    let totalPages = 1;
    let checkupTypes = [];
    let filteredCheckupTypes = [];
    
    // Variables for deleting
    let checkupTypeToDelete = null;
    
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const statusFilter = document.getElementById('status-filter');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const addCheckupBtn = document.getElementById('add-checkup-btn');
    const checkupTypesBody = document.getElementById('checkup-types-body');
    const paginationEl = document.getElementById('pagination');
    const paginationStart = document.getElementById('pagination-start');
    const paginationEnd = document.getElementById('pagination-end');
    const paginationTotal = document.getElementById('pagination-total');
    const checkupTypeModal = document.getElementById('checkup-type-modal');
    const checkupModalTitle = document.getElementById('checkup-modal-title');
    const checkupTypeForm = document.getElementById('checkup-type-form');
    const saveCheckupBtn = document.getElementById('save-checkup-btn');
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // Initialize the page
    init();
    
    /**
     * Initialize the page
     */
    function init() {
        // Set up event listeners
        addCheckupBtn.addEventListener('click', openAddCheckupModal);
        searchBtn.addEventListener('click', filterCheckupTypes);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') filterCheckupTypes();
        });
        
        statusFilter.addEventListener('change', filterCheckupTypes);
        resetFiltersBtn.addEventListener('click', resetFilters);
        saveCheckupBtn.addEventListener('click', handleCheckupFormSubmit);
        confirmDeleteBtn.addEventListener('click', confirmDeleteCheckupType);
        
        // Setup image preview
        const imageInput = document.getElementById('checkup-image');
        if (imageInput) {
            imageInput.addEventListener('change', function() {
                const previewContainer = document.getElementById('image-preview-container');
                const preview = document.getElementById('image-preview');
                
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        preview.src = e.target.result;
                        previewContainer.style.display = 'block';
                    };
                    reader.readAsDataURL(this.files[0]);
                } else {
                    previewContainer.style.display = 'none';
                }
            });
        }
        
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
        
        // Load checkup types
        loadCheckupTypes();
    }
    
    /**
     * Load checkup types data
     */
    function loadCheckupTypes() {
        // Show loading indicator
        checkupTypesBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i> Loading checkup types...
                </td>
            </tr>
        `;
        
        // Fetch checkup types from API
        fetch('/api/checkup-types')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load checkup types');
                }
                return response.json();
            })
            .then(data => {
                checkupTypes = data;
                filteredCheckupTypes = [...checkupTypes];
                renderCheckupTypesTable();
            })
            .catch(error => {
                console.error('Error loading checkup types:', error);
                checkupTypesBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="error-message">
                            <i class="fas fa-exclamation-circle"></i> Error loading checkup types. Please try again.
                        </td>
                    </tr>
                `;
                showNotification('Failed to load checkup types. ' + error.message, 'danger');
            });
    }
    
    /**
     * Filter checkup types based on search and dropdown filters
     */
    function filterCheckupTypes() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const statusValue = statusFilter.value;
        
        filteredCheckupTypes = checkupTypes.filter(checkupType => {
            // Filter by search term
            const nameMatch = checkupType.name.toLowerCase().includes(searchTerm);
            const descMatch = checkupType.description ? checkupType.description.toLowerCase().includes(searchTerm) : false;
            const searchMatch = nameMatch || descMatch;
            
            // Filter by status
            let statusMatch = true;
            if (statusValue !== 'all') {
                statusMatch = (statusValue === 'active' && checkupType.is_active === 1) || 
                              (statusValue === 'inactive' && checkupType.is_active === 0);
            }
            
            return searchMatch && statusMatch;
        });
        
        // Reset to first page when filtering
        currentPage = 1;
        renderCheckupTypesTable();
    }
    
    /**
     * Reset all filters
     */
    function resetFilters() {
        searchInput.value = '';
        statusFilter.value = 'all';
        
        filteredCheckupTypes = [...checkupTypes];
        currentPage = 1;
        renderCheckupTypesTable();
    }
    
    /**
     * Render the checkup types table with pagination
     */
    function renderCheckupTypesTable() {
        // Calculate pagination
        totalPages = Math.ceil(filteredCheckupTypes.length / itemsPerPage);
        
        // Ensure current page is within bounds
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        
        // Calculate start and end indices
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredCheckupTypes.length);
        
        // Update pagination display
        paginationStart.textContent = filteredCheckupTypes.length > 0 ? startIndex + 1 : 0;
        paginationEnd.textContent = endIndex;
        paginationTotal.textContent = filteredCheckupTypes.length;
        
        // Clear existing content
        checkupTypesBody.innerHTML = '';
        
        // Check if no records found
        if (filteredCheckupTypes.length === 0) {
            checkupTypesBody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">
                        <i class="fas fa-info-circle"></i> No checkup types found.
                    </td>
                </tr>
            `;
            renderPagination();
            return;
        }
        
        // Render table rows
        const checkupTypesToDisplay = filteredCheckupTypes.slice(startIndex, endIndex);
        
        checkupTypesToDisplay.forEach(checkupType => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${checkupType.checkup_id}</td>
                <td>${checkupType.name}</td>
                <td>${checkupType.description ? checkupType.description.substring(0, 50) + (checkupType.description.length > 50 ? '...' : '') : '-'}</td>
                <td>
                    ${checkupType.image_path ? 
                    `<img src="/${checkupType.image_path}" alt="${checkupType.name}" style="max-width: 50px; max-height: 50px;" onerror="this.src='/assets/default_checkup.svg'; this.onerror=null;" />` : 
                    '<span class="text-muted">No image</span>'}
                </td>
                <td>RM ${parseFloat(checkupType.price).toFixed(2)}</td>
                <td>${checkupType.duration_minutes}</td>
                <td>${checkupType.max_slots_per_time}</td>
                <td>
                    <span class="status-badge ${checkupType.is_active === 1 ? 'status-active' : 'status-inactive'}">
                        ${checkupType.is_active === 1 ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon btn-edit" data-id="${checkupType.checkup_id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon btn-delete" data-id="${checkupType.checkup_id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            // Add event listeners for action buttons
            row.querySelector('.btn-edit').addEventListener('click', function() {
                openEditCheckupModal(checkupType.checkup_id);
            });
            
            row.querySelector('.btn-delete').addEventListener('click', function() {
                openDeleteModal(checkupType.checkup_id);
            });
            
            checkupTypesBody.appendChild(row);
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
                renderCheckupTypesTable();
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
                renderCheckupTypesTable();
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
                renderCheckupTypesTable();
            }
        });
        paginationEl.appendChild(nextButton);
    }
    
    /**
     * Open modal for adding a new checkup type
     */
    function openAddCheckupModal() {
        // Reset form
        checkupTypeForm.reset();
        document.getElementById('checkup-id').value = '';
        
        // Clear all error messages
        clearFormErrors(checkupTypeForm);
        
        // Set modal title
        checkupModalTitle.textContent = 'Add New Checkup Type';
        
        // Set default values
        document.getElementById('checkup-active').checked = true;
        document.getElementById('checkup-duration').value = '30';
        document.getElementById('checkup-max-slots').value = '10';
        
        // Show modal
        checkupTypeModal.style.display = 'block';
        checkupTypeModal.classList.add('show');
        
        // Add backdrop if needed
        if (!document.querySelector('.modal-backdrop')) {
            var backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop show';
            document.body.appendChild(backdrop);
        }
    }
    
    /**
     * Open modal for editing a checkup type
     * @param {number} checkupId - The ID of the checkup type to edit
     */
    function openEditCheckupModal(checkupId) {
        // Clear all error messages
        clearFormErrors(checkupTypeForm);
        
        // Get checkup type data
        fetch(`/api/checkup-types/${checkupId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load checkup type details');
                }
                return response.json();
            })
            .then(checkupType => {
                // Set form values
                document.getElementById('checkup-id').value = checkupType.checkup_id;
                document.getElementById('checkup-name').value = checkupType.name;
                document.getElementById('checkup-description').value = checkupType.description || '';
                document.getElementById('checkup-price').value = checkupType.price;
                document.getElementById('checkup-duration').value = checkupType.duration_minutes;
                document.getElementById('checkup-max-slots').value = checkupType.max_slots_per_time;
                
                // Set status radio button
                if (checkupType.is_active === 1) {
                    document.getElementById('checkup-active').checked = true;
                } else {
                    document.getElementById('checkup-inactive').checked = true;
                }
                
                // Show image preview if available
                const previewContainer = document.getElementById('image-preview-container');
                const preview = document.getElementById('image-preview');
                if (checkupType.image_path) {
                    preview.src = '/' + checkupType.image_path;
                    previewContainer.style.display = 'block';
                } else {
                    previewContainer.style.display = 'none';
                }
                
                // Set modal title
                checkupModalTitle.textContent = 'Edit Checkup Type';
                
                // Show modal
                checkupTypeModal.style.display = 'block';
                checkupTypeModal.classList.add('show');
                
                // Add backdrop if needed
                if (!document.querySelector('.modal-backdrop')) {
                    var backdrop = document.createElement('div');
                    backdrop.className = 'modal-backdrop show';
                    document.body.appendChild(backdrop);
                }
            })
            .catch(error => {
                console.error('Error loading checkup type details:', error);
                showNotification('Failed to load checkup type details. ' + error.message, 'danger');
            });
    }
    
    /**
     * Open delete confirmation modal
     * @param {number} checkupId - The ID of the checkup type to delete
     */
    function openDeleteModal(checkupId) {
        checkupTypeToDelete = checkupId;
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
     * Handle checkup type form submission (add/edit)
     */
    function handleCheckupFormSubmit() {
        // Clear previous error messages
        clearFormErrors(checkupTypeForm);
        
        // Get form values
        const checkupId = document.getElementById('checkup-id').value;
        const name = document.getElementById('checkup-name').value.trim();
        const description = document.getElementById('checkup-description').value.trim();
        const price = document.getElementById('checkup-price').value;
        const duration = document.getElementById('checkup-duration').value;
        const maxSlots = document.getElementById('checkup-max-slots').value;
        const isActive = document.querySelector('input[name="checkup-status"]:checked').value;
        const imageFile = document.getElementById('checkup-image').files[0];
        
        // Validate form
        let isValid = true;
        
        if (!name) {
            showFieldError('checkup-name', 'Name is required');
            isValid = false;
        }
        
        if (!price || parseFloat(price) < 0) {
            showFieldError('checkup-price', 'Please enter a valid price');
            isValid = false;
        }
        
        if (!duration || parseInt(duration) < 5) {
            showFieldError('checkup-duration', 'Duration must be at least 5 minutes');
            isValid = false;
        }
        
        if (!maxSlots || parseInt(maxSlots) < 1) {
            showFieldError('checkup-max-slots', 'Maximum slots must be at least 1');
            isValid = false;
        }
        
        if (!isValid) return;
        
        // Use FormData to handle file uploads
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description || '');
        formData.append('price', parseFloat(price));
        formData.append('duration_minutes', parseInt(duration));
        formData.append('max_slots_per_time', parseInt(maxSlots));
        formData.append('is_active', parseInt(isActive));
        
        // Only append image if a file is selected
        if (imageFile) {
            console.log('Appending image file to form data:', imageFile.name, imageFile.type, imageFile.size);
            formData.append('image', imageFile);
        } else {
            console.log('No image file selected');
        }
        
        // Add or update checkup type
        if (checkupId) {
            updateCheckupType(checkupId, formData);
        } else {
            addCheckupType(formData);
        }
    }
    
    /**
     * Add a new checkup type
     * @param {Object} checkupData - The checkup type data to add
     */
    function addCheckupType(formData) {
        console.log('Sending form data to server for creating checkup type');
        
        // Debug - list all entries in the FormData (for debugging)
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + (pair[0] === 'image' ? 'File object' : pair[1]));
        }
        
        fetch('/api/checkup-types', {
            method: 'POST',
            // Don't set Content-Type header when sending FormData
            // The browser will set it automatically with the correct boundary
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to add checkup type');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide modal
            checkupTypeModal.style.display = 'none';
            checkupTypeModal.classList.remove('show');
            
            // Remove backdrop
            var backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Show success notification
            showNotification('Checkup type added successfully', 'success');
            
            // Reload checkup types
            loadCheckupTypes();
        })
        .catch(error => {
            console.error('Error adding checkup type:', error);
            showNotification(error.message, 'danger');
        });
    }
    
    /**
     * Update an existing checkup type
     * @param {number} checkupId - The ID of the checkup type to update
     * @param {Object} checkupData - The updated checkup type data
     */
    function updateCheckupType(checkupId, formData) {
        // Add the checkup ID to the form data
        formData.append('checkup_id', checkupId);
        
        console.log('Sending form data to server for updating checkup type:', checkupId);
        
        // Debug - list all entries in the FormData (for debugging)
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + (pair[0] === 'image' ? 'File object' : pair[1]));
        }
        
        fetch(`/api/checkup-types/${checkupId}`, {
            method: 'PUT',
            // Don't set Content-Type header when sending FormData
            // The browser will set it automatically with the correct boundary
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to update checkup type');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide modal
            checkupTypeModal.style.display = 'none';
            checkupTypeModal.classList.remove('show');
            
            // Remove backdrop
            var backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Show success notification
            showNotification('Checkup type updated successfully', 'success');
            
            // Reload checkup types
            loadCheckupTypes();
        })
        .catch(error => {
            console.error('Error updating checkup type:', error);
            showNotification(error.message, 'danger');
        });
    }
    
    /**
     * Delete a checkup type
     */
    function confirmDeleteCheckupType() {
        if (!checkupTypeToDelete) return;
        
        fetch(`/api/checkup-types/${checkupTypeToDelete}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to delete checkup type');
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
            showNotification('Checkup type deleted successfully', 'success');
            
            // Reload checkup types
            loadCheckupTypes();
            
            // Reset checkupTypeToDelete
            checkupTypeToDelete = null;
        })
        .catch(error => {
            console.error('Error deleting checkup type:', error);
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
