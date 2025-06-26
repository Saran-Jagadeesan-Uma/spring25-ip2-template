import { useState } from 'react';
import useUserContext from './useUserContext';
import { GameInstance, GameMove } from '../types';

/**
 * Custom hook to manage the state and logic for the "Nim" game page,
 * including making a move and handling input changes.
 * @param gameState The current state of the Nim game.
 * @returns An object containing the following:
 * - `user`: The current user from the context.
 * - `move`: The current move entered by the player.
 * - `handleMakeMove`: A function to send the player's move to the server via a socket event.
 * - `handleInputChange`: A function to update the move state based on user input (1 to 3 objects).
 */

const useNimGamePage = (gameState: GameInstance) => {
  const { user, socket } = useUserContext();

  const [move, setMove] = useState<number>(1);

  const handleMakeMove = async () => {
    if (!socket || !user || !gameState) return;

    const movePayload: GameMove = {
      gameID: gameState.gameID,
      move: {
        playerID: user.username,
        gameID: gameState.gameID,
        move: {
          numObjects: move,
        },
      },
    };
    socket.emit('makeMove', movePayload);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const parsed = parseInt(value, 10);

    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 3) {
      setMove(parsed);
    }
  };

  return {
    user,
    move,
    handleMakeMove,
    handleInputChange,
  };
};

export default useNimGamePage;
