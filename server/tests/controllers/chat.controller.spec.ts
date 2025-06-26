import mongoose from 'mongoose';
import supertest from 'supertest';
import { app } from '../../app';
import * as chatService from '../../services/chat.service';
import * as databaseUtil from '../../utils/database.util';
import MessageModel from '../../models/messages.model';
import ChatModel from '../../models/chat.model';
import { Chat } from '../../types/chat';
import { Message } from '../../types/message';

/**
 * Spies on the service functions
 */
const saveChatSpy = jest.spyOn(chatService, 'saveChat');
const createMessageSpy = jest.spyOn(chatService, 'createMessage');
const addMessageSpy = jest.spyOn(chatService, 'addMessageToChat');
const getChatSpy = jest.spyOn(chatService, 'getChat');
const addParticipantSpy = jest.spyOn(chatService, 'addParticipantToChat');
const populateDocumentSpy = jest.spyOn(databaseUtil, 'populateDocument');
const getChatsByParticipantsSpy = jest.spyOn(chatService, 'getChatsByParticipants');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

/**
 * Sample test suite for the /chat endpoints
 */
describe('Chat Controller', () => {
  describe('POST /chat/createChat', () => {
    // TODO: Task 3 Write additional tests for the createChat endpoint
    it('should create a new chat successfully', async () => {
      const validChatPayload = {
        participants: ['user1', 'user2'],
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };

      const serializedPayload = {
        ...validChatPayload,
        messages: validChatPayload.messages.map(message => ({
          ...message,
          msgDateTime: message.msgDateTime.toISOString(),
        })),
      };

      const chatResponse: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01'),
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'user1',
            },
            type: 'direct',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      saveChatSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue(chatResponse);

      const response = await supertest(app).post('/chat/createChat').send(validChatPayload);

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        _id: chatResponse._id?.toString(),
        participants: chatResponse.participants.map(participant => participant.toString()),
        messages: chatResponse.messages.map(message => ({
          ...message,
          _id: message._id?.toString(),
          msgDateTime: message.msgDateTime.toISOString(),
          user: {
            ...message.user,
            _id: message.user?._id.toString(),
          },
        })),
        createdAt: chatResponse.createdAt?.toISOString(),
        updatedAt: chatResponse.updatedAt?.toISOString(),
      });

      expect(saveChatSpy).toHaveBeenCalledWith(serializedPayload);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chatResponse._id?.toString(), 'chat');
    });
  });

  describe('POST /chat/:chatId/addMessage', () => {
    // TODO: Task 3 Write additional tests for the addMessage endpoint
    it('should add a message to chat successfully', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messagePayload: Message = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };

      const serializedPayload = {
        ...messagePayload,
        msgDateTime: messagePayload.msgDateTime.toISOString(),
      };

      const messageResponse = {
        _id: new mongoose.Types.ObjectId(),
        ...messagePayload,
        user: {
          _id: new mongoose.Types.ObjectId(),
          username: 'user1',
        },
      };

      const chatResponse = {
        _id: chatId,
        participants: ['user1', 'user2'],
        messages: [messageResponse],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      createMessageSpy.mockResolvedValue(messageResponse);
      addMessageSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue(chatResponse);

      const response = await supertest(app).post(`/chat/${chatId}/addMessage`).send(messagePayload);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        _id: chatResponse._id.toString(),
        participants: chatResponse.participants.map(participant => participant.toString()),
        messages: chatResponse.messages.map(message => ({
          ...message,
          _id: message._id.toString(),
          msgDateTime: message.msgDateTime.toISOString(),
          user: {
            ...message.user,
            _id: message.user._id.toString(),
          },
        })),
        createdAt: chatResponse.createdAt.toISOString(),
        updatedAt: chatResponse.updatedAt.toISOString(),
      });

      expect(createMessageSpy).toHaveBeenCalledWith(serializedPayload);
      expect(addMessageSpy).toHaveBeenCalledWith(chatId.toString(), messageResponse._id.toString());
      expect(populateDocumentSpy).toHaveBeenCalledWith(chatResponse._id.toString(), 'chat');
    });
  });

  describe('GET /chat/:chatId', () => {
    // TODO: Task 3 Write additional tests for the getChat endpoint
    it('should retrieve a chat by ID', async () => {
      // 1) Prepare a valid chatId param
      const chatId = new mongoose.Types.ObjectId().toString();

      // 2) Mock a fully enriched chat
      const mockFoundChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1'],
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01T00:00:00Z'),
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'user1',
            },
            type: 'direct',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 3) Mock the service calls
      getChatSpy.mockResolvedValue(mockFoundChat);
      populateDocumentSpy.mockResolvedValue(mockFoundChat);

      // 4) Invoke the endpoint
      const response = await supertest(app).get(`/chat/${chatId}`);

      // 5) Assertions
      expect(response.status).toBe(200);
      expect(getChatSpy).toHaveBeenCalledWith(chatId);
      expect(populateDocumentSpy).toHaveBeenCalledWith(mockFoundChat._id?.toString(), 'chat');

      // Convert ObjectIds and Dates for comparison
      expect(response.body).toMatchObject({
        _id: mockFoundChat._id?.toString(),
        participants: mockFoundChat.participants.map(p => p.toString()),
        messages: mockFoundChat.messages.map(m => ({
          _id: m._id?.toString(),
          msg: m.msg,
          msgFrom: m.msgFrom,
          msgDateTime: m.msgDateTime.toISOString(),
          user: {
            _id: m.user?._id.toString(),
            username: m.user?.username,
          },
        })),
        createdAt: mockFoundChat.createdAt?.toISOString(),
        updatedAt: mockFoundChat.updatedAt?.toISOString(),
      });
    });
  });

  describe('POST /chat/:chatId/addParticipant', () => {
    // TODO: Task 3 Write additional tests for the addParticipant endpoint
    it('should add a participant to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      const updatedChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addParticipantSpy.mockResolvedValue(updatedChat);

      const response = await supertest(app).post(`/chat/${chatId}/addParticipant`).send({ userId });

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        _id: updatedChat._id?.toString(),
        participants: updatedChat.participants.map(id => id.toString()),
        messages: [],
        createdAt: updatedChat.createdAt?.toISOString(),
        updatedAt: updatedChat.updatedAt?.toISOString(),
      });

      expect(addParticipantSpy).toHaveBeenCalledWith(chatId, userId);
    });
  });

  describe('POST /chat/getChatsByUser/:username', () => {
    it('should return 200 with an array of chats', async () => {
      const username = 'user1';
      const chats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      getChatsByParticipantsSpy.mockResolvedValueOnce(chats);
      populateDocumentSpy.mockResolvedValueOnce(chats[0]);

      const response = await supertest(app).get(`/chat/getChatsByUser/${username}`);

      expect(getChatsByParticipantsSpy).toHaveBeenCalledWith([username]);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chats[0]._id?.toString(), 'chat');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject([
        {
          _id: chats[0]._id?.toString(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: chats[0].createdAt?.toISOString(),
          updatedAt: chats[0].updatedAt?.toISOString(),
        },
      ]);
    });

    it('should return 500 if populateDocument fails for any chat', async () => {
      const username = 'user1';
      const chats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      getChatsByParticipantsSpy.mockResolvedValueOnce(chats);
      populateDocumentSpy.mockResolvedValueOnce({ error: 'Service error' });

      const response = await supertest(app).get(`/chat/getChatsByUser/${username}`);

      expect(getChatsByParticipantsSpy).toHaveBeenCalledWith([username]);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chats[0]._id?.toString(), 'chat');
      expect(response.status).toBe(500);
      expect(response.text).toBe('Error retrieving chat: Failed populating chats');
    });
  });
});
