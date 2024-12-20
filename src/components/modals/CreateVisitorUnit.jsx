import axios from "axios";
import toast from "react-hot-toast";
import React, { useState, useEffect } from "react";
import { IoIosCreate } from "react-icons/io";

export default function CreateVisitorUnit({
  setIsCreateVisitorModalOpen,
  currentFacility,
  setUnits,
  unit,
}) {
  const [newVisitor, setNewVisitor] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    gateCode: "",
    timeProfile: "",
    accessProfile: "",
  });
  const [timeProfiles, setTimeProfiles] = useState({});
  const [accessProfiles, setAccessProfiles] = useState({});
  // API call handler to get time profiles
  const handleTimeProfiles = async () => {
    var tokenStageKey = "";
    var tokenEnvKey = "";
    if (currentFacility.environment === "cia-stg-1.aws.") {
      tokenStageKey = "cia-stg-1.aws.";
    } else {
      tokenEnvKey = currentFacility.environment;
    }

    const config = {
      method: "get",
      url: `https://accesscontrol.${tokenStageKey}insomniaccia${tokenEnvKey}.com/facilities/${currentFacility.id}/timegroups`,
      headers: {
        Authorization: "Bearer " + currentFacility?.bearer?.access_token,
        accept: "application/json",
        "api-version": "2.0",
      },
    };

    axios(config)
      .then(function (response) {
        setTimeProfiles(response.data);
      })
      .catch(function (error) {
        console.log(error);
      });
  };
  // API call handler to get access profiles
  const handleAccessProfiles = async () => {
    var tokenStageKey = "";
    var tokenEnvKey = "";
    if (currentFacility.environment === "cia-stg-1.aws.") {
      tokenStageKey = "cia-stg-1.aws.";
    } else {
      tokenEnvKey = currentFacility.environment;
    }

    const config = {
      method: "get",
      url: `https://accesscontrol.${tokenStageKey}insomniaccia${tokenEnvKey}.com/facilities/${currentFacility.id}/accessprofiles`,
      headers: {
        Authorization: "Bearer " + currentFacility?.bearer?.access_token,
        accept: "application/json",
        "api-version": "2.0",
      },
    };

    axios(config)
      .then(function (response) {
        setAccessProfiles(response.data);
      })
      .catch(function (error) {
        console.log(error);
      });
  };
  // API call handler to create the new visitor
  const handleCreateVisitor = (e) => {
    e.preventDefault();
    if (!newVisitor.timeProfile) {
      newVisitor.timeProfile = timeProfiles[0].id;
    }
    if (!newVisitor.accessProfile) {
      newVisitor.accessProfile = accessProfiles[0].id;
    }
    var tokenStageKey = "";
    var tokenEnvKey = "";
    if (currentFacility.environment === "cia-stg-1.aws.") {
      tokenStageKey = "cia-stg-1.aws.";
    } else {
      tokenEnvKey = currentFacility.environment;
    }

    const data = {
      timeGroupId: 0,
      accessProfileId: 0,
      unitId: unit.id,
      accessCode: newVisitor.gateCode,
      lastName: newVisitor.lastName,
      firstName: newVisitor.firstName,
      email: newVisitor.email,
      mobilePhoneNumber: newVisitor.phone,
      isTenant: true,
      extendedData: {
        additionalProp1: null,
        additionalProp2: null,
        additionalProp3: null,
      },
      suppressCommands: true,
    };
    const config = {
      method: "post",
      url: `https://accesscontrol.${tokenStageKey}insomniaccia${tokenEnvKey}.com/facilities/${currentFacility.id}/visitors`,
      headers: {
        Authorization: "Bearer " + currentFacility?.bearer?.access_token,
        accept: "application/json",
        "api-version": "2.0",
        "Content-Type": "application/json-patch+json",
      },
      data: data,
    };
    toast.promise(
      axios(config)
        .then(function (response) {
          setUnits((prevUnits) => {
            const updatedUnits = prevUnits.map((u) =>
              u.unitNumber === unit.unitNumber ? { ...u, status: "Rented" } : u
            );
            return updatedUnits.sort((a, b) => {
              if (a.unitNumber < b.unitNumber) return -1;
              if (a.unitNumber > b.unitNumber) return 1;
              return 0;
            });
          });
        })
        .catch(function (error) {
          throw error;
        }),
      {
        loading: `Renting unit ${unit.unitNumber}...`,
        success: <b>Unit {unit.unitNumber} rented successfully!</b>,
        error: <b>Failed to rent unit {unit.unitNumber}.</b>,
      }
    );

    // Close modal and clear input after submitting
    setIsCreateVisitorModalOpen(false);
    setNewVisitor("");
  };

  // On load get dependencies
  useEffect(() => {
    handleTimeProfiles();
    handleAccessProfiles();
  }, []);

  return (
    // Background Filter
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      {/* Modal Container */}
      <div className="bg-white rounded shadow-lg w-96 dark:bg-darkPrimary">
        {/* Header Container */}
        <div className="pl-2 border-b-2 border-b-yellow-500 flex justify-between items-center h-10">
          <div className="flex text-center items-center">
            <IoIosCreate />
            <h2 className="ml-2 text-lg font-bold text-center items-center">
              Renting Unit {unit.unitNumber}
            </h2>
          </div>
        </div>
        {/* Content Container */}
        <form onSubmit={handleCreateVisitor} className="px-5 py-3">
          <label className="block">First Name</label>
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-2 w-full mb-2 dark:bg-darkSecondary dark:border-border"
            value={newVisitor.firstName}
            onChange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                firstName: e.target.value,
              }))
            }
            placeholder="Enter first name"
            required
          />
          <label className="block">Last Name</label>
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-2 w-full mb-2 dark:bg-darkSecondary dark:border-border"
            value={newVisitor.lastName}
            onChange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                lastName: e.target.value,
              }))
            }
            placeholder="Enter last name"
            required
          />
          <label className="block">Mobile Phone Number</label>
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-2 w-full mb-2 dark:bg-darkSecondary dark:border-border"
            value={newVisitor.phone}
            onChange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                phone: e.target.value,
              }))
            }
            placeholder="Enter mobile phone number"
            required
          />
          <label className="block">Email Address</label>
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-2 w-full mb-2 dark:bg-darkSecondary dark:border-border"
            value={newVisitor.email}
            onChange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                email: e.target.value,
              }))
            }
            placeholder="Enter email address"
            required
          />
          <label className="block">Gate Code</label>
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-2 w-full mb-2 dark:bg-darkSecondary dark:border-border"
            value={newVisitor.gateCode}
            onChange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                gateCode: e.target.value,
              }))
            }
            placeholder="Enter gate code"
            required
          />
          <label className="block">Time Profile</label>
          <select
            name="timeProfiles"
            id="timeProfiles"
            className="border border-gray-300 rounded px-3 py-2 w-full mb-2 dark:bg-darkSecondary dark:border-border"
            value={newVisitor.timeProfile}
            onChange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                timeProfile: e.target.value,
              }))
            }
          >
            {timeProfiles && timeProfiles.length > 0 ? (
              timeProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))
            ) : (
              <option value="">Loading...</option>
            )}
          </select>

          <label className="block">Access Profile</label>
          <select
            name="accessProfiles"
            id="accessProfiles"
            className="border border-gray-300 rounded px-3 py-2 w-full mb-2 dark:bg-darkSecondary dark:border-border"
            onChange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                accessProfile: e.target.value,
              }))
            }
          >
            {accessProfiles && accessProfiles.length > 0 ? (
              accessProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))
            ) : (
              <option value="">Loading...</option>
            )}
          </select>

          <div className="mt-4 flex justify-end">
            <button
              className="bg-gray-400 px-4 py-2 rounded mr-2 hover:bg-gray-500 font-bold transition duration-300 ease-in-out transform hover:scale-105 text-white"
              onClick={() => setIsCreateVisitorModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-bold transition duration-300 ease-in-out transform hover:scale-105"
              type="submit"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
