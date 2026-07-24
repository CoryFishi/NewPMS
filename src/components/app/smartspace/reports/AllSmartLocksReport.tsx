import PaginationFooter from "@components/shared/PaginationFooter";
import axios from "axios";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";
import {
  RiSignalWifi1Fill,
  RiSignalWifi2Fill,
  RiSignalWifi3Fill,
  RiSignalWifiFill,
  RiErrorWarningFill,
} from "react-icons/ri";
import {
  MdBattery20,
  MdBattery60,
  MdBattery80,
  MdBatteryFull,
  MdBattery0Bar,
} from "react-icons/md";
import { FaLock, FaLockOpen, FaCheckCircle } from "react-icons/fa";
import { BsShieldLockFill } from "react-icons/bs";
import { IoIosWarning } from "react-icons/io";
import DataTable from "@components/shared/DataTable";
import DetailModal from "@components/shared/DetailModal";
import { buildApiUrl, authHeaders } from "@hooks/opentech";

export default function AllSmartLocksReport({
  selectedFacilities,
  searchQuery,
}: {
  selectedFacilities: any[];
  searchQuery: string;
}) {
  const [filteredSmartLocks, setFilteredSmartLocks] = useState<any[]>([]);
  const [smartlocks, setSmartlocks] = useState<any[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("asc");
  const [sortedColumn, setSortedColumn] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedSmartLock, setSelectedSmartLock] = useState<any>(null);

  const handleColumnSort = (columnKey: string, accessor:  any = (a:any) => a[columnKey]) => {
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
      setFilteredSmartLocks([...smartlocks]);
      return;
    }

    setFilteredSmartLocks(
      [...filteredSmartLocks].sort((a: any, b: any) => {
        const aVal = accessor(a);
        const bVal = accessor(b);
        return newDirection === "asc"
          ? aVal.localeCompare?.(bVal) ?? aVal - bVal
          : bVal.localeCompare?.(aVal) ?? bVal - aVal;
      })
    );
  };

  const handleRowClick = (row: any) => {
    setSelectedSmartLock(row);
    setIsDetailModalOpen(true);
  };

  const exportSmartLocks = () => {
    // Convert the data to CSV format
    const headers = [
      "Facility",
      "Device Name",
      "Unit",
      "Device Type",
      "Signal Quality",
      "Battery Level",
      "Lock State",
      "Unit Details",
      "Lock Status Message(s)",
      "Last Update",
    ];
    // Create rows
    const csvRows = [
      headers.join(","), // Add headers to rows
      ...filteredSmartLocks.map((device) =>
        [
          device.facilityName,
          device.name,
          device.unitName,
          device.deviceType,
          Math.round((device.signalQuality / 255) * 100) + "%",
          device.batteryLevel + "%",
          device.lockState,
          device.unitStatus +
            (device.visitorName ? " - " + device.visitorName : ""),
          device.statusMessages[0] != ""
            ? device.statusMessages.join("; ")
            : "SmartLock is online",
          device.lastUpdateTimestampDisplay,
        ].join(",")
      ),
    ];

    // Create a blob from the CSV rows
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // Create a link to download the file
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "SmartLock_AllSmartLocks.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchSmartLock = async (facility: { id: string; name: string; environment: string; bearer: string }) => {
    try {
      const response = await axios.get(
        buildApiUrl(facility, `/facilities/${facility.id}/smartlockstatus`),
        {
          headers: authHeaders({ ...facility, token: { access_token: facility.bearer } }),
        }
      );
      const smartLocks = response.data;
      return smartLocks;
    } catch (error) {
      console.error(`Error fetching SmartLocks for: ${facility.name}`, error);
      toast.error(`${facility.name} does not have SmartLocks`);
      return null;
    }
  };

  const fetchDataForSelectedFacilities = useCallback(async () => {
    setSmartlocks([]); // Clear existing data
    const fetchPromises = selectedFacilities.map(async (facility) => {
      const facilityName = facility.name;
      const smartlockData = await fetchSmartLock(facility);

      // Add facilityName to each smartlock in the fetched data
      const updatedSmartlockData = smartlockData.map((smartlock) => ({
        ...smartlock,
        facilityName,
      }));

      return updatedSmartlockData;
    });

    const allSmartlockData = await Promise.all(fetchPromises);

    // Flatten the array and update state with all smartlocks
    const flattenedData = allSmartlockData.flat();
    var sortedSmartLocks = [...flattenedData].sort((a, b) => {
      if (a.facilityName.toLowerCase() < b.facilityName.toLowerCase())
        return -1;
      if (a.facilityName.toLowerCase() > b.facilityName.toLowerCase()) return 1;
      return 0;
    });
    setSmartlocks(sortedSmartLocks);
  }, [selectedFacilities]);

  useEffect(() => {
    fetchDataForSelectedFacilities();
  }, [selectedFacilities, fetchDataForSelectedFacilities]);

  useEffect(() => {
    setSortedColumn("Facility");

    const filteredSmartLocks = smartlocks.filter((smartlock) => {
      if (searchQuery.toLowerCase() === "online") {
        return !smartlock.isDeviceOffline; // Show only online devices
      }

      return (
        (smartlock.facilityName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (smartlock.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (smartlock.unitName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (smartlock.overallStatus || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (smartlock.deviceType || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (smartlock.visitorName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        String(smartlock.batteryLevel || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        String(
          Math.round((smartlock.signalQuality / 255) * 100) || ""
        ).includes(searchQuery) ||
        (Array.isArray(smartlock.statusMessages) &&
          smartlock.statusMessages.some((message) =>
            (message || "").toLowerCase().includes(searchQuery.toLowerCase())
          ))
      );
    });
    setFilteredSmartLocks(filteredSmartLocks);
    setCurrentPage(1);
  }, [smartlocks, searchQuery]);

  const columns = [
    {
      key: "facilityName",
      label: "Facility Name",
      accessor: (r: any) => r.facilityName,
      render: (r: any) => (
        <div className="w-full flex items-center justify-center">
          <div className="truncate max-w-[32ch]">{r.facilityName}</div>
        </div>
      ),
    },
    {
      key: "name",
      label: "Name",
      accessor: (r: any) => r.name,
      render: (r: any) => (
        <div className="w-full flex items-center justify-center">
          <div className="truncate max-w-[32ch]">{r.name}</div>
        </div>
      ),
    },
    {
      key: "unit",
      label: "Unit",
      accessor: (r: any) => r.unitName,
    },
    {
      key: "deviceType",
      label: "Device Type",
      accessor: (r: any) => r.deviceType,
    },
    {
      key: "signalQuality",
      label: "Signal Quality",
      accessor: (r: any) => r.signalQuality,
      render: (r: any) => {
        const pct = Math.round((r.signalQuality / 255) * 100);
        const Icon =
          pct < 24
            ? RiSignalWifi1Fill
            : pct < 63
            ? RiSignalWifi2Fill
            : pct < 90
            ? RiSignalWifi3Fill
            : RiSignalWifiFill;
        const color =
          pct < 20
            ? "text-red-500"
            : pct < 70
            ? "text-yellow-500"
            : "text-green-500";
        return (
          <span className="inline-flex items-center gap-1">
            <Icon className={`${color}`} /> {pct}%
          </span>
        );
      },
    },
    {
      key: "batteryLevel",
      label: "Battery",
      accessor: (r: any) => r.batteryLevel,
      render: (r: any) => {
        const lvl = r.batteryLevel;
        const Icon =
          lvl < 20
            ? MdBattery0Bar
            : lvl < 50
            ? MdBattery20
            : lvl < 75
            ? MdBattery60
            : lvl < 99
            ? MdBattery80
            : MdBatteryFull;
        const color =
          lvl < 30
            ? "text-red-500"
            : lvl < 99
            ? "text-yellow-500"
            : "text-green-500";
        return (
          <span className="inline-flex items-center gap-1">
            <Icon className={`${color}`} /> {lvl}%
          </span>
        );
      },
    },
    {
      key: "lockState",
      label: "Lock State",
      accessor: (r: any) => r.lockState,
      render: (r: any) => (
        <span>
          {r.lockState === "Locked" ? (
            <div className="inline-flex items-center gap-2">
              <FaLock />
              {r.lockState}
            </div>
          ) : r.lockState === "Unlocked" || r.lockState === "UnlockedLocal" ? (
            <div className="inline-flex items-center gap-2">
              <FaLockOpen />
              {r.lockState}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2">
              <BsShieldLockFill className="text-red-500" />
              {r.lockState}
            </div>
          )}
        </span>
      ),
    },
    {
      key: "unitDetails",
      label: "Unit Details",
      accessor: (r: any) =>
        r.unitStatus + (r.visitorName ? " - " + r.visitorName : ""),
    },
    {
      key: "statusMessages",
      label: "SmartLock Status",
      accessor: (r: any) =>
        r.statusMessages?.some((m) => m.trim() !== "")
          ? r.statusMessages.join(" | ").toLowerCase()
          : "SmartLock is online",
      render: (r: any) => {
        const Icon =
          r.overallStatus === "error"
            ? RiErrorWarningFill
            : r.overallStatus === "warning"
            ? IoIosWarning
            : FaCheckCircle;
        const color =
          r.overallStatus === "error"
            ? "text-red-500"
            : r.overallStatus === "warning"
            ? "text-yellow-500"
            : "text-green-500";

        return (
          <div className={`inline-flex items-center gap-2 ${color}`}>
            <Icon className="text-xl" />
            <span className="flex flex-col text-left">
              {r.statusMessages?.some((m) => m.trim() !== "")
                ? r.statusMessages.map((m, i) => <span key={i}>{m}</span>)
                : "SmartLock is online"}
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

  return (
    <div className="w-full px-2">
      {isDetailModalOpen && (
        <DetailModal
          device={selectedSmartLock as any}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}

      <div className="flex justify-end mb-1">
        <p
          className="text-black dark:text-white rounded-sm hover:text-zinc-400 dark:hover:text-zinc-400 hover:cursor-pointer mr-2 right-0"
          onClick={() => exportSmartLocks()}
        >
          Export
        </p>
      </div>
      <div className="h-[73vh] overflow-y-auto text-center">
        <DataTable
          columns={columns}
          data={filteredSmartLocks}
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
          items={filteredSmartLocks}
        />
      </div>
    </div>
  );
}
