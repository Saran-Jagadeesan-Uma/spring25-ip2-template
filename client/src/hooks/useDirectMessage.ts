import { useEffect, useState } from 'react';
import { Chat, ChatUpdatePayload, User } from '../types';
import useUserContext from './useUserContext';
import { createChat, getChatById, getChatsByUser, sendMessage } from '../services/chatService';

const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<User | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const handleJoinChat = (chatID: string) => {
    socket.emit('joinChat', chatID);
  };

  const handleSendMessage = async () => {
    if (!selectedChat || !selectedChat._id || !user || !user._id || newMessage.trim() === '') {
      return;
    }

    const result = await sendMessage(
      {
        msg: newMessage,
        msgFrom: user._id.toString(),
        msgDateTime: new Date(),
      },
      selectedChat._id.toString(),
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
    setChatToCreate(selectedUser);
  };

  const handleCreateChat = async () => {
    if (!chatToCreate || !chatToCreate._id || !user || !user._id) return;

    const result = await createChat([user._id.toString(), chatToCreate._id.toString()]);

    if ('error' in result) return;

    setChats(prev => {
      const exists = prev.some(chat => chat._id === result._id);
      return exists ? prev : [...prev, result];
    });
    setSelectedChat(result);
    handleJoinChat(result._id.toString());
    setShowCreatePanel(false);
    setChatToCreate(null);
  };

  useEffect(() => {
    const fetchChats = async () => {
      if (!user._id) return;
      const result = await getChatsByUser(user._id.toString());
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
