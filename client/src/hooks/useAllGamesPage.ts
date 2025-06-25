import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame, getGames } from '../services/gamesService';
import { GameInstance, GameType } from '../types';

/**
 * Custom hook to manage the state and logic for the "All Games" page, including fetching games,
 * creating a new game, and navigating to game details.
 */
const useAllGamesPage = () => {
  const navigate = useNavigate();
  const [availableGames, setAvailableGames] = useState<GameInstance[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchGames = async () => {
    try {
      const games = await getGames(undefined, 'WAITING_TO_START');
      setAvailableGames(games);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    }
  };

  const handleCreateGame = async (gameType: GameType) => {
    try {
      await createGame(gameType);
      await fetchGames();
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  const handleJoin = (gameID: string) => {
    navigate(`/games/${gameID}`);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleToggleModal = () => {
    setIsModalOpen(prev => !prev);
  };

  const handleSelectGameType = (gameType: GameType) => {
    handleCreateGame(gameType);
    handleToggleModal();
  };

  return {
    availableGames,
    handleJoin,
    fetchGames,
    isModalOpen,
    handleToggleModal,
    handleSelectGameType,
  };
};

export default useAllGamesPage;
