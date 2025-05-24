class ActivityTracker {
    constructor() {
        this.currentUser = null;
        this.currentSession = null;
        this.sessionStartTime = null;
        this.timerInterval = null;
        this.activities = {
            reading: { name: 'Reading', emoji: '📚' },
            videogames: { name: 'Video Games', emoji: '🎮' },
            tv: { name: 'TV', emoji: '📺' },
            socialmedia: { name: 'Social Media', emoji: '📱' },
            study: { name: 'Study', emoji: '📖' },
            music: { name: 'Music Lessons', emoji: '🎵' },
            physical: { name: 'Physical Activity', emoji: '🏃' }
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkLogin();
        this.updateDisplay();
    }

    bindEvents() {
        // Login events
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Activity buttons
        document.querySelectorAll('.activity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const activity = e.target.dataset.activity;
                this.startActivity(activity);
            });
        });

        // Session controls
        document.getElementById('stopSession').addEventListener('click', () => {
            this.stopSession();
        });

        // Modal events
        document.getElementById('saveTime').addEventListener('click', () => {
            this.saveManualTime();
        });

        document.getElementById('cancelTime').addEventListener('click', () => {
            this.hideModal();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });
    }

    // Authentication
    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        // Simple authentication - in production, use proper authentication
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            this.currentUser = username;
            localStorage.setItem('currentUser', username);
            this.showDashboard();
            errorDiv.textContent = '';
        } else {
            // Create new user if doesn't exist
            if (username && password) {
                this.createUser(username, password);
                this.currentUser = username;
                localStorage.setItem('currentUser', username);
                this.showDashboard();
                errorDiv.textContent = '';
            } else {
                errorDiv.textContent = 'Please enter both username and password';
            }
        }
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('users')) || [];
    }

    createUser(username, password) {
        const users = this.getUsers();
        users.push({ username, password });
        localStorage.setItem('users', JSON.stringify(users));
    }

    checkLogin() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = savedUser;
            this.showDashboard();
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        if (this.currentSession) {
            this.stopSession();
        }
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('dashboardScreen').classList.remove('active');
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('dashboardScreen').classList.add('active');
        document.getElementById('currentUser').textContent = this.currentUser;
        this.updateDisplay();
    }

    // Activity Management
    startActivity(activityKey) {
        if (this.currentSession) {
            this.stopSession();
        }

        this.currentSession = activityKey;
        this.sessionStartTime = new Date();
        
        document.getElementById('currentActivity').textContent = this.activities[activityKey].name;
        document.getElementById('activeSession').classList.remove('hidden');
        
        this.startTimer();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = new Date() - this.sessionStartTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            document.getElementById('sessionTimer').textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopSession() {
        if (!this.currentSession) return;

        const endTime = new Date();
        const duration = endTime - this.sessionStartTime;
        const minutes = Math.round(duration / 60000);

        this.logActivity(this.currentSession, minutes);
        
        clearInterval(this.timerInterval);
        this.currentSession = null;
        this.sessionStartTime = null;
        
        document.getElementById('activeSession').classList.add('hidden');
        this.updateDisplay();
    }

    logActivity(activityKey, minutes) {
        if (minutes < 1) return;

        const today = new Date().toDateString();
        const data = this.getUserData();
        
        if (!data[today]) {
            data[today] = {};
        }
        
        if (!data[today][activityKey]) {
            data[today][activityKey] = 0;
        }
        
        data[today][activityKey] += minutes;
        this.saveUserData(data);
    }

    showModal(activityKey) {
        document.getElementById('modalActivity').textContent = this.activities[activityKey].name;
        document.getElementById('timerModal').classList.remove('hidden');
        document.getElementById('timerModal').dataset.activity = activityKey;
    }

    hideModal() {
        document.getElementById('timerModal').classList.add('hidden');
        document.getElementById('hours').value = '';
        document.getElementById('minutes').value = '';
    }

    saveManualTime() {
        const hours = parseInt(document.getElementById('hours').value) || 0;
        const minutes = parseInt(document.getElementById('minutes').value) || 0;
        const totalMinutes = hours * 60 + minutes;
        
        if (totalMinutes > 0) {
            const activityKey = document.getElementById('timerModal').dataset.activity;
            this.logActivity(activityKey, totalMinutes);
            this.updateDisplay();
        }
        
        this.hideModal();
    }

    // Data Management
    getUserData() {
        const key = `data_${this.currentUser}`;
        return JSON.parse(localStorage.getItem(key)) || {};
    }

    saveUserData(data) {
        const key = `data_${this.currentUser}`;
        localStorage.setItem(key, JSON.stringify(data));
    }

    // Display Updates
    updateDisplay() {
        if (!this.currentUser) return;
        
        this.updateTodaySummary();
        this.updateWeeklyReport();
    }

    updateTodaySummary() {
        const today = new Date().toDateString();
        const data = this.getUserData();
        const todayData = data[today] || {};
        
        const summaryDiv = document.getElementById('todaySummary');
        summaryDiv.innerHTML = '';
        
        Object.keys(this.activities).forEach(activityKey => {
            const minutes = todayData[activityKey] || 0;
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            
            const div = document.createElement('div');
            div.className = 'activity-summary';
            div.innerHTML = `
                <h4>${this.activities[activityKey].emoji} ${this.activities[activityKey].name}</h4>
                <div class="activity-time">${hours}h ${remainingMinutes}m</div>
            `;
            summaryDiv.appendChild(div);
        });
    }

    updateWeeklyReport() {
        const data = this.getUserData();
        const reportDiv = document.getElementById('weeklyReport');
        reportDiv.innerHTML = '';
        
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date);
        }
        
        last7Days.forEach(date => {
            const dateStr = date.toDateString();
            const dayData = data[dateStr] || {};
            const totalMinutes = Object.values(dayData).reduce((sum, minutes) => sum + minutes, 0);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            
            const div = document.createElement('div');
            div.className = 'week-day';
            div.innerHTML = `
                <span>${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span>${hours}h ${minutes}m total</span>
            `;
            reportDiv.appendChild(div);
        });
    }

    // Export functionality
    exportData() {
        const data = this.getUserData();
        const exportData = {
            user: this.currentUser,
            exportDate: new Date().toISOString(),
            activities: this.activities,
            data: data
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-data-${this.currentUser}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new ActivityTracker();
});