import axios from "axios";
import toast from "react-hot-toast";
import { useState, useEffect, useCallback } from "react";
import { IoIosCreate } from "react-icons/io";
import { useAuth } from "@context/AuthProvider";
import ModalContainer from "@components/ui/ModalContainer";
import SelectOption from "@components/ui/SelectOption";
import InputBox from "@components/ui/InputBox";
import { addEvent } from "@hooks/supabase";
import { buildApiUrl, authHeaders } from "@hooks/opentech";

export default function CreateVisitorVisitor({
  setIsCreateVisitorModalOpen,
  setVisitors,
}) {
  const [newVisitor, setNewVisitor] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    gateCode: "",
    timeProfile: "",
    accessProfile: "",
    type: "",
  });

  const [timeProfiles, setTimeProfiles] = useState({});
  const [accessProfiles, setAccessProfiles] = useState({});
  const [units, setUnits] = useState({});
  const [selectedUnit, setSelectedUnit] = useState(null);
  const { currentFacility, user } = useAuth();
  const visitorTypes = [
    { id: "Tenant", name: "PMS Tenant" },
    { id: "Guest", name: "PMS Guest" },
    { id: "nonTenant", name: "PMS Non-Tenant Guest" },
  ];

  const handleUnits = useCallback(async () => {
    const config = {
      method: "get",
      url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/units`),
      headers: authHeaders(currentFacility),
    };

    return axios(config)
      .then(function (response) {
        const sortedUnits = response.data.sort((a, b) => {
          if (a.unitNumber < b.unitNumber) return -1;
          if (a.unitNumber > b.unitNumber) return 1;
          return 0;
        });
        setUnits(sortedUnits);
        return response;
      })
      .catch(function (error) {
        throw error;
      });
  }, [currentFacility]);
  const handleTimeProfiles = useCallback(async () => {
    const config = {
      method: "get",
      url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/timegroups`),
      headers: authHeaders(currentFacility),
    };

    axios(config)
      .then(function (response) {
        setTimeProfiles(response.data);
      })
      .catch(function (error) {
        console.error(error);
      });
  }, [currentFacility]);
  const handleAccessProfiles = useCallback(async () => {
    const config = {
      method: "get",
      url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/accessprofiles`),
      headers: authHeaders(currentFacility),
    };

    axios(config)
      .then(function (response) {
        setAccessProfiles(response.data);
      })
      .catch(function (error) {
        console.error(error);
      });
  }, [currentFacility]);
  const handleCreateVisitor = () => {
    const requiredFields = {
      firstName: "First name",
      lastName: "Last name",
      gateCode: "Gate code",
      timeProfile: "Time profile",
      accessProfile: "Access profile",
    };
    if (newVisitor.type !== "nonTenant") {
      if (!newVisitor.type || !selectedUnit) {
        toast.error("Select a visitor type and unit");
        return;
      }
    }
    for (const [key, label] of Object.entries(requiredFields)) {
      if (!newVisitor[key] || newVisitor[key].trim() === "") {
        toast.error(`${label} is required`);
        return;
      }
    }
    if (newVisitor.phone && newVisitor.phone.length < 10) {
      toast.error("Phone number must be at least 10 digits");
      return;
    }
    if (newVisitor.email && !/\S+@\S+\.\S+/.test(newVisitor.email)) {
      toast.error("Email address is invalid");
      return;
    }
    let data = {};
    if (newVisitor.type === "Tenant") {
      data = {
        timeGroupId: newVisitor.timeProfile,
        accessProfileId: newVisitor.accessProfile,
        unitId: selectedUnit,
        accessCode: newVisitor.gateCode,
        lastName: newVisitor.lastName,
        firstName: newVisitor.firstName,
        email: newVisitor.email || null,
        mobilePhoneNumber: newVisitor.phone || null,
        isTenant: true,
        extendedData: {
          additionalProp1: null,
          additionalProp2: null,
          additionalProp3: null,
        },
        suppressCommands: false,
      };
    } else if (newVisitor.type === "nonTenant") {
      data = {
        timeGroupId: newVisitor.timeProfile,
        accessProfileId: newVisitor.accessProfile,
        unitId: selectedUnit,
        accessCode: newVisitor.gateCode,
        lastName: newVisitor.lastName,
        firstName: newVisitor.firstName,
        email: newVisitor.email || null,
        mobilePhoneNumber: newVisitor.phone || null,
        isTenant: false,
        isPortalVisitor: true,
        extendedData: {
          additionalProp1: null,
          additionalProp2: null,
          additionalProp3: null,
        },
        suppressCommands: false,
      };
    } else {
      data = {
        timeGroupId: newVisitor.timeProfile,
        accessProfileId: newVisitor.accessProfile,
        unitId: selectedUnit,
        accessCode: newVisitor.gateCode,
        lastName: newVisitor.lastName,
        firstName: newVisitor.firstName,
        email: newVisitor.email || null,
        mobilePhoneNumber: newVisitor.phone || null,
        isTenant: false,
        extendedData: {
          additionalProp1: null,
          additionalProp2: null,
          additionalProp3: null,
        },
        suppressCommands: false,
      };
    }

    const config = {
      method: "post",
      url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/visitors`),
      headers: authHeaders(currentFacility, "application/json-patch+json"),
      data: data,
    };
    toast.promise(
      axios(config)
        .then(async function (response) {
          const newVisitorData = [response.data.visitor];

          await addEvent(
            "Add Tenant",
            `${user.email} rented  ${
              newVisitorData[0].unitNumber
                ? "unit " + newVisitorData[0].unitNumber
                : ""
            } to ${newVisitorData[0].name} at facility ${
              currentFacility.name
            }, ${currentFacility.id}`,
            true
          );

          setVisitors((prevVisitors) => {
            const updatedVisitors = [...prevVisitors, ...newVisitorData];
            updatedVisitors.sort((a, b) => {
              if (a.unitNumber < b.unitNumber) return -1;
              if (a.unitNumber > b.unitNumber) return 1;
              return 0;
            });
            return updatedVisitors;
          });
        })
        .catch(async function (error) {
          await addEvent(
            "Add Tenant",
            `${user.email} rented unit at facility ${currentFacility.name}, ${currentFacility.id}`,
            false
          );
          console.error(error);
          throw error;
        }),
      {
        loading: `Creating ${newVisitor.type}...`,
        success: <b> {newVisitor.type} successfully created!</b>,
        error: <b>Failed to create {newVisitor.type}.</b>,
      }
    );

    // Close modal and clear input after submitting
    setIsCreateVisitorModalOpen(false);
    setNewVisitor({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      gateCode: "",
      timeProfile: "",
      accessProfile: "",
      type: "",
    });
  };

  useEffect(() => {
    handleUnits();
    handleTimeProfiles();
    handleAccessProfiles();
  }, [handleTimeProfiles, handleAccessProfiles, handleUnits]);

  return (
    <ModalContainer
      title={`Creating New Visitor`}
      icon={<IoIosCreate />}
      mainContent={
        <div className="min-w-96 flex flex-col pt-4 gap-3">
          <SelectOption
            required={true}
            value={newVisitor.type}
            onChange={(e) =>{
              setNewVisitor((prevState) => ({
                ...prevState,
                type: e.target.value,
              }));
              setSelectedUnit("");
            }}
            options={Array.isArray(visitorTypes) ? visitorTypes : []}
            placeholder="Visitor Type"
          />
          {newVisitor?.type !== "nonTenant" && newVisitor?.type !== "" && (
            <SelectOption
              required={true}
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(parseInt(e.target.value))}
              options={
                Array.isArray(units)
                  ? units
                      .filter((unit) =>
                        newVisitor?.type === "Tenant"
                          ? unit.status === "Vacant"
                          : newVisitor?.type === "Guest"
                          ? unit.status === "Rented"
                          : true
                      )
                      .map((unit) => ({
                        id: unit.id,
                        name: `${unit.unitNumber} - ${unit.status}`,
                      }))
                  : []
              }
              placeholder="Select a Unit"
            />
          )}

          {newVisitor.type && (
            <>
              <InputBox
                required={true}
                type={"text"}
                placeholder={"First Name"}
                onchange={(e) =>
                  setNewVisitor((prevState) => ({
                    ...prevState,
                    firstName: e.target.value,
                  }))
                }
                value={newVisitor.firstName || ""}
              />
              <InputBox
                required={true}
                type={"text"}
                placeholder={"Last Name"}
                onchange={(e) =>
                  setNewVisitor((prevState) => ({
                    ...prevState,
                    lastName: e.target.value,
                  }))
                }
                value={newVisitor.lastName || ""}
              />
              <InputBox
                type={"text"}
                placeholder={"Mobile Phone Number"}
                onchange={(e) =>
                  setNewVisitor((prevState) => ({
                    ...prevState,
                    phone: e.target.value,
                  }))
                }
                value={newVisitor.phone || ""}
              />
              <InputBox
                type={"text"}
                placeholder={"Email Address"}
                onchange={(e) =>
                  setNewVisitor((prevState) => ({
                    ...prevState,
                    email: e.target.value,
                  }))
                }
                value={newVisitor.email || ""}
              />
              <InputBox
                required={true}
                type={"text"}
                placeholder={"Gate Code"}
                onchange={(e) =>
                  setNewVisitor((prevState) => ({
                    ...prevState,
                    gateCode: e.target.value,
                  }))
                }
                value={newVisitor.gateCode || ""}
              />
              <SelectOption
                required={true}
                value={newVisitor.timeProfile}
                onChange={(e) =>
                  setNewVisitor((prevState) => ({
                    ...prevState,
                    timeProfile: e.target.value,
                  }))
                }
                options={Array.isArray(timeProfiles) ? timeProfiles : []}
                placeholder="Select a Time Profile"
              />
              <SelectOption
                required={true}
                value={newVisitor.accessProfile}
                onChange={(e) =>
                  setNewVisitor((prevState) => ({
                    ...prevState,
                    accessProfile: e.target.value,
                  }))
                }
                options={Array.isArray(accessProfiles) ? accessProfiles : []}
                placeholder="Select a Access Profile"
              />
            </>
          )}
        </div>
      }
      responseContent={
        <div className="mt-4 flex justify-end">
          <button
            className="bg-zinc-400 hover:cursor-pointer px-4 py-2 rounded-sm mr-2 hover:bg-zinc-500 font-bold transition duration-300 ease-in-out transform hover:scale-105 text-white"
            onClick={() => setIsCreateVisitorModalOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="bg-green-500 hover:cursor-pointer text-white px-4 py-2 rounded-sm hover:bg-green-600 font-bold transition duration-300 ease-in-out transform hover:scale-105"
            type="button"
            onClick={() => handleCreateVisitor()}
          >
            Submit
          </button>
        </div>
      }
      onClose={() => setIsCreateVisitorModalOpen(false)}
    />
  );
}
