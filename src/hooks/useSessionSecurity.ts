import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const WARNING_BEFORE_MS = 5 * 60 * 1000; // Warn 5 minutes before timeout

/**
 * Hook to monitor session activity and auto-logout on inactivity
 */
export function useSessionSecurity() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSessionTimeout = useCallback(async () => {
    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
      variant: 'destructive',
    });
    await signOut();
    navigate('/auth');
  }, [signOut, navigate, toast]);

  const showTimeoutWarning = useCallback(() => {
    toast({
      title: 'Session Expiring Soon',
      description: 'Your session will expire in 5 minutes due to inactivity.',
      variant: 'default',
    });
  }, [toast]);

  useEffect(() => {
    if (!user) return;

    let lastActivity = Date.now();
    let timeoutId: NodeJS.Timeout;
    let warningId: NodeJS.Timeout;

    const resetTimers = () => {
      lastActivity = Date.now();
      
      clearTimeout(timeoutId);
      clearTimeout(warningId);

      // Set warning timer
      warningId = setTimeout(() => {
        showTimeoutWarning();
      }, SESSION_TIMEOUT_MS - WARNING_BEFORE_MS);

      // Set logout timer
      timeoutId = setTimeout(() => {
        handleSessionTimeout();
      }, SESSION_TIMEOUT_MS);
    };

    // Activity events
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    const handleActivity = () => {
      // Debounce activity updates to every 30 seconds
      if (Date.now() - lastActivity > 30000) {
        resetTimers();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetTimers();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(warningId);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user, handleSessionTimeout, showTimeoutWarning]);
}
