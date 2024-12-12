import { useState } from "react";
import Navbar from "../components/Navbar";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthProvider";
import NotFound from "../components/NotFound";

export default function Dashboard({ darkMode, toggleDarkMode }) {
  const [dashboardMenu, setDashboardMenu] = useState(true);
  const { user, permissions } = useAuth();

  return (
    <div className="h-screen w-screen flex flex-col overflow-x-hidden overflow-hidden font-roboto">
      {user && permissions.pmsPlatform ? (
        <>
          <Navbar
            setDashboardMenu={setDashboardMenu}
            dashboardMenu={dashboardMenu}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
          <div className="flex flex-1">
            <DashboardLayout dashboardMenu={dashboardMenu} />
          </div>
        </>
      ) : (
        <NotFound />
      )}
    </div>
  );
}
