import Visitors from "@views/pms/visitors/Visitors";
import Units from "@views/pms/units/Units";
import AllFacilities from "@views/pms/all-facilities/AllFacilities";
import Favorites from "@views/pms/favorites/Favorites";
import Overview from "@views/pms/overview/Overview";
import Scripts from "@views/pms/scripts/Scripts";
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import { BsFillBuildingsFill, BsBuildingFill } from "react-icons/bs";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import axios from "axios";
import { useAuth } from "@context/AuthProvider";
import { supabase } from "@lib/supabaseClient";
import { FaExternalLinkAlt } from "react-icons/fa";
import { handleSingleLogin, buildApiUrl, authHeaders } from "@hooks/opentech";
import { RiAdminFill } from "react-icons/ri";

export default function PMSDashboardLayout({
  dashboardMenu,
  setDashboardMenu,
} : { dashboardMenu: boolean; setDashboardMenu: any }) {
  const {
    user,
    currentFacility,
    setCurrentFacility,
    setTokens,
    setFavoriteTokens,
    setSelectedTokens,
    permissions,
    getBearerToken,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNameGrabbed, setIsNameGrabbed] = useState(false);
  const [openSections, setOpenSections] = useState({
    facilities: false,
    currentFacility: false,
    admin: false,
  });
  const [currentFacilityName, setCurrentFacilityName] = useState("Select a Facility");

  // Determine active section from URL
  const path = location.pathname;
  const isFacilitySection = path.includes("/pms/visitors") || path.includes("/pms/units") || path.includes("/pms/overview");
  const isFacilitiesSection = path.includes("/pms/all-facilities") || path.includes("/pms/favorites");
  const isAdminSection = path.includes("/pms/scripts");

  const handleCurrentFacilityUpdate = useCallback(async (updatedInfo: any) => {
    const { error } = await supabase.from("user_data").upsert(
      {
        user_id: user.id,
        current_facility: updatedInfo,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Error saving credentials:", error.message);
    } else {
      setCurrentFacility(updatedInfo);
      setCurrentFacilityName(updatedInfo.name);
      setIsNameGrabbed(true);
    }
  }, [user, setCurrentFacility]);

  const handleCurrentFacilityDelete = async () => {
    const { error } = await supabase.from("user_data").upsert(
      {
        user_id: user.id,
        current_facility: {},
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Error saving credentials:", error.message);
    } else {
      setCurrentFacility({});
      setCurrentFacilityName("Select a Facility");
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      setTokens([]);
      setCurrentFacility({});
      setFavoriteTokens([]);
      setSelectedTokens([]);
      navigate("/login");
    }
  };

  const handleLogin = useCallback(async () => {
    if (!currentFacility || Object.keys(currentFacility).length === 0) return;

    // Use cached bearer token from AuthProvider when available
    const cached = getBearerToken(currentFacility);
    if (cached) {
      const updatedFacility = { ...currentFacility, token: { access_token: cached } };
      handleCurrentFacilityUpdate(updatedFacility);
      return;
    }

    try {
      const fetchToken = await handleSingleLogin(currentFacility);
      if ('token' in fetchToken) {
        const updatedFacility = {
          ...currentFacility,
          token: fetchToken.token,
        };
        handleCurrentFacilityUpdate(updatedFacility);
      } else {
        console.error("Login failed:", fetchToken.error);
      }
    } catch (err) {
      console.error("Login failed:", err);
    }
  }, [currentFacility, handleCurrentFacilityUpdate, getBearerToken]);

  const handleFacilityInfo = useCallback(async () => {
    if (Object.keys(currentFacility).length === 0) return;
    const config = {
      method: "get",
      url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}`),
      headers: authHeaders(currentFacility),
    };

    axios(config)
      .then(function (response) {
        const facilityInfo = response.data;
        let facility = currentFacility;
        const updatedFacility = {
          ...facility,
          facilityInfo,
        };
        handleCurrentFacilityUpdate(updatedFacility);
        setCurrentFacilityName(response.data.name);
      })
      .catch(function (error) {
        console.error("Error during login:", error);
      });
  }, [currentFacility, handleCurrentFacilityUpdate]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    const handleFacilityHandles = async () => {
      await handleLogin();
      await handleFacilityInfo();
    };
    if (!isNameGrabbed) {
      handleFacilityHandles();
    }
    // Token refresh is handled centrally by AuthProvider — no interval needed here
  }, [currentFacility, isNameGrabbed, handleLogin, handleFacilityInfo]);

  return (
    <div className="flex flex-col w-full h-screen overflow-y-auto overflow-hidden">
      <div className="flex flex-row w-full h-full shrink-0">
        {dashboardMenu === true && (
          <div className="flex flex-col h-full md:min-w-62.5 min-w-full bg-zinc-950 text-white dark:bg-zinc-950 border-r dark:border-zinc-800 select-none text-lg relative">
            {/* Header */}
            <div className="pt-2">
              <h3 className="text-center m-5 text-xl">OpenTech PMS</h3>
            </div>

            {/* Current Facility Section */}
            {currentFacility && currentFacility.id > 0 && (
              <div className={`pl-2 pr-2 pb-8 mt-8 ${isFacilitySection ? "bg-zinc-900 dark:bg-zinc-900 border-l-yellow-500 border-l-2" : "dark:bg-zinc-950"}`}>
                <div
                  className="flex justify-between items-center cursor-pointer mt-8"
                  onClick={() => toggleSection("currentFacility")}
                >
                  <div className="flex items-center space-x-2">
                    <BsBuildingFill className={`${isFacilitySection ? "text-yellow-500" : ""}`} />
                    <span className="pl-1 truncate max-w-[18ch]">{currentFacilityName}</span>
                  </div>
                  {openSections.currentFacility ? <MdExpandLess className="shrink-0 text-2xl" /> : <MdExpandMore className="shrink-0 text-2xl" />}
                </div>

                {!openSections.currentFacility && (
                  <div className="mx-4 mt-4 space-y-2">
                    <button
                      onClick={() => { navigate("/pms/visitors"); if (window.innerWidth < 768) setDashboardMenu(false); }}
                      className={`px-2 block w-full text-left cursor-pointer ${path === "/pms/visitors" ? "border-b-2 border-yellow-500" : ""} hover:bg-zinc-800 dark:hover:bg-zinc-800`}
                    >
                      Visitors
                    </button>
                    <button
                      onClick={() => { navigate("/pms/units"); if (window.innerWidth < 768) setDashboardMenu(false); }}
                      className={`px-2 block w-full text-left cursor-pointer ${path === "/pms/units" ? "border-b-2 border-yellow-500" : ""} hover:bg-zinc-800 dark:hover:bg-zinc-800`}
                    >
                      Units
                    </button>
                    {currentFacility && currentFacility.id > 0
                      ? (() => {
                          const baseUrl =
                            currentFacility.environment === "staging"
                              ? `https://portal.${currentFacility.environment}insomniaccia.com/facility/${currentFacility.id}/dashboard`
                              : `https://portal.insomniaccia${currentFacility.environment}.com/facility/${currentFacility.id}/dashboard`;
                          return (
                            <button
                              onClick={(e) => { e.preventDefault(); window.open(baseUrl, "_blank"); }}
                              title={baseUrl}
                              className="px-2 flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-800"
                            >
                              <FaExternalLinkAlt />
                              Control Center
                            </button>
                          );
                        })()
                      : null}
                    <button
                      onClick={() => {
                        navigate("/pms/all-facilities");
                        handleCurrentFacilityDelete();
                        if (window.innerWidth < 768) setDashboardMenu(false);
                      }}
                      className="px-2 block w-full text-left cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-800"
                    >
                      Clear Facility
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Facilities Section */}
            <div className={`border-t border-b pl-2 pr-2 border-zinc-500 pb-8 ${isFacilitiesSection ? "bg-zinc-900 dark:bg-zinc-900 border-l-yellow-500 border-l-2" : "dark:bg-zinc-950"}`}>
              <div
                className="flex justify-between items-center cursor-pointer mt-8"
                onClick={() => toggleSection("facilities")}
              >
                <div className="flex items-center space-x-2">
                  <BsFillBuildingsFill className={`${isFacilitiesSection ? "text-yellow-500" : ""}`} />
                  <span className="pl-1 truncate max-w-[18ch]">Other Options</span>
                </div>
                {openSections.facilities ? <MdExpandLess className="shrink-0 text-2xl" /> : <MdExpandMore className="shrink-0 text-2xl" />}
              </div>

              {!openSections.facilities && (
                <div className="mx-4 mt-4 space-y-2">
                  <button
                    onClick={() => { navigate("/pms/all-facilities"); if (window.innerWidth < 768) setDashboardMenu(false); }}
                    className={`px-2 block w-full text-left cursor-pointer ${path === "/pms/all-facilities" ? "border-b-2 border-yellow-500" : ""} hover:bg-zinc-800 dark:hover:bg-zinc-800`}
                  >
                    All Facilities
                  </button>
                  <button
                    onClick={() => { navigate("/pms/favorites"); if (window.innerWidth < 768) setDashboardMenu(false); }}
                    className={`px-2 block w-full text-left cursor-pointer ${path === "/pms/favorites" ? "border-b-2 border-yellow-500" : ""} hover:bg-zinc-800 dark:hover:bg-zinc-800`}
                  >
                    Favorites
                  </button>
                </div>
              )}
            </div>

            {/* Admin Section */}
            {permissions.pmsPlatformAdmin && currentFacility.id > 0 && (
              <div className={`border-t border-b pl-2 pr-2 border-zinc-500 pb-8 ${isAdminSection ? "bg-zinc-900 dark:bg-zinc-900 border-l-yellow-500 border-l-2" : "dark:bg-zinc-950"}`}>
                <div
                  className="flex justify-between items-center cursor-pointer mt-8"
                  onClick={() => toggleSection("admin")}
                >
                  <div className="flex items-center space-x-2">
                    <RiAdminFill className={`${isAdminSection ? "text-yellow-500" : ""}`} />
                    <span className="pl-1 truncate max-w-[18ch]">Admin Functions</span>
                  </div>
                  {openSections.admin ? <MdExpandLess className="shrink-0 text-2xl" /> : <MdExpandMore className="shrink-0 text-2xl" />}
                </div>

                {!openSections.admin && (
                  <div className="mx-4 mt-4 space-y-2">
                    <button
                      onClick={() => { navigate("/pms/scripts"); if (window.innerWidth < 768) setDashboardMenu(false); }}
                      className={`px-2 block w-full text-left cursor-pointer ${path === "/pms/scripts" ? "border-b-2 border-yellow-500" : ""} hover:bg-zinc-800 dark:hover:bg-zinc-800`}
                    >
                      Scripts
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="absolute bottom-0 w-full hidden md:flex justify-between text-sm cursor-pointer text-center">
              <Link to="/user-settings" className="hover:dark:bg-zinc-900 w-full p-2">Settings</Link>
              <div className="hover:dark:bg-zinc-900 w-full p-2">
                <a href="https://opentechalliancesupport.zendesk.com/hc/en-us/categories/115001966887-OpenTech-IoE" target="_blank" rel="noopener noreferrer">Help</a>
              </div>
              <div className="hover:dark:bg-zinc-900 w-full p-2" onClick={handleLogout}>Logout</div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="w-full flex flex-col h-full">
          <Routes>
            <Route index element={<Navigate to="all-facilities" replace />} />
            <Route path="all-facilities" element={<AllFacilities setCurrentFacilityName={setCurrentFacilityName} />} />
            <Route path="favorites" element={<Favorites setCurrentFacilityName={setCurrentFacilityName} />} />
            <Route path="units" element={<Units currentFacilityName={currentFacilityName} />} />
            <Route path="visitors" element={<Visitors currentFacilityName={currentFacilityName} />} />
            <Route path="overview" element={<Overview currentFacilityName={currentFacilityName} />} />
            <Route path="scripts" element={<Scripts />} />
            <Route path="*" element={<Navigate to="all-facilities" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
