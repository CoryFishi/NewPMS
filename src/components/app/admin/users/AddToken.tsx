import axios from "axios";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { FaEdit } from "react-icons/fa";
import qs from "qs";
import { buildAuthUrl } from "@hooks/opentech";

export default function AddToken({
  setIsAddTokenFacilityModalOpen,
  setNewUserData,
}) {
  const [api, setApi] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [client, setClient] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [environment, setEnvironment] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = async () => {
    const data = qs.stringify({
      grant_type: "password",
      username: api,
      password: apiSecret,
      client_id: client,
      client_secret: clientSecret,
    });

    const config = {
      method: "post",
      url: buildAuthUrl({ api, apiSecret, client, clientSecret, environment }),
      headers: {
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    };

    return axios(config)
      .then(async function (response) {
        setIsAuthenticated(true);
        toast.success("Successfully Authenticated!");
        return response.data;
      })
      .catch(function (error) {
        setIsAuthenticated(false);
        toast.error("Failed to Authenticated...");
        console.error("Error during login:", error);
        throw error;
      });
  };

  return (
    // Background Filter
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 dark:text-white">
      {/* Modal Container */}
      <div className="bg-white rounded-sm shadow-lg dark:bg-zinc-900 min-w-96">
        {/* Header Container */}
        <div className="px-2 border-b-2 border-b-yellow-500 flex justify-between items-center h-10">
          <div className="flex text-center items-center">
            <h2 className="mx-2 text-lg font-bold text-center items-center flex justify-center gap-2">
              <FaEdit /> Adding New Token
            </h2>
          </div>
        </div>
        {/* Content Container */}
        <div className="px-5 py-3">
          {/* API */}
          <label className="block my-1 font-bold">API:</label>
          <input
            type="text"
            className="border border-slate-100 shadow-md rounded-sm w-full p-1 dark:border-zinc-700"
            value={api}
            placeholder="api token"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setApi(e.target.value);
              setIsAuthenticated(false);
            }}
          />
          {/* API Secret */}
          <label className="block my-1 font-bold">API Secret:</label>
          <input
            type="text"
            className="border border-slate-100 shadow-md rounded-sm w-full p-1 dark:border-zinc-700"
            value={apiSecret}
            placeholder="api secret token"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>{
              setApiSecret(e.target.value);
              setIsAuthenticated(false);
            }}
          />
          {/* Client */}
          <label className="block my-1 font-bold">Client:</label>
          <input
            type="text"
            className="border border-slate-100 shadow-md rounded-sm w-full p-1 dark:border-zinc-700"
            value={client}
            placeholder="client id"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>{
              setClient(e.target.value);
              setIsAuthenticated(false);
            }}
          />
          {/* Client Secret */}
          <label className="block my-1 font-bold">Client Secret:</label>
          <input
            type="text"
            className="border border-slate-100 shadow-md rounded-sm w-full p-1 dark:border-zinc-700"
            value={clientSecret}
            placeholder="client secret token"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>{
              setClientSecret(e.target.value);
              setIsAuthenticated(false);
            }}
          />
          {/* Environment */}
          <label className="block my-1 font-bold">Environment:</label>
          <select
            className="border border-slate-100 shadow-md rounded-sm w-full p-2 dark:border-zinc-700 hover:cursor-pointer"
            value={environment}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>{
              setEnvironment(e.target.value);
              setIsAuthenticated(false);
            }}
          >
            <option className="dark:bg-zinc-800" value="">
              Production
            </option>
            <option className="dark:bg-zinc-800" value="-dev">
              Development
            </option>
            <option className="dark:bg-zinc-800" value="-qa">
              QA
            </option>
            <option className="dark:bg-zinc-800" value="cia-stg-1.aws.">
              Staging
            </option>
          </select>
          {/* Button Container */}
          <div className="mt-4 flex justify-between">
            <button
              className={`${
                isAuthenticated
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-yellow-600 hover:bg-yellow-700"
              } text-white px-4 py-2 rounded font-bold transition duration-300 ease-in-out transform hover:scale-105 hover:cursor-pointer`}
              onClick={() => handleLogin()}
            >
              Authenticate
            </button>
            <div>
              <button
                className="hover:cursor-pointer bg-zinc-400 px-4 py-2 rounded-sm mr-2 hover:bg-zinc-500 font-bold transition duration-300 ease-in-out transform hover:scale-105 text-white"
                onClick={() => setIsAddTokenFacilityModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={`${
                  isAuthenticated
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                } text-white px-4 py-2 rounded font-bold transition duration-300 ease-in-out transform hover:scale-105 hover:cursor-pointer`}
                onClick={() => {
                  if (isAuthenticated) {
                    setNewUserData((prevState) => ({
                      ...prevState,
                      tokens: [
                        ...(prevState.tokens || []),
                        {
                          api: api,
                          apiSecret: apiSecret,
                          client: client,
                          clientSecret: clientSecret,
                          environment: environment,
                        },
                      ],
                    }));
                    setIsAddTokenFacilityModalOpen(false);
                  }
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
