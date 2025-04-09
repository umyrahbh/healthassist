/**
 * Health Facts management functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Only execute if on the health facts page
    if (!document.body.matches('[data-page="health_facts"]')) return;

    // Load header
    loadHeader('admin');
    
    // Variables for pagination
    const itemsPerPage = 10;
    let currentPage = 1;
    let totalPages = 1;
    let healthFacts = [];
    let filteredHealthFacts = [];
    let categories = new Set();
    
    // Variables for deleting
    let factToDelete = null;
    
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const statusFilter = document.getElementById('status-filter');
    const featuredFilter = document.getElementById('featured-filter');
    const categoryFilter = document.getElementById('category-filter');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const addFactBtn = document.getElementById('add-fact-btn');
    const healthFactsBody = document.getElementById('health-facts-body');
    const paginationEl = document.getElementById('pagination');
    const paginationStart = document.getElementById('pagination-start');
    const paginationEnd = document.getElementById('pagination-end');
    const paginationTotal = document.getElementById('pagination-total');
    const factModal = document.getElementById('fact-modal');
    const factModalTitle = document.getElementById('fact-modal-title');
    const factForm = document.getElementById('fact-form');
    const saveFactBtn = document.getElementById('save-fact-btn');
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // Initialize the page
    init();
    
    /**
     * Initialize the page
     */
    function init() {
        // Set up event listeners
        addFactBtn.addEventListener('click', openAddFactModal);
        searchBtn.addEventListener('click', filterHealthFacts);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') filterHealthFacts();
        });
        statusFilter.addEventListener('change', filterHealthFacts);
        featuredFilter.addEventListener('change', filterHealthFacts);
        categoryFilter.addEventListener('change', filterHealthFacts);
        resetFiltersBtn.addEventListener('click', resetFilters);
        saveFactBtn.addEventListener('click', handleFactFormSubmit);
        confirmDeleteBtn.addEventListener('click', confirmDeleteFact);
        
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
        
        // Load health facts
        loadHealthFacts();
    }
    
    /**
     * Load health facts data
     */
    function loadHealthFacts() {
        // Show loading indicator
        healthFactsBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i> Loading health facts...
                </td>
            </tr>
        `;
        
        // Fetch health facts from API
        fetch('/api/health-facts')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load health facts');
                }
                return response.json();
            })
            .then(data => {
                healthFacts = data;
                filteredHealthFacts = [...healthFacts];
                
                // Extract unique categories
                categories = new Set();
                healthFacts.forEach(fact => {
                    if (fact.category) {
                        categories.add(fact.category);
                    }
                });
                
                // Populate category filter
                updateCategoryFilter();
                
                renderHealthFactsTable();
            })
            .catch(error => {
                console.error('Error loading health facts:', error);
                healthFactsBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="error-message">
                            <i class="fas fa-exclamation-circle"></i> Error loading health facts. Please try again.
                        </td>
                    </tr>
                `;
                showNotification('Failed to load health facts. ' + error.message, 'danger');
            });
    }
    
    /**
     * Update category filter with unique values
     */
    function updateCategoryFilter() {
        // Clear existing options except "All"
        while (categoryFilter.options.length > 1) {
            categoryFilter.remove(1);
        }
        
        // Add new options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }
    
    /**
     * Filter health facts based on search and dropdown filters
     */
    function filterHealthFacts() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const statusValue = statusFilter.value;
        const featuredValue = featuredFilter.value;
        const categoryValue = categoryFilter.value;
        
        filteredHealthFacts = healthFacts.filter(fact => {
            // Filter by search term
            const titleMatch = fact.title.toLowerCase().includes(searchTerm);
            const contentMatch = fact.content.toLowerCase().includes(searchTerm);
            const categoryMatch = fact.category ? fact.category.toLowerCase().includes(searchTerm) : false;
            const searchMatch = titleMatch || contentMatch || categoryMatch;
            
            // Filter by status
            let statusMatch = true;
            if (statusValue !== 'all') {
                statusMatch = (statusValue === 'active' && fact.is_active === 1) || 
                              (statusValue === 'inactive' && fact.is_active === 0);
            }
            
            // Filter by featured
            let featuredMatch = true;
            if (featuredValue !== 'all') {
                featuredMatch = (featuredValue === 'featured' && fact.is_featured === 1) || 
                                (featuredValue === 'not-featured' && fact.is_featured === 0);
            }
            
            // Filter by category
            let categoryFilterMatch = true;
            if (categoryValue !== 'all') {
                categoryFilterMatch = fact.category === categoryValue;
            }
            
            return searchMatch && statusMatch && featuredMatch && categoryMatch;
        });
        
        // Reset to first page when filtering
        currentPage = 1;
        renderHealthFactsTable();
    }
    
    /**
     * Reset all filters
     */
    function resetFilters() {
        searchInput.value = '';
        statusFilter.value = 'all';
        featuredFilter.value = 'all';
        categoryFilter.value = 'all';
        
        filteredHealthFacts = [...healthFacts];
        currentPage = 1;
        renderHealthFactsTable();
    }
    
    /**
     * Render the health facts table with pagination
     */
    function renderHealthFactsTable() {
        // Calculate pagination
        totalPages = Math.ceil(filteredHealthFacts.length / itemsPerPage);
        
        // Ensure current page is within bounds
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        
        // Calculate start and end indices
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredHealthFacts.length);
        
        // Update pagination display
        paginationStart.textContent = filteredHealthFacts.length > 0 ? startIndex + 1 : 0;
        paginationEnd.textContent = endIndex;
        paginationTotal.textContent = filteredHealthFacts.length;
        
        // Clear existing content
        healthFactsBody.innerHTML = '';
        
        // Check if no records found
        if (filteredHealthFacts.length === 0) {
            healthFactsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <i class="fas fa-info-circle"></i> No health facts found.
                    </td>
                </tr>
            `;
            renderPagination();
            return;
        }
        
        // Render table rows
        const factsToDisplay = filteredHealthFacts.slice(startIndex, endIndex);
        
        factsToDisplay.forEach(fact => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${fact.fact_id}</td>
                <td>${fact.title}</td>
                <td>${fact.content.substring(0, 100)}${fact.content.length > 100 ? '...' : ''}</td>
                <td>${fact.category || '-'}</td>
                <td>
                    <span class="status-badge ${fact.is_featured === 1 ? 'status-featured' : 'status-not-featured'}">
                        ${fact.is_featured === 1 ? 'Featured' : 'Not Featured'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${fact.is_active === 1 ? 'status-active' : 'status-inactive'}">
                        ${fact.is_active === 1 ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon btn-edit" data-id="${fact.fact_id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon btn-delete" data-id="${fact.fact_id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            // Add event listeners for action buttons
            row.querySelector('.btn-edit').addEventListener('click', function() {
                openEditFactModal(fact.fact_id);
            });
            
            row.querySelector('.btn-delete').addEventListener('click', function() {
                openDeleteModal(fact.fact_id);
            });
            
            healthFactsBody.appendChild(row);
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
                renderHealthFactsTable();
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
                renderHealthFactsTable();
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
                renderHealthFactsTable();
            }
        });
        paginationEl.appendChild(nextButton);
    }
    
    /**
     * Open modal for adding a new health fact
     */
    function openAddFactModal() {
        // Reset form
        factForm.reset();
        document.getElementById('fact-id').value = '';
        
        // Clear all error messages
        clearFormErrors(factForm);
        
        // Set modal title
        factModalTitle.textContent = 'Add New Health Fact';
        
        // Set default values
        document.getElementById('fact-active').checked = true;
        document.getElementById('fact-not-featured').checked = true;
        
        // Show modal
        factModal.style.display = 'block';
        factModal.classList.add('show');
        
        // Add backdrop if needed
        if (!document.querySelector('.modal-backdrop')) {
            var backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop show';
            document.body.appendChild(backdrop);
        }
    }
    
    /**
     * Open modal for editing a health fact
     * @param {number} factId - The ID of the health fact to edit
     */
    function openEditFactModal(factId) {
        // Clear all error messages
        clearFormErrors(factForm);
        
        // Get health fact data
        fetch(`/api/health-facts/${factId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load health fact details');
                }
                return response.json();
            })
            .then(fact => {
                // Set form values
                document.getElementById('fact-id').value = fact.fact_id;
                document.getElementById('fact-title').value = fact.title;
                document.getElementById('fact-content').value = fact.content;
                document.getElementById('fact-category').value = fact.category || '';
                
                // Set featured radio button
                if (fact.is_featured === 1) {
                    document.getElementById('fact-featured').checked = true;
                } else {
                    document.getElementById('fact-not-featured').checked = true;
                }
                
                // Set status radio button
                if (fact.is_active === 1) {
                    document.getElementById('fact-active').checked = true;
                } else {
                    document.getElementById('fact-inactive').checked = true;
                }
                
                // Set modal title
                factModalTitle.textContent = 'Edit Health Fact';
                
                // Show modal
                factModal.style.display = 'block';
        factModal.classList.add('show');
        
        // Add backdrop if needed
        if (!document.querySelector('.modal-backdrop')) {
            var backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop show';
            document.body.appendChild(backdrop);
        }
            })
            .catch(error => {
                console.error('Error loading health fact details:', error);
                showNotification('Failed to load health fact details. ' + error.message, 'danger');
            });
    }
    
    /**
     * Open delete confirmation modal
     * @param {number} factId - The ID of the health fact to delete
     */
    function openDeleteModal(factId) {
        factToDelete = factId;
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
     * Handle health fact form submission (add/edit)
     */
    function handleFactFormSubmit() {
        // Clear previous error messages
        clearFormErrors(factForm);
        
        // Get form values
        const factId = document.getElementById('fact-id').value;
        const title = document.getElementById('fact-title').value.trim();
        const content = document.getElementById('fact-content').value.trim();
        const category = document.getElementById('fact-category').value.trim();
        const isFeatured = document.querySelector('input[name="fact-featured"]:checked').value;
        const isActive = document.querySelector('input[name="fact-status"]:checked').value;
        
        // Validate form
        let isValid = true;
        
        if (!title) {
            showFieldError('fact-title', 'Title is required');
            isValid = false;
        }
        
        if (!content) {
            showFieldError('fact-content', 'Content is required');
            isValid = false;
        }
        
        if (!isValid) return;
        
        // Prepare data object
        const factData = {
            title: title,
            content: content,
            category: category || null,
            is_featured: parseInt(isFeatured),
            is_active: parseInt(isActive)
        };
        
        // Add or update health fact
        if (factId) {
            updateHealthFact(factId, factData);
        } else {
            addHealthFact(factData);
        }
    }
    
    /**
     * Add a new health fact
     * @param {Object} factData - The health fact data to add
     */
    function addHealthFact(factData) {
        fetch('/api/health-facts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(factData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to add health fact');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide modal
            factModal.style.display = 'none';
            factModal.classList.remove('show');
            
            // Remove backdrop
            var backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Show success notification
            showNotification('Health fact added successfully', 'success');
            
            // Reload health facts
            loadHealthFacts();
        })
        .catch(error => {
            console.error('Error adding health fact:', error);
            showNotification(error.message, 'danger');
        });
    }
    
    /**
     * Update an existing health fact
     * @param {number} factId - The ID of the health fact to update
     * @param {Object} factData - The updated health fact data
     */
    function updateHealthFact(factId, factData) {
        fetch(`/api/health-facts/${factId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(factData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to update health fact');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide modal
            factModal.style.display = 'none';
            factModal.classList.remove('show');
            
            // Remove backdrop
            var backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Show success notification
            showNotification('Health fact updated successfully', 'success');
            
            // Reload health facts
            loadHealthFacts();
        })
        .catch(error => {
            console.error('Error updating health fact:', error);
            showNotification(error.message, 'danger');
        });
    }
    
    /**
     * Delete a health fact
     */
    function confirmDeleteFact() {
        if (!factToDelete) return;
        
        fetch(`/api/health-facts/${factToDelete}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to delete health fact');
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
            showNotification('Health fact deleted successfully', 'success');
            
            // Reload health facts
            loadHealthFacts();
            
            // Reset factToDelete
            factToDelete = null;
        })
        .catch(error => {
            console.error('Error deleting health fact:', error);
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
