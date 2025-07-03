import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  getUserByUsername,
  deleteUser,
  resetPassword,
  updateBiography,
} from '../services/userService';
import { User } from '../types';
import useUserContext from './useUserContext';

/**
 * A custom hook to encapsulate all logic/state for the ProfileSettings component.
 */
const useProfileSettings = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useUserContext();

  const [userData, setUserData] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [editBioMode, setEditBioMode] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const canEditProfile = currentUser?.username === username;

  useEffect(() => {
    if (!username) {
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await getUserByUsername(username);
        setUserData(data);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage('Error fetching user profile');
        setSuccessMessage(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username]);

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const validatePasswords = () =>
    newPassword && confirmNewPassword && newPassword === confirmNewPassword;

  const handleResetPassword = async () => {
    if (!username) {
      setErrorMessage('Username not found.');
      setSuccessMessage(null);
      return;
    }

    if (!validatePasswords()) {
      setErrorMessage('Passwords do not match.');
      setSuccessMessage(null);
      return;
    }

    try {
      await resetPassword(username, newPassword);
      setSuccessMessage('Password reset successfully.');
      setErrorMessage(null);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      setErrorMessage('Failed to reset password.');
      setSuccessMessage(null);
    }
  };

  const handleUpdateBiography = async () => {
    if (!username) {
      setErrorMessage('Username not found.');
      setSuccessMessage(null);
      return;
    }
    try {
      const updatedUser = await updateBiography(username, newBio);
      setUserData(updatedUser);
      setSuccessMessage('Biography updated successfully.');
      setErrorMessage(null);
      setEditBioMode(false);
    } catch (error) {
      setErrorMessage('Failed to update biography.');
      setSuccessMessage(null);
    }
  };

  const handleDeleteUser = () => {
    if (!username) {
      setErrorMessage('Username not found.');
      setSuccessMessage(null);
      return;
    }

    setShowConfirmation(true);
    setPendingAction(() => async () => {
      try {
        await deleteUser(username);
        setSuccessMessage('Account deleted successfully.');
        setErrorMessage(null);
        navigate('/');
      } catch (error) {
        setErrorMessage('Failed to delete user.');
        setSuccessMessage(null);
      } finally {
        setShowConfirmation(false);
      }
    });
  };

  return {
    userData,
    newPassword,
    confirmNewPassword,
    setNewPassword,
    setConfirmNewPassword,
    loading,
    editBioMode,
    setEditBioMode,
    newBio,
    setNewBio,
    successMessage,
    errorMessage,
    showConfirmation,
    setShowConfirmation,
    pendingAction,
    setPendingAction,
    canEditProfile,
    showPassword,
    togglePasswordVisibility,
    handleResetPassword,
    handleUpdateBiography,
    handleDeleteUser,
  };
};

export default useProfileSettings;
