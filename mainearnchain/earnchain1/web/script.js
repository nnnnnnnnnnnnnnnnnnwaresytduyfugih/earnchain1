class EarnChainApp {
  constructor() {
    this.userId = null;
    this.backendUrl = '';
    this.totalEarned = 0;
    this.init();
  }

  init() {
    // Initialize Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      if (user && user.id) {
        this.userId = user.id;
        this.backendUrl = window.location.origin;
        this.registerUser();
        this.loadDashboard();
      } else {
        this.showError('Unable to get Telegram user data');
      }
    } else {
      // Fallback for local testing
      this.userId = '7746836233'; // Your Telegram ID for testing
      this.backendUrl = window.location.origin;
      this.registerUser();
      this.loadDashboard();
    }
  }

  async registerUser() {
    try {
      await fetch(`${this.backendUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId })
      });
    } catch (error) {
      console.error('Registration error:', error);
    }
  }

  async loadDashboard() {
    await this.loadBalance();
    await this.loadAds();
    await this.loadHistory();
  }

  async loadBalance() {
    try {
      const response = await fetch(`${this.backendUrl}/user/${this.userId}`);
      const data = await response.json();
      document.getElementById('balance').textContent = data.balance.toFixed(4);
      this.totalEarned = data.balance;
      document.getElementById('total-earned').textContent = data.balance.toFixed(4);
    } catch (error) {
      this.showError('Failed to load balance');
    }
  }

  async loadAds() {
    const adsContainer = document.getElementById('ads');
    try {
      const response = await fetch(`${this.backendUrl}/ads?userId=${this.userId}`);
      const ads = await response.json();
      
      if (ads.length === 0) {
        adsContainer.innerHTML = `
          <div class="ad-card">
            <div class="ad-title"><i class="fas fa-info-circle"></i> No Opportunities Available</div>
            <p>Check back later for new earning opportunities!</p>
          </div>
        `;
        return;
      }

      adsContainer.innerHTML = '';
      ads.forEach(ad => {
        const adElement = document.createElement('div');
        adElement.className = 'ad-card';
        adElement.innerHTML = `
          <div class="ad-title">
            <i class="fas fa-gift"></i>
            ${ad.title}
          </div>
          <div class="ad-reward">
            <i class="fas fa-coins"></i>
            +${ad.reward} CHAIN POINTS
          </div>
          <button class="click-btn" onclick="app.clickAd(${ad.id})">
            <i class="fas fa-hand-pointer"></i> Claim Reward
          </button>
        `;
        adsContainer.appendChild(adElement);
      });
    } catch (error) {
      adsContainer.innerHTML = '<div class="error">Failed to load opportunities</div>';
    }
  }

  async loadHistory() {
    const historyContainer = document.getElementById('history');
    try {
      const response = await fetch(`${this.backendUrl}/history/${this.userId}`);
      const history = await response.json();
      
      if (history.length === 0) {
        historyContainer.innerHTML = `
          <div class="history-item">
            <div class="history-title">No Earnings Yet</div>
            <div class="history-details">
              <span>Start earning by clicking opportunities above</span>
            </div>
          </div>
        `;
        return;
      }

      historyContainer.innerHTML = '';
      history.slice(0, 10).forEach(item => {
        const date = new Date(item.timestamp * 1000);
        const historyElement = document.createElement('div');
        historyElement.className = 'history-item';
        historyElement.innerHTML = `
          <div class="history-title">${item.title}</div>
          <div class="history-details">
            <span>+${item.points} CHAIN POINTS</span>
            <span>${date.toLocaleDateString()}</span>
          </div>
        `;
        historyContainer.appendChild(historyElement);
      });
    } catch (error) {
      historyContainer.innerHTML = '<div class="error">Failed to load earnings history</div>';
    }
  }

  async clickAd(adId) {
    const buttons = document.querySelectorAll('.click-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    });

    try {
      const response = await fetch(`${this.backendUrl}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, adId: adId })
      });

      const result = await response.json();
      
      if (response.ok) {
        // Success animation
        const btn = event.target || event.currentTarget;
        btn.innerHTML = '<i class="fas fa-check"></i> Reward Claimed!';
        btn.style.background = 'linear-gradient(45deg, #4CAF50, #8BC34A)';
        
        setTimeout(() => {
          this.loadDashboard();
          // Show success message
          if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.showPopup({
              title: "Success!",
              message: `🎉 You earned ${result.points} CHAIN POINTS!`,
              buttons: [{text: "Awesome!"}]
            });
          } else {
            alert(`🎉 Success! You earned ${result.points} CHAIN POINTS!`);
          }
        }, 1500);
      } else {
        throw new Error(result.error || 'Failed to claim reward');
      }
    } catch (error) {
      // Error handling
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.showPopup({
          title: "Error",
          message: `❌ ${error.message || 'Failed to claim reward'}`,
          buttons: [{text: "Try Again"}]
        });
      } else {
        alert(`❌ Error: ${error.message || 'Failed to claim reward'}`);
      }
      this.loadDashboard(); // Refresh to show current state
    } finally {
      // Re-enable buttons after a delay
      setTimeout(() => {
        buttons.forEach(btn => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-hand-pointer"></i> Claim Reward';
        });
      }, 2000);
    }
  }

  showError(message) {
    const container = document.querySelector('.container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      ${message}
    `;
    container.insertBefore(errorDiv, container.firstChild);
    
    // Auto-remove error after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }
}

// Initialize app when page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new EarnChainApp();
});

// Handle Telegram Web App events
if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.onEvent('viewportChanged', () => {
    // Handle viewport changes if needed
  });
}