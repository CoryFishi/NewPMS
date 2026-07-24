import PaginationFooter from "@components/shared/PaginationFooter";
import axios from "axios";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import DataTable from "@components/shared/DataTable";
import DetailModal from "@components/shared/DetailModal";
import { IoIosWarning } from "react-icons/io";
import { RiErrorWarningFill } from "react-icons/ri";
import { buildApiUrl, authHeaders } from "@hooks/opentech";

export default function AllAccessPointsReport({
  selectedFacilities,
  searchQuery,
}: {
  selectedFacilities: any[];
  searchQuery: string;
}) {
  const [filteredAccessPoints, setFilteredAccessPoints] = useState<any[]>([]);
  const [accessPoints, setAccessPoints] = useState<any[]>([]);
  const [hoveredRow, setHoveredRow] = useState<null | number>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [sortedColumn, setSortedColumn] = useState<null | string>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedAccessPoint, setSelectedAccessPoint] = useState<any>(null);

  const fetchAccessPoints = async (facility: any) => {
    try {
      const response = await axios.get(
        buildApiUrl(facility, `/facilities/${facility.id}/edgerouterplatformdevicesstatus`),
        {
          headers: authHeaders({ ...facility, token: { access_token: facility.bearer } }),
        }
      );
      const accessPoints = response.data;
      return accessPoints;
    } catch (error) {
      console.error(
        `Error fetching Access Points for: ${facility.name}`,
        error
      );
      toast.error(`${facility.name} does not have Access Points`);
      return null;
    }
  };

  const fetchDataForSelectedFacilities = useCallback(async () => {
    setAccessPoints([]); // Clear existing data
    const fetchPromises = selectedFacilities.map(async (facility) => {
      const facilityName = facility.name;
      const accessPointsData = await fetchAccessPoints(facility);

      // Add facilityName to each Access Points in the fetched data
      const updatedAccessPointData = accessPointsData.map((accessPoint) => ({
        ...accessPoint,
        facilityName,
      }));

      return updatedAccessPointData;
    });

    const allAccessPointData = await Promise.all(fetchPromises);

    // Flatten the array and update state with all Access Points
    const flattenedData = allAccessPointData.flat();
    setAccessPoints(flattenedData);
  }, [selectedFacilities]);

  useEffect(() => {
    fetchDataForSelectedFacilities();
  }, [selectedFacilities, fetchDataForSelectedFacilities]);

  useEffect(() => {
    setSortedColumn("Facility");
    var sortedAccesspoints = [...accessPoints].sort((a, b) => {
      if (a.facilityName.toLowerCase() < b.facilityName.toLowerCase())
        return -1;
      if (a.facilityName.toLowerCase() > b.facilityName.toLowerCase()) return 1;
      return 0;
    });

    const filteredAccessPoints = sortedAccesspoints.filter(
      (accessPoint) =>
        (accessPoint.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (accessPoint.facilityName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (accessPoint.overallStatus || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
    setFilteredAccessPoints(filteredAccessPoints);
    setCurrentPage(1);
  }, [accessPoints, searchQuery]);

  const handleColumnSort = (columnKey: string, accessor: any = (a:any) => a[columnKey]) => {
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
      setFilteredAccessPoints([...accessPoints]);
      return;
    }

    setFilteredAccessPoints(
      [...filteredAccessPoints].sort((a, b) => {
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
      key: "connectionStatus",
      label: "Connection Status",
      accessor: (r: any) => r.connectionStatus,
      render: (r: any) => (
        <div className="inline-flex items-center gap-2">
          {r.connectionStatus === "ok" ? (
            <FaCheckCircle className="text-green-500" />
          ) : r.connectionStatus === "warning" ? (
            <IoIosWarning className="text-yellow-500" />
          ) : r.connectionStatus === "error" ? (
            <RiErrorWarningFill className="text-red-500" />
          ) : (
            ""
          )}
          <div>{r.connectionStatusMessage}</div>
        </div>
      ),
    },
    {
      key: "isDeviceOffline",
      label: "Status",
      accessor: (r: any) => r.isDeviceOffline,
      render: (r: any) => <div>{!r.isDeviceOffline ? "Online" : "Offline"}</div>,
    },
    {
      key: "lastUpdateTimestamp",
      label: "Last Updated",
      accessor: (r: any) => r.lastUpdateTimestamp,
    },
  ];

  const handleRowClick = (row: any) => {
    setSelectedAccessPoint(row);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="w-full px-2">
      {isDetailModalOpen && (
        <DetailModal
          device={selectedAccessPoint}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
      <div className="h-[73vh] overflow-y-auto text-center">
        <DataTable
          columns={columns}
          data={filteredAccessPoints}
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
          items={filteredAccessPoints}
        />
      </div>
    </div>
  );
}
