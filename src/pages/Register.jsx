import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import SignUp from "../components/SignUp";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function Register({ darkMode, toggleDarkMode }) {
  const [dashboardMenu, setDashboardMenu] = useState(true);
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading && user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-x-hidden overflow-hidden font-roboto">
      <Navbar
        setDashboardMenu={setDashboardMenu}
        dashboardMenu={dashboardMenu}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
      <SignUp />
    </div>
  );
}
