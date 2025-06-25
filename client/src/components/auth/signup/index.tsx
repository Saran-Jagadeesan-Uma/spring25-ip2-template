import React from 'react';
import './index.css';
import { Link } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';

/**
 * Renders a signup form with username, password, and password confirmation inputs,
 * password visibility toggle, error handling, and a link to the login page.
 */
const Signup = () => {
  const {
    username,
    password,
    passwordConfirmation,
    showPassword,
    err,
    handleSubmit,
    handleInputChange,
    togglePasswordVisibility,
  } = useAuth('signup');

  return (
    <div className='container'>
      <h2>Sign up for FakeStackOverflow!</h2>
      <form onSubmit={handleSubmit}>
        <h4>Please enter your username.</h4>
        <input
          type='text'
          className='input-text'
          value={username}
          onChange={e => handleInputChange(e, 'username')}
        />

        <h4>Please enter your password.</h4>
        <input
          type={showPassword ? 'text' : 'password'}
          className='input-text'
          value={password}
          onChange={e => handleInputChange(e, 'password')}
        />

        <h4>Please confirm your password.</h4>
        <input
          type={showPassword ? 'text' : 'password'}
          className='input-text'
          value={passwordConfirmation}
          onChange={e => handleInputChange(e, 'confirmPassword')}
        />

        <div className='show-password'>
          <input
            type='checkbox'
            id='showPasswordToggle'
            checked={showPassword}
            onChange={togglePasswordVisibility}
          />
          <label htmlFor='showPasswordToggle'>Show Password</label>
        </div>

        <button type='submit' className='login-button'>
          Submit
        </button>
      </form>

      {err && <p className='error-message'>{err}</p>}

      <Link to='/' className='login-link'>
        Have an account? Login here.
      </Link>
    </div>
  );
};

export default Signup;
