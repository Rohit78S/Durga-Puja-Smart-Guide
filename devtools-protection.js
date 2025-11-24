// DevTools Protection Script
// Protects your web application from inspection via browser developer tools

(function() {
    'use strict';

    let devtoolsOpen = false;
    let warningShown = false;

    // Detect DevTools by window size difference
    const detectDevToolsBySize = () => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        if (widthThreshold || heightThreshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                blockAccess();
            }
        }
    };

    // Detect DevTools using console tricks
    const detectDevToolsByConsole = () => {
        const element = new Image();
        let devtoolsDetected = false;

        Object.defineProperty(element, 'id', {
            get: function() {
                devtoolsDetected = true;
                if (!devtoolsOpen) {
                    devtoolsOpen = true;
                    blockAccess();
                }
            }
        });

        console.log('%c', element);
        console.clear();
    };

    // Block access when DevTools detected
    const blockAccess = () => {
        if (warningShown) return;
        warningShown = true;

        // Clear the page and show warning
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(10px);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                animation: fadeIn 0.4s ease-in;
            ">
                <style>
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from {
                            transform: translateY(30px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                    }
                </style>
                <div style="
                    background: rgba(255, 255, 255, 0.95);
                    padding: 35px 30px;
                    border-radius: 16px;
                    box-shadow:
                        0 25px 50px rgba(0, 0, 0, 0.5),
                        0 10px 25px rgba(0, 0, 0, 0.3),
                        0 5px 10px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.5);
                    text-align: center;
                    max-width: 380px;
                    animation: slideUp 0.5s ease-out;
                    border: 1px solid rgba(231, 76, 60, 0.15);
                ">
                    <div style="
                        width: 60px;
                        height: 60px;
                        background: linear-gradient(135deg, #e74c3c, #c0392b);
                        border-radius: 50%;
                        margin: 0 auto 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow:
                            0 10px 30px rgba(231, 76, 60, 0.4),
                            0 5px 15px rgba(231, 76, 60, 0.3),
                            0 0 0 8px rgba(231, 76, 60, 0.1);
                        animation: pulse 2s infinite;
                    ">
                        <span style="font-size: 32px;">🔒</span>
                    </div>

                    <h1 style="
                        color: #2c3e50;
                        margin-bottom: 12px;
                        font-size: 24px;
                        font-weight: 700;
                        letter-spacing: -0.3px;
                    ">Access Denied</h1>

                    <div style="
                        width: 50px;
                        height: 3px;
                        background: linear-gradient(90deg, #e74c3c, #c0392b);
                        margin: 0 auto 18px;
                        border-radius: 2px;
                    "></div>

                    <p style="
                        color: #7f8c8d;
                        font-size: 14px;
                        line-height: 1.6;
                        margin-bottom: 20px;
                    ">
                        Developer tools detected. Please close DevTools and refresh.
                    </p>

                    <button onclick="location.reload()" style="
                        padding: 12px 32px;
                        background: linear-gradient(135deg, #3498db, #2980b9);
                        color: white;
                        border: none;
                        border-radius: 50px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        box-shadow:
                            0 8px 20px rgba(52, 152, 219, 0.4),
                            0 4px 10px rgba(52, 152, 219, 0.3);
                        transition: all 0.3s ease;
                        letter-spacing: 0.3px;
                    "
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 12px 30px rgba(52, 152, 219, 0.5), 0 6px 15px rgba(52, 152, 219, 0.4)'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 20px rgba(52, 152, 219, 0.4), 0 4px 10px rgba(52, 152, 219, 0.3)'">
                        🔄 Refresh
                    </button>
                </div>
            </div>
        `;
    };

    // Disable right-click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showToast('🚫 Right-click is disabled', '#e74c3c');
        return false;
    });

    // Disable keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            showToast('🚫 Developer tools are disabled', '#e74c3c');
            return false;
        }
        // Ctrl+Shift+I
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            showToast('🚫 Developer tools are disabled', '#e74c3c');
            return false;
        }
        // Ctrl+Shift+J
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            showToast('🚫 Console is disabled', '#e74c3c');
            return false;
        }
        // Ctrl+U
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            showToast('🚫 View source is disabled', '#e74c3c');
            return false;
        }
        // Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            showToast('🚫 Inspect element is disabled', '#e74c3c');
            return false;
        }
        // Ctrl+S
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            showToast('🚫 Save page is disabled', '#e74c3c');
            return false;
        }
    });

    // Show toast notification with modern design
    const showToast = (message, color = '#e74c3c') => {
        const existingToasts = document.querySelectorAll('.protection-toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = 'protection-toast';
        toast.innerHTML = `
            <style>
                @keyframes slideInRight {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            </style>
            <div style="
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <span style="font-size: 18px;">${message.split(' ')[0]}</span>
                <span style="font-size: 13px; font-weight: 500;">${message.substring(message.indexOf(' ') + 1)}</span>
            </div>
        `;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.95);
            color: ${color};
            padding: 12px 20px;
            border-radius: 12px;
            box-shadow:
                0 10px 30px rgba(0, 0, 0, 0.3),
                0 5px 15px rgba(0, 0, 0, 0.2),
                0 2px 5px rgba(0, 0, 0, 0.1);
            z-index: 999999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            animation: slideInRight 0.4s ease-out;
            border-left: 3px solid ${color};
            backdrop-filter: blur(10px);
            font-size: 14px;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.4s ease-in forwards';
            setTimeout(() => toast.remove(), 400);
        }, 2600);
    };

    // Disable text selection
    document.addEventListener('selectstart', (e) => {
        e.preventDefault();
        return false;
    });

    // Disable copy
    document.addEventListener('copy', (e) => {
        e.preventDefault();
        showToast('🚫 Copying is disabled', '#e74c3c');
        return false;
    });

    // Disable cut
    document.addEventListener('cut', (e) => {
        e.preventDefault();
        return false;
    });

    // Disable paste
    document.addEventListener('paste', (e) => {
        e.preventDefault();
        return false;
    });

    // Prevent iframe embedding
    if (window.top !== window.self) {
        window.top.location = window.self.location;
    }

    // Debugger trap
    setInterval(() => {
        (function() {
            return false;
        })['constructor']('debugger')();
    }, 50);

    // Run detection checks
    setInterval(detectDevToolsBySize, 500);
    setInterval(detectDevToolsByConsole, 1000);

    // Clear console
    setInterval(() => {
        console.clear();
    }, 2000);

    // Detect DevTools on page load
    window.addEventListener('load', () => {
        detectDevToolsBySize();
        detectDevToolsByConsole();
    });

    // Monitor resize events
    window.addEventListener('resize', detectDevToolsBySize);

    console.log('%cStop!', 'color: red; font-size: 50px; font-weight: bold;');
    console.log('%cThis is a browser feature intended for developers. If someone told you to copy-paste something here, it is a scam.', 'font-size: 16px;');

})();