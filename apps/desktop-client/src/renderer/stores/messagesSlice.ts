import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export enum MessageType {
  TEXT = 0,
  FILE = 1,
  VOICE = 2,
  LINK_PREVIEW = 3,
  INVITE = 4,
  RECEIPT = 5,
  BURN_NOTICE = 6,
}

export interface Message {
  msgId: string;
  from: string;
  to: string;
  type: MessageType;
  content: string;
  timestamp: number;
  replyTo?: string;
  burnAfterSec?: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface MessagesState {
  conversations: Record<string, Message[]>;
}

const initialState: MessagesState = {
  conversations: {},
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<{ conversationId: string; message: Message }>) => {
      const { conversationId, message } = action.payload;
      if (!state.conversations[conversationId]) {
        state.conversations[conversationId] = [];
      }
      state.conversations[conversationId].push(message);
    },
    updateMessageStatus: (
      state,
      action: PayloadAction<{ conversationId: string; msgId: string; status: Message['status'] }>
    ) => {
      const { conversationId, msgId, status } = action.payload;
      const messages = state.conversations[conversationId];
      if (messages) {
        const index = messages.findIndex(m => m.msgId === msgId);
        if (index !== -1) {
          messages[index].status = status;
        }
      }
    },
    removeMessage: (state, action: PayloadAction<{ conversationId: string; msgId: string }>) => {
      const { conversationId, msgId } = action.payload;
      const messages = state.conversations[conversationId];
      if (messages) {
        state.conversations[conversationId] = messages.filter(m => m.msgId !== msgId);
      }
    },
    clearConversation: (state, action: PayloadAction<string>) => {
      delete state.conversations[action.payload];
    },
    clearAllMessages: (state) => {
      state.conversations = {};
    },
  },
});

export const { addMessage, updateMessageStatus, removeMessage, clearConversation, clearAllMessages } =
  messagesSlice.actions;
export default messagesSlice.reducer;