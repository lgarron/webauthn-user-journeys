import { Base64urlString } from "@github/webauthn-json/dist/types/base64url";
import { truncateID } from "./state";

export enum Result {
  Unknown = "Unknown",
  InvalidStateError = "InvalidStateError",
  Success = "Success",
}

export function addButtonFunctionality(
  selector: string,
  info: {
    expectedResult: Result;
  },
  fn: () => Promise<string | { id: Base64urlString } | void>
) {
  for (const button of document.querySelectorAll(
    selector
  ) as Iterable<HTMLButtonElement>) {
    function addTD() {
      const td = button.parentElement.parentElement.appendChild(
        document.createElement("td")
      );
      td.textContent = "…";
      return td;
    }
    addTD().textContent = info.expectedResult;
    const outputElem = addTD();
    const matchElem = addTD();
    const infoElem = addTD();
    infoElem.classList.add("pre");
    button.addEventListener("click", async () => {
      outputElem.textContent = "…";
      matchElem.textContent = "…";
      outputElem.classList.add("waiting");
      matchElem.classList.add("waiting");
      let result = Result.Unknown;
      try {
        button.disabled = true;
        const returnValue = await fn();
        result = Result.Success;
        if (typeof returnValue === "string") {
          infoElem.textContent = returnValue;
        } else if (returnValue && returnValue.id) {
          infoElem.textContent = "Key ID: " + truncateID(returnValue.id);
        } else {
          infoElem.textContent = "N/A";
        }
      } catch (e) {
        result = e.name;
        console.error(e);
        infoElem.textContent = "";
        const button = infoElem.appendChild(document.createElement("button"));
        button.textContent = "Show error text";
        button.addEventListener("click", () => alert(e));
        infoElem.appendChild(document.createElement("br"));
        infoElem.append("(or open the console)");
      } finally {
        button.disabled = false;
      }
      outputElem.classList.remove("waiting");
      matchElem.classList.remove("waiting");
      outputElem.textContent = result;
      matchElem.textContent = result === info.expectedResult ? "✅" : "❌";
    });
  }
}
