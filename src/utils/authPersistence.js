// Auth persistence utilities to ensure login state is maintained across page refreshes

const AUTH_STORAGE_KEY = 'portal_auth_state';
const LAST_PATH_KEY = 'portal_last_path';

export const saveAuthState = (user, userProfile, userRole) => {
  try {
    const authState = {
      user: user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      } : null,
      userProfile,
      userRole,
      timestamp: Date.now()
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  } catch (error) {
    console.error('Failed to save auth state:', error);
  }
};

export const saveLastPath = (path) => {
  try {
    localStorage.setItem(LAST_PATH_KEY, path);
  } catch (error) {
    console.error('Failed to save last path:', error);
  }
};

export const getLastPath = () => {
  try {
    return localStorage.getItem(LAST_PATH_KEY);
  } catch (error) {
    console.error('Failed to get last path:', error);
    return null;
  }
};

export const clearLastPath = () => {
  try {
    localStorage.removeItem(LAST_PATH_KEY);
  } catch (error) {
    console.error('Failed to clear last path:', error);
  }
};

export const getAuthState = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const authState = JSON.parse(stored);
      // Check if the stored state is not too old (24 hours)
      const isRecent = Date.now() - authState.timestamp < 24 * 60 * 60 * 1000;
      return isRecent ? authState : null;
    }
    return null;
  } catch (error) {
    console.error('Failed to get auth state:', error);
    return null;
  }
};

export const clearAuthState = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear auth state:', error);
  }
};

export const isAuthStateValid = (authState) => {
  if (!authState || !authState.user || !authState.userRole) {
    console.log('Auth state invalid:', { hasAuthState: !!authState, hasUser: !!authState?.user, hasUserRole: !!authState?.userRole });
    return false;
  }
  
  // Check if the stored state is not too old (24 hours)
  const isRecent = Date.now() - authState.timestamp < 24 * 60 * 60 * 1000;
  console.log('Auth state validation:', { isRecent, userRole: authState.userRole, age: Date.now() - authState.timestamp });
  return isRecent;
};
