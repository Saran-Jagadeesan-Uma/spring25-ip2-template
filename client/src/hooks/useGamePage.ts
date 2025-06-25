import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useUserContext from './useUserContext';
import { GameErrorPayload, GameInstance, GameUpdatePayload } from '../types';
import { joinGame, leaveGame } from '../services/gamesService';

/**
 * Custom hook to manage the state and logic for the game page, including joining, leaving the game, and handling game updates.
 * @returns An object containing the following:
 * - `gameState`: The current state of the game, or null if no game is joined.
 * - `error`: A string containing any error messages related to the game, or null if no errors exist.
 * - `handleLeaveGame`: A function to leave the current game and navigate back to the game list.
 */
const useGamePage = () => {
  const { user, socket } = useUserContext();
  const { gameID } = useParams();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameInstance | null>(null);
  const [joinedGameID, setJoinedGameID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLeaveGame = async () => {
    if (joinedGameID && gameState?.state.status !== 'OVER') {
      try {
        await leaveGame(joinedGameID, user.username);
        socket?.emit('leaveGame', joinedGameID);
      } catch (err) {
        setError('Failed to leave game.');
      }
    }

    navigate('/games');
  };

  useEffect(() => {
    const handleJoinGame = async (id: string) => {
      try {
        const game = await joinGame(id, user.username);
        setGameState(game);
        setJoinedGameID(id);
        socket?.emit('joinGame', id);
      } catch (err) {
        setError('Failed.');
      }
    };

    if (gameID) {
      handleJoinGame(gameID);
    }

    const handleGameUpdate = (updatedState: GameUpdatePayload) => {
      setGameState(updatedState.gameState);
    };

    const handleGameError = (gameError: GameErrorPayload) => {
      if (gameError.player === user.username) {
        setError(gameError.error);
      }
    };

    socket?.on('gameUpdate', handleGameUpdate);
    socket?.on('gameError', handleGameError);

    return () => {
      socket?.off('gameUpdate', handleGameUpdate);
      socket?.off('gameError', handleGameError);
    };
  }, [gameID, socket, user.username]);

  return {
    gameState,
    error,
    handleLeaveGame,
  };
};

export default useGamePage;
