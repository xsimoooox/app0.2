import { clearWakwakUser } from './wakwakUser';

export function performLogout(navigate, disconnectSocket) {
  clearWakwakUser();
  if (typeof disconnectSocket === 'function') {
    disconnectSocket();
  }
  navigate('/', { replace: true });
}
