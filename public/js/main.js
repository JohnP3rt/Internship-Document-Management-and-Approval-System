document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(loginForm);
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    document.cookie = `token=${data.token}; path=/`;
                    window.location.href = `/${data.role}/dashboard`;
                } else {
                    alert(data.error || 'Login failed');
                }
            } catch (err) {
                alert('Login failed. Please try again.');
            }
        });
    }

    const originalFetch = window.fetch;
    window.fetch = function() {
        let [resource, config] = arguments;
        if(config === undefined) {
            config = {};
        }
        if(config.headers === undefined) {
            config.headers = {};
        }
        
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        return originalFetch(resource, config);
    };

    document.querySelectorAll('.delete-doc').forEach(button => {
        button.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this document?')) {
                const docId = button.dataset.id;
                const response = await fetch(`/api/student/document/${docId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) {
                    window.location.reload();
                }
            }
        });
    });

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            try {
                const response = await fetch('/api/auth/student-register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                const data = await response.json();
                if (response.ok) {
                    alert(data.message);
                    window.location.href = '/';
                } else {
                    alert(data.error);
                }
            } catch (err) {
                alert('Registration failed. Please try again.');
            }
        });
    }

    document.querySelectorAll('.approve-student').forEach(button => {
        button.addEventListener('click', async (e) => {
            const userId = e.target.dataset.id;
            try {
                const response = await fetch(`/api/coordinator/approve-student/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) {
                    window.location.reload();
                }
            } catch (err) {
                alert('Error approving student');
            }
        });
    });
});
