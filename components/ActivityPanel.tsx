import React, { useState, useEffect } from 'react';
import { activityService } from '../apiServices';

interface Activity {
  id: number;
  activity_type: string;
  activity_description?: string;
  project_id?: string;
  project_title?: string;
  created_at: string;
  metadata?: any;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

interface ActivityPanelProps {
  onClose: () => void;
}

const ActivityPanel: React.FC<ActivityPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'activity' | 'notifications'>('notifications');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'notifications') {
        const data = await activityService.getNotifications();
        setNotifications((data as any)?.notifications || []);
        setUnreadCount((data as any)?.unread_count || 0);
      } else {
        const data = await activityService.getFeed();
        setActivities((data as any)?.activities || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await activityService.markNotificationRead(id);
      await loadData();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await activityService.markAllNotificationsRead();
      await loadData();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_created':
        return '📁';
      case 'project_updated':
        return '✏️';
      case 'project_duplicated':
        return '📋';
      case 'scene_added':
        return '🎬';
      case 'export':
        return '📤';
      default:
        return '📝';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Activity & Notifications</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'notifications'
                ? 'border-b-2 border-amber-500 text-amber-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === 'activity'
                ? 'border-b-2 border-amber-500 text-amber-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Activity Feed
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading...</div>
          ) : activeTab === 'notifications' ? (
            <>
              {notifications.length > 0 && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No notifications</div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`bg-zinc-800 border rounded-lg p-3 ${
                        !notification.is_read ? 'border-amber-500' : 'border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-white">{notification.title}</h4>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-sm text-zinc-400 mb-2">{notification.message}</p>
                          )}
                          <div className="text-xs text-zinc-500">
                            {new Date(notification.created_at).toLocaleString()}
                          </div>
                        </div>
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs text-amber-500 hover:text-amber-400"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No activity yet</div>
              ) : (
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg p-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getActivityIcon(activity.activity_type)}</span>
                        <div className="flex-1">
                          <p className="text-sm text-white">
                            {activity.activity_description || activity.activity_type}
                          </p>
                          {activity.project_title && (
                            <p className="text-xs text-zinc-500 mt-1">
                              Project: {activity.project_title}
                            </p>
                          )}
                          <div className="text-xs text-zinc-500 mt-1">
                            {new Date(activity.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityPanel;

