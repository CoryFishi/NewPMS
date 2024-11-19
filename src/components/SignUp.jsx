import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "Sign-up successful! Please check your email to confirm. Once confirmed please login."
      );
      setError(null);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-darkPrimary">
      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg max-w-sm w-full">
            <h1 className="font-bold text-center text-3xl">Oh no!</h1>
            <p className="text-center text-red-500 mt-3">{error}</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded w-full"
              onClick={() => setError(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg max-w-sm w-full">
            <h1 className="font-bold text-center text-3xl">Success!</h1>
            <p className="text-center text-blue-500 mt-3">{message}</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded w-full"
              onClick={() => setMessage(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <form
        onSubmit={handleSignUp}
        className="bg-white dark:bg-darkSecondary shadow-lg rounded-lg p-8 max-w-md w-full space-y-4 mb-16"
      >
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 text-center mb-6">
          Sign Up
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        />

        <button
          type="submit"
          className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-150"
        >
          Sign Up
        </button>

        <p className="text-center dark:text-white">
          Already have an account? Sign In{" "}
          <span
            className="text-blue-400 hover:cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Here
          </span>
        </p>
      </form>
    </div>
  );
}