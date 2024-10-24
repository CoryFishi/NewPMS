import { useState } from "react";
import Navbar from "../components/Navbar";
import DashboardLayout from "../components/DashboardLayout";

export default function Dashboard({
  currentFacility,
  setCurrentFacility,
  savedFacilities,
  setSavedFacilities,
  favoriteFacilities,
  setFavoriteFacilities,
  darkMode,
  toggleDarkMode,
}) {
  const [dashboardMenu, setDashboardMenu] = useState(true);

  return (
    <div className="h-screen w-screen flex flex-col overflow-x-hidden overflow-hidden font-roboto">
      <Navbar
        setDashboardMenu={setDashboardMenu}
        dashboardMenu={dashboardMenu}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
      <div className="flex flex-1">
        <DashboardLayout
          dashboardMenu={dashboardMenu}
          currentFacility={currentFacility}
          setCurrentFacility={setCurrentFacility}
          savedFacilities={
            Array.isArray(savedFacilities) ? savedFacilities : []
          }
          setSavedFacilities={setSavedFacilities}
          favoriteFacilities={favoriteFacilities}
          setFavoriteFacilities={setFavoriteFacilities}
        />
      </div>
    </div>
  );
}
