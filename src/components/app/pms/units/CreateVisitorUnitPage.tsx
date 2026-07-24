import axios from "axios";
import toast from "react-hot-toast";
import { useState, useEffect, useCallback } from "react";
import { IoIosCreate } from "react-icons/io";
import { useAuth } from "@context/AuthProvider";
import { addEvent } from "@hooks/supabase";
import { buildApiUrl, authHeaders } from "@hooks/opentech";
import ModalContainer from "@components/ui/ModalContainer";
import InputBox from "@components/ui/InputBox";
import SelectOption from "@components/ui/SelectOption";

export default function CreateVisitorUnitPage({
  setIsCreateVisitorModalOpen,
  setValues,
  unit,
  type = "new",
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
  const { user, currentFacility } = useAuth();
  const [timeProfiles, setTimeProfiles] = useState({});
  const [accessProfiles, setAccessProfiles] = useState({});
  // API call handler to get time profiles
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
  // API call handler to get access profiles
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
  // API call handler to create the new visitor
  const handleCreateVisitor = async () => {
    const requiredFields = {
      firstName: "First name",
      lastName: "Last name",
      gateCode: "Gate code",
      timeProfile: "Time profile",
      accessProfile: "Access profile",
    };
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
    const data = {
      timeGroupId: newVisitor.timeProfile,
      accessProfileId: newVisitor.accessProfile,
      unitId: unit.id,
      accessCode: newVisitor.gateCode,
      lastName: newVisitor.lastName,
      firstName: newVisitor.firstName,
      email: newVisitor.email || null,
      mobilePhoneNumber: newVisitor.phone || null,
      isTenant: type == "new" ? true : false,
      extendedData: {
        additionalProp1: null,
        additionalProp2: null,
        additionalProp3: null,
      },
      suppressCommands: true,
    };
    const config = {
      method: "post",
      url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/visitors`),
      headers: authHeaders(currentFacility),
      data: data,
    };
    toast.promise(
      axios(config)
        .then(function (response) {
          if (type == "new") {
            setValues((prevValues) => {
              const updatedUnits = prevValues.map((u) =>
                u.unitNumber === unit.unitNumber
                  ? { ...u, status: "Rented" }
                  : u
              );
              return updatedUnits.sort((a, b) => {
                if (a.unitNumber < b.unitNumber) return -1;
                if (a.unitNumber > b.unitNumber) return 1;
                return 0;
              });
            });
          } else {
            const newVisitorData = response.data.visitor;
            setValues((prevValues) => {
              const updatedVisitors = [...prevValues, newVisitorData];
              return updatedVisitors;
            });
          }
        })
        .catch(function (error) {
          console.error("Visitor creation error: ", error);
        }),
      {
        loading: `Renting unit ...`,
        success: <b>Unit rented successfully!</b>,
        error: <b>Failed to rent unit.</b>,
      }
    );
    await addEvent(
      "Add Tenant",
      `${user.email} rented unit ${unit.unitNumber} to ${newVisitor.firstName} ${newVisitor.lastName} at facility ${currentFacility.name}, ${currentFacility.id}`,
      true
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
    });
  };

  // On load get dependencies
  useEffect(() => {
    handleTimeProfiles();
    handleAccessProfiles();
  }, [handleTimeProfiles, handleAccessProfiles]);

  return (
    <ModalContainer
      title={`Creating Visitor for unit ${unit.unitNumber}`}
      icon={<IoIosCreate />}
      mainContent={
        <div className="min-w-96 flex flex-col pt-4 gap-3">
          <InputBox
            type={"text"}
            placeholder={"First Name"}
            onchange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                firstName: e.target.value,
              }))
            }
            value={newVisitor.firstName}
            required={true}
          />
          <InputBox
            type={"text"}
            placeholder={"Last Name"}
            onchange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                lastName: e.target.value,
              }))
            }
            value={newVisitor.lastName}
            required={true}
          />
          <InputBox
            type={"phone"}
            placeholder={"Mobile Phone Number"}
            onchange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                phone: e.target.value,
              }))
            }
            value={newVisitor.phone}
          />
          <InputBox
            type={"email"}
            placeholder={"Email Address"}
            onchange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                email: e.target.value,
              }))
            }
            value={newVisitor.email}
          />
          <InputBox
            type={"text"}
            placeholder={`Gate Code`}
            onchange={(e) =>
              setNewVisitor((prevState) => ({
                ...prevState,
                gateCode: e.target.value,
              }))
            }
            value={newVisitor.gateCode}
            required={true}
          />
          <SelectOption
            value={newVisitor.timeProfile}
            onChange={(e) =>
              setNewVisitor((prev) => ({
                ...prev,
                timeProfile: e.target.value,
              }))
            }
            options={Array.isArray(timeProfiles) ? timeProfiles : []}
            placeholder="Select a Time Profile"
            required={true}
          />
          <SelectOption
            value={newVisitor.accessProfile}
            onChange={(e) =>
              setNewVisitor((prev) => ({
                ...prev,
                accessProfile: e.target.value,
              }))
            }
            options={Array.isArray(accessProfiles) ? accessProfiles : []}
            placeholder="Select an Access Profile"
            required={true}
          />
        </div>
      }
      responseContent={
        <div className="flex justify-end">
          <button
            className="bg-zinc-400 hover:cursor-pointer px-4 py-2 rounded-sm mr-2 hover:bg-zinc-500 font-bold transition duration-300 ease-in-out transform hover:scale-105 text-white"
            onClick={() => setIsCreateVisitorModalOpen(false)}
          >
            Cancel
          </button>
          <button
            className="bg-green-500 hover:cursor-pointer text-white px-4 py-2 rounded-sm hover:bg-green-600 font-bold transition duration-300 ease-in-out transform hover:scale-105"
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
