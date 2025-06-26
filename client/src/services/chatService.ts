import { Message } from '../types';
import api from './config';

const CHAT_API_URL = `${process.env.REACT_APP_SERVER_URL}/chat`;

/**
 * Fetches all chats associated with a given user.
 */
export const getChatsByUser = async (username: string) => {
  const res = await api.get(`${CHAT_API_URL}/chats/user/${username}`);

  if (res.status !== 200) {
    throw new Error('Error when fetching chats for user');
  }

  return res.data;
};

/**
 * Fetches a chat by its unique ID.
 */
export const getChatById = async (chatID: string) => {
  const res = await api.get(`${CHAT_API_URL}/chats/${chatID}`);

  if (res.status !== 200) {
    throw new Error('Error when fetching chat by ID');
  }

  return res.data;
};

/**
 * Sends a message to a specific chat.
 */
export const sendMessage = async (message: Omit<Message, 'type'>, chatID: string) => {
  const res = await api.post(`${CHAT_API_URL}/chats/${chatID}/messages`, message);

  if (res.status !== 200) {
    throw new Error('Error when adding message to chat');
  }

  return res.data;
};

/**
 * Creates a new chat with the specified participants.
 */
export const createChat = async (participants: string[]) => {
  const res = await api.post(`${CHAT_API_URL}/createChat`, { participants, messages: [] });

  if (res.status !== 201) {
    throw new Error('Error when creating chat');
  }

  return res.data;
};
