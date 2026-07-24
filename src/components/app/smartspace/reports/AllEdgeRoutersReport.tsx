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

export default function AllEdgeRoutersReport({
  selectedFacilities,
  searchQuery,
} : {
  selectedFacilities: any[];
  searchQuery: string;
}) {
  const [filteredEdgeRouters, setFilteredEdgeRouters] = useState<any[]>([]);
  const [edgeRouters, setEdgeRouters] = useState<any[]>([]);
  const [hoveredRow, setHoveredRow] = useState<null | number>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [sortedColumn, setSortedColumn] = useState<null | string>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedEdgeRouter, setSelectedEdgeRouter] = useState<any>(null);

  const fetchEdgeRouters = async (facility: any) => {
    try {
      const response = await axios.get(
        buildApiUrl(facility, `/facilities/${facility.id}/edgerouterstatus`),
        {
          headers: authHeaders({ ...facility, token: { access_token: facility.bearer } }),
        }
      );
      const edgeRouters = response.data;
      return edgeRouters;
    } catch (error) {
      console.error(`Error fetching Edge Routers for: ${facility.name}`, error);
      toast.error(`${facility.name} does not have Edge Routers`);
      return null;
    }
  };

  const fetchDataForSelectedFacilities = useCallback(async () => {
    setEdgeRouters([]); // Clear existing data
    const fetchPromises = selectedFacilities.map(async (facility) => {
      const facilityName = facility.name;
      const edgeRoutersData = await fetchEdgeRouters(facility);

      // Add facilityName to the edgeRoutersData array
      edgeRoutersData.facilityName = facilityName;

      return edgeRoutersData;
    });

    const allEdgeRouterData = await Promise.all(fetchPromises);

    // Flatten the array and update state with all Edge Routers
    const flattenedData = allEdgeRouterData.flat();
    setEdgeRouters(flattenedData);
  }, [selectedFacilities]);

  useEffect(() => {
    fetchDataForSelectedFacilities();
  }, [selectedFacilities, fetchDataForSelectedFacilities]);

  useEffect(() => {
    setSortedColumn("Facility");
    var sortedEdgeRouters = [...edgeRouters].sort((a, b) => {
      if (a.facilityName.toLowerCase() < b.facilityName.toLowerCase())
        return -1;
      if (a.facilityName.toLowerCase() > b.facilityName.toLowerCase()) return 1;
      return 0;
    });

    const filteredEdgeRouters = sortedEdgeRouters.filter(
      (edgeRouter) =>
        (edgeRouter.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (edgeRouter.facilityName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (edgeRouter.overallStatus || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
    setFilteredEdgeRouters(filteredEdgeRouters);
    setCurrentPage(1);
  }, [edgeRouters, searchQuery]);

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
      setFilteredEdgeRouters([...edgeRouters]);
      return;
    }

    setFilteredEdgeRouters(
      [...filteredEdgeRouters].sort((a, b) => {
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
      key: "eventStatusMessage",
      label: "Event Status",
      accessor: (r: any) => r.eventStatusMessage,
    },
    {
      key: "isLockProvisioningEnabled",
      label: "Provisioning Enabled",
      accessor: (r: any) => r.isLockProvisioningEnabled,
      render: (r: any) => (
        <div>
          {r.isAccessPointProvisioningEnabled || r.isLockProvisioningEnabled
            ? "True"
            : "False"}
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
      key: "lastCommunicationOn",
      label: "Last Communication On",
      accessor: (r: any) => r.lastCommunicationOn,
    },
  ];

  const handleRowClick = (row: any) => {
    setSelectedEdgeRouter(row);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="w-full px-2">
      {isDetailModalOpen && (
        <DetailModal
          device={selectedEdgeRouter}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
      <div className="h-[73vh] overflow-y-auto text-center">
        <DataTable
          columns={columns}
          data={filteredEdgeRouters}
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
          items={filteredEdgeRouters}
        />
      </div>
    </div>
  );
}
