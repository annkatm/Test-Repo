// Toast utility functions to replace alert() calls

export const showToast = (message, type = 'info', title = null, duration = 5000) => {
  if (window.showToast) {
    window.showToast({
      type,
      title,
      message,
      duration
    });
  } else {
    // Fallback to alert if toast system not available
    alert(message);
  }
};

export const showSuccess = (message, title = 'Success', duration = 4000) => {
  showToast(message, 'success', title, duration);
};

export const showError = (message, title = 'Error', duration = 6000) => {
  showToast(message, 'error', title, duration);
};

export const showWarning = (message, title = 'Warning', duration = 5000) => {
  showToast(message, 'warning', title, duration);
};

export const showInfo = (message, title = 'Info', duration = 4000) => {
  showToast(message, 'info', title, duration);
};

// Replace alert() function globally
export const replaceAlert = () => {
  const originalAlert = window.alert;
  
  window.alert = (message) => {
    // Determine toast type based on message content
    let type = 'info';
    let title = 'Notification';
    
    if (message.includes('Error') || message.includes('Failed') || message.includes('error')) {
      type = 'error';
      title = 'Error';
    } else if (message.includes('Success') || message.includes('successfully') || message.includes('✓')) {
      type = 'success';
      title = 'Success';
    } else if (message.includes('Warning') || message.includes('required')) {
      type = 'warning';
      title = 'Warning';
    }
    
    showToast(message, type, title);
  };
  
  return originalAlert;
};
