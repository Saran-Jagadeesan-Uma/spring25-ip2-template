import React from 'react';
import './index.css';
import useDirectMessage from '../../../hooks/useDirectMessage';
import ChatsListCard from './chatsListCard';
import UsersListPage from '../usersListPage';
import MessageCard from '../messageCard';
import { User } from '../../../types';

/**
 * DirectMessage component renders a page for direct messaging between users.
 * It includes a list of users and a chat window to send and receive messages.
 */
const DirectMessage = () => {
  const {
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
  } = useDirectMessage();

  return (
    <>
      <div className='create-panel'>
        <button
          className='custom-button'
          onClick={() => setShowCreatePanel(prevState => !prevState)}>
          {showCreatePanel ? 'Hide Create Chat Panel' : 'Start a Chat'}
        </button>
        {showCreatePanel && (
          <>
            <p>Selected User: {chatToCreate?.username}</p>
            <button className='custom-button' onClick={handleCreateChat}>
              Create Chat
            </button>
            <UsersListPage handleUserSelect={handleUserSelect} />
          </>
        )}
      </div>
      <div className='direct-message-container'>
        <div className='chats-list'>
          {chats.map(chat => (
            <ChatsListCard
              key={chat._id?.toString()}
              chat={chat}
              handleChatSelect={handleChatSelect}
            />
          ))}
        </div>
        <div className='chat-container'>
          {selectedChat ? (
            <>
              <h2>
                Chat Participants:{' '}
                {selectedChat.participants
                  .filter(p => typeof p === 'object' && 'username' in p)
                  .map(p => (p as User).username)
                  .join(', ')}
              </h2>

              <div className='chat-messages'>
                {selectedChat.messages.map(msg => (
                  <MessageCard key={msg._id?.toString()} message={msg} />
                ))}
              </div>
              <div className='message-input'>
                <input
                  type='text'
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder='Enter MEssage'
                  className='custom-input'
                />
                <button className='custom-button' onClick={handleSendMessage}>
                  Send
                </button>
              </div>
            </>
          ) : (
            <h2>Select a user to start chatting</h2>
          )}
        </div>
      </div>
    </>
  );
};

export default DirectMessage;
