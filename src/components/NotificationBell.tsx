import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationBellProps {
  notifications: AppNotification[];
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ notifications }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('4cousins_read_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const unreadCount = notifications.filter((n) => n.id && !readIds.has(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id).filter(Boolean) as string[]);
    setReadIds(allIds);
    localStorage.setItem('4cousins_read_notifications', JSON.stringify(Array.from(allIds)));
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      handleMarkAllRead();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
        title="Family Fund Alerts & Activity"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Live Activity & Alerts
                </span>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold"
                >
                  Clear badge
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  No notifications yet. New contributions and fund disbursements will appear here in real time.
                </div>
              ) : (
                notifications.map((n, i) => (
                  <div
                    key={n.id || i}
                    className={`p-3.5 transition hover:bg-amber-50/50 ${
                      n.type === 'disbursement'
                        ? 'bg-rose-50/40 border-l-4 border-l-rose-500'
                        : 'border-l-4 border-l-emerald-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-stone-900 leading-snug">
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-stone-400 font-mono shrink-0">
                        {n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
