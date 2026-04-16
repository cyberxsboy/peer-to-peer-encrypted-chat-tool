import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarCollapsed: boolean;
  currentConversationId: string | null;
  isRecordingVoice: boolean;
  showSettings: boolean;
  theme: 'light' | 'dark';
}

const initialState: UiState = {
  sidebarCollapsed: false,
  currentConversationId: null,
  isRecordingVoice: false,
  showSettings: false,
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setCurrentConversation: (state, action: PayloadAction<string | null>) => {
      state.currentConversationId = action.payload;
    },
    setRecordingVoice: (state, action: PayloadAction<boolean>) => {
      state.isRecordingVoice = action.payload;
    },
    toggleSettings: (state) => {
      state.showSettings = !state.showSettings;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
  },
});

export const { 
  toggleSidebar, 
  setCurrentConversation, 
  setRecordingVoice, 
  toggleSettings, 
  setTheme 
} = uiSlice.actions;
export default uiSlice.reducer;