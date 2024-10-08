import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { FaCircleCheck } from "react-icons/fa6";
import { MdOutlineError } from "react-icons/md";
import axios from "axios";
import qs from "qs";
import toast from "react-hot-toast";

export default function Settings({
  setCurrentFacility,
  currentFacility,
  savedFacilities = [],
  setSavedFacilities,
}) {
  // Create state for each input field
  const [api, setApi] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [client, setClient] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [environment, setEnvironment] = useState("-");

  const [settingsSavedFacilities, setSettingsSavedFacilities] = useState(
    Array.isArray(savedFacilities) ? savedFacilities : []
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const submitNewFacility = () => {
    return new Promise((resolve, reject) => {
      try {
        if (environment === "-" || !isAuthenticated) {
          reject("Invalid environment or authentication status.");
          return;
        }

        // Update the saved facilities state
        const updatedFacilities = [
          ...(settingsSavedFacilities || []),
          {
            api: api,
            apiSecret: apiSecret,
            client: client,
            clientSecret: clientSecret,
            environment: environment,
          },
        ];

        const updatedSettingsFacilities = [
          ...(settingsSavedFacilities || []),
          {
            api: api,
            apiSecret: apiSecret,
            client: client,
            clientSecret: clientSecret,
            environment: environment,
            isAuthenticated: true,
          },
        ];

        localStorage.setItem(
          "savedFacilities",
          JSON.stringify(updatedFacilities)
        );

        setSavedFacilities(updatedFacilities);
        setSettingsSavedFacilities(updatedSettingsFacilities);

        // Clear the form inputs
        setApi("");
        setApiSecret("");
        setClient("");
        setClientSecret("");
        setEnvironment("-");
        setIsAuthenticated(false);

        resolve("Facility added successfully!");
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleOldLogin = (facility, index) => {
    var tokenStageKey = "";
    var tokenEnvKey = "";
    if (facility.environment === "cia-stg-1.aws.") {
      tokenStageKey = "cia-stg-1.aws.";
    } else {
      tokenEnvKey = facility.environment;
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
      url: `https://auth.${tokenStageKey}insomniaccia${tokenEnvKey}.com/auth/token`,
      headers: {
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    };
    axios(config)
      .then(function (response) {
        setSettingsSavedFacilities((prevFacilities) =>
          prevFacilities.map((f, i) =>
            i === index ? { ...f, isAuthenticated: true } : f
          )
        );
        return response;
      })
      .catch(function (error) {
        setSettingsSavedFacilities((prevFacilities) =>
          prevFacilities.map((f, i) =>
            i === index ? { ...f, isAuthenticated: false } : f
          )
        );
        console.error(error.message);
      });
  };

  const handleNewLogin = (env) => {
    var tokenStageKey = "";
    var tokenEnvKey = "";
    if (env === "cia-stg-1.aws.") {
      tokenStageKey = "cia-stg-1.aws.";
    } else {
      tokenEnvKey = env;
    }
    const data = qs.stringify({
      grant_type: "password",
      username: api,
      password: apiSecret,
      client_id: client,
      client_secret: clientSecret,
    });
    const config = {
      method: "post",
      url: `https://auth.${tokenStageKey}insomniaccia${tokenEnvKey}.com/auth/token`,
      headers: {
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    };
    return axios(config)
      .then(function (response) {
        setIsAuthenticated(true);
        return response;
      })
      .catch(function (error) {
        setIsAuthenticated(false);
        console.error(error.message);
        throw error;
      });
  };

  // Delete facility handler
  const deleteFacility = (index) => {
    return new Promise((resolve, reject) => {
      try {
        const updatedFacilities = settingsSavedFacilities.filter(
          (_, i) => i !== index
        );

        setSavedFacilities(updatedFacilities);
        setSettingsSavedFacilities(updatedFacilities);
        localStorage.setItem(
          "savedFacilities",
          JSON.stringify(updatedFacilities)
        );
        resolve(true); // Resolve the promise if successful
      } catch (error) {
        reject(error); // Reject the promise if there is an error
      }
    });
  };

  useEffect(() => {
    const storedFacilities = JSON.parse(
      localStorage.getItem("savedFacilities")
    );
    if (Array.isArray(storedFacilities)) {
      setSavedFacilities(storedFacilities);
      setSettingsSavedFacilities(storedFacilities);
    } else {
      setSavedFacilities([]);
      setSettingsSavedFacilities([]);
    }
  }, [setSavedFacilities]);

  // Run login for all saved facilities when settingsSavedFacilities changes
  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      settingsSavedFacilities.forEach((facility, index) => {
        handleOldLogin(facility, index);
      });
      isMounted = false;
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-x-hidden font-roboto overflow-hidden">
      <Navbar />
      <div className="flex flex-col min-h-screen bg-white overflow-hidden">
        <div>
          <table className="w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2 text-left">
                  API Key
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  API Secret
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Client
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Client Secret
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Environment
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Authenticated
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {settingsSavedFacilities.map((facility, index) => (
                <tr key={index} className="hover:bg-gray-100">
                  <td className="border border-gray-300 px-4 py-2">
                    {facility.api}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {facility.apiSecret}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {facility.client}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {facility.clientSecret}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {facility.environment === ""
                      ? "Production"
                      : facility.environment === "-dev"
                      ? "Development"
                      : facility.environment === "-qa"
                      ? "QA"
                      : facility.environment === "cia-stg-1.aws."
                      ? "Staging"
                      : facility.environment}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <div className="flex justify-center text-lg">
                      {facility.isAuthenticated ? (
                        <FaCircleCheck className="text-green-500" />
                      ) : (
                        <MdOutlineError className="text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <div className="text-center">
                      <button
                        className="m-1 px-4 py-1 bg-red-500 rounded-md hover:bg-red-600 text-white"
                        onClick={() =>
                          toast.promise(deleteFacility(index), {
                            loading: "Deleting Credentials...",
                            success: <b>Successfully deleted!</b>,
                            error: <b>Failed deletion!</b>,
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="hover:bg-gray-100">
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <input
                    type="text"
                    className="w-64 border border-slate-100 shadow-md"
                    value={api}
                    onChange={(e) => setApi(e.target.value)}
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <input
                    type="text"
                    className="w-64 border border-slate-100 shadow-md"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <input
                    type="text"
                    className="w-64 border border-slate-100 shadow-md"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <input
                    type="text"
                    className="w-64 border border-slate-100 shadow-md"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  <select
                    value={environment}
                    onChange={(e) =>
                      setEnvironment(e.target.value) &
                      handleNewLogin(e.target.value)
                    }
                    className="w-64 p-0.5 shadow-md border border-slate-100"
                  >
                    <option value="-">--Select an Option--</option>
                    <option value="">Production</option>
                    <option value="-dev">Development</option>
                    <option value="-qa">QA</option>
                    <option value="cia-stg-1.aws.">Staging</option>
                  </select>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="flex justify-center text-lg">
                    {isAuthenticated ? (
                      <FaCircleCheck className="text-green-500" />
                    ) : (
                      <MdOutlineError className="text-red-500" />
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center ">
                  {isAuthenticated ? (
                    <button
                      className="m-1 px-4 py-1 bg-green-400 rounded-md hover:bg-green-500 text-white"
                      onClick={() =>
                        toast.promise(submitNewFacility(), {
                          loading: "Creating Credentials...",
                          success: <b>Successfully created!</b>,
                          error: <b>Failed to create!</b>,
                        })
                      }
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      className="m-1 px-4 py-1 bg-green-400 rounded-md hover:bg-green-500 text-white"
                      onClick={() =>
                        toast.promise(handleNewLogin(environment), {
                          loading: "Authenticating Credentials...",
                          success: <b>Successfully authenticated!</b>,
                          error: <b>Failed to authenticate!</b>,
                        })
                      }
                    >
                      Authenticate
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
