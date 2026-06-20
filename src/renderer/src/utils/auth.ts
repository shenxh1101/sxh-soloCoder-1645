import { Employee } from '../types';

const USER_KEY = 'ers_current_user';

export function setCurrentUser(user: Employee) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUser(): Employee | null {
  const data = localStorage.getItem(USER_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
}

declare global {
  interface Window {
    electronAPI: any;
  }
}

export const api = window.electronAPI;
