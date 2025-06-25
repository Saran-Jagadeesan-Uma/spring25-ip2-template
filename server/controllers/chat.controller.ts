import express, { Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../services/chat.service';
import { populateDocument } from '../utils/database.util';
import {
  CreateChatRequest,
  AddMessageRequestToChat,
  AddParticipantRequest,
  ChatIdRequest,
  GetChatByParticipantsRequest,
} from '../types/chat';
import { FakeSOSocket } from '../types/socket';
import ChatModel from '../models/chat.model';
import { Message } from '../types/message';

/*
 * This controller handles chat-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the chat routes.
 * @throws {Error} Throws an error if the chat creation fails.
 */
const chatController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Validates that the request body contains all required fields for a chat.
   * @param req The incoming request containing chat data.
   * @returns `true` if the body contains valid chat fields; otherwise, `false`.
   */
  const isCreateChatRequestValid = (req: CreateChatRequest): boolean => {
    const { participants, messages } = req.body;
    if (!Array.isArray(participants) || participants.length < 2) return false;

    const validParticipants = participants.every(
      p => typeof p === 'string' || p instanceof ObjectId,
    );
    const validMessages =
      !messages ||
      (Array.isArray(messages) &&
        messages.every(m => typeof m.msg === 'string' && typeof m.msgFrom === 'string'));

    return validParticipants && validMessages;
  };

  /**
   * Validates that the request body contains all required fields for a message.
   * @param req The incoming request containing message data.
   * @returns `true` if the body contains valid message fields; otherwise, `false`.
   */
  const isAddMessageRequestValid = (req: AddMessageRequestToChat): boolean => {
    const { msg, msgFrom, msgDateTime } = req.body;
    const hasMsg = typeof msg === 'string' && msg.trim().length > 0;
    const hasSender = typeof msgFrom === 'string';
    const hasValidDate =
      msgDateTime === undefined || !Number.isNaN(new Date(msgDateTime).getTime()) === false;
    return hasMsg && hasSender && hasValidDate;
  };

  /**
   * Validates that the request body contains all required fields for a participant.
   * @param req The incoming request containing participant data.
   * @returns `true` if the body contains valid participant fields; otherwise, `false`.
   */
  const isAddParticipantRequestValid = (req: AddParticipantRequest): boolean => {
    const { participant } = req.body;
    return typeof participant === 'string' || participant instanceof ObjectId;
  };

  /**
   * Creates a new chat with the given participants (and optional initial messages).
   * @param req The request object containing the chat data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is created.
   * @throws {Error} Throws an error if the chat creation fails.
   */
  const createChatRoute = async (req: CreateChatRequest, res: Response): Promise<void> => {
    if (!isCreateChatRequestValid(req)) {
      res.status(400).json({ error: 'Invalid chat creation request' });
      return;
    }

    try {
      const saved = await saveChat(req.body);

      if ('error' in saved) {
        res.status(500).json(saved);
        return;
      }

      const populated = await ChatModel.findById(saved._id)
        .populate({
          path: 'messages',
          populate: {
            path: 'msgFrom',
            model: 'UserModel',
          },
        })
        .populate('participants');

      socket.emit('chatUpdate', { chat: populated, type: 'created' });
      res.status(201).json(populated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create chat' });
    }
  };

  /**
   * Adds a new message to an existing chat.
   * @param req The request object containing the message data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the message is added.
   * @throws {Error} Throws an error if the message addition fails.
   */
  const addMessageToChatRoute = async (
    req: AddMessageRequestToChat,
    res: Response,
  ): Promise<void> => {

    if (!isAddMessageRequestValid(req)) {
      res.status(400).json({ error: 'Invalid message request' });
      return;
    }

    try {
      const messagePayload: Message = {
        msg: req.body.msg,
        msgFrom: req.body.msgFrom.toString(),
        msgDateTime: req.body.msgDateTime ? new Date(req.body.msgDateTime) : new Date(),
        type: 'direct',
      };

      const message = await createMessage(messagePayload);

      if ('error' in message || !message._id) {
        res.status(500).json({ error: 'Message creation failed or ID missing' });
        return;
      }

      const updatedChat = await addMessageToChat(req.params.chatId, message._id.toString());

      if ('error' in updatedChat) {
        res.status(500).json(updatedChat);
        return;
      }

      const populated = await populateDocument(updatedChat._id.toString(), 'chat');

      socket.emit('chatUpdate', {
        chat: populated,
        type: 'created',
      });

      res.status(200).json(populated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add message to chat' });
    }
  };

  /**
   * Retrieves a chat by its ID, optionally populating participants and messages.
   * @param req The request object containing the chat ID.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is retrieved.
   * @throws {Error} Throws an error if the chat retrieval fails.
   */
  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    try {
      const chat = await getChat(req.params.chatId);

      if ('error' in chat) {
        res.status(404).json(chat);
        return;
      }

      const populated = await populateDocument(chat._id.toString(), 'chat');
      res.status(200).json(populated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve chat' });
    }
  };

  /**
   * Retrieves chats for a user based on their username.
   * @param req The request object containing the username parameter in `req.params`.
   * @param res The response object to send the result, either the populated chats or an error message.
   * @returns {Promise<void>} A promise that resolves when the chats are successfully retrieved and populated.
   */
  const getChatsByUserRoute = async (
    req: GetChatByParticipantsRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const chats = await getChatsByParticipants([req.params.username]);
      const populatedChats = await Promise.all(
        chats.map(chat => populateDocument(chat._id.toString(), 'chat')),
      );
      res.status(200).json(populatedChats);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve chats' });
    }
  };

  /**
   * Adds a participant to an existing chat.
   * @param req The request object containing the participant data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the participant is added.
   * @throws {Error} Throws an error if the participant addition fails.
   */
  const addParticipantToChatRoute = async (
    req: AddParticipantRequest,
    res: Response,
  ): Promise<void> => {
    if (!isAddParticipantRequestValid(req)) {
      res.status(400).json({ error: 'Invalid participant' });
      return;
    }
    try {
      const updated = await addParticipantToChat(
        req.params.chatId,
        req.body.participant.toString(), 
      );
      if ('error' in updated) {
        res.status(500).json(updated);
        return;
      }
      const populated = await populateDocument(updated._id.toString(), 'chat');
      res.status(200).json(populated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add participant' });
    }
  };

  socket.on('connection', conn => {
    conn.on('joinChat', (chatId?: string) => {
      if (typeof chatId === 'string') {
        conn.join(chatId);
      }
    });

    conn.on('leaveChat', (chatId?: string) => {
      if (typeof chatId === 'string') {
        conn.leave(chatId);
      }
    });
  });

  router.post('/chats', createChatRoute);
  router.get('/chats/:chatId', getChatRoute);
  router.get('/chats/user/:username', getChatsByUserRoute);
  router.post('/chats/:chatId/messages', addMessageToChatRoute);
  router.post('/chats/:chatId/participants', addParticipantToChatRoute);
  router.post('/createChat', createChatRoute);

  return router;
};

export default chatController;