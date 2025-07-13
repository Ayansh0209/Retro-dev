import React, { useState, useEffect } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '../utils/firebase';
import { onIdTokenChanged } from 'firebase/auth';

export default function AuthPage({ onAuthSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');


  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken(true); 
          localStorage.setItem('token', token);
          localStorage.setItem('email', user.email);
        } catch (err) {
          console.error('[Token Refresh Error]', err?.message || err);
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
      }
    });

    return () => unsubscribe();
  }, []);

  
  useEffect(() => {
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken(true); 
          localStorage.setItem('token', token);
          console.log('[Token refreshed]');
        } catch (err) {
          console.error('[Periodic Token Refresh Error]', err?.message || err);
        }
      }
    }, 50 * 60 * 1000); // 50 minutes

    return () => clearInterval(interval);
  }, []);

  //    Handle Login or Signup
  const handleAuth = async () => {
    try {
      const userCredential = isSignup
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);

      const token = await userCredential.user.getIdToken(true);
      localStorage.setItem('token', token);
      localStorage.setItem('email', email);

      //    Backend verification call
      const res = await fetch('http://localhost:3000/auth/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Backend verification failed');
      onAuthSuccess(email); // Notify parent component
    } catch (err) {
      console.error('[Auth Error]', err?.message || err);
      setAuthError(err?.message || 'Authentication failed.');
    }
  };

  return (
    <div className="p-6 text-green-500 font-mono bg-black h-screen flex flex-col justify-center items-center">
      <h1 className="text-xl mb-4">🔐 GitWhiz {isSignup ? 'Signup' : 'Login'}</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-2 px-2 py-1 bg-black border border-green-500 text-green-300 outline-none"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-2 px-2 py-1 bg-black border border-green-500 text-green-300 outline-none"
      />

      <button
        onClick={handleAuth}
        className="bg-green-600 px-4 py-1 rounded text-black font-bold hover:bg-green-400"
      >
        {isSignup ? 'Sign Up' : 'Login'}
      </button>

      <p
        className="text-green-400 underline mt-2 cursor-pointer"
        onClick={() => setIsSignup(!isSignup)}
      >
        {isSignup ? 'Already have an account? Login' : 'New user? Sign up'}
      </p>

      {authError && <p className="text-red-500 mt-2">{authError}</p>}
    </div>
  );
}
