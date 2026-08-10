// Request permission for desktop notifications
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

// Show a desktop notification
export const showDesktopNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch (error) {
      console.error("Error showing desktop notification:", error);
    }
  }
  return null;
};

// Show notification for new lead
export const notifyNewLead = (leadName: string, leadCompany?: string) => {
  const body = leadCompany 
    ? `Nova lead: ${leadName} - ${leadCompany}`
    : `Nova lead: ${leadName}`;
  
  showDesktopNotification("🎯 Novo Lead no CRM!", {
    body,
    tag: "new-lead", // Prevent duplicate notifications
    requireInteraction: false,
  });
};
