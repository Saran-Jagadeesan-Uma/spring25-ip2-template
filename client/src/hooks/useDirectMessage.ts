import { useEffect, useState } from 'react';
import { Chat, ChatUpdatePayload, User } from '../types';
import useUserContext from './useUserContext';
import { createChat, getChatById, getChatsByUser, sendMessage } from '../services/chatService';

/**
 * useDirectMessage is a custom hook that provides state and functions for direct messaging between users.
 * It includes a selected user, messages, and a new message state.
 */
const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const handleJoinChat = (chatID: string) => {
    socket.emit('joinChat', chatID);
  };

  const handleSendMessage = async () => {
    if (!selectedChat || newMessage.trim() === '') return;

    const result = await sendMessage(
      {
        msg: newMessage,
        msgFrom: user.username,
        msgDateTime: new Date(),
      },
      selectedChat._id?.toString() ?? '',
    );

    if ('error' in result) return;

    setSelectedChat(prev =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, result],
            updatedAt: new Date(),
          }
        : prev,
    );
    setNewMessage('');
  };

  const handleChatSelect = async (chatID: string | undefined) => {
    if (!chatID) return;
    const chat = await getChatById(chatID);
    if (!('error' in chat)) {
      setSelectedChat(chat);
      handleJoinChat(chatID);
    }
  };

  const handleUserSelect = (selectedUser: User) => {
    setChatToCreate(selectedUser.username);
  };

  const handleCreateChat = async () => {
    if (!chatToCreate) return;

    const result = await createChat([user.username, chatToCreate]);

    if ('error' in result) return;

    setChats(prev => {
      const exists = prev.some(chat => chat._id === result._id);
      return exists ? prev : [...prev, result];
    });
    setSelectedChat(result);
    handleJoinChat(result._id.toString());
    setShowCreatePanel(false);
    setChatToCreate('');
  };

  useEffect(() => {
    const fetchChats = async () => {
      const result = await getChatsByUser(user.username);
      if (!('error' in result)) setChats(result);
    };

    const handleChatUpdate = (chatUpdate: ChatUpdatePayload) => {
      if (chatUpdate.type === 'created') {
        setChats(prev => {
          const exists = prev.some(chat => chat._id === chatUpdate.chat._id);
          return exists ? prev : [...prev, chatUpdate.chat];
        });
      } else if (chatUpdate.type === 'newMessage') {
        setSelectedChat(prev => {
          if (
            prev &&
            prev._id &&
            chatUpdate.chat._id &&
            prev._id.toString() === chatUpdate.chat._id.toString()
          ) {
            return chatUpdate.chat;
          }
          return prev;
        });
      } else {
        throw new Error('Invalid chat update type');
      }
    };

    fetchChats();
    socket.on('chatUpdate', handleChatUpdate);

    return () => {
      socket.off('chatUpdate', handleChatUpdate);

      if (selectedChat?._id) {
        socket.emit('leaveChat', selectedChat._id.toString());
      }
    };
  }, [user.username, socket, selectedChat?._id]);

  return {
    selectedChat,
    chatToCreate,
    chats,
    newMessage,
    setNewMessage,
    showCreatePanel,
    setShowCreatePanel,
    handleSendMessage,
    handleChatSelect,
    handleUserSelect,
    handleCreateChat,
  };
};

export default useDirectMessage;
