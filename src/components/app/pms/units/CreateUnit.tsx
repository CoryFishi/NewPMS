import axios from "axios";
import toast from "react-hot-toast";
import { useState } from "react";
import { IoIosCreate } from "react-icons/io";
import { useAuth } from "@context/AuthProvider";
import { addEvent } from "@hooks/supabase";
import { buildApiUrl, authHeaders } from "@hooks/opentech";
import ModalButton from "@components/ui/ModalButton";
import ModalContainer from "@components/ui/ModalContainer";
import InputBox from "@components/ui/InputBox";

export default function CreateUnit({ setIsUnitModalOpen, setUnits }) {
  // Store the unit number to be created
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const { user, currentFacility } = useAuth();

  // API call handler to create the new unit
  const handleCreateUnit = async () => {
    if (!newUnitNumber) {
      setIsUnitModalOpen(false);
      return;
    }
    const unitNumbersArray = newUnitNumber.split(",").flatMap((unit) => {
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

        return [unit]; // fallback
      }

      return [unit];
    });

    unitNumbersArray.map(async (unitNumber) => {
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
      try {
        toast.promise(
          axios(config)
            .then(function (response) {
              setUnits((prevUnits) => {
                const updatedUnits = [...prevUnits, response.data];
                // Sort unit array by unitNumber before returning
                return updatedUnits.sort((a, b) => {
                  if (a.unitNumber < b.unitNumber) return -1;
                  if (a.unitNumber > b.unitNumber) return 1;
                  return 0;
                });
              });
            })
            .catch(function (error) {
              throw error;
            }),
          {
            loading: `Creating unit ${unitNumber}...`,
            success: <b>Unit {unitNumber} created successfully!</b>,
            error: <b>Failed to create unit {unitNumber}.</b>,
          }
        );
        if (unitNumbersArray.length <= 1) {
          await addEvent(
            "Create Unit",
            `${user.email} created unit ${unitNumber} at ${currentFacility.name}, facility id ${currentFacility.id}`,
            true
          );
        }
      } catch (error) {
        console.error("Error creating unit:", error);
      }
    });
    if (unitNumbersArray.length > 1) {
      await addEvent(
        "Create Unit",
        `${user.email} created unit ${newUnitNumber} at ${currentFacility.name}, ${currentFacility.id}`,
        true
      );
    }
    setIsUnitModalOpen(false);
    setNewUnitNumber("");
  };

  return (
    <ModalContainer
      title={"Create Unit(s)"}
      icon={<IoIosCreate />}
      mainContent={
        <div className="flex flex-col pt-3">
          {/* Unit Number Input */}
          <InputBox
            type="text"
            value={newUnitNumber}
            onchange={(e) => setNewUnitNumber(e.target.value)}
            placeholder="Unit Number(s)"
          />
          <p className="text-wrap text-xs text-red-400 mt-1">
            Multiple Units can be created by sperating each unit by a comma or
            <br />
            by adding a hyphen to create a range of units. <br />
            Example: 1001,1002,A001-A050 <br />
          </p>
        </div>
      }
      responseContent={
        <div className="flex justify-end">
          <ModalButton
            onclick={() => setIsUnitModalOpen(false)}
            text="Cancel"
          />
          <ModalButton
            onclick={handleCreateUnit}
            text="Save"
            className={"bg-green-500 hover:bg-green-600"}
          />
        </div>
      }
      onClose={() => setIsUnitModalOpen(false)}
    />
  );
}
