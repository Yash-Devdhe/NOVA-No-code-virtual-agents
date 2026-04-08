"use client";

import React, { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bell, Check, CheckCircle, ExternalLink, Image, Info, Trash2, AlertCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserDetailContext } from "@/context/UserDetailsContext";
import { useToast } from "@/components/ui/use-toast";

interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: number;
}

const NotificationBell = () => {
  const { toast } = useToast();
  const { userDetail } = React.useContext(UserDetailContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userId = userDetail?._id as Id<"UserTable"> | undefined;
  const queryArgs = userId ? { userId } : "skip";
  const notifications = (useQuery(api.notifications.GetUserNotifications, queryArgs) || []) as Notification[];
  const unreadCount = useQuery(api.notifications.GetUnreadCount, queryArgs) || 0;

  const markAsRead = useMutation(api.notifications.MarkAsRead);
  const markAllAsRead = useMutation(api.notifications.MarkAllAsRead);
  const deleteNotification = useMutation(api.notifications.DeleteNotification);

  const logConvexError = (error: unknown, action: string) => {
    toast({
      title: `${action} failed`,
      description: error instanceof Error ? error.message : String(error),
      variant: "destructive",
    });
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead({
        notificationId: notificationId as Id<"NotificationsTable">,
      });
    } catch (error) {
      logConvexError(error, "Mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;

    try {
      await markAllAsRead({
        userId,
      });
    } catch (error) {
      logConvexError(error, "Mark all as read");
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification({
        notificationId: notificationId as Id<"NotificationsTable">,
      });
    } catch (error) {
      logConvexError(error, "Delete notification");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "agent_created":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "media_generated":
        return <Image className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 transition-colors hover:bg-white/10"
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-300 hover:text-white"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getIcon(notification.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          !notification.isRead ? "text-gray-900" : "text-gray-600"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                        {notification.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {formatTime(notification.createdAt)}
                        </span>
                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification._id)}
                              className="rounded p-1 hover:bg-gray-200"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3 text-gray-500" />
                            </button>
                          )}
                          {notification.link && (
                            <a
                              href={notification.link}
                              className="rounded p-1 hover:bg-gray-200"
                              title="View"
                            >
                              <ExternalLink className="h-3 w-3 text-gray-500" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(notification._id)}
                            className="rounded p-1 hover:bg-gray-200"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="mt-2 h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
