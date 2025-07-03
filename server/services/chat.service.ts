import ChatModel from '../models/chat.model';
import MessageModel from '../models/messages.model';
import UserModel from '../models/users.model';
import { Chat, ChatResponse, CreateChatPayload } from '../types/chat';
import { Message, MessageResponse } from '../types/message';

/**
 * Creates and saves a new chat document in the database, resolving usernames to ObjectIds.
 */
export const saveChat = async (chatPayload: CreateChatPayload): Promise<ChatResponse> => {
  try {
    const messageIds = [];

    if (chatPayload.messages && Array.isArray(chatPayload.messages)) {
      const messageDocs = chatPayload.messages.map(msg =>
        new MessageModel({
          ...msg,
          type: 'direct',
        }).save(),
      );

      const savedMessages = await Promise.all(messageDocs);
      messageIds.push(...savedMessages.map(m => m._id.toString()));
    }

    const users = await UserModel.find({ username: { $in: chatPayload.participants } });

    if (users.length !== chatPayload.participants.length) {
      return { error: 'Some users not found' };
    }

    const participantIds = users.map(user => user._id.toString());

    const newChat = await ChatModel.create({
      participants: participantIds,
      messages: messageIds,
    });

    return newChat.toObject();
  } catch (err) {
    return { error: 'Failed to save chat' };
  }
};

/**
 * Creates and saves a new message document in the database.
 */
export const createMessage = async (messageData: Message): Promise<MessageResponse> => {
  try {
    const message = new MessageModel(messageData);
    const savedMessage = await message.save();
    return savedMessage;
  } catch (err) {
    return { error: 'Failed to create message' };
  }
};

/**
 * Adds a message ID to an existing chat.
 */
export const addMessageToChat = async (
  chatId: string,
  messageId: string,
): Promise<ChatResponse> => {
  try {
    const updatedChat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $push: { messages: messageId } },
      { new: true },
    );
    if (!updatedChat) return { error: 'Chat not found' };
    return updatedChat;
  } catch (err) {
    return { error: 'Failed to add message to chat' };
  }
};

/**
 * Retrieves a chat document by its ID.
 */
export const getChat = async (chatId: string): Promise<ChatResponse> => {
  try {
    const chat = await ChatModel.findById(chatId);
    if (!chat) return { error: 'Chat not found' };
    return chat;
  } catch (err) {
    return { error: 'Failed to get chat' };
  }
};

/**
 * Retrieves chats that include all the provided participant usernames.
 */
export const getChatsByParticipants = async (usernames: string[]): Promise<Chat[]> => {
  try {
    const users = await UserModel.find({ username: { $in: usernames } });
    const userIds = users.map(user => user._id);
    const chats = await ChatModel.find({ participants: { $all: userIds } });
    return chats;
  } catch (err) {
    return [];
  }
};

/**
 * Adds a participant (by ObjectId string) to an existing chat.
 */
export const addParticipantToChat = async (
  chatId: string,
  userId: string,
): Promise<ChatResponse> => {
  try {
    const updatedChat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $addToSet: { participants: userId } },
      { new: true },
    );

    if (!updatedChat) return { error: 'Chat not found' };
    return updatedChat;
  } catch (err) {
    return { error: 'Failed to add participant to chat' };
  }
};
