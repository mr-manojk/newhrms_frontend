
import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Notification } from '../types';
import { systemService, NOTIFICATIONS_UPDATED_EVENT } from '../services/systemService';

export const useNotifications = (user: User | null) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      const allNotifs = await systemService.getNotifications();
      // If server is offline, getNotifications now returns an empty array safely
      const userNotifs = (allNotifs || [])
        .filter(n => String(n.userId) === String(user.id))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setNotifications(userNotifs);
    } catch (error) {
      if (!silent) console.error("Error loading notifications:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(() => fetchNotifications(true), 15000);
    
    const handleUpdateEvent = () => fetchNotifications(true);
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nexushr_cache_notifications') fetchNotifications(true);
    };
    const handleFocus = () => fetchNotifications(true);

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUpdateEvent);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUpdateEvent);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchNotifications]);

  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.isRead), 
  [notifications]);

  const unreadCount = unreadNotifications.length;

  const markAsRead = async (id: string) => {
    const updatedLocal = notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    setNotifications(updatedLocal);
    
    try {
      const allNotifs = await systemService.getNotifications();
      const globalUpdated = allNotifs.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      );
      await systemService.saveNotifications(globalUpdated);
    } catch (error) {
      // Offline fallback already handled by safeFetch returning null
    }
  };

  const clearAll = async () => {
    if (!user) return;
    const updatedLocal = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updatedLocal);

    try {
      const allNotifs = await systemService.getNotifications();
      const globalUpdated = allNotifs.map(n => 
        String(n.userId) === String(user.id) ? { ...n, isRead: true } : n
      );
      await systemService.saveNotifications(globalUpdated);
    } catch (error) {
      // Offline fallback already handled by safeFetch returning null
    }
  };

  return {
    notifications: unreadNotifications,
    unreadCount,
    markAsRead,
    clearAll,
    fetchNotifications
  };
};
