export enum Result {
  Success = "Success",
  Error = "Error",
}

export function addButtonFunctionality(
  selector: string,
  info: {
    expectedResult: Result;
    alertMessage?: string;
  },
  fn: () => Promise<any>
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
    button.addEventListener("click", async () => {
      outputElem.textContent = "…";
      matchElem.textContent = "…";
      outputElem.classList.add("waiting");
      matchElem.classList.add("waiting");
      let result = Result.Error;
      try {
        button.disabled = true;
        // if (info.alertMessage) {
        //   alert(info.alertMessage);
        // }
        await fn();
        result = Result.Success;
      } catch (e) {
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
