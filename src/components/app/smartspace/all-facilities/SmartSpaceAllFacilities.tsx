import DataTable from "@components/shared/DataTable";
import LoadingSpinner from "@components/shared/LoadingSpinner";
import PaginationFooter from "@components/shared/PaginationFooter";
import axios from "axios";
import toast from "react-hot-toast";
import React, { useCallback, useEffect, useState } from "react";
import qs from "qs";
import { useAuth } from "@context/AuthProvider";
import { supabase } from "@lib/supabaseClient";
import { FaExternalLinkAlt } from "react-icons/fa";
import { IoKeypad, IoLockOpen, IoNotificationsCircle } from "react-icons/io5";
import { LuBrainCircuit } from "react-icons/lu";
import { RiAlarmWarningFill } from "react-icons/ri";
import { FaWarehouse } from "react-icons/fa6";
import {
  RiCheckboxCircleFill,
  RiCheckboxBlankCircleLine,
} from "react-icons/ri";
import InputBox from "@components/ui/InputBox";
import { getEnvironmentName, buildAuthUrl, buildApiUrl, authHeaders } from "@hooks/opentech";

export default function SmartSpaceAllFacilitiesPage() {
  const [facilities, setFacilities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [sortedColumn, setSortedColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [noFacilities, setNoFacilities] = useState(false);
  const { user, tokens, selectedTokens, setSelectedTokens, getBearerToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentLoadingText, setCurrentLoadingText] = useState("");

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
      setFilteredFacilities([...facilities]);
      return;
    }

    const sorted = [...filteredFacilities].sort((a, b) => {
      const aVal = accessor(a) ?? "";
      const bVal = accessor(b) ?? "";

      if (aVal < bVal) return newDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return newDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredFacilities(sorted);
  };

  const handleLogin = async (facility) => {
    const data = qs.stringify({
      grant_type: "password",
      username: facility.api,
      password: facility.apiSecret,
      client_id: facility.client,
      client_secret: facility.clientSecret,
    });

    const config = {
      method: "post",
      url: buildAuthUrl(facility),
      headers: {
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    };

    return axios(config)
      .then(function (response) {
        return response.data;
      })
      .catch(function (error) {
        console.error("Error during login:", error);
        throw error;
      });
  };
  const handleFacilities = useCallback(async (saved: any[]) => {
    setFacilities([]);
    setFilteredFacilities([]);
    setIsLoading(true);
    const total = saved.length;
    let loadedCount = 0;
    setCurrentLoadingText(`0/${total} loaded`);

    const handleAccount = async (facility: any) => {
      try {
        // Use cached bearer token when available to avoid redundant auth calls
        const cachedToken = getBearerToken(facility);
        const bearer = cachedToken
          ? { access_token: cachedToken }
          : await handleLogin(facility);

        const res = await axios.get(
          buildApiUrl(facility, "/facilities/statuslist"),
          {
            headers: authHeaders({
              ...facility,
              token: { access_token: bearer?.access_token },
            }),
          }
        );

        const enriched = res.data.map((item: any) => ({
          ...item,
          environment: facility.environment,
          api: facility.api,
          apiSecret: facility.apiSecret,
          client: facility.client,
          clientSecret: facility.clientSecret,
        }));

        return enriched;
      } catch (err) {
        console.error(`Error loading ${facility.client}:`, err);
        toast.error(`Failed to load facilities for account ${facility.name || facility.client} in ${getEnvironmentName(facility)}.`);
        return [];
      }
    };

    try {
      const chunks = await Promise.all(
        saved.map(async (facility) => {
          const result = await handleAccount(facility);
          loadedCount++;
          setCurrentLoadingText(`${loadedCount}/${total} loaded`);
          return result;
        })
      );

      const flattened = chunks.flat();

      if (flattened.length === 0) {
        setNoFacilities(true);
      } else {
        const sorted = flattened.sort((a, b) => {
          if (a.environment < b.environment) return -1;
          if (a.environment > b.environment) return 1;
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
          return 0;
        });

        setFacilities(sorted);
        setFilteredFacilities(sorted);
      }
    } catch (err) {
      toast.error(`Facilities Failed to Load!: ${err.message}`);
    } finally {
      setCurrentLoadingText("");
      setIsLoading(false);
    }
  }, [setFacilities, getBearerToken]);

  const handleSelectedFacilitiesUpdate = async (newFacility: any, isSelected: boolean) => {
    const { data: currentData, error: fetchError } = await supabase
      .from("user_data")
      .select("selected_tokens")
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      console.error("Error fetching selected tokens:", fetchError.message);
      toast.error("Failed to retrieve selected facilities.");
      return;
    }

    const formattedFacility = {
      id: newFacility.facilityId,
      api: newFacility.api,
      apiSecret: newFacility.apiSecret,
      client: newFacility.client,
      clientSecret: newFacility.clientSecret,
      name: newFacility.facilityName,
      environment: newFacility.environment,
      propertyNumber: newFacility.facilityPropertyNumber,
    };

    let updatedTokens;

    if (isSelected) {
      updatedTokens = (currentData?.selected_tokens || []).filter(
        (token) => token.id !== formattedFacility.id
      );
    } else {
      updatedTokens = [
        ...(currentData?.selected_tokens || []).filter(
          (token) => token.id !== formattedFacility.id
        ),
        formattedFacility,
      ];
    }

    const { error: upsertError } = await supabase.from("user_data").upsert(
      {
        user_id: user.id,
        selected_tokens: updatedTokens,
        last_update_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      console.error("Error saving selected tokens:", upsertError.message);
      toast.error("Failed to update selected facilities.");
    } else {
      setSelectedTokens(updatedTokens);
    }
  };
  const addToSelected = async (facility: any) => {
    const isSelected = isFacilitySelected(facility.facilityId);
    handleSelectedFacilitiesUpdate(facility, isSelected);
  };

  const FacilityStatusIcons = ({ facility }: { facility: any }) => {
    const getStatusIcon = (status: string, Icon: any, message: string) => {
      if (!status) return null;
      const color =
        status === "ok"
          ? "text-green-500"
          : status === "warning"
          ? "text-yellow-500"
          : status === "error"
          ? "text-red-500"
          : "";
      return <Icon className={`${color} inline-block`} title={message || ""} />;
    };

    return (
      <>
        {getStatusIcon(
          facility.gatewayStatus,
          LuBrainCircuit,
          facility.gatewayStatusMessage
        )}
        {getStatusIcon(
          facility.edgeRouterStatus,
          IoLockOpen,
          facility.edgeRouterPlatformDeviceStatusMessage
        )}
        {getStatusIcon(
          facility.deviceStatus,
          IoKeypad,
          facility.deviceStatusMessage
        )}
        {getStatusIcon(
          facility.alarmStatus,
          RiAlarmWarningFill,
          facility.alarmStatusMessage
        )}
        {getStatusIcon(
          facility.pmsInterfaceStatus,
          IoNotificationsCircle,
          facility.pmsInterfaceStatusMessage
        )}
      </>
    );
  };
  const isFacilitySelected = (facilityId: string) => {
    return (selectedTokens || []).some(
      (facility) => facility.id === facilityId
    );
  };

  useEffect(() => {
    if (!tokens) return;
    handleFacilities(tokens);
  }, [tokens, handleFacilities]);

  useEffect(() => {
    setCurrentPage(1);
    const loweredQuery = searchQuery.toLowerCase();

    const searchableFields = [
      "facilityId",
      "facilityPropertyNumber",
      "facilityName",
      "accountName",
      "environment",
      "gatewayStatus",
      "alarmStatus",
      "deviceStatus",
      "edgeRouterPlatformDeviceStatus",
      "pmsInterfaceStatus",
      "gatewayStatusMessage",
      "alarmStatusMessage",
      "deviceStatusMessage",
      "edgeRouterPlatformDeviceStatusMessage",
      "pmsInterfaceStatusMessage",
    ];

    const filtered = facilities.filter((facility) => {
      return (
        searchableFields.some((field) => {
          const value = facility[field];
          return value?.toString().toLowerCase().includes(loweredQuery);
        }) ||
        (facility.edgeRouterPlatformDeviceStatus != null &&
          "smartlock".includes(loweredQuery))
      );
    });

    setFilteredFacilities(filtered);
  }, [facilities, searchQuery]);

  const environmentLabel = {
    "-dev": "Development",
    "": "Production",
    "-qa": "QA",
    "staging": "Staging",
  };

  const columns = [
    {
      key: "isSelected",
      label: "◯",
      accessor: (f: any) => (isFacilitySelected(f.facilityId) ? 1 : 0),
      render: (f: any) => (
        <div
          className="flex justify-center text-yellow-500 cursor-pointer items-center"
          onClick={(e) => {
            e.stopPropagation();
            addToSelected(f);
          }}
        >
          {isFacilitySelected(f.facilityId) ? (
            <RiCheckboxCircleFill className="text-lg" />
          ) : (
            <RiCheckboxBlankCircleLine className="text-lg text-slate-400" />
          )}
        </div>
      ),
    },
    {
      key: "environment",
      label: "Environment",
      accessor: (f: any) => f.environment?.toLowerCase() || "",
      render: (f: any) => environmentLabel[f.environment] ?? "N/A",
    },
    {
      key: "facilityId",
      label: "Facility Id",
      accessor: (f: any) => f.facilityId,
    },
    {
      key: "accountName",
      label: "Account Name",
      accessor: (f: any) =>
        f.accountName.length > 24
          ? f.accountName.slice(0, 24) + "..."
          : f.accountName || "",
    },
    {
      key: "facilityName",
      label: "Facility Name",
      accessor: (f: any) => f.facilityName?.toLowerCase() || "",
      render: (f: any) => (
        <div className="flex gap-3 items-center justify-center">
          <p className="pl-1 truncate max-w-[32ch]">
            {f.facilityName.length > 24
              ? f.facilityName.slice(0, 24) + "..."
              : f.facilityName}
          </p>
          <FaExternalLinkAlt
            title={`https://portal.${
              f.environment === "staging"
                ? f.environment
                : "insomniaccia" + f.environment
            }.com/facility/${f.id}/dashboard`}
            className="text-blue-300 hover:text-blue-500 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const url =
                f.environment === "staging"
                  ? `https://portal.${f.environment}insomniaccia.com/facility/${f.id}/dashboard`
                  : `https://portal.insomniaccia${f.environment}.com/facility/${f.id}/dashboard`;
              window.open(url, "_blank");
            }}
          />
        </div>
      ),
    },
    {
      key: "facilityPropertyNumber",
      label: "Property Number",
      accessor: (f: any) => f.facilityPropertyNumber || "",
    },
    {
      key: "status",
      label: "Status",
      accessor: () => "",
      render: (f: any) => <FacilityStatusIcons facility={f} />,
      sortable: false,
    },
  ];

  return (
    <div
      className={`relative ${
        isLoading ? "overflow-hidden min-h-full" : "overflow-auto"
      } h-full dark:text-white dark:bg-zinc-900 relative`}
    >
      {/* Loading Spinner */}
      {isLoading && <LoadingSpinner loadingText={currentLoadingText} />}
      {/* Header */}
      <div className="flex h-12 bg-zinc-200 items-center dark:border-zinc-700 dark:bg-zinc-950">
        <div className="ml-5 flex items-center text-sm">
          <FaWarehouse className="text-lg" />
          &ensp; All Facilities
        </div>
      </div>
      {/* Body */}
      <div className="w-full px-5 flex flex-col rounded-lg h-full">
        {/* Search Bar */}
        <div className="mt-5 mb-2 flex items-center justify-end text-center">
          <InputBox
            placeholder="Search facilities..."
            value={searchQuery}
            onchange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Table */}
        <div>
          <DataTable
            columns={columns}
            data={filteredFacilities}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            sortDirection={sortDirection}
            sortedColumn={sortedColumn}
            onSort={handleColumnSort}
          />
          {/* If no facilities display no facilities text */}
          {noFacilities && (
            <div className="w-full text-center mt-5 text-red-500">
              No Authorized Facilities To Choose From...
            </div>
          )}
          {/* Modal footer/pagination */}
          <div className="px-2 py-5 mx-1">
            <PaginationFooter
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              items={filteredFacilities}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
