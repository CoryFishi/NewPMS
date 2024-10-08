import axios from "axios";
import toast from "react-hot-toast";
import React, { useEffect, useState } from "react";
import { GoStar, GoStarFill } from "react-icons/go";
import qs from "qs";

export default function FavoritesPage({
  setCurrentFacility,
  setCurrentFacilityName,
  savedFacilities,
  favoriteFacilities,
  setFavoriteFacilities,
}) {
  const [facilities, setFacilities] = useState([]);

  const handleSelectLogin = async (facility) => {
    var tokenStageKey = "";
    var tokenEnvKey = "";
    if (facility.environment === "cia-stg-1.aws.") {
      tokenStageKey = "cia-stg-1.aws.";
    } else {
      tokenEnvKey = facility.environment;
    }
    const data = qs.stringify({
      grant_type: "password",
      username: facility.api,
      password: facility.apiSecret,
      client_id: facility.client,
      client_secret: facility.clientSecret,
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

    return axios(config)
      .then(function (response) {
        localStorage.setItem(
          "currentFacility",
          JSON.stringify({
            ...facility,
            bearer: response.data,
          })
        );
        setCurrentFacility((prevState) => ({
          ...prevState,
          bearer: response.data,
        }));
        setCurrentFacilityName(facility.name);
        return response;
      })
      .catch(function (error) {
        console.error("Error during login:", error);
        throw error;
      });
  };

  const handleFacilities = async (saved) => {
    // Run the toast notification for each facility
    try {
      setFacilities(favoriteFacilities);
      toast.success(<b>Favorites loaded successfully!</b>);
    } catch {
      alert("It broke");
    }
  };

  const handleSelect = async (facility) => {
    setCurrentFacility(facility);
    localStorage.setItem("currentFacility", JSON.stringify(facility));
    toast.promise(handleSelectLogin(facility), {
      loading: "Selecting facility...",
      success: <b>Facility selected!</b>,
      error: <b>Could not select facility.</b>,
    });
  };

  const addToFavorite = async (facility) => {
    const isFavorite = isFacilityFavorite(facility.id);
    if (isFavorite) {
      setFavoriteFacilities((prevFavoriteFacilities) => {
        const updatedFavorites = prevFavoriteFacilities.filter(
          (favFacility) => favFacility.id !== facility.id
        );

        localStorage.setItem(
          "favoriteFacilities",
          JSON.stringify(updatedFavorites)
        );
        return updatedFavorites;
      });
    } else {
      setFavoriteFacilities((prevFavoriteFacilities) => {
        const updatedFavorites = [...prevFavoriteFacilities, facility];
        localStorage.setItem(
          "favoriteFacilities",
          JSON.stringify(updatedFavorites)
        );
        return updatedFavorites;
      });
    }
  };

  useEffect(() => {
    handleFacilities(savedFacilities);
  }, []);

  const isFacilityFavorite = (facilityId) => {
    return favoriteFacilities.some((facility) => facility.id === facilityId);
  };

  return (
    <div className="w-full h-full p-5 flex flex-col rounded-lg overflow-auto mb-14">
      <table className="w-full table-auto border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-4 py-2"></th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Environment
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Facility Id
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Facility Name
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Property Number
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {facilities.map((facility, index) => (
            <tr key={index} className="hover:bg-gray-100">
              <td
                className="border border-gray-300 px-4 py-2 hover:cursor-pointer"
                onClick={() => addToFavorite(facility)}
              >
                <div className="flex justify-center text-yellow-500">
                  {isFacilityFavorite(facility.id) ? (
                    <GoStarFill />
                  ) : (
                    <GoStar />
                  )}
                </div>
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {facility.environment == "-dev"
                  ? "Development"
                  : ""
                  ? "Production"
                  : "-qa"
                  ? "QA"
                  : "cia-stg-1.aws."
                  ? "Staging"
                  : "N?A"}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {facility.id}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {facility.name}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {facility.propertyNumber}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <button
                  className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                  onClick={() => handleSelect(facility)}
                >
                  Select
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
