import { FaScroll } from "react-icons/fa6";
import { useAuth } from "@context/AuthProvider";
import axios from "axios";
import { useState } from "react";
import ScriptConfirmation from "@views/pms/scripts/ScriptConfirmation";
import FillVacantModal, { FillVacantConfig } from "@views/pms/units/FillVacantModal";
import GeneralButton from "@components/ui/GeneralButton";
import { addEvent } from "@hooks/supabase";
import { buildApiUrl, authHeaders } from "@hooks/opentech";

export default function Scripts() {
  const { currentFacility, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");
  const [units, setUnits] = useState("");
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isFillVacantModalOpen, setIsFillVacantModalOpen] = useState(false);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);

  const importUnits = async (units) => {
    if (!units) return;
    const unitNumbersArray = units.split(",").flatMap((unit) => {
      unit = unit.trim();
      if (unit.includes("-")) {
        const [start, end] = unit.split("-").map((u) => u.trim());

        const prefixStart = start.match(/^[^\d]+/g)?.[0] || "";
        const prefixEnd = end.match(/^[^\d]+/g)?.[0] || "";

        const numStartStr = start.replace(prefixStart, "");
        const numEndStr = end.replace(prefixEnd, "");

        const numStart = parseInt(numStartStr);
        const numEnd = parseInt(numEndStr);
        const digitCount = numStartStr.length;

        if (
          prefixStart === prefixEnd &&
          !isNaN(numStart) &&
          !isNaN(numEnd) &&
          numStart <= numEnd &&
          numEnd - numStart < 1000
        ) {
          return Array.from({ length: numEnd - numStart + 1 }, (_, i) => {
            const num = (numStart + i).toString().padStart(digitCount, "0");
            return `${prefixStart}${num}`;
          });
        }

        return [unit];
      }

      return [unit];
    });

    await unitNumbersArray.map(async (unitNumber) => {
      const data = {
        unitNumber: unitNumber,
        extendedData: {
          additionalProp1: null,
          additionalProp2: null,
          additionalProp3: null,
        },
        suppressCommands: false,
      };
      // API call
      const config = {
        method: "post",
        url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/units`),
        headers: authHeaders(currentFacility),
        data: data,
      };
      axios(config)
        .then(function (response) {
          const r = response.data;
          setLogs((prevLogs) => [
            ...prevLogs,
            `${new Date().toLocaleString()}: Unit ${r.unitNumber} (${
              r.id
            }) imported sucessfully`,
          ]);
        })
        .catch(function (error) {
          setLogs((prevLogs) => [
            ...prevLogs,
            `${new Date().toLocaleString()}: Unit ${unitNumber} failed to import! ${
              error.response.data.UnitNumber
            }`,
          ]);
          throw error;
        });
    });

    await addEvent(
      "Import Units",
      `${user.email} imported units at facility ${currentFacility.name}, ${currentFacility.id}`,
      true
    );
    setIsUnitModalOpen(false);
  };

  const importUnitsWTenants = async (units) => {
    if (!units) return;
    const handleRent = async (unit) => {
      const data = {
        timeGroupId: 0,
        accessProfileId: 0,
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
        headers: authHeaders(currentFacility, "application/json-patch+json"),
        data: data,
      };

      return axios(config)
        .then(async function (response) {
          const r = response.data.visitor;
          setLogs((prevLogs) => [
            ...prevLogs,
            `${new Date().toLocaleString()}: Tenant ${r.id} (Unit ${
              r.unitNumber
            }) imported sucessfully`,
          ]);
          return response;
        })
        .catch(function (error) {
          throw error;
        });
    };
    const unitNumbersArray = units.split(",").flatMap((unit) => {
      unit = unit.trim();
      if (unit.includes("-")) {
        const [start, end] = unit.split("-").map((u) => u.trim());

        const prefixStart = start.match(/^[^\d]+/g)?.[0] || "";
        const prefixEnd = end.match(/^[^\d]+/g)?.[0] || "";

        const numStartStr = start.replace(prefixStart, "");
        const numEndStr = end.replace(prefixEnd, "");

        const numStart = parseInt(numStartStr);
        const numEnd = parseInt(numEndStr);
        const digitCount = numStartStr.length;

        if (
          prefixStart === prefixEnd &&
          !isNaN(numStart) &&
          !isNaN(numEnd) &&
          numStart <= numEnd &&
          numEnd - numStart < 1000
        ) {
          return Array.from({ length: numEnd - numStart + 1 }, (_, i) => {
            const num = (numStart + i).toString().padStart(digitCount, "0");
            return `${prefixStart}${num}`;
          });
        }

        return [unit];
      }

      return [unit];
    });

    await unitNumbersArray.map(async (unitNumber) => {
      const data = {
        unitNumber: unitNumber,
        extendedData: {
          additionalProp1: null,
          additionalProp2: null,
          additionalProp3: null,
        },
        suppressCommands: false,
      };
      // API call
      const config = {
        method: "post",
        url: buildApiUrl(currentFacility, `/facilities/${currentFacility.id}/units`),
        headers: authHeaders(currentFacility),
        data: data,
      };
      axios(config)
        .then(function (response) {
          const r = response.data;
          setLogs((prevLogs) => [
            ...prevLogs,
            `${new Date().toLocaleString()}: Unit ${r.unitNumber} (${
              r.id
            }) imported sucessfully`,
          ]);
          handleRent(r);
        })
        .catch(function (error) {
          setLogs((prevLogs) => [
            ...prevLogs,
            `${new Date().toLocaleString()}: Unit ${unitNumber} failed to import! ${
              error.response.data.UnitNumber
            }`,
          ]);
          throw error;
        });
    });

    await addEvent(
      "Import Units",
      `${user.email} imported units with tenants at facility ${currentFacility.name}, ${currentFacility.id}`,
      true
    );

    setIsTenantModalOpen(false);
  };

  const getBaseUrl = () => buildApiUrl(currentFacility, "");

  const fillVacantUnits = async (config: FillVacantConfig) => {
    setIsFillVacantModalOpen(false);
    const baseUrl = getBaseUrl();
    const headers = authHeaders(currentFacility, "application/json-patch+json");

    let allUnits;
    try {
      const res = await axios.get(
        `${baseUrl}facilities/${currentFacility.id}/units`,
        { headers }
      );
      allUnits = res.data;
    } catch {
      setLogs((prev) => [
        ...prev,
        `${new Date().toLocaleString()}: Failed to fetch units`,
      ]);
      setIsFillVacantModalOpen(false);
      return;
    }

    const vacantUnits = allUnits.filter((u) => u.status === "Vacant");
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleString()}: Found ${vacantUnits.length} vacant unit(s) — starting fill...`,
    ]);

    await Promise.allSettled(
      vacantUnits.map(async (unit) => {
        const data = {
          timeGroupId: 0,
          accessProfileId: 0,
          unitId: unit.id,
          accessCode: config.randomCode
            ? Math.floor(Math.random() * (999999999 - 100000 + 1)) + 100000
            : Number(config.accessCode),
          lastName: "Tenant",
          firstName: "Temporary",
          email: config.email,
          mobilePhoneNumber: config.phone,
          isTenant: true,
          extendedData: {
            additionalProp1: null,
            additionalProp2: null,
            additionalProp3: null,
          },
          suppressCommands: false,
        };
        try {
          const res = await axios.post(
            `${baseUrl}facilities/${currentFacility.id}/visitors`,
            data,
            { headers }
          );
          const v = res.data.visitor;
          setLogs((prev) => [
            ...prev,
            `${new Date().toLocaleString()}: Filled unit ${unit.unitNumber} (${unit.id}) — visitor ${v.id}`,
          ]);
        } catch {
          setLogs((prev) => [
            ...prev,
            `${new Date().toLocaleString()}: Failed to fill unit ${unit.unitNumber} (${unit.id})`,
          ]);
        }
      })
    );

    await addEvent(
      "Fill Vacant Units",
      `${user.email} filled ${vacantUnits.length} vacant unit(s) with temporary tenants at facility ${currentFacility.name}, ${currentFacility.id}`,
      true
    );
  };

  const cleanupTempTenants = async () => {
    setIsCleanupModalOpen(false);
    const baseUrl = getBaseUrl();
    const headers = authHeaders(currentFacility, "application/json-patch+json");

    let allVisitors;
    try {
      const res = await axios.get(
        `${baseUrl}facilities/${currentFacility.id}/visitors`,
        { headers }
      );
      allVisitors = res.data;
    } catch {
      setLogs((prev) => [
        ...prev,
        `${new Date().toLocaleString()}: Failed to fetch visitors`,
      ]);
      return;
    }

    const tempTenants = allVisitors.filter(
      (v) => v.name === "Temporary Tenant"
    );
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleString()}: Found ${tempTenants.length} temporary tenant(s) — starting cleanup...`,
    ]);

    await Promise.allSettled(
      tempTenants.map(async (visitor) => {
        try {
          await axios.post(
            `${baseUrl}facilities/${currentFacility.id}/units/${visitor.unitId}/vacate`,
            "",
            { headers }
          );
          setLogs((prev) => [
            ...prev,
            `${new Date().toLocaleString()}: Vacated unit ${visitor.unitNumber} (visitor ${visitor.id})`,
          ]);
        } catch {
          setLogs((prev) => [
            ...prev,
            `${new Date().toLocaleString()}: Failed to vacate unit ${visitor.unitNumber} (visitor ${visitor.id})`,
          ]);
        }
      })
    );

    await addEvent(
      "Cleanup Temporary Tenants",
      `${user.email} moved out ${tempTenants.length} temporary tenant(s) at facility ${currentFacility.name}, ${currentFacility.id}`,
      true
    );
  };

  const unitGroups = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="relative overflow-auto h-full dark:text-white dark:bg-zinc-900">
      {isUnitModalOpen && (
        <ScriptConfirmation
          title={"Confirm Unit Creation"}
          message={message}
          handleSubmit={() => importUnits(units)}
          setIsModalOpen={setIsUnitModalOpen}
        />
      )}
      {isTenantModalOpen && (
        <ScriptConfirmation
          title={"Confirm Unit W/ Tenant Creation"}
          message={message}
          handleSubmit={() => importUnitsWTenants(units)}
          setIsModalOpen={setIsTenantModalOpen}
        />
      )}
      {isFillVacantModalOpen && (
        <FillVacantModal
          setIsModalOpen={setIsFillVacantModalOpen}
          handleSubmit={fillVacantUnits}
        />
      )}
      {isCleanupModalOpen && (
        <ScriptConfirmation
          title={"Confirm Temporary Tenant Cleanup"}
          message={"move out all temporary tenants (name: \"Temporary Tenant\") from their units"}
          handleSubmit={cleanupTempTenants}
          setIsModalOpen={setIsCleanupModalOpen}
        />
      )}
      <div className="flex h-12 bg-zinc-200 items-center dark:border-zinc-700 dark:bg-zinc-950">
        <div className="ml-5 flex items-center text-sm">
          <FaScroll className="text-lg" />
          &ensp; Scripts
        </div>
      </div>
      <div className="w-full h-fit p-5 flex flex-col pb-10 gap-4">
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3 text-sm border dark:border-zinc-700">
          Active facility:{" "}
          <span className="font-semibold">{currentFacility.name}</span>
        </div>

        {/* Import Units */}
        <div className="border dark:border-zinc-700 rounded-lg overflow-hidden">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 border-b dark:border-zinc-700">
            <p className="font-semibold text-sm">Import Units</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Create units without tenants
            </p>
          </div>
          <div className="p-4 flex flex-col gap-4">
            {[100, 1000].map((count) => (
              <div key={count}>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                  {count} Units
                </p>
                <div className="flex flex-wrap gap-y-2">
                  {unitGroups.map((letter) => {
                    const padded = count.toString().padStart(4, "0");
                    const unitRange = `${letter}0001-${letter}${padded}`;
                    const title = `Import ${count} ${letter} Units`;
                    return (
                      <GeneralButton
                        key={letter}
                        onclick={() => {
                          setUnits(unitRange);
                          setMessage(title);
                          setIsUnitModalOpen(true);
                        }}
                        className="bg-yellow-500 hover:bg-amber-500"
                        text={title}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Import Units with Tenants */}
        <div className="border dark:border-zinc-700 rounded-lg overflow-hidden">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 border-b dark:border-zinc-700">
            <p className="font-semibold text-sm">Import Units with Tenants</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Create units and assign a temporary tenant to each
            </p>
          </div>
          <div className="p-4 flex flex-col gap-4">
            {[100, 1000].map((count) => (
              <div key={count}>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                  {count} Units
                </p>
                <div className="flex flex-wrap gap-y-2">
                  {unitGroups.map((letter) => {
                    const padded = count.toString().padStart(4, "0");
                    const unitRange = `${letter}0001-${letter}${padded}`;
                    const title = `Import ${count} ${letter} Units w/ tenants`;
                    return (
                      <GeneralButton
                        key={letter}
                        onclick={() => {
                          setUnits(unitRange);
                          setMessage(title);
                          setIsTenantModalOpen(true);
                        }}
                        className="bg-yellow-500 hover:bg-amber-500"
                        text={title}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Temporary Tenants */}
        <div className="border border-rose-200 dark:border-rose-900 rounded-lg overflow-hidden">
          <div className="bg-rose-50 dark:bg-rose-950 px-4 py-3 border-b border-rose-200 dark:border-rose-900">
            <p className="font-semibold text-sm text-rose-700 dark:text-rose-300">
              Temporary Tenants
            </p>
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-0.5">
              Bulk-fill vacant units or remove all temporary tenants
            </p>
          </div>
          <div className="p-4 flex flex-wrap gap-y-2">
            <GeneralButton
              onclick={() => setIsFillVacantModalOpen(true)}
              className="bg-blue-500 hover:bg-blue-600"
              text="Fill All Vacant Units"
            />
            <GeneralButton
              onclick={() => setIsCleanupModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700"
              text="Move Out All Temp Tenants"
            />
          </div>
        </div>

        {/* Event Log */}
        <div className="border dark:border-zinc-700 rounded-lg overflow-hidden">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 border-b dark:border-zinc-700 flex items-center justify-between">
            <p className="font-semibold text-sm">Event Log</p>
            {logs.length > 0 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {logs.length} event{logs.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="max-h-96 min-h-24 flex flex-col p-3 overflow-y-auto font-mono text-xs gap-0.5">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`w-full ${
                  log.toLowerCase().includes("fail")
                    ? "text-red-500"
                    : ""
                }`}
              >
                {log}
              </div>
            ))}
            {logs.length < 1 && (
              <div className="w-full text-center text-zinc-400 dark:text-zinc-500 py-4">
                No events received yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
