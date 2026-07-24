import CreateUnit from "@views/pms/units/CreateUnit";
import EditVisitor from "@views/pms/units/EditVisitorUnitPage";
import PaginationFooter from "@components/shared/PaginationFooter";
import LoadingSpinner from "@components/shared/LoadingSpinner";
import DataTable from "@components/shared/DataTable";
import TableButton from "@components/ui/TableButton";
import GeneralButton from "@components/ui/GeneralButton";
import SliderButton from "@components/ui/SliderButton";
import InputBox from "@components/ui/InputBox";
import { useAuth } from "@context/AuthProvider";
import { addEvent } from "@hooks/supabase";
import { buildApiUrl, authHeaders } from "@hooks/opentech";
import axios from "axios";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";
import { RiDoorLockFill } from "react-icons/ri";
import DeleteModal from "@views/pms/DeleteModal";
import CreateVisitorUnitPage from "@views/pms/units/CreateVisitorUnitPage";
import DelinquencyModal from "@views/pms/units/DelinquencyModal";

export default function Units({ currentFacilityName } : { currentFacilityName: string }) {
  const [units, setUnits] = useState<any[]>([]);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);
  const [isCreateVisitorModalOpen, setIsCreateVisitorModalOpen] =
    useState<boolean>(false);
  const [visitorAutofill, setVisitorAutofill] = useState<boolean>(
    localStorage.getItem("visitorAutofill") === "true" || false
  );
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [timeProfiles, setTimeProfiles] = useState<Record<string, any>>({});
  const [accessProfiles, setAccessProfiles] = useState<Record<string, any>>({});
  const [isEditVisitorModalOpen, setIsEditVisitorModalOpen] = useState<boolean>(false);
  const [filteredUnits, setFilteredUnits] = useState<any[]>(units);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [sortedColumn, setSortedColumn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [unitsPulled, setUnitsPulled] = useState<boolean>(false);
  const [visitors, setVisitors] = useState<any[]>([]);
  const { currentFacility, user, permissions } = useAuth();
  const [smartLocks, setSmartLocks] = useState<any[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredLock, setHoveredLock] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDelinquencyModalOpen, setIsDelinquencyModalOpen] = useState<boolean>(false);
  const [continousDelinquency, setContinousDelinquency] = useState<boolean>(false);
  const [continousDelete, setContinousDelete] = useState<boolean>(false);
  const [isMoveOutModalOpen, setIsMoveOutModalOpen] = useState<boolean>(false);
  const [currentLoadingText] = useState<string>("Loading Units...");
  const rentedCount = filteredUnits.filter(
    (unit) => unit.status === "Rented"
  ).length;
  const delinquentCount = filteredUnits.filter(
    (unit) => unit.status === "Delinquent"
  ).length;
  const vacantCount = filteredUnits.filter(
    (unit) => unit.status === "Vacant"
  ).length;

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
        setSortedColumn("Unit Number");
        setUnits(sortedUnits);
        return response;
      })
      .catch(function (error) {
        throw error;
      });
  }, [currentFacility]);
  const handleSmartLocks = useCallback(async () => {
    try {
      const response = await axios.get(
        buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/smartlockstatus`),
        {
          headers: authHeaders(currentFacility),
        }
      );
      const smartLocks = response.data;
      if (smartLocks.length > 0) {
        setSmartLocks(smartLocks);
        return smartLocks;
      } else {
        return false;
      }
    } catch (error) {
      console.error(
        `Error fetching SmartLocks for: ${currentFacility.name}`,
        error
      );
      console.error(`${currentFacility.name} does not have SmartLocks`);
      return null;
    }
  }, [currentFacility]);
  const moveIn = async (unit) => {
    const handleRent = async () => {
      const data = {
        timeGroupId: timeProfiles[0].id,
        accessProfileId: accessProfiles[0].id,
        unitId: unit.id,
        accessCode:
          Math.floor(Math.random() * (999999999 - 100000 + 1)) + 100000,
        lastName: "Tenant",
        firstName: "Temporary",
        email: "automations@temp.com",
        mobilePhoneNumber: "9996666999",
        isTenant: true,
        extendedData: {
          additionalProp1: null,
          additionalProp2: null,
          additionalProp3: null,
        },
        suppressCommands: false,
      };

      const config = {
        method: "post",
        url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/visitors`),
        headers: authHeaders(currentFacility),
        data: data,
      };

      return axios(config)
        .then(function (response) {
          setUnits((prevUnits) =>
            prevUnits.map((u) =>
              u.id === unit.id ? { ...u, status: "Rented" } : u
            )
          );
          return response;
        })
        .catch(function (error) {
          throw error;
        });
    };

    if (visitorAutofill) {
      try {
        await toast.promise(handleRent(), {
          loading: "Renting Unit " + unit.unitNumber + "...",
          success: <b>{unit.unitNumber} successfully rented!</b>,
          error: <b>{unit.unitNumber} failed rental!</b>,
        });
        await addEvent(
          "Add Tenant",
          `${user.email} rented unit ${unit.unitNumber} to Tenant Temporary at facility ${currentFacility.name}, ${currentFacility.id}`,
          true
        );
      } catch (error) {
        await addEvent(
          "Add Tenant",
          `${user.email} rented unit ${unit.unitNumber} to Tenant Temporary at facility ${currentFacility.name}, ${currentFacility.id}`,
          false
        );
        console.error("Error renting unit:", error);
      }
    } else {
      setIsCreateVisitorModalOpen(true);
    }
  };
  const turnRented = async (unit) => {
    const handleRentalStatus = async () => {
      const config = {
        method: "post",
        url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/units/${unit.id}/enable?suppressCommands=true`),
        headers: authHeaders(currentFacility),
        data: "",
      };
      return axios(config)
        .then(function (response) {
          setUnits((prevUnits) =>
            prevUnits.map((u) =>
              u.id === unit.id ? { ...u, status: "Rented" } : u
            )
          );
          return response;
        })
        .catch(function (error) {
          throw error;
        });
    };
    try {
      toast.promise(handleRentalStatus(), {
        loading: "Changing " + unit.unitNumber + "to rented...",
        success: <b>{unit.unitNumber} successfully changed to rented!</b>,
        error: <b>{unit.unitNumber} failed status change!</b>,
      });
      await addEvent(
        "Update Unit To Rented",
        `${user.email} set ${unit.unitNumber} as rented at ${currentFacilityName}, facility id ${currentFacility.id}`,
        true
      );
    } catch (error) {
      await addEvent(
        "Update Unit To Rented",
        `${user.email} set ${unit.unitNumber} as rented at ${currentFacilityName}, facility id ${currentFacility.id}`,
        false
      );
      console.error("Error changing unit status to rented:", error);
    }
  };
  const moveOut = async (unit) => {
    const handleMoveOut = async () => {
      const config = {
        method: "post",
        url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/units/${unit.id}/vacate`),
        headers: authHeaders(currentFacility),
        data: "",
      };

      return axios(config)
        .then(function (response) {
          setUnits((prevUnits) =>
            prevUnits.map((u) =>
              u.id === unit.id ? { ...u, status: "Vacant" } : u
            )
          );
          return response;
        })
        .catch(function (error) {
          throw error;
        });
    };
    try {
      await toast.promise(handleMoveOut(), {
        loading: "Removing tenant from unit " + unit.unitNumber + "...",
        success: <b>{unit.unitNumber} successfully vacated!</b>,
        error: <b>{unit.unitNumber} failed rental!</b>,
      });
      await addEvent(
        "Remove Tenant",
        `${user.email} moved out ${unit.unitNumber} at ${currentFacilityName}, facility id ${currentFacility.id}`,
        true
      );
    } catch (error) {
      await addEvent(
        "Remove Tenant",
        `${user.email} moved out ${unit.unitNumber} at ${currentFacilityName}, facility id ${currentFacility.id}`,
        false
      );
      console.error("Error moving out tenant:", error);
    }
  };
  const turnDelinquent = async (unit) => {
    const handleRentalStatus = async () => {
      const config = {
        method: "post",
        url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/units/${unit.id}/disable`),
        headers: authHeaders(currentFacility),
        data: "",
      };
      return axios(config)
        .then(function (response) {
          setUnits((prevUnits) =>
            prevUnits.map((u) =>
              u.id === unit.id ? { ...u, status: "Delinquent" } : u
            )
          );
          return response;
        })
        .catch(function (error) {
          throw error;
        });
    };
    try {
      toast.promise(handleRentalStatus(), {
        loading: "Changing " + unit.unitNumber + "to delinquent...",
        success: <b>{unit.unitNumber} successfully changed to delinquent!</b>,
        error: <b>{unit.unitNumber} failed status change!</b>,
      });
      await addEvent(
        "Update Unit To Delinquent",
        `${user.email} set ${unit.unitNumber} as delinquent at ${currentFacilityName}, facility id ${currentFacility.id}`,
        true
      );
    } catch (error) {
      await addEvent(
        "Update Unit To Delinquent",
        `${user.email} set ${unit.unitNumber} as delinquent at ${currentFacilityName}, facility id ${currentFacility.id}`,
        false
      );
      console.error("Error changing unit status to delinquent:", error);
    }
  };
  const deleteUnit = async (unit) => {
    const handleDelete = async () => {
      const config = {
        method: "post",
        url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/units/${unit.id}/delete/vacant`),
        headers: authHeaders(currentFacility),
        data: "",
      };

      return axios(config)
        .then(function (response) {
          setUnits((prevUnits) => prevUnits.filter((u) => u.id !== unit.id));
          return response;
        })
        .catch(function (error) {
          throw error;
        });
    };
    try {
      toast.promise(handleDelete(), {
        loading: "Deleting Unit " + unit.unitNumber + "...",
        success: <b>{unit.unitNumber} successfully deleted!</b>,
        error: <b>{unit.unitNumber} failed deletion!</b>,
      });
      await addEvent(
        "Delete Unit",
        `${user.email} deleted ${unit.unitNumber} at ${currentFacilityName}, facility id ${currentFacility.id}`,
        true
      );
    } catch (error) {
      await addEvent(
        "Delete Unit",
        `${user.email} deleted ${unit.unitNumber} at ${currentFacilityName}, facility id ${currentFacility.id}`,
        false
      );
      console.error("Error deleting unit:", error);
    }
  };
  const editTenants = async (unit) => {
    if (unit.status === "Vacant") return;
    setSelectedUnit(unit);
    const handleVisitorFetch = async () => {
      const config = {
        method: "get",
        url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/units/${unit.id}/visitors`),
        headers: authHeaders(currentFacility),
        data: "",
      };
      return axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          throw error;
        });
    };

    const visitors = await handleVisitorFetch();
    setVisitors(visitors);
    setIsEditVisitorModalOpen(true);
  };
  const handleVisitorAutofill = (isFill) => {
    setVisitorAutofill(!isFill);
    localStorage.setItem("visitorAutofill", `${!isFill}`);
  };

  // Run handleUnits once when the component loads
  useEffect(() => {
    const fetchData = async () => {
      // Return if no token is found
      if (!currentFacility.token) return;
      // Return if units have already been pulled
      if (unitsPulled) return;
      await Promise.all([
        handleUnits(),
        handleAccessProfiles(),
        handleTimeProfiles(),
        handleSmartLocks(),
      ]);
      setUnitsPulled(true);
    };

    fetchData();
  }, [currentFacility, unitsPulled, handleAccessProfiles, handleTimeProfiles, handleUnits, handleSmartLocks]);

  // Refresh data every 5 minutes
  useEffect(() => {
    if (!currentFacility.token) return;
    const interval = setInterval(async () => {
      await Promise.all([
        handleUnits(),
        handleAccessProfiles(),
        handleTimeProfiles(),
        handleSmartLocks(),
      ]);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentFacility, handleUnits, handleAccessProfiles, handleTimeProfiles, handleSmartLocks]);

  useEffect(() => {
    const filteredUnits = units.filter(
      (unit) =>
        unit.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.id.toString().includes(searchQuery) ||
        unit.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUnits(filteredUnits);
  }, [units, searchQuery]);

  const handleColumnSort = (columnKey, accessor = (a) => a[columnKey]) => {
    let newDirection;

    if (sortedColumn !== columnKey) {
      newDirection = "asc";
    } else if (sortDirection === "asc") {
      newDirection = "desc";
    } else if (sortDirection === "desc") {
      newDirection = null;
    }

    setSortedColumn(newDirection ? columnKey : null);
    setSortDirection(newDirection);

    if (!newDirection) {
      setFilteredUnits([...units]);
      return;
    }

    const sorted = [...filteredUnits].sort((a, b) => {
      const aVal = accessor(a) ?? "";
      const bVal = accessor(b) ?? "";

      if (aVal < bVal) return newDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return newDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredUnits(sorted);
  };

  const columns = [
    {
      key: "id",
      label: "Unit ID",
      render: (u) =>
        u.status === "Rented" || u.status === "Delinquent" ? (
          <span
            className="text-blue-500 hover:underline cursor-pointer"
            title="Edit Tenant"
            onClick={() => editTenants(u)}
          >
            {u.id}
          </span>
        ) : (
          u.id
        ),
    },
    {
      key: "unitNumber",
      label: "Unit Number",
      accessor: (u) => u.unitNumber,
    },
    {
      key: "status",
      label: "Status",
      accessor: (u) => u.status,
    },
    {
      key: "smartlock",
      label: "SmartLock",
      sortable: true,
      accessor: (u) => {
        const locks = smartLocks.filter((l) => l.unitId === u.id);
        return locks.map((l) => l.name?.toLowerCase() || "").join(", ");
      },
      render: (u, i) => {
        const matchingLocks = smartLocks.filter((lock) => lock.unitId === u.id);
        if (matchingLocks.length === 0) return "";

        return (
          <div className="flex flex-col gap-1">
            {matchingLocks.map((lock, idx) => (
              <div
                key={lock.id ?? `${u.id}-${idx}`}
                className="relative hover:cursor-pointer"
                onMouseDown={() => {
                  setHoveredRow(i);
                  setHoveredLock(idx);
                }}
                onMouseLeave={() => {
                  setHoveredRow(null);
                  setHoveredLock(null);
                }}
              >
                <span>{`${lock.deviceType} - ${lock.name}`}</span>

                {hoveredRow === i && hoveredLock === idx && (
                  <div className="absolute z-10 dark:bg-zinc-700 bg-white text-black dark:text-white p-4 rounded shadow-lg w-md left-1/2 -translate-x-1/2 shadow-border">
                    <div className="grid grid-cols-2 gap-3 text-xs max-h-64 overflow-y-auto text-left overflow-x-clip p-2">
                      {Object.entries(lock).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-bold text-yellow-400 overflow-ellipsis">
                            {key}:
                          </span>{" "}
                          <span className="wrap-break-word">
                            {value == null || value === ""
                              ? "null"
                              : typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (unit) => {
        if (unit.status === "Rented") {
          return (
            <div className="space-x-1">
              {permissions.pmsPlatformVisitorEdit && (
                <TableButton
                  onclick={() => {
                    if (continousDelinquency) {
                      turnDelinquent(unit);
                    } else {
                      setIsDelinquencyModalOpen(true);
                      setSelectedUnit(unit);
                    }
                  }}
                  text="Turn Delinquent"
                  className={"bg-yellow-500 hover:bg-yellow-600"}
                />
              )}
              {permissions.pmsPlatformVisitorDelete && (
                <TableButton
                  onclick={() => {
                    if (continousDelete) {
                      moveOut(unit);
                    } else {
                      setIsMoveOutModalOpen(true);
                      setSelectedUnit(unit);
                    }
                  }}
                  text="Move Out"
                  className={"bg-rose-600 hover:bg-rose-700"}
                />
              )}
            </div>
          );
        }
        if (unit.status === "Vacant") {
          return (
            <div className="space-x-1">
              {permissions.pmsPlatformVisitorCreate && (
                <TableButton
                  onclick={() => {
                    moveIn(unit);
                    setSelectedUnit(unit);
                  }}
                  text="Move In"
                  className={"bg-green-500 hover:bg-green-600"}
                />
              )}
              {permissions.pmsPlatformUnitDelete && (
                <TableButton
                  onclick={() => {
                    if (continousDelete) {
                      deleteUnit(unit);
                    } else {
                      setIsDeleteModalOpen(true);
                      setSelectedUnit(unit);
                    }
                  }}
                  text="Delete"
                  className={"bg-red-500 hover:bg-red-600"}
                />
              )}
            </div>
          );
        }
        if (unit.status === "Delinquent") {
          return (
            <div className="space-x-1">
              {permissions.pmsPlatformVisitorEdit && (
                <TableButton
                  onclick={() => {
                    if (continousDelinquency) {
                      turnRented(unit);
                    } else {
                      setIsDelinquencyModalOpen(true);
                      setSelectedUnit(unit);
                    }
                  }}
                  text="Turn Rented"
                  className={"bg-green-500 hover:bg-green-600"}
                />
              )}
              {permissions.pmsPlatformVisitorDelete && (
                <TableButton
                  onclick={() => {
                    if (continousDelete) {
                      moveOut(unit);
                    } else {
                      setIsMoveOutModalOpen(true);
                      setSelectedUnit(unit);
                    }
                  }}
                  text="Move Out"
                  className={"bg-rose-600 hover:bg-rose-700"}
                />
              )}
            </div>
          );
        }

        return <span>Error</span>;
      },
      sortable: false,
    },
  ];

  const handleDelinquency = (u) => {
    if (u.status == "Rented") {
      turnDelinquent(u);
    } else {
      turnRented(u);
    }
  };

  return (
    <div
      className={`relative ${
        !unitsPulled ? "overflow-hidden min-h-full" : "overflow-auto"
      } h-full dark:text-white dark:bg-zinc-900 relative`}
    >
      {/* Create Unit Modal Popup */}
      {isUnitModalOpen && (
        <CreateUnit
          setIsUnitModalOpen={setIsUnitModalOpen}
          setUnits={setUnits}
        />
      )}
      {/* Create Visitor Modal Popup */}
      {isCreateVisitorModalOpen && (
        <CreateVisitorUnitPage
          setIsCreateVisitorModalOpen={setIsCreateVisitorModalOpen}
          setValues={setUnits}
          unit={selectedUnit}
          type="new"
        />
      )}
      {/* Multi Visitor Edit Modal */}
      {isEditVisitorModalOpen && (
        <EditVisitor
          setIsEditVisitorModalOpen={setIsEditVisitorModalOpen}
          visitors={visitors}
          unit={selectedUnit}
        />
      )}
      {/* Delete Unit Confirmation Modal */}
      {isDeleteModalOpen && (
        <DeleteModal
          type={"unit"}
          setIsDeleteModalOpen={setIsDeleteModalOpen}
          handleDelete={deleteUnit}
          value={selectedUnit}
          setContinousDelete={setContinousDelete}
          continousDelete={continousDelete}
        />
      )}
      {/* Delete Unit Confirmation Modal */}
      {isMoveOutModalOpen && (
        <DeleteModal
          type={"uv"}
          setIsDeleteModalOpen={setIsMoveOutModalOpen}
          handleDelete={moveOut}
          value={selectedUnit}
          setContinousDelete={setContinousDelete}
          continousDelete={continousDelete}
        />
      )}
      {/* Update Unit Delinquency Status Confirmation Modal */}
      {isDelinquencyModalOpen && (
        <DelinquencyModal
          setIsDelinquencyModalOpen={setIsDelinquencyModalOpen}
          handleDelinquency={handleDelinquency}
          value={selectedUnit}
          setContinousDelinquency={setContinousDelinquency}
          continousDelinquency={continousDelinquency}
        />
      )}
      {/* Loading Spinner */}
      {!unitsPulled && <LoadingSpinner loadingText={currentLoadingText} />}
      {/* Page Header */}
      <div className="flex h-12 bg-zinc-200 items-center dark:border-zinc-700 dark:bg-zinc-950">
        <div className="ml-5 flex items-center text-sm">
          <RiDoorLockFill className="text-lg" />
          &ensp; Units | {currentFacilityName}
        </div>
      </div>
      <div className="w-full px-5 flex flex-col rounded-lg h-fit">
        {/* Totals Header */}
        <div className="mt-5 min-h-12 flex justify-center gap-32">
          <div className="text-center">
            <div className="font-bold text-2xl">{rentedCount}</div>
            Rented
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl">{delinquentCount}</div>
            Delinquent
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl">{vacantCount}</div>
            Vacant
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl">
              {rentedCount + vacantCount + delinquentCount}
            </div>
            Total
          </div>
        </div>
        <div className="mt-5 mb-2 flex items-center justify-end text-center">
          {/* Search Bar */}
          <InputBox
            type="text"
            placeholder="Search units..."
            onchange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}}
            value={searchQuery}
          />
          {/* Visitor Autofill Toggle */}
          {permissions.pmsPlatformVisitorCreate && (
            <>
              <h3 className="mr-2 w-36">Visitor Autofill</h3>
              <SliderButton
                onclick={() => handleVisitorAutofill(visitorAutofill)}
                value={visitorAutofill}
                onValue={true}
                offValue={false}
              />
            </>
          )}
          {/* Create Unit Button */}
          {permissions.pmsPlatformUnitCreate && (
            <GeneralButton
              onclick={() => setIsUnitModalOpen(true)}
              text="Create Unit(s)"
              className={"bg-yellow-500 hover:bg-yellow-600"}
            />
          )}
        </div>
        {/* Unit Table */}
        <DataTable
          columns={columns}
          data={filteredUnits}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          sortedColumn={sortedColumn}
          sortDirection={sortDirection}
          onSort={handleColumnSort}
        />
        {/* Pagination Footer */}
        <div className="px-2 py-5 mx-1">
          <PaginationFooter
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            items={filteredUnits}
          />
        </div>
      </div>
    </div>
  );
}
