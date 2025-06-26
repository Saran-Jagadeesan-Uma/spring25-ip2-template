import express, { Response } from 'express';
import { ObjectId, isValidObjectId } from 'mongoose';
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

const chatController = (socket: FakeSOSocket) => {
  const router = express.Router();

  const isCreateChatRequestValid = (req: CreateChatRequest): boolean => {
    const { participants, messages } = req.body;
    if (!Array.isArray(participants) || participants.length < 2) return false;

    const validParticipants = participants.every(p =>
      typeof p === 'string' && isValidObjectId(p),
    );

    const validMessages =
      !messages ||
      (Array.isArray(messages) &&
        messages.every(
          m =>
            typeof m.msg === 'string' &&
            typeof m.msgFrom === 'string' &&
            (!m.msgDateTime || (typeof m.msgDateTime === 'string' && !isNaN(Date.parse(m.msgDateTime)))),
        ));

    return validParticipants && validMessages;
  };

  const isAddMessageRequestValid = (req: AddMessageRequestToChat): boolean => {
    const { msg, msgFrom, msgDateTime } = req.body;
    const hasMsg = typeof msg === 'string' && msg.trim().length > 0;
    const hasSender = typeof msgFrom === 'string';
    const hasValidDate =
      msgDateTime === undefined || !Number.isNaN(new Date(msgDateTime).getTime());

    return hasMsg && hasSender && hasValidDate;
  };

  const isAddParticipantRequestValid = (req: AddParticipantRequest): boolean => {
    const { participant } = req.body;
    return typeof participant === 'string' && isValidObjectId(participant);
  };

  const createChatRoute = async (req: CreateChatRequest, res: Response): Promise<void> => {
    console.log('[createChatRoute] Incoming request:', req.body);

    if (!isCreateChatRequestValid(req)) {
      console.error('[createChatRoute] ❌ Invalid request:', req.body);
      res.status(400).json({ error: 'Invalid chat creation request' });
      return;
    }

    try {
      const saved = await saveChat(req.body);

      if ('error' in saved) {
        console.error('[createChatRoute] ❌ saveChat error:', saved);
        res.status(500).json(saved);
        return;
      }

      const populated = await ChatModel.findById(saved._id)
        .populate({
          path: 'messages',
          populate: { path: 'msgFrom', model: 'UserModel' },
        })
        .populate('participants');

      console.log('[createChatRoute] ✅ Chat created:', populated?._id);
      socket.emit('chatUpdate', { chat: populated, type: 'created' });
      res.status(201).json(populated);
    } catch (err) {
      console.error('[createChatRoute] ❌ Unexpected error:', err);
      res.status(500).json({ error: 'Failed to create chat' });
    }
  };

  const addMessageToChatRoute = async (
    req: AddMessageRequestToChat,
    res: Response,
  ): Promise<void> => {
    if (!isAddMessageRequestValid(req)) {
      console.error('[addMessageToChatRoute] ❌ Invalid message:', req.body);
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
        console.error('[addMessageToChatRoute] ❌ createMessage error:', message);
        res.status(500).json({ error: 'Message creation failed or ID missing' });
        return;
      }

      const updatedChat = await addMessageToChat(req.params.chatId, message._id.toString());
      if ('error' in updatedChat) {
        console.error('[addMessageToChatRoute] ❌ addMessageToChat error:', updatedChat);
        res.status(500).json(updatedChat);
        return;
      }

      const populated = await populateDocument(updatedChat._id.toString(), 'chat');
      socket.emit('chatUpdate', { chat: populated, type: 'newMessage' });
      res.status(200).json(populated);
    } catch (err) {
      console.error('[addMessageToChatRoute] ❌ Unexpected error:', err);
      res.status(500).json({ error: 'Failed to add message to chat' });
    }
  };

  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    try {
      const chat = await getChat(req.params.chatId);
      if ('error' in chat) {
        console.warn('[getChatRoute] Chat not found:', req.params.chatId);
        res.status(404).json(chat);
        return;
      }

      const populated = await populateDocument(chat._id.toString(), 'chat');
      res.status(200).json(populated);
    } catch (err) {
      console.error('[getChatRoute] ❌ Error fetching chat:', err);
      res.status(500).json({ error: 'Failed to retrieve chat' });
    }
  };

 const getChatsByUserRoute = async (
  req: GetChatByParticipantsRequest,
  res: Response,
): Promise<void> => {
  try {
    const chats = await getChatsByParticipants([req.params.username]);
    const populatedChats = await Promise.all(
      chats.map(chat => populateDocument(chat._id.toString(), 'chat')),
    );

    const hasError = populatedChats.some(chat => (chat as any)?.error);
    if (hasError) {
      console.error('[getChatsByUserRoute] ❌ Error populating some chats');
      res.status(500).send('Error retrieving chat: Failed populating chats');
      return;
    }

    res.status(200).json(populatedChats);
  } catch (err) {
    console.error('[getChatsByUserRoute] ❌ Failed to retrieve chats:', err);
    res.status(500).json({ error: 'Failed to retrieve chats' });
  }
};


  const addParticipantToChatRoute = async (
    req: AddParticipantRequest,
    res: Response,
  ): Promise<void> => {
    if (!isAddParticipantRequestValid(req)) {
      console.error('[addParticipantToChatRoute] ❌ Invalid participant:', req.body);
      res.status(400).json({ error: 'Invalid participant' });
      return;
    }

    try {
      const updated = await addParticipantToChat(req.params.chatId, req.body.participant.toString());
      if ('error' in updated) {
        console.error('[addParticipantToChatRoute] ❌ addParticipantToChat error:', updated);
        res.status(500).json(updated);
        return;
      }

      const populated = await populateDocument(updated._id.toString(), 'chat');
      res.status(200).json(populated);
    } catch (err) {
      console.error('[addParticipantToChatRoute] ❌ Error:', err);
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
  router.post('/createChat', createChatRoute); // optional legacy

  return router;
};

export default chatController;
