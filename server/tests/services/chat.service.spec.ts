/* eslint-disable @typescript-eslint/no-var-requires */
import mongoose from 'mongoose';

import ChatModel from '../../models/chat.model';
import MessageModel from '../../models/messages.model';
import UserModel from '../../models/users.model';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../../services/chat.service';
import { Chat } from '../../types/chat';
import { Message } from '../../types/message';

const mockingoose = require('mockingoose');

describe('Chat service', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------------------
  // 1. saveChat
  // ----------------------------------------------------------------------------
  describe('saveChat', () => {
    it('should successfully save a chat and verify its body (ignore exact IDs)', async () => {
      mockingoose(MessageModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          msg: 'Hello!',
          msgFrom: 'testUser',
          msgDateTime: new Date('2025-01-01T00:00:00Z'),
          type: 'direct',
        },
        'create',
      );

      mockingoose(ChatModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          participants: [new mongoose.Types.ObjectId()],
          messages: [new mongoose.Types.ObjectId()],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'create',
      );

      const result = await saveChat({
        participants: [new mongoose.Types.ObjectId()],
        messages: [
          {
            msg: 'Hello!',
            msgFrom: 'testUser',
            msgDateTime: new Date('2025-01-01T00:00:00Z'),
            type: 'direct',
          },
        ],
      });

      if ('error' in result) {
        throw new Error(`Expected a Chat, got error: ${result.error}`);
      }

      expect(result).toHaveProperty('_id');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
    });
    it('should return an error if saving message fails', async () => {
      mockingoose(MessageModel).toReturn(new Error('Failed to save message'), 'create');

      const result = await saveChat({
        participants: [new mongoose.Types.ObjectId()],
        messages: [
          {
            msg: 'Hi!',
            msgFrom: 'testUser',
            msgDateTime: new Date(),
            type: 'direct',
          },
        ],
      });

      expect(result).toHaveProperty('error');
    });
  });

  // ----------------------------------------------------------------------------
  // 2. createMessage
  // ----------------------------------------------------------------------------
  describe('createMessage', () => {
    const mockMessage: Message = {
      msg: 'Hey!',
      msgFrom: 'userX',
      msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
      type: 'direct',
    };

    it('should create a message successfully if user exists', async () => {
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'userX' },
        'findOne',
      );

      const mockCreatedMsg = {
        _id: new mongoose.Types.ObjectId(),
        ...mockMessage,
      };
      mockingoose(MessageModel).toReturn(mockCreatedMsg, 'create');

      const result = await createMessage(mockMessage);

      expect(result).toMatchObject(mockMessage);
    });

    it('should return error if message save fails', async () => {
      mockingoose(MessageModel).toReturn(new Error('save failed'), 'create');

      const result = await createMessage(mockMessage);
      expect(result).toHaveProperty('error');
    });
    it('should return error if user not found', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');

      const result = await createMessage(mockMessage);
      expect(result).toHaveProperty('error');
    });
  });

  // ----------------------------------------------------------------------------
  // 3. addMessageToChat
  // ----------------------------------------------------------------------------
  describe('addMessageToChat', () => {
    it('should add a message ID to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      const mockUpdatedChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: [new mongoose.Types.ObjectId()],
        messages: [new mongoose.Types.ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Chat;

      mockingoose(ChatModel).toReturn(mockUpdatedChat, 'findOneAndUpdate');

      const result = await addMessageToChat(chatId, messageId);
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }

      expect(result.messages).toEqual(mockUpdatedChat.messages);
    });

    it('should return error if chat not found', async () => {
      mockingoose(ChatModel).toReturn(null, 'findOneAndUpdate');

      const result = await addMessageToChat('badId', 'msgId');
      expect(result).toHaveProperty('error');
    });
  });

  // ----------------------------------------------------------------------------
  // 4. getChat
  // ----------------------------------------------------------------------------
  describe('getChat', () => {
    it('should return a chat if found', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();

      const mockChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: [new mongoose.Types.ObjectId()],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockingoose(ChatModel).toReturn(mockChat, 'findOne');

      const result = await getChat(chatId);

      if ('error' in result) {
        throw new Error('Expected a chat, got error');
      }

      expect(result._id).toEqual(mockChat._id);
    });

    it('should return an error if chat is not found', async () => {
      mockingoose(ChatModel).toReturn(null, 'findOne');

      const result = await getChat('fakeId');

      expect(result).toHaveProperty('error');
    });

    it('should return an error on database failure', async () => {
      mockingoose(ChatModel).toReturn(new Error('db error'), 'findOne');

      const result = await getChat('someId');

      expect(result).toHaveProperty('error');
    });
  });

  // ----------------------------------------------------------------------------
  // 5. addParticipantToChat
  // ----------------------------------------------------------------------------
  describe('addParticipantToChat', () => {
    it('should add a participant if user exists', async () => {
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'testUser' },
        'findOne',
      );

      const mockChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: [new mongoose.Types.ObjectId()],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockingoose(ChatModel).toReturn(mockChat, 'findOneAndUpdate');

      const result = await addParticipantToChat(mockChat._id!.toString(), 'newUserId');
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }
      expect(result._id).toEqual(mockChat._id);
    });

    it('should return error if chat is not found', async () => {
      mockingoose(ChatModel).toReturn(null, 'findOneAndUpdate');

      const result = await addParticipantToChat('badChatId', 'userX');
      expect(result).toHaveProperty('error');
    });
  });

  // ----------------------------------------------------------------------------
  // 6. getChatsByParticipants
  // ----------------------------------------------------------------------------
  describe('getChatsByParticipants', () => {
    it('should retrieve chats by participants', async () => {
      const mockChats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockingoose(ChatModel).toReturn(mockChats, 'find');

      const result = await getChatsByParticipants(['user1', 'user2']);
      expect(result).toHaveLength(1);
      expect(result).toEqual(mockChats);
    });

    it('should return empty array if no chats found', async () => {
      mockingoose(ChatModel).toReturn([], 'find');

      const result = await getChatsByParticipants(['unknownUser']);
      expect(result).toHaveLength(0);
    });

    it('should return empty array if database fails', async () => {
      mockingoose(ChatModel).toReturn(new Error('fail'), 'find');

      const result = await getChatsByParticipants(['userX']);
      expect(result).toHaveLength(0);
    });
  });
});
