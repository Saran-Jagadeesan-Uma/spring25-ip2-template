import mongoose, { Model } from 'mongoose';
import chatSchema from './schema/chat.schema';
import { Chat } from '../types/chat';

/**
 * Mongoose model for the Chat collection.
 */
const ChatModel: Model<Chat> = mongoose.models.Chat || mongoose.model<Chat>('Chat', chatSchema);

export default ChatModel;
