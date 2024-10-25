import axios from "axios";
import toast from "react-hot-toast";
import React, { useEffect, useState } from "react";
import qs from "qs";
import {
  RiCheckboxCircleFill,
  RiCheckboxBlankCircleLine,
} from "react-icons/ri";

export default function SmartLockSelectedPage({
  savedFacilities,
  selectedFacilities,
  setSelectedFacilities,
  setOpenPage,
}) {
  const [facilities, setFacilities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFacilities, setFilteredFacilities] =
    useState(selectedFacilities);

  const handleFacilities = async (saved) => {
    // Run the toast notification for each facility
    try {
      setFacilities(selectedFacilities);
      toast.success(<b>Favorites loaded successfully!</b>);
    } catch {
      alert("It broke");
    }
  };

  const addToSelected = async (facility) => {
    const isSelected = isFacilitySelected(facility.id);
    if (isSelected) {
      setSelectedFacilities((prevFavoriteFacilities) => {
        const updatedFavorites = prevFavoriteFacilities.filter(
          (favFacility) => favFacility.id !== facility.id
        );

        localStorage.setItem(
          "selectedFacilities",
          JSON.stringify(updatedFavorites)
        );
        return updatedFavorites;
      });
    } else {
      setSelectedFacilities((prevFavoriteFacilities) => {
        const updatedFavorites = [...prevFavoriteFacilities, facility];
        localStorage.setItem(
          "selectedFacilities",
          JSON.stringify(updatedFavorites)
        );
        return updatedFavorites;
      });
    }
  };

  useEffect(() => {
    handleFacilities(savedFacilities);
  }, []);

  const isFacilitySelected = (facilityId) => {
    return selectedFacilities.some((facility) => facility.id === facilityId);
  };

  useEffect(() => {
    const filtered = facilities.filter(
      (facility) =>
        (facility.id || "").toString().includes(searchQuery) ||
        (facility.propertyNumber || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (facility.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (facility.environment || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
    setFilteredFacilities(filtered);
  }, [facilities, searchQuery]);

  return (
    <div className="overflow-auto h-full dark:text-white dark:bg-darkPrimary">
      <div className="flex h-12 bg-gray-200 items-center dark:border-border dark:bg-darkNavPrimary">
        <div className="ml-5 flex items-center text-sm">
          <RiCheckboxCircleFill className="text-lg" />
          &ensp; Selected Facilities
        </div>
      </div>
      <div className="w-full h-full p-5 flex flex-col rounded-lg pb-10">
        <input
          type="text"
          placeholder="Search facilities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-2 border p-2 w-full dark:bg-darkNavSecondary rounded dark:border-border"
        />
        <table className="w-full table-auto border-collapse  pb-96">
          <thead className="sticky top-[-1px] z-10">
            <tr className="bg-gray-200 dark:bg-darkNavSecondary">
              <th className="border border-gray-300 dark:border-border px-4 py-2 text-left hover:bg-slate-300 hover:dark:bg-darkPrimary hover:transition hover:duration-300 hover:ease-in-out"></th>
              <th
                className="border border-gray-300 dark:border-border px-4 py-2 text-left hover:cursor-pointer hover:bg-slate-300 hover:dark:bg-darkPrimary hover:transition hover:duration-300 hover:ease-in-out"
                onClick={() =>
                  setFilteredFacilities(
                    [...filteredFacilities].sort((a, b) => {
                      if (a.environment < b.environment) return -1;
                      if (a.environment > b.environment) return 1;
                      return 0;
                    })
                  )
                }
              >
                Environment
              </th>
              <th
                className="border border-gray-300 dark:border-border px-4 py-2 text-left hover:cursor-pointer hover:bg-slate-300 hover:dark:bg-darkPrimary hover:transition hover:duration-300 hover:ease-in-out"
                onClick={() =>
                  setFilteredFacilities(
                    [...filteredFacilities].sort((a, b) => {
                      if (a.id < b.id) return -1;
                      if (a.id > b.id) return 1;
                      return 0;
                    })
                  )
                }
              >
                Facility Id
              </th>
              <th
                className="border border-gray-300 dark:border-border px-4 py-2 text-left hover:cursor-pointer hover:bg-slate-300 hover:dark:bg-darkPrimary hover:transition hover:duration-300 hover:ease-in-out"
                onClick={() =>
                  setFilteredFacilities(
                    [...filteredFacilities].sort((a, b) => {
                      if (a.name.toLowerCase() < b.name.toLowerCase())
                        return -1;
                      if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
                      return 0;
                    })
                  )
                }
              >
                Facility Name
              </th>
              <th
                className="border border-gray-300 dark:border-border px-4 py-2 text-left hover:cursor-pointer hover:bg-slate-300 hover:dark:bg-darkPrimary hover:transition hover:duration-300 hover:ease-in-out"
                onClick={() =>
                  setFilteredFacilities(
                    [...filteredFacilities].sort((a, b) => {
                      const propA = a.propertyNumber
                        ? a.propertyNumber.toLowerCase()
                        : "";
                      const propB = b.propertyNumber
                        ? b.propertyNumber.toLowerCase()
                        : "";

                      if (propA < propB) return -1;
                      if (propA > propB) return 1;
                      return 0;
                    })
                  )
                }
              >
                Property Number
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredFacilities.map((facility, index) => (
              <tr
                key={index}
                className="hover:bg-gray-100 dark:hover:bg-darkNavSecondary hover:cursor-pointer"
                onClick={() => addToSelected(facility)}
              >
                <td className="hover:cursor-pointer border-y border-gray-300 dark:border-border px-4 py-2">
                  <div className="flex justify-center text-yellow-500">
                    {isFacilitySelected(facility.id) ? (
                      <RiCheckboxCircleFill className="text-lg" />
                    ) : (
                      <RiCheckboxBlankCircleLine className="text-lg text-slate-400" />
                    )}
                  </div>
                </td>
                <td className="border-y border-gray-300 dark:border-border px-4 py-2">
                  {facility.environment == "-dev"
                    ? "Development"
                    : facility.environment == ""
                    ? "Production"
                    : facility.environment == "-qa"
                    ? "QA"
                    : facility.environment == "cia-stg-1.aws."
                    ? "Staging"
                    : "N?A"}
                </td>
                <td className="border-y border-gray-300 dark:border-border px-4 py-2">
                  {facility.id}
                </td>
                <td className="border-y border-gray-300 dark:border-border px-4 py-2">
                  {facility.name}
                </td>
                <td className="border-y border-gray-300 dark:border-border px-4 py-2">
                  {facility.propertyNumber}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
