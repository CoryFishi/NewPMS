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
import { FaCheckCircle } from "react-icons/fa";
import { IoIosWarning } from "react-icons/io";
import DataTable from "@components/shared/DataTable";
import DetailModal from "@components/shared/DetailModal";
import { BsDoorClosedFill, BsBuildingFill } from "react-icons/bs";
import { GrStatusUnknown } from "react-icons/gr";
import { buildApiUrl, authHeaders } from "@hooks/opentech";

export default function AllSmartMotionReport({
  selectedFacilities,
  searchQuery,
} : {
  selectedFacilities: any[];
  searchQuery: string;
}) {
  const [filteredSmartMotion, setFilteredSmartMotion] = useState<any[]>([]);
  const [smartMotion, setSmartMotion] = useState<any[]>([]);
  const [hoveredRow, setHoveredRow] = useState<null | number>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [sortedColumn, setSortedColumn] = useState<null | string>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<false | true>(false);
  const [selectedMotionSensor, setSelectedMotionSensor] = useState<null | any>(null);

  const exportSmartMotion = () => {
    // Convert the data to CSV format
    const headers = [
      "Facility",
      "Device Name",
      "Deployment Type",
      "Unit",
      "Unit Details",
      "Signal Quality",
      "Battery Level",
      "Sensor State",
      "Sensor Status Message(s)",
      "Last Update",
    ];
    // Create rows
    const csvRows = [
      headers.join(","), // Add headers to rows
      ...filteredSmartMotion.map((device: any) =>
        [
          device.facilityName,
          device.name,
          device.deploymentType,
          device.unitName,
          device.unitStatus +
            (device.visitorName ? " - " + device.visitorName : ""),
          Math.round((device.signalQuality / 255) * 100) + "%",
          device.batteryLevel + "%",
          device.sensorState,
          device.statusMessages[0] != ""
            ? device.statusMessages.join("; ")
            : "SmartMotion sensor is online",
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
    link.setAttribute("download", "AllSmartMotion.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchSmartMotion = async (facility: any) => {
    try {
      const response = await axios.get(
        buildApiUrl(facility, `/facilities/${facility.id}/smartmotionstatus`),
        {
          headers: authHeaders({ ...facility, token: { access_token: facility.bearer } }),
        }
      );
      const smartMotion = response.data;
      return smartMotion;
    } catch (error) {
      console.error(`Error fetching SmartMotion for: ${facility.name}`, error);
      toast.error(`${facility.name} does not have SmartMotion`);
      return null;
    }
  };

  const fetchDataForSelectedFacilities = useCallback(async () => {
    setSmartMotion([]); // Clear existing data
    const fetchPromises = selectedFacilities.map(async (facility) => {
      const facilityName = facility.name;
      const smartMotionData = await fetchSmartMotion(facility);
      if (!smartMotionData) return [];
      // Add facilityName to each smartmotion in the fetched data
      const updatedSmartMotionData = smartMotionData.map((smartmotion) => ({
        ...smartmotion,
        facilityName,
      }));

      return updatedSmartMotionData;
    });

    const allSmartMotionData = await Promise.all(fetchPromises);

    // Flatten the array and update state with all smartmotion
    const flattenedData = allSmartMotionData.flat();
    var sortedSmartMotion = [...flattenedData].sort((a, b) => {
      if (a.facilityName.toLowerCase() < b.facilityName.toLowerCase())
        return -1;
      if (a.facilityName.toLowerCase() > b.facilityName.toLowerCase()) return 1;
      return 0;
    });
    setSmartMotion(sortedSmartMotion as any);
  }, [selectedFacilities]);

  useEffect(() => {
    fetchDataForSelectedFacilities();
  }, [selectedFacilities, fetchDataForSelectedFacilities]);

  useEffect(() => {
    setSortedColumn("Facility");

    const filteredSmartMotion = smartMotion.filter((smartmotion: any) => {
      return (
        (smartmotion.facilityName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (smartmotion.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (smartmotion.unitName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (smartmotion.overallStatus || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (smartmotion.deviceType || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (smartmotion.visitorName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        String(smartmotion.batteryLevel || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        String(
          Math.round((smartmotion.signalQuality / 255) * 100) || ""
        ).includes(searchQuery) ||
        (Array.isArray(smartmotion.statusMessages) &&
          smartmotion.statusMessages.some((message) =>
            (message || "").toLowerCase().includes(searchQuery.toLowerCase())
          ))
      );
    });
    setFilteredSmartMotion(filteredSmartMotion as any);
    setCurrentPage(1);
  }, [smartMotion, searchQuery]);

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
      setFilteredSmartMotion([...smartMotion] as any);
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

  const columns = [
    {
      key: "facilityName",
      label: "Facility Name",
      accessor: (r) => r.facilityName,
      render: (r) => (
        <div className="w-full flex items-center justify-center">
          <div className="truncate max-w-[32ch]">{r.facilityName}</div>
        </div>
      ),
    },
    {
      key: "name",
      label: "Name",
      accessor: (r) => r.name,
      render: (r) => (
        <div className="w-full flex items-center justify-center">
          <div className="truncate max-w-[32ch]">{r.name}</div>
        </div>
      ),
    },
    {
      key: "deploymentType",
      label: "Deployment",
      accessor: (r) => r.deploymentType,
      render: (r) => {
        const Icon =
          r.deploymentType === "Unit"
            ? BsDoorClosedFill
            : r.deploymentType === "AccessArea"
            ? BsBuildingFill
            : GrStatusUnknown;
        const color =
          r.deploymentType === "Unit" && r.unitStatus === "Rented"
            ? "text-green-500"
            : r.deploymentType === "Unit" && r.unitStatus === "Delinquent"
            ? "text-red-500"
            : "text-zinc-500";

        return (
          <span className="inline-flex items-center gap-2">
            <Icon className={`${color}`} /> {r.deploymentType}{" "}
            {r.deploymentType === "Unit"
              ? `- ${r.unitName} (${r.unitStatus}${
                  r.visitorName ? " - " + r.visitorName : ""
                })`
              : ""}
          </span>
        );
      },
    },
    {
      key: "signalQuality",
      label: "Signal Quality",
      accessor: (r) => r.signalQuality,
      render: (r) => {
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
      accessor: (r) => r.batteryLevel,
      render: (r) => {
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
      key: "sensorState",
      label: "Sensor State",
      accessor: (r) => r.sensorState,
      render: (r) => <span>{r.sensorState}</span>,
    },
    {
      key: "statusMessages",
      label: "Sensor Status",
      accessor: (r) =>
        r.statusMessages?.some((m) => m.trim() !== "")
          ? r.statusMessages.join(" | ").toLowerCase()
          : "SmartMotion sensor is online",
      render: (r) => {
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
                : "SmartMotion sensor is online"}
            </span>
          </div>
        );
      },
    },
    {
      key: "lastUpdateTimestampDisplay",
      label: "Last Update",
      accessor: (r) => r.lastUpdateTimestampDisplay,
    },
  ];

  const handleRowClick = (row) => {
    setSelectedMotionSensor(row);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="w-full px-2">
      <div className="flex justify-end mb-1">
        <p
          className="text-black dark:text-white rounded-sm hover:text-zinc-400 dark:hover:text-zinc-400 hover:cursor-pointer mr-2 right-0"
          onClick={() => exportSmartMotion()}
        >
          Export
        </p>
      </div>

      {isDetailModalOpen && (
        <DetailModal
          device={selectedMotionSensor}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}

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
    </div>
  );
}
