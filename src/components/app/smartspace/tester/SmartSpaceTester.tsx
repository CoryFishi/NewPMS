import { RiTestTubeFill } from "react-icons/ri";
import { useAuth } from "@context/AuthProvider";
import { useState, useRef, useEffect, useCallback } from "react";
import InputBox from "@components/ui/InputBox";
import PaginationFooter from "@components/shared/PaginationFooter";
import DataTable from "@components/shared/DataTable";
import DetailModal from "@components/shared/DetailModal";
import { RiErrorWarningFill } from "react-icons/ri";
import axios from "axios";
import { toast } from "react-hot-toast";
import { buildAuthUrl, buildApiUrl, authHeaders } from "@hooks/opentech";

export default function SmartSpaceTester() {
  const { selectedTokens } = useAuth();
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [smartMotionData, setSmartMotionData] = useState<any[]>([]);
  const [filteredSmartMotion, setFilteredSmartMotion] =
    useState<any[]>(smartMotionData);
  const [selectedMotion, setSelectedMotion] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [sortedColumn, setSortedColumn] = useState<null | string>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [hoveredRow, setHoveredRow] = useState<null | number>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [pollingValue, setPollingValue] = useState<number>(5);
  const [lastPollTime, setLastPollTime] = useState<null | number>(null);
  const modalRef = useRef(null);
  const smartMotionDataRef = useRef<any[]>([]);
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Close modal if clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false); // Close the modal
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsOpen]);

  const handleColumnSort = (columnKey: string, accessor: any = (a: any) => a[columnKey]) => {
    let newDirection: "asc" | "desc" | null = "asc";

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
      setFilteredSmartMotion([...smartMotionData]);
      return;
    }

    setFilteredSmartMotion(
      [...filteredSmartMotion].sort((a, b) => {
        const aVal = accessor(a);
        const bVal = accessor(b);
        return newDirection === "asc"
          ? aVal.localeCompare?.(bVal) ?? aVal - bVal
          : bVal.localeCompare?.(aVal) ?? bVal - aVal;
      })
    );
  };
  const fetchBearerToken = async (facility: { environment: string; api: string; apiSecret: string; client: string; clientSecret: string; name: string }) => {
    try {
      const data = {
        grant_type: "password",
        username: facility.api,
        password: facility.apiSecret,
        client_id: facility.client,
        client_secret: facility.clientSecret,
      };

      const response = await axios.post(
        buildAuthUrl(facility),
        data,
        {
          headers: {
            accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error(`Error fetching token for ${facility.name}:`, error);
      toast.error(`Failed to fetch token for ${facility.name}`);
      return null;
    }
  };

  const fetchInitialSmartMotionData = useCallback(async (facility: any) => {
    const bearer = await fetchBearerToken(facility);
    if (!bearer) return;
    const { id } = facility;
    try {
      const response = await axios.get(
        buildApiUrl(facility, `/facilities/${id}/smartmotionstatus`),
        {
          headers: authHeaders({ ...facility, token: { access_token: bearer } }),
        }
      );
      const data = response.data;
      const formattedData = data.map((item) => ({
        name: item.name,
        currentSensorState: item.sensorState,
        overallStatusMessage: item.overallStatusMessage,
        overallStatus: item.overallStatus,
        hasDetectedMotion: item.sensorState === "Motion" ? true : false,
        lastUpdateTimestampDisplay: new Date(
          item.lastUpdateTimestamp
        ).toLocaleString(),
      }));
      return formattedData;
    } catch (error) {
      console.error(
        `Error fetching SmartMotion data for ${facility.name}:`,
        error
      );
      toast.error(`Failed to fetch SmartMotion data for ${facility.name}`);
      return [];
    }
  }, []);

  const fetchNewSmartMotionData = useCallback(async (facility: any) => {
    const bearer = await fetchBearerToken(facility);
    if (!bearer) return;
    const { id } = facility;
    try {
      const response = await axios.get(
        buildApiUrl(facility, `/facilities/${id}/smartmotionstatus`),
        {
          headers: authHeaders({ ...facility, token: { access_token: bearer } }),
        }
      );
      const data = response.data;
      const formattedData = data.map((item) => {
        const existingItem = smartMotionDataRef.current.find(
          (existing) => existing.name === item.name
        );
        return {
          name: item.name,
          currentSensorState: item.sensorState,
          overallStatusMessage: item.overallStatusMessage,
          overallStatus: item.overallStatus,
          hasDetectedMotion:
            existingItem?.hasDetectedMotion === true ||
            item.sensorState === "Motion",
          lastUpdateTimestampDisplay: new Date(
            item.lastUpdateTimestamp
          ).toLocaleString(),
        };
      });
      return formattedData;
    } catch (error) {
      console.error(
        `Error fetching SmartMotion data for ${facility.name}:`,
        error
      );
      toast.error(`Failed to fetch SmartMotion data for ${facility.name}`);
      return [];
    }
  }, []);

  const fetchNewSmartMotionEventData = useCallback(async (facility: any) => {
    const bearer = await fetchBearerToken(facility);
    if (!bearer) return new Set();
    try {
      const now = Math.floor(Date.now() / 1000);
      const twoMinutesAgo = now - 120;

      const response = await axios.get(
        buildApiUrl(
          facility,
          `/combinedevents/facilities/${facility.id}?uq=&vq=&etq=27&etq=28&minDate=${twoMinutesAgo}&maxDate=${now}&hideMetadata=true`,
          "accessevent"
        ),
        {
          headers: authHeaders(
            { ...facility, token: { access_token: bearer } },
            "application/json",
            "3.0"
          ),
        }
      );
      const data = response.data;
      const deviceNamesWithMotion = new Set(
        data.map((event) => event.deviceName)
      );
      return deviceNamesWithMotion;
    } catch (error) {
      console.error(
        `Error fetching SmartMotion event data for ${facility.name}:`,
        error
      );
      toast.error(
        `Failed to fetch SmartMotion event data for ${facility.name}`
      );
      return new Set();
    }
  }, []);

  const columns = [
    {
      key: "name",
      label: "Name",
      accessor: (r: any) => r.name,
      render: (r: any) => (
        <div className="w-full flex items-center justify-center">
          <div className="truncate max-w-[32ch] flex items-center text-center justify-center">
            {r.name}
          </div>
        </div>
      ),
    },
    {
      key: "sensorState",
      label: "Sensor State",
      accessor: (r: any) => r.currentSensorState,
      render: (r: any) => <span>{r.currentSensorState}</span>,
    },
    {
      key: "hasDetectedMotion",
      label: "Detected Motion",
      accessor: (r: any) => (r.hasDetectedMotion ? "Yes" : "No"),
      render: (r: any) => {
        const Icon = r.hasDetectedMotion
          ? RiErrorWarningFill
          : RiErrorWarningFill;

        const color = r.hasDetectedMotion ? "text-green-500" : "text-red-500";

        return (
          <div className={`inline-flex items-center gap-2 ${color}`}>
            <Icon className="text-xl" />
            <span className="flex flex-col text-left">
              {r.hasDetectedMotion ? "Yes" : "No"}
            </span>
          </div>
        );
      },
    },
    {
      key: "lastUpdateTimestampDisplay",
      label: "Last Update",
      accessor: (r: any) => r.lastUpdateTimestampDisplay,
    },
  ];

  const handleRowClick = (row: any) => {
    setSelectedMotion(row);
    setIsDetailModalOpen(true);
  };

  useEffect(() => {
    if (!isTesting) {
      setSmartMotionData([]);
      setFilteredSmartMotion([]);
      return;
    }

    const beginPolling = async () => {
      const data = await fetchInitialSmartMotionData(selectedFacility);
      setSmartMotionData(data);
      smartMotionDataRef.current = data;
      const eventData = await fetchNewSmartMotionEventData(selectedFacility);
      for (let item of data) {
        if (eventData.has(item.name)) {
          item.hasDetectedMotion = true;
        }
      }
      setFilteredSmartMotion(data);
      setLastPollTime(new Date().getTime());
    };

    const refreshSmartMotion = async () => {
      const data = await fetchNewSmartMotionData(selectedFacility);
      setSmartMotionData(data);
      smartMotionDataRef.current = data;
      const eventData = await fetchNewSmartMotionEventData(selectedFacility);
      for (let item of data) {
        if (eventData.has(item.name)) {
          item.hasDetectedMotion = true;
        }
      }
      setFilteredSmartMotion(data);
      setLastPollTime(new Date().getTime());
    };

    beginPolling();
    const intervalId = setInterval(refreshSmartMotion, pollingValue * 1000);

    return () => clearInterval(intervalId);
  }, [isTesting, pollingValue, selectedFacility, fetchInitialSmartMotionData, fetchNewSmartMotionData, fetchNewSmartMotionEventData]);

  return (
    <div
      className={`h-full dark:text-white dark:bg-zinc-900 relative overflow-auto`}
    >
      {isDetailModalOpen && (
        <DetailModal
          device={selectedMotion}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
      {/* Header */}
      <div className="flex h-12 bg-zinc-200 items-center dark:border-zinc-700 dark:bg-zinc-950">
        <div className="ml-5 flex items-center text-sm">
          <RiTestTubeFill className="text-lg" />
          &ensp; SmartMotion Tester
        </div>
      </div>
      <div className="w-full gap-2 flex p-2 items-center">
        <InputBox
          placeholder="Search reports..."
          value={searchQuery}
          onchange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="ml-2 relative inline-block w-96" ref={modalRef}>
          <button
            onClick={toggleDropdown}
            className="w-full border rounded-sm dark:bg-zinc-900 dark:border-zinc-700 text-black dark:text-white p-2 hover:cursor-pointer"
          >
            {selectedFacility ? selectedFacility.name : "Select Facility"}
          </button>
          {isOpen && (
            <div className="absolute mt-1 w-full items-center justify-center text-center bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50 max-h-60 overflow-y-auto">
              {selectedTokens.map((facility) => (
                <label
                  key={facility.name}
                  className="flex gap-2 p-2 hover:cursor-pointer w-full text-center items-center justify-center hover:bg-zinc-400 dark:hover:bg-zinc-800 rounded"
                  onClick={() => {
                    setSelectedFacility(facility);
                    setIsOpen(false);
                  }}
                >
                  <span>{facility.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <button
          className={`w-96 border rounded-sm dark:border-zinc-700 text-black dark:text-white p-2 hover:cursor-pointer ${
            isTesting
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          } disabled:opacity-50 disabled:hover:cursor-not-allowed`}
          disabled={!selectedFacility}
          onClick={() => setIsTesting(!isTesting)}
          title={
            !selectedFacility
              ? "Select a facility to start testing"
              : isTesting
              ? "Stop Testing"
              : "Start Testing"
          }
        >
          {isTesting ? "Stop Testing" : "Start Testing"}
        </button>
      </div>
      <div className="w-full px-2 flex items-center justify-between mb-2">
        <p className="text-left text-sm ml-2">
          Events pulled every
          <select
            className="border rounded-sm mx-2 dark:border-zinc-700 dark:bg-zinc-900 cursor-pointer"
            id="secondValue"
            value={pollingValue}
            onChange={(e) => {
              setPollingValue(Number(e.target.value));
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
          seconds
        </p>
        <p>
          {lastPollTime
            ? `${new Date(lastPollTime).toLocaleTimeString()}`
            : "Never updated"}
        </p>
      </div>
      {isTesting ? (
        <>
          <div className="h-[73vh] overflow-y-auto text-center">
            <DataTable
              columns={columns}
              data={filteredSmartMotion}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              sortDirection={sortDirection}
              sortedColumn={sortedColumn}
              onSort={handleColumnSort}
              hoveredRow={hoveredRow}
              setHoveredRow={setHoveredRow}
              onRowClick={handleRowClick}
            />
          </div>
          <div className="px-2 py-5 mx-1">
            <PaginationFooter
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              items={filteredSmartMotion}
            />
          </div>
        </>
      ) : (
        <div className="text-center mt-10 text-lg">
          SmartMotion testing is currently stopped. Click &quot;Start Testing&quot; to
          begin.
        </div>
      )}
    </div>
  );
}
