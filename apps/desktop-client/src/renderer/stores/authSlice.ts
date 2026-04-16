import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  userId: string | null;
  username: string | null;
  email: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  pubKeyHash: string | null;
  salt: string | null;
}

const initialState: AuthState = {
  userId: null,
  username: null,
  email: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  pubKeyHash: null,
  salt: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        userId: string;
        username: string;
        email?: string;
        accessToken: string;
        refreshToken: string;
        pubKeyHash?: string;
        salt?: string;
      }>
    ) => {
      state.userId = action.payload.userId;
      state.username = action.payload.username;
      state.email = action.payload.email || null;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.pubKeyHash = action.payload.pubKeyHash || null;
      state.salt = action.payload.salt || null;
    },
    setToken: (state, action: PayloadAction<{ accessToken: string }>) => {
      state.accessToken = action.payload.accessToken;
    },
    logout: (state) => {
      state.userId = null;
      state.username = null;
      state.email = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.pubKeyHash = null;
      state.salt = null;
    },
  },
});

export const { setCredentials, setToken, logout } = authSlice.actions;
export default authSlice.reducer;