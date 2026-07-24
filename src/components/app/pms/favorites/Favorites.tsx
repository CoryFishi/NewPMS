import PaginationFooter from "@components/shared/PaginationFooter";
import DataTable from "@components/shared/DataTable";
import axios from "axios";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoStar, GoStarFill } from "react-icons/go";
import qs from "qs";
import { useAuth } from "@context/AuthProvider";
import { supabase } from "@lib/supabaseClient";
import { FaExternalLinkAlt } from "react-icons/fa";
import TableButton from "@components/ui/TableButton";
import InputBox from "@components/ui/InputBox";
import { buildAuthUrl } from "@hooks/opentech";

export default function Favorites({ setCurrentFacilityName } : { setCurrentFacilityName: any; }) {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("asc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredFacilities, setFilteredFacilities] = useState<any[]>([]);
  const [sortedColumn, setSortedColumn] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [hasFavoriteTokensLoaded, setHasFavoriteTokensLoaded] = useState<boolean>(false);
  const {
    user,
    favoriteTokens,
    setFavoriteTokens,
    currentFacility,
    setCurrentFacility,
    getBearerToken,
  } = useAuth();
  const navigate = useNavigate();
  const [noFacilities, setNoFacilities] = useState<boolean>(false);

  const handleSort = (columnKey: string, accessor: any = (a: any) => a[columnKey]) => {
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
  const handleCurrentFacilityUpdate = async (updatedInfo: any) => {
    const { error } = await supabase.from("user_data").upsert(
      {
        user_id: user.id,
        current_facility: updatedInfo,
        last_update_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Error saving credentials:", error.message);
    } else {
      setCurrentFacility(updatedInfo);
    }
  };
  const handleSelectLogin = async (facility: any) => {
    // Use cached bearer token if available — avoids a round-trip auth call
    const cached = getBearerToken(facility);
    if (cached) {
      const updatedFacility = {
        ...facility,
        token: { access_token: cached },
      };
      handleCurrentFacilityUpdate(updatedFacility);
      setCurrentFacilityName(facility.name);
      return { data: updatedFacility };
    }

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
        const tokenData = response.data;
        const updatedFacility = {
          ...facility,
          token: tokenData,
        };
        handleCurrentFacilityUpdate(updatedFacility);

        setCurrentFacilityName(facility.name);
        return response;
      })
      .catch(function (error) {
        console.error("Error during login:", error);
        throw error;
      });
  };
  const handleSelect = async (facility: any) => {
    await handleCurrentFacilityUpdate(facility);
    await toast.promise(handleSelectLogin(facility), {
      loading: "Selecting facility...",
      success: <b>Facility selected!</b>,
      error: <b>Could not select facility.</b>,
    });
    navigate("/pms/units");
  };
  const addToFavorite = async (facility: any) => {
    const isFavorite = isFacilityFavorite(facility.id);
    handleFavoriteFacilitiesUpdate(facility, isFavorite);
  };
  const handleFavoriteFacilitiesUpdate = async (newFacility: any, isFavorite: boolean) => {
    // Fetch existing favorite tokens for the user
    const { data: currentData, error: fetchError } = await supabase
      .from("user_data")
      .select("favorite_tokens")
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      console.error("Error fetching favorite tokens:", fetchError.message);
      toast.error("Failed to retrieve favorite credentials.");
      return;
    }
    if (isFavorite) {
      setNoFacilities(false);
      // Filter out the token to remove
      const updatedTokens = (currentData?.favorite_tokens || []).filter(
        (token) => token.id !== newFacility.id
      );

      // Upsert the updated tokens array back to the database
      const { error } = await supabase.from("user_data").upsert(
        {
          user_id: user.id,
          favorite_tokens: updatedTokens,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.error("Error removing favorite token:", error.message);
      } else {
        setFavoriteTokens(updatedTokens);
      }
    } else {
      // Filter in the token to remove
      const updatedTokens = [
        ...(currentData?.favorite_tokens || []),
        newFacility,
      ];
      const { error } = await supabase.from("user_data").upsert(
        {
          user_id: user.id,
          favorite_tokens: updatedTokens,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.error("Error saving favorite tokens:", error.message);
      } else {
        setFavoriteTokens(updatedTokens);
      }
    }
  };
  const isFacilityFavorite = (facilityId: string) => {
    return favoriteTokens.some((facility: any) => facility.id === facilityId);
  };

  useEffect(() => {
    try {
      if (favoriteTokens.length < 1) {
        if (facilities.length < 1) {
          setNoFacilities(true);
        }
        return;
      }
      if (hasFavoriteTokensLoaded) return;
      setHasFavoriteTokensLoaded(true);
      setNoFacilities(false);
      setFacilities(favoriteTokens);
    } catch {
      alert("It broke");
    }
  }, [favoriteTokens, facilities.length, hasFavoriteTokensLoaded]);

  useEffect(() => {
    const filtered = facilities.filter((facility: any) =>
        (facility.id || "").toString().includes(searchQuery) ||
        (facility.propertyNumber || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (facility.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (facility.environment || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
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
      key: "isFavorite",
      label: "★",
      accessor: (r: any) => (isFacilityFavorite(r.id) ? 1 : 0),
      render: (r: any) => (
        <div
          className="flex justify-center text-yellow-500 cursor-pointer"
          onClick={() => addToFavorite(r)}
        >
          {isFacilityFavorite(r.id) ? (
            <GoStarFill />
          ) : (
            <GoStar className="text-slate-400" />
          )}
        </div>
      ),
    },
    {
      key: "environment",
      label: "Environment",
      accessor: (r: any) => r.environment,
      render: (r: any) => environmentLabel[r.environment] ?? "N/A",
    },
    {
      key: "id",
      label: "Facility Id",
      accessor: (r: any) => r.id,
    },
    {
      key: "name",
      label: "Facility Name",
      accessor: (r: any) => r.name,
      render: (r: any) => (
        <div className="flex gap-3 items-center justify-center">
          {r.name}
          <FaExternalLinkAlt
            className="text-blue-300 hover:text-blue-500 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const baseUrl =
                r.environment === "staging"
                  ? `https://portal.${r.environment}insomniaccia.com/facility/${r.id}/dashboard`
                  : `https://portal.insomniaccia${r.environment}.com/facility/${r.id}/dashboard`;
              window.open(baseUrl, "_blank");
            }}
          />
        </div>
      ),
    },
    {
      key: "propertyNumber",
      label: "Property Number",
      accessor: (r: any) => r.propertyNumber,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r: any) =>
        currentFacility.id === r.id &&
        currentFacility.environment === r.environment ? (
          <TableButton
            onclick={() => navigate("/pms/units")}
            text={"Selected"}
          />
        ) : (
          <TableButton
            className="bg-yellow-500 hover:bg-yellow-600"
            onclick={() => handleSelect(r)}
            text={"Select"}
          />
        ),
    },
  ];

  return (
    <div className="relative overflow-auto h-full dark:text-white dark:bg-zinc-900">
      <div className="flex h-12 bg-zinc-200 items-center dark:border-zinc-700 dark:bg-zinc-950">
        <div className="ml-5 flex items-center text-sm">
          <GoStarFill className="text-lg" />
          &ensp; Favorites
        </div>
      </div>
      <div className="w-full h-fit p-5 flex flex-col rounded-lg pb-10">
        <div className=" mb-2 flex items-center justify-end text-center">
          <InputBox
            type="text"
            placeholder="Search facilities..."
            onchange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
          />
        </div>
        <DataTable
          columns={columns}
          data={filteredFacilities}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          sortDirection={sortDirection}
          sortedColumn={sortedColumn}
          onSort={handleSort}
        />

        {/* No Facilities Notification Text */}
        {noFacilities && (
          <p className="text-center p-4 font-bold text-lg">
            No facilities currently favorited...
          </p>
        )}
        {/* Pagination Footer */}
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
  );
}
