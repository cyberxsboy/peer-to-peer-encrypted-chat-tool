import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Contact {
  peerId: string;
  nickname?: string;
  trusted: boolean;
  addedAt: number;
  lastSeen?: number;
}

interface Group {
  groupId: string;
  name: string;
  ownerId: string;
  members: string[];
  createdAt: number;
  unreadCount: number;
  lastMessage?: string;
}

interface ContactsState {
  friends: Contact[];
  groups: Group[];
  pendingRequests: Contact[];
}

const initialState: ContactsState = {
  friends: [],
  groups: [],
  pendingRequests: [],
};

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    addFriend: (state, action: PayloadAction<Contact>) => {
      state.friends.push(action.payload);
    },
    removeFriend: (state, action: PayloadAction<string>) => {
      state.friends = state.friends.filter(f => f.peerId !== action.payload);
    },
    updateFriend: (state, action: PayloadAction<{ peerId: string; updates: Partial<Contact> }>) => {
      const index = state.friends.findIndex(f => f.peerId === action.payload.peerId);
      if (index !== -1) {
        state.friends[index] = { ...state.friends[index], ...action.payload.updates };
      }
    },
    addGroup: (state, action: PayloadAction<Group>) => {
      state.groups.push(action.payload);
    },
    removeGroup: (state, action: PayloadAction<string>) => {
      state.groups = state.groups.filter(g => g.groupId !== action.payload);
    },
    updateGroup: (state, action: PayloadAction<{ groupId: string; updates: Partial<Group> }>) => {
      const index = state.groups.findIndex(g => g.groupId === action.payload.groupId);
      if (index !== -1) {
        state.groups[index] = { ...state.groups[index], ...action.payload.updates };
      }
    },
    addPendingRequest: (state, action: PayloadAction<Contact>) => {
      state.pendingRequests.push(action.payload);
    },
    removePendingRequest: (state, action: PayloadAction<string>) => {
      state.pendingRequests = state.pendingRequests.filter(p => p.peerId !== action.payload);
    },
    clearContacts: (state) => {
      state.friends = [];
      state.groups = [];
      state.pendingRequests = [];
    },
  },
});

export const { 
  addFriend, 
  removeFriend, 
  updateFriend, 
  addGroup, 
  removeGroup, 
  updateGroup,
  addPendingRequest,
  removePendingRequest,
  clearContacts 
} = contactsSlice.actions;
export default contactsSlice.reducer;