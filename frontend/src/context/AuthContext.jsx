import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

function decodeJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return {}; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for guest token in URL ?guest=TOKEN
    const params = new URLSearchParams(window.location.search);
    const guestToken = params.get('guest');
    if (guestToken) {
      // Only apply guest token if there's no existing admin session
      const existing = localStorage.getItem('token');
      const existingRole = existing ? decodeJwt(existing).role : null;
      if (!existing || existingRole === 'guest') {
        localStorage.setItem('token', guestToken);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }

    const token = localStorage.getItem('token');
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded.role === 'guest') {
        setUser({ id: 'guest', name: 'Guest', email: '', role: 'guest' });
        setLoading(false);
        return;
      }
      api.get('/auth/me')
        .then(res => setUser({ ...res.data, role: res.data.role || 'admin' }))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const loginAsGuest = async () => {
    const { data } = await api.post('/auth/guest');
    localStorage.setItem('token', data.token);
    setUser({ id: 'guest', name: 'Guest', email: '', role: 'guest' });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updated) => setUser(prev => ({ ...prev, ...updated }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginAsGuest, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
