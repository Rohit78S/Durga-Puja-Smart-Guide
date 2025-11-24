// push-notifications.js - Advanced Push Notification Service for Durga Puja App

class PushNotificationService {
    constructor() {
        this.subscriptionsKey = 'puja-push-subscriptions';
        this.messageQueue = [];
        this.isProcessing = false;
        this.retryAttempts = 3;
        this.retryDelay = 5000;
        
        // Bind methods to prevent 'this' context loss
        this.requestPermission = this.requestPermission.bind(this);

        this.initializeService();
    }

    async initializeService() {
        // Load saved subscriptions
        this.subscriptions = this.loadSubscriptions();

        // Setup message handlers
        this.setupMessageHandlers();

        console.log('✅ Push Notification Service initialized');
    }

    // --- ADDED: The Missing Permission Request Function ---
    async requestPermission() {
        if (!('Notification' in window)) {
            alert("This browser does not support notifications.");
            return false;
        }

        if (Notification.permission === 'granted') {
            console.log("Permission already granted.");
            return true;
        }

        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            // Send a welcome ping
            this.sendImmediateNotification({
                type: 'update', // Using your template system
                data: { version: '2025.1.0' }
            });
            return true;
        }
        return false;
    }

    loadSubscriptions() {
        try {
            const stored = localStorage.getItem(this.subscriptionsKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load subscriptions:', error);
            return [];
        }
    }

    saveSubscriptions() {
        try {
            localStorage.setItem(this.subscriptionsKey, JSON.stringify(this.subscriptions));
        } catch (error) {
            console.error('Failed to save subscriptions:', error);
        }
    }

    setupMessageHandlers() {
        // Handle messages from main thread
        if (typeof window !== 'undefined') {
            window.addEventListener('message', this.handleMessage.bind(this));
        }

        // Handle service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        }
    }

    handleMessage(event) {
        if (!event.data || !event.data.type) return;

        const { type, data } = event.data;

        switch (type) {
            case 'SCHEDULE_NOTIFICATION':
                this.scheduleNotification(data);
                break;
            case 'CANCEL_NOTIFICATION':
                this.cancelNotification(data.id);
                break;
            case 'SEND_IMMEDIATE':
                this.sendImmediateNotification(data);
                break;
        }
    }

    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;

        if (type === 'NOTIFICATION_CLICKED') {
            this.handleNotificationClick(data);
        }
    }

    // Create notification templates for different scenarios
    createNotificationTemplate(type, data) {
        const templates = {
            update: {
                title: 'Durga Puja App Updated',
                body: `New version ${data.version || 'Latest'} available with exciting features!`,
                icon: 'images/icon.png', // Ensure these paths exist
                badge: 'images/badge.png',
                tag: 'app-update',
                actions: [
                    { action: 'update', title: 'Update Now' },
                    { action: 'dismiss', title: 'Later' }
                ],
                data: { type: 'update', url: '/', ...data },
                requireInteraction: true
            },

            puja_reminder: {
                title: `${data.event} - ${data.date}`,
                body: `Don't miss ${data.event}! Perfect time for pandal hopping.`,
                icon: 'images/icon.png',
                badge: 'images/badge.png',
                tag: `puja-${data.event ? data.event.toLowerCase() : 'alert'}`,
                actions: [
                    { action: 'view_pandals', title: 'View Pandals' },
                    { action: 'set_reminder', title: 'Remind Later' }
                ],
                data: { type: 'puja_reminder', url: '/?section=pandals', ...data },
                requireInteraction: true,
                timestamp: Date.now()
            },

            gps_active: {
                title: 'GPS Tracking Active',
                body: 'Your pandal route is being tracked. Enjoying the puja hopping?',
                icon: 'images/icon.png',
                badge: 'images/badge.png',
                tag: 'gps-tracking',
                actions: [
                    { action: 'view_route', title: 'View Route' },
                    { action: 'stop_tracking', title: 'Stop' }
                ],
                data: { type: 'gps_tracking', url: '/?section=map', ...data },
                silent: false
            },

            pandal_nearby: {
                title: 'Pandal Nearby!',
                body: `${data.pandalName} is just ${data.distance}m away. Want to visit?`,
                icon: 'images/icon.png',
                badge: 'images/badge.png',
                tag: `nearby-${data.pandalId}`,
                actions: [
                    { action: 'navigate', title: 'Navigate' },
                    { action: 'bookmark', title: 'Bookmark' }
                ],
                data: { type: 'pandal_nearby', pandalId: data.pandalId, ...data },
                silent: true
            },

            weather_alert: {
                title: 'Weather Alert',
                body: `${data.condition} expected. Plan your pandal visits accordingly.`,
                icon: 'images/icon.png',
                badge: 'images/badge.png',
                tag: 'weather-alert',
                actions: [
                    { action: 'view_weather', title: 'View Forecast' }
                ],
                data: { type: 'weather_alert', url: '/?weather=true', ...data }
            },

            milestone: {
                title: 'Achievement Unlocked!',
                body: `You've visited ${data.count} pandals! You earned the "${data.badge}" badge.`,
                icon: 'images/icon.png',
                badge: 'images/badge.png',
                tag: `achievement-${data.badge}`,
                actions: [
                    { action: 'view_badges', title: 'View Badges' }
                ],
                data: { type: 'achievement', url: '/?section=badges', ...data },
                vibrate: [200, 100, 200]
            },

            emergency: {
                title: 'Emergency Alert',
                body: data.message,
                icon: 'images/icon.png',
                badge: 'images/badge.png',
                tag: `emergency-${data.id}`,
                actions: [
                    { action: 'view_details', title: 'Details' }
                ],
                data: { type: 'emergency', url: '/?section=emergency', ...data },
                requireInteraction: true,
                vibrate: [200, 100, 200, 100, 200],
                silent: false
            }
        };

        return templates[type] || null;
    }

    scheduleNotification(notificationData) {
        const { type, scheduledTime, data } = notificationData;
        const template = this.createNotificationTemplate(type, data || {});

        if (!template) {
            console.error('Unknown notification type:', type);
            return;
        }

        const now = Date.now();
        const delay = scheduledTime - now;

        if (delay <= 0) {
            this.sendImmediateNotification({ type, data });
            return;
        }

        const timeoutId = setTimeout(() => {
            this.sendImmediateNotification({ type, data });
        }, delay);

        this.messageQueue.push({
            id: `${type}-${Date.now()}`,
            type,
            data,
            scheduledTime,
            timeoutId,
            template
        });

        console.log(`Notification scheduled for ${new Date(scheduledTime).toLocaleString()}`);
    }

    cancelNotification(notificationId) {
        const index = this.messageQueue.findIndex(item => item.id === notificationId);

        if (index !== -1) {
            const notification = this.messageQueue[index];
            if (notification.timeoutId) {
                clearTimeout(notification.timeoutId);
            }
            this.messageQueue.splice(index, 1);
            console.log('Notification cancelled:', notificationId);
        }
    }

    async sendImmediateNotification(notificationData) {
        const { type, data } = notificationData;
        const template = this.createNotificationTemplate(type, data || {});

        if (!template) {
            console.error('Unknown notification type:', type);
            return;
        }

        try {
            await this.sendNotification(template);
        } catch (error) {
            console.error('Failed to send notification:', error);
            this.queueForRetry(notificationData);
        }
    }

    async sendNotification(notificationOptions) {
        // Fallback for when Service Worker is not ready or active
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
            console.warn('Service Worker not active, using fallback notification');
            new Notification(notificationOptions.title, notificationOptions);
            return;
        }

        const registration = await navigator.serviceWorker.ready;

        // Final permission check
        if (Notification.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
        }

        await registration.showNotification(notificationOptions.title, {
            ...notificationOptions,
            timestamp: notificationOptions.timestamp || Date.now()
        });

        console.log('Notification sent:', notificationOptions.title);
    }

    queueForRetry(notificationData) {
        const retryItem = {
            ...notificationData,
            retryCount: (notificationData.retryCount || 0) + 1
        };

        if (retryItem.retryCount <= this.retryAttempts) {
            setTimeout(() => {
                this.sendImmediateNotification(retryItem);
            }, this.retryDelay);

            console.log(`Retry ${retryItem.retryCount}/${this.retryAttempts}`);
        }
    }

    handleNotificationClick(eventData) {
        const { action, data } = eventData;

        // Note: FocusApp logic removed because it crashes in the Window scope.
        // The Service Worker handles the focus event automatically via 'notificationclick'.

        switch (action) {
            case 'update':
                this.postMessage({ type: 'TRIGGER_UPDATE', data });
                break;
            case 'navigate':
                if (data.pandalId) window.location.href = `/?pandal=${data.pandalId}`;
                break;
            default:
                if (data.url) window.location.href = data.url;
        }
    }

    postMessage(message) {
        if (typeof window !== 'undefined' && window.postMessage) {
            window.postMessage(message, '*');
        }
    }

    // Schedule standard Puja events
    scheduleAllPujaNotifications() {
        const pujaEvents = [
            { name: 'Mahalaya', date: '2025-09-21' },
            { name: 'Sasthi', date: '2025-09-28' },
            { name: 'Saptami', date: '2025-09-29' },
            { name: 'Astami', date: '2025-09-30' },
            { name: 'Navami', date: '2025-10-01' },
            { name: 'Dashami', date: '2025-10-02' }
        ];

        pujaEvents.forEach(event => {
            // Schedule for 8 AM on the day of
            const dateObj = new Date(event.date);
            dateObj.setHours(8, 0, 0, 0);

            this.scheduleNotification({
                type: 'puja_reminder',
                scheduledTime: dateObj.getTime(),
                data: {
                    event: event.name,
                    date: dateObj.toLocaleDateString()
                }
            });
        });

        console.log('All Puja notifications scheduled');
    }
}

// --- GLOBAL INITIALIZATION (Safe Version) ---
let pushNotificationService;

document.addEventListener('DOMContentLoaded', () => {
    pushNotificationService = new PushNotificationService();
    // Make it available to your Login script
    window.pushNotificationService = pushNotificationService;
    console.log("✅ Push Notification Service Ready");
});

// IMPORTANT: No 'export default' here to prevent browser crashes.