import AllSmartLocksReport from "@views/smartspace/reports/AllSmartLocksReport";
import AllEdgeRoutersReport from "@views/smartspace/reports/AllEdgeRoutersReport";
import AllAccessPointsReport from "@views/smartspace/reports/AllAccessPointsReport";
import EventsReport from "@views/smartspace/reports/EventsReport";
import OnlineTimeReport from "@views/smartspace/reports/OnlineTimeReport";
import LoadingSpinner from "@components/shared/LoadingSpinner";
import { useAuth } from "@context/AuthProvider";
import axios from "axios";
import toast from "react-hot-toast";
import React, { useEffect, useRef, useState } from "react";
import { FaLock } from "react-icons/fa";
import OfflineEventsComparison from "@views/smartspace/reports/OfflineEventsComparison";
import InputBox from "@components/ui/InputBox";
import AllSmartMotionReport from "@views/smartspace/reports/AllSmartMotionReport";
import { buildAuthUrl } from "@hooks/opentech";

export default function SmartSpaceReports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [newSelectedFacilities, setNewSelectedFacilities] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [facilitiesWithBearers, setFacilitiesWithBearers] = useState([]);
  const [openPage, setOpenPage] = useState<keyof typeof reportOptions>("AllSmartLocksReport");
  const [reportSearch, setReportSearch] = useState(false);
  const { selectedTokens, getBearerToken } = useAuth();
  const modalRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLoadingText, setCurrentLoadingText] = useState("");
  const [pageLoadDateTime, setPageLoadDateTime] = useState(
    new Date().toLocaleString()
  );
  const [reportOptions] = useState({
    AllSmartLocksReport: AllSmartLocksReport,
    AllEdgeRoutersReport: AllEdgeRoutersReport,
    AllAccessPointsReport: AllAccessPointsReport,
    EventsReport: EventsReport,
    OnlineTimeReport: OnlineTimeReport,
    OfflineEventsComparison: OfflineEventsComparison,
    AllSmartMotionReport: AllSmartMotionReport,
  });

  // Close modal if clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
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

  // Function to select all selected facilities
  const selectAllFacilities = () => {
    setReportSearch(false);

    const allSelection = facilitiesWithBearers.map((facility) => facility);
    setNewSelectedFacilities(allSelection);
  };

  // Function to deselect all selected facilities
  const deselectAllFacilities = () => {
    setReportSearch(false);

    setNewSelectedFacilities([]);
  };

  // Function to get a bearer token for each facility
  const fetchBearerToken = async (facility) => {
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

  // Facility dropdown toggle
  const toggleDropdown = () => setIsOpen(!isOpen);

  // Facility Selection handler
  const handleFacilitySelection = (e, facility) => {
    setReportSearch(false);
    if (e.target.checked) {
      setNewSelectedFacilities((prev) => [...prev, facility]);
    } else {
      setNewSelectedFacilities((prev) =>
        prev.filter((item) => item !== facility)
      );
    }
  };

  // Get bearer tokens prior to creating rows/cards
  useEffect(() => {
    const fetchFacilitiesWithBearers = async () => {
      try {
        const updatedFacilities = await Promise.all(
          selectedTokens.map(async (facility) => {
            // Use cached bearer token when available — avoids a round-trip auth call
            const cached = getBearerToken(facility);
            if (cached) return { ...facility, bearer: cached };
            setCurrentLoadingText(`Fetching token for ${facility.name}...`);
            const bearer = await fetchBearerToken(facility);
            return { ...facility, bearer };
          })
        );
        setFacilitiesWithBearers(updatedFacilities);
      } catch (error) {
        console.error("Error fetching facilities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchFacilitiesWithBearers();
  }, [selectedTokens, getBearerToken]);

  // Set all facilities as selected by default
  useEffect(() => {
    const initialSelection = facilitiesWithBearers.map((facility) => facility);
    setNewSelectedFacilities(initialSelection);
  }, [facilitiesWithBearers]);

  return (
    <div
      className={`relative ${
        isLoading ? "overflow-hidden min-h-full" : "overflow-auto"
      } h-full dark:text-white dark:bg-zinc-900 relative`}
    >
      {/* Loading Spinner */}
      {isLoading && <LoadingSpinner loadingText={currentLoadingText} />}
      {/* tab title */}
      <div className="flex h-12 bg-zinc-200 items-center dark:border-zinc-700 dark:bg-zinc-950">
        <div className="ml-5 flex items-center text-sm">
          <FaLock className="text-lg" />
          &ensp; SmartLock Reports
        </div>
      </div>
      <p className="text-sm dark:text-white text-left pt-1 pl-1">
        {pageLoadDateTime}
      </p>
      <div className="mt-3 mb-2 flex items-center justify-end text-center mx-5">
        {/* Search Bar */}
        <InputBox
          placeholder="Search reports..."
          value={searchQuery}
          onchange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          name="report"
          id="report"
          className="ml-2 w-96 border rounded-sm dark:bg-zinc-900 dark:border-zinc-700 text-black dark:text-white p-[10.5px] hover:cursor-pointer"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setOpenPage(e.target.value as keyof typeof reportOptions);
            setReportSearch(false);
          }}
        >
          <option value="AllSmartLocksReport">All SmartLocks</option>
          <option value="AllSmartMotionReport">All SmartMotion</option>
          <option value="AllEdgeRoutersReport">All EdgeRouters</option>
          <option value="AllAccessPointsReport">All AccessPoints</option>
          <option value="EventsReport">Events</option>
          <option value="OnlineTimeReport">Online Time</option>
          <option value="OfflineEventsComparison">
            Offline Events Comparison
          </option>
        </select>
        <div className="ml-2 relative inline-block w-96" ref={modalRef}>
          <button
            onClick={toggleDropdown}
            className="w-full border rounded-sm dark:bg-zinc-900 dark:border-zinc-700 text-black dark:text-white p-2 hover:cursor-pointer"
          >
            {newSelectedFacilities.length} facilities selected
          </button>

          {isOpen && (
            <div className="absolute mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50 max-h-60 overflow-y-auto">
              <div className="w-full text-white text-left px-1 justify-evenly flex">
                <button
                  className="text-green-400 hover:cursor-pointer hover:underline"
                  onClick={() => selectAllFacilities()}
                >
                  Select all
                </button>
                <button
                  className="text-yellow-400 hover:cursor-pointer"
                  onClick={() => deselectAllFacilities()}
                >
                  Deselect all
                </button>
              </div>
              {facilitiesWithBearers.map((facility) => (
                <label
                  key={facility.name}
                  className="flex text-left gap-2 p-2 hover:cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={facility.api}
                    checked={newSelectedFacilities.includes(facility)}
                    onChange={(e) => handleFacilitySelection(e, facility)}
                    className="form-checkbox text-black dark:text-white"
                  />
                  <span>{facility.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {/* Search Button */}
        <button
          className="bg-yellow-500 text-white p-1 py-2 rounded-sm hover:bg-yellow-600 hover:scale-105 duration-300 ml-3 w-44 font-bold hover:cursor-pointer"
          onClick={() => {
            setReportSearch(true);
            setPageLoadDateTime(new Date().toLocaleString());
          }}
        >
          Search
        </button>
      </div>
      {reportSearch === false && (
        <div className="w-full text-center mt-5">
          Choose and search a report...
        </div>
      )}
      {reportSearch &&
        (() => {
          const ReportComponent = reportOptions[openPage];
          return (
            <ReportComponent
              selectedFacilities={newSelectedFacilities}
              searchQuery={searchQuery}
            />
          );
        })()}
    </div>
  );
}
