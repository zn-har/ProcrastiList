class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.editingTodoId = null;
        this.authToken = this.getAuthToken();
        this.init();
    }

    init() {
        this.checkAuth();
        this.bindEvents();
        this.loadTodos();
    }

    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    async checkAuth() {
        if (!this.authToken) {
            this.redirectToLogin();
            return;
        }

        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Invalid token');
            }

            const userData = await response.json();
            this.displayUserInfo(userData);
        } catch (error) {
            this.clearAuthToken();
            this.redirectToLogin();
        }
    }

    clearAuthToken() {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        this.authToken = null;
    }

    redirectToLogin() {
        window.location.href = '/static/login.html';
    }

    displayUserInfo(userData) {
        // Add user info to header
        const header = document.querySelector('.header');
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <div class="user-welcome">
                <span>Welcome back, <strong>${userData.name}</strong>!</span>
                <button class="logout-btn" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
        header.appendChild(userInfo);

        // Bind logout event
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuthToken();
            this.redirectToLogin();
        }
    }

    bindEvents() {
        // Add todo form
        document.getElementById('todoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTodo();
        });

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Edit modal
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditedTodo();
        });

        // Close modal on backdrop click
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                this.closeEditModal();
            }
        });
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    async loadTodos() {
        this.showLoading();
        try {
            const response = await fetch('/api/todos', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    this.redirectToLogin();
                    return;
                }
                throw new Error('Failed to load todos');
            }
            
            this.todos = await response.json();
            this.renderTodos();
            this.updateCounts();
        } catch (error) {
            this.showToast('Failed to load todos', 'error');
            console.error('Error loading todos:', error);
        } finally {
            this.hideLoading();
        }
    }

    async addTodo() {
        const title = document.getElementById('todoTitle').value.trim();
        const description = document.getElementById('todoDescription').value.trim();
        const priority = document.getElementById('todoPriority').value;
        const deadline = document.getElementById('todoDeadline').value;

        if (!title) return;

        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    priority,
                    deadline: deadline || null
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.redirectToLogin();
                    return;
                }
                throw new Error('Failed to add todo');
            }

            const newTodo = await response.json();
            this.todos.unshift(newTodo);
            this.clearForm();
            this.renderTodos();
            this.updateCounts();
            this.showToast('Todo added successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to add todo', 'error');
            console.error('Error adding todo:', error);
        }
    }

    async toggleTodo(id) {
        try {
            const response = await fetch(`/api/todos/${id}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.redirectToLogin();
                    return;
                }
                throw new Error('Failed to toggle todo');
            }

            const updatedTodo = await response.json();
            const index = this.todos.findIndex(todo => todo.id === id);
            if (index !== -1) {
                this.todos[index] = updatedTodo;
                this.renderTodos();
                this.updateCounts();
                this.showToast(
                    updatedTodo.completed ? 'Todo completed!' : 'Todo reopened!',
                    'success'
                );
            }
        } catch (error) {
            this.showToast('Failed to toggle todo', 'error');
            console.error('Error toggling todo:', error);
        }
    }

    async deleteTodo(id) {
        if (!confirm('Are you sure you want to delete this todo?')) return;

        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.redirectToLogin();
                    return;
                }
                throw new Error('Failed to delete todo');
            }

            this.todos = this.todos.filter(todo => todo.id !== id);
            this.renderTodos();
            this.updateCounts();
            this.showToast('Todo deleted successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to delete todo', 'error');
            console.error('Error deleting todo:', error);
        }
    }

    openEditModal(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        this.editingTodoId = id;
        document.getElementById('editTitle').value = todo.title;
        document.getElementById('editDescription').value = todo.description;
        document.getElementById('editPriority').value = todo.priority;
        
        // Format deadline for datetime-local input
        if (todo.deadline) {
            const deadlineDate = new Date(todo.deadline);
            const localISOTime = new Date(deadlineDate.getTime() - deadlineDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            document.getElementById('editDeadline').value = localISOTime;
        } else {
            document.getElementById('editDeadline').value = '';
        }
        
        document.getElementById('editModal').classList.add('show');
    }

    closeEditModal() {
        this.editingTodoId = null;
        document.getElementById('editModal').classList.remove('show');
    }

    async saveEditedTodo() {
        if (!this.editingTodoId) return;

        const title = document.getElementById('editTitle').value.trim();
        const description = document.getElementById('editDescription').value.trim();
        const priority = document.getElementById('editPriority').value;
        const deadline = document.getElementById('editDeadline').value;

        if (!title) return;

        try {
            const response = await fetch(`/api/todos/${this.editingTodoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    priority,
                    deadline: deadline || null
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.redirectToLogin();
                    return;
                }
                throw new Error('Failed to update todo');
            }

            const updatedTodo = await response.json();
            const index = this.todos.findIndex(todo => todo.id === this.editingTodoId);
            if (index !== -1) {
                this.todos[index] = updatedTodo;
                this.renderTodos();
                this.showToast('Todo updated successfully!', 'success');
            }
            this.closeEditModal();
        } catch (error) {
            this.showToast('Failed to update todo', 'error');
            console.error('Error updating todo:', error);
        }
    }

    renderTodos() {
        const todoList = document.getElementById('todoList');
        const emptyState = document.getElementById('emptyState');
        
        const filteredTodos = this.getFilteredTodos();
        
        if (filteredTodos.length === 0) {
            todoList.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        todoList.innerHTML = filteredTodos.map(todo => this.createTodoHTML(todo)).join('');

        // Bind event listeners
        todoList.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.toggleTodo(id);
            });
        });

        todoList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.openEditModal(id);
            });
        });

        todoList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.deleteTodo(id);
            });
        });
    }

    createTodoHTML(todo) {
        const createdDate = new Date(todo.created_at).toLocaleDateString();
        const createdTime = new Date(todo.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const deadlineInfo = this.getDeadlineInfo(todo.deadline);
        const deadlineClasses = this.getDeadlineClasses(todo.deadline, todo.completed);
        
        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''} ${todo.priority}-priority ${deadlineClasses}">
                <div class="todo-header">
                    <div class="todo-content">
                        <div class="todo-title">${this.escapeHtml(todo.title)}</div>
                        ${todo.description ? `<div class="todo-description">${this.escapeHtml(todo.description)}</div>` : ''}
                    </div>
                    <div class="todo-actions">
                        <button class="action-btn toggle-btn ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                            <i class="fas ${todo.completed ? 'fa-undo' : 'fa-check'}"></i>
                            ${todo.completed ? 'Undo' : 'Done'}
                        </button>
                        <button class="action-btn edit-btn" data-id="${todo.id}">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        <button class="action-btn delete-btn" data-id="${todo.id}">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </div>
                <div class="todo-meta">
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <span class="priority-badge priority-${todo.priority}">
                            ${todo.priority} priority
                        </span>
                        ${deadlineInfo.badge}
                    </div>
                    <span class="todo-timestamp">
                        Created: ${createdDate} at ${createdTime}
                    </span>
                </div>
            </div>
        `;
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            case 'pending':
                return this.todos.filter(todo => !todo.completed);
            default:
                return this.todos;
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.renderTodos();
    }

    updateCounts() {
        const allCount = this.todos.length;
        const completedCount = this.todos.filter(todo => todo.completed).length;
        const pendingCount = allCount - completedCount;

        document.getElementById('allCount').textContent = allCount;
        document.getElementById('completedCount').textContent = completedCount;
        document.getElementById('pendingCount').textContent = pendingCount;
    }

    clearForm() {
        document.getElementById('todoForm').reset();
        document.getElementById('todoPriority').value = 'medium';
    }

    getDeadlineInfo(deadline) {
        if (!deadline) {
            return { badge: '', status: null };
        }

        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diffMs = deadlineDate - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        const formatOptions = {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        let badgeClass = '';
        let icon = 'fa-clock';
        let text = '';

        if (diffMs < 0) {
            // Overdue
            badgeClass = 'deadline-overdue';
            icon = 'fa-exclamation-triangle';
            text = `Overdue: ${deadlineDate.toLocaleDateString()} ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffHours <= 24) {
            // Due soon (within 24 hours)
            badgeClass = 'deadline-due-soon';
            icon = 'fa-bell';
            if (diffHours < 1) {
                text = `Due in ${Math.max(1, Math.floor(diffMs / (1000 * 60)))} minutes`;
            } else {
                text = `Due in ${Math.floor(diffHours)} hours`;
            }
        } else if (diffDays <= 7) {
            // Due within a week
            badgeClass = 'deadline-upcoming';
            icon = 'fa-calendar-alt';
            text = `Due ${deadlineDate.toLocaleDateString([], formatOptions)}`;
        } else {
            // Future deadline
            badgeClass = 'deadline-upcoming';
            icon = 'fa-calendar';
            text = `Due ${deadlineDate.toLocaleDateString([], formatOptions)}`;
        }

        const badge = `<span class="deadline-badge ${badgeClass}">
            <i class="fas ${icon}"></i>
            ${text}
        </span>`;

        return { badge, status: badgeClass.replace('deadline-', '') };
    }

    getDeadlineClasses(deadline, completed) {
        if (!deadline || completed) return '';
        
        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diffMs = deadlineDate - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffMs < 0) {
            return 'overdue';
        } else if (diffHours <= 24) {
            return 'due-soon';
        }
        
        return '';
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-triangle' : 
                    'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
        
        // Remove on click
        toast.addEventListener('click', () => {
            toast.remove();
        });
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});

// Add some keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape to close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('editModal');
        if (modal.classList.contains('show')) {
            modal.classList.remove('show');
        }
    }
    
    // Ctrl/Cmd + Enter to submit forms
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeForm = document.querySelector('#todoForm:focus-within, #editForm:focus-within');
        if (activeForm) {
            activeForm.dispatchEvent(new Event('submit'));
        }
    }
});
