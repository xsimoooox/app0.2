import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

/** Enregistre le numéro sur le serveur d'appels (connexion éphémère). */
export function registerSocketUser(phoneNumber) {
  return new Promise((resolve) => {
    if (!phoneNumber) {
      resolve();
      return;
    }

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      try {
        socket.disconnect();
      } catch {
        /* ignore */
      }
      resolve();
    };

    socket.on('connect', () => {
      socket.emit('register_user', phoneNumber);
      setTimeout(finish, 500);
    });

    socket.on('connect_error', finish);
    setTimeout(finish, 4000);
  });
}
