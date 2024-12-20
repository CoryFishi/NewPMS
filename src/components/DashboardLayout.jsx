import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BsFillBuildingsFill, BsBuildingFill } from "react-icons/bs";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import VisitorPage from "./VisitorPage";
import UnitPage from "./UnitPage";
import AllFacilitiesPage from "./AllFacilitiesPage";
import FavoritesPage from "./FavoritesPage";
import axios from "axios";
import qs from "qs";

export default function DashboardLayout({
  dashboardMenu,
  currentFacility,
  setCurrentFacility,
  savedFacilities = [],
  favoriteFacilities,
  setFavoriteFacilities,
}) {
  const [openSections, setOpenSections] = useState({
    facilities: false,
    currentFacility: false,
  });
  const [openPage, setOpenPage] = useState(
    localStorage.getItem("openPage") || "allFacilities"
  );
  const [currentFacilityName, setCurrentFacilityName] = useState(
    localStorage.getItem("selectedFacilityName") || "Select a Facility"
  );
  const existingLocalStorageFacility =
    JSON.parse(localStorage.getItem("currentFacility")) || {};

  const navigate = useNavigate();

  const handleLogin = () => {
    var tokenStageKey = "";
    var tokenEnvKey = "";
    if (currentFacility.environment === "cia-stg-1.aws.") {
      tokenStageKey = "cia-stg-1.aws.";
    } else {
      tokenEnvKey = currentFacility.environment;
    }
    const data = qs.stringify({
      grant_type: "password",
      username: currentFacility.api,
      password: currentFacility.apiSecret,
      client_id: currentFacility.client,
      client_secret: currentFacility.clientSecret,
    });
    const config = {
      method: "post",
      url: `https://auth.${tokenStageKey}insomniaccia${tokenEnvKey}.com/auth/token`,
      headers: {
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    };

    axios(config)
      .then(function (response) {
        const tokenData = response.data;
        localStorage.setItem(
          "currentFacility",
          JSON.stringify({
            ...existingLocalStorageFacility,
            bearer: response.data,
          })
        );
        setCurrentFacility((prevState) => ({
          ...prevState,
          bearer: response.data,
        }));
        setCurrentFacilityName(currentFacility.name);

        setTimeout(() => {
          handleLogin();
        }, (tokenData.expires_in - 60) * 1000);
      })
      .catch(function (error) {
        console.error("Error during login:", error);
      });
  };

  const handleFacilityInfo = () => {
    var tokenStageKey = "";
    var tokenEnvKey = "";
    if (currentFacility.environment === "cia-stg-1.aws.") {
      tokenStageKey = "cia-stg-1.aws.";
    } else {
      tokenEnvKey = currentFacility.environment;
    }
    const config = {
      method: "get",
      url: `https://accesscontrol.${tokenStageKey}insomniaccia${tokenEnvKey}.com/facilities/${currentFacility.id}`,
      headers: {
        accept: "application/json",
        Authorization: "Bearer " + currentFacility.bearer.access_token,
        "api-version": "2.0",
      },
    };

    axios(config)
      .then(function (response) {
        setCurrentFacility((prevState) => ({
          ...prevState,
          facilityInfo: response.data,
        }));
        setCurrentFacilityName(response.data.name);
      })
      .catch(function (error) {
        console.error("Error during login:", error);
      });
  };

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Check if savedFacilities is empty and alert the user
  useEffect(() => {
    if (savedFacilities.length === 0) {
      alert("Please authenticate a service, before proceeding...");
      navigate("/settings");
    }
  }, [savedFacilities, navigate]);

  // Run handleLogin once when the component loads
  useEffect(() => {
    const initialize = async () => {
      try {
        await handleLogin();
        await handleFacilityInfo();
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };

    initialize();
  }, []);

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden">
      <div className="flex flex-row w-full h-full">
        {dashboardMenu === true && (
          <div className="flex flex-col h-full w-1/6 bg-navPrimary text-white text-xl dark:bg-darkNavPrimary border-r dark:border-border select-none">
            {/* Header Side Bar */}
            <div>
              <h3 className="text-center m-5 text-2xl">OPENTECH IoE</h3>
            </div>

            {/* Current Facility Side Bar */}
            <div
              className={`pl-2 pr-2 pb-8 mt-8 ${
                openPage === "visitors" || openPage === "units"
                  ? "bg-navSecondary dark:bg-darkNavSecondary border-l-yellow-500 border-l-2"
                  : "dark:bg-darkNavPrimary"
              }`}
            >
              <div
                className="flex justify-between items-center cursor-pointer mt-8"
                onClick={() => toggleSection("currentFacility")}
              >
                <div className="flex items-center space-x-2">
                  <BsBuildingFill />
                  <span className="pl-2">{currentFacilityName}</span>
                </div>
                {openSections.currentFacility ? (
                  <MdExpandLess />
                ) : (
                  <MdExpandMore />
                )}
              </div>

              {!openSections.currentFacility && (
                <div className="mx-4 mt-4 space-y-2">
                  <Link
                    onClick={() =>
                      setOpenPage("visitors") &
                      localStorage.setItem("openPage", "visitors")
                    }
                    className="px-2 block rounded hover:bg-darkNavSecondary dark:hover:bg-darkPrimary"
                  >
                    Visitors
                  </Link>
                  <Link
                    onClick={() =>
                      setOpenPage("units") &
                      localStorage.setItem("openPage", "units")
                    }
                    className="px-2 block rounded hover:bg-darkNavSecondary dark:hover:bg-darkPrimary"
                  >
                    Units
                  </Link>
                </div>
              )}
            </div>

            {/* Facilities Side Bar */}
            <div
              className={`border-t border-b pl-2 pr-2 border-gray-500 pb-8 ${
                openPage === "allFacilities" || openPage === "favorites"
                  ? "bg-navSecondary dark:bg-darkNavSecondary border-l-yellow-500 border-l-2"
                  : "dark:bg-darkNavPrimary"
              }`}
            >
              <div
                className="flex justify-between items-center cursor-pointer mt-8"
                onClick={() => toggleSection("facilities")}
              >
                <div className="flex items-center space-x-2">
                  <BsFillBuildingsFill />
                  <span>Other Options</span>
                </div>
                {openSections.facilities ? <MdExpandLess /> : <MdExpandMore />}
              </div>

              {!openSections.facilities && (
                <div className="mx-4 mt-4 space-y-2">
                  <Link
                    onClick={() =>
                      setOpenPage("allFacilities") &
                      localStorage.setItem("openPage", "allFacilities")
                    }
                    className="px-2 block rounded hover:bg-darkNavSecondary dark:hover:bg-darkPrimary"
                  >
                    All Facilities
                  </Link>
                  <Link
                    onClick={() =>
                      setOpenPage("favorites") &
                      localStorage.setItem("openPage", "favorites")
                    }
                    className="px-2 block rounded hover:bg-darkNavSecondary dark:hover:bg-darkPrimary"
                  >
                    Favorites
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="w-full flex flex-col bg-background-50 dark:bg-darkPrimary h-full">
          {openPage === "visitors" && (
            <VisitorPage
              currentFacility={currentFacility}
              currentFacilityName={currentFacilityName}
            />
          )}
          {openPage === "units" && (
            <UnitPage
              currentFacility={currentFacility}
              currentFacilityName={currentFacilityName}
            />
          )}
          {openPage === "allFacilities" && (
            <AllFacilitiesPage
              currentFacility={currentFacility}
              setCurrentFacility={setCurrentFacility}
              setCurrentFacilityName={setCurrentFacilityName}
              savedFacilities={savedFacilities}
              favoriteFacilities={favoriteFacilities}
              setFavoriteFacilities={setFavoriteFacilities}
              setOpenPage={setOpenPage}
            />
          )}
          {openPage === "favorites" && (
            <FavoritesPage
              currentFacility={currentFacility}
              setCurrentFacility={setCurrentFacility}
              setCurrentFacilityName={setCurrentFacilityName}
              savedFacilities={savedFacilities}
              favoriteFacilities={favoriteFacilities}
              setFavoriteFacilities={setFavoriteFacilities}
              setOpenPage={setOpenPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
