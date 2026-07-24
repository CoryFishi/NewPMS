import axios from "axios";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { buildApiUrl, authHeaders } from "@hooks/opentech";

export default function OfflineEventsComparison({ selectedFacilities } : { selectedFacilities: any[] }) {
  const [dayValue, setDayValue] = useState<number>(7);
  const currentTime = Math.floor(Date.now() / 1000);
  const pastDayValue = currentTime - dayValue * 24 * 60 * 60;
  const [smartlockEventsData, setSmartlockEventsData] = useState<any[]>([]);
  const fetchSmartLockEvents = useCallback(async (facility: any) => {
    try {
      const response = await axios.get(
        buildApiUrl(
          facility,
          `/combinedevents/facilities/${facility.id}?uq=&vq=&etq=5&etq=6&minDate=${pastDayValue}&maxDate=${currentTime}&hideMetadata=true`,
          "accessevent"
        ),
        {
          headers: authHeaders(
            { ...facility, token: { access_token: facility.bearer } },
            "application/json",
            "3.0"
          ),
        }
      );
      const smartLockEvents = await response.data;
      smartLockEvents.sort(
        (a: any, b: any) => new Date(a.createdUtc).getTime() - new Date(b.createdUtc).getTime()
      );
      return smartLockEvents;
    } catch (error) {
      console.error(`Error fetching Events for: ${facility.name}`, error);
      toast.error(`${facility.name} does not have Events`);
      return null;
    }
  }, [currentTime, pastDayValue]);

  

  useEffect(() => {
    const fetchDataForSelectedFacilities = async () => {
    const fetchPromises = selectedFacilities.map(async (facility) => {
      const smartlockData = await fetchSmartLockEvents(facility);
      return { [facility.name]: smartlockData };
    });

    const allSmartlockData = await Promise.all(fetchPromises);

    setSmartlockEventsData(allSmartlockData);
    };
    fetchDataForSelectedFacilities();
  }, [selectedFacilities, dayValue, fetchSmartLockEvents]);

  return (
    <div className="w-full px-2">
      <div className="flex flex-col justify-between mb-1">
        <p className="text-left text-sm ml-2">
          Events shown from the last
          <select
            className="border rounded-sm mx-2 dark:bg-darkSecondary dark:border-border"
            id="dayValue"
            value={dayValue}
            onChange={(e) => {
              setDayValue(Number(e.target.value));
            }}
          >
            <option value={1}>1</option>
            <option value={3}>3</option>
            <option value={7}>7</option>
            <option value={30}>30</option>
            <option value={90}>90</option>
            <option value={120}>120</option>
            <option value={180}>180</option>
          </select>
          days
        </p>
        <div>
          {smartlockEventsData.map((element) => {
            const facilityName = Object.keys(element)[0];
            const events = element[facilityName] || [];

            const byDay = events.reduce((acc, evt) => {
              const day = evt.createdUtc?.slice(0, 10) || "Unknown";

              if (!acc[day]) {
                acc[day] = { date: day, offline: 0, online: 0 };
              }

              const type = (evt.eventType || "").toLowerCase();

              if (type.includes("offline")) {
                acc[day].offline += 1;
              } else if (type.includes("online")) {
                acc[day].online += 1;
              }

              return acc;
            }, {});

            const chartData = Object.values(byDay).sort(
              (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            return (
              <div key={facilityName} className="mb-6">
                <h2 className="text-lg font-semibold mb-2">{facilityName}</h2>

                {chartData.length > 0 && (
                  <div className="mb-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart
                        data={chartData}
                        margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          labelFormatter={(label) => `Date: ${label}`}
                          formatter={(value, name) => [
                            value,
                            name === "offline"
                              ? "Offline events"
                              : "Online events",
                          ]}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #ccc",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="offline"
                          stackId="status"
                          stroke="#ef4444"
                          fill="#fecaca"
                          name="Offline"
                        />
                        <Area
                          type="monotone"
                          dataKey="online"
                          stackId="status"
                          stroke="#22c55e"
                          fill="#bbf7d0"
                          name="Online"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
