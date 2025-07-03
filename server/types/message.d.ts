import { ObjectId } from 'mongodb';
import { Request } from 'express';

/**
 * Interface representing a Message, which contains:
 * - _id - The unique identifier for the message. Optional field.
 * - msg - The text of the message.
 * - msgFrom - The username of the user sending the message.
 * - msgDateTime - The date and time when the message was sent.
 */
export interface Message {
  _id?: ObjectId;
  msg: string;
  msgFrom: string | ObjectId; 
  msgDateTime: Date;
  type: 'global' | 'direct';
}

/**
 * Type representing the possible responses for a Message-related operation.
 */
export type MessageResponse = Message | { error: string };

/**
 * Interface extending the request body when adding a message to a chat, which contains:
 * - messageToAdd - The message being added.
 */
export interface AddMessageRequest extends Request {
  body: {
    messageToAdd: Omit<Message, 'type'>;
  };
}

/**
 * Interface representing the payload for a message update event, which contains:
 * - msg - The updated message.
 */
export interface MessageUpdatePayload {
  msg: Message;
}
