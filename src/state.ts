import { PublicKeyCredentialWithAttestationJSON } from "@github/webauthn-json";
import { Base64urlString } from "@github/webauthn-json/dist/types/base64url";

export type RegistrationLevel =
  | "security-key"
  | "trusted-device"
  | "discoverable-trusted-device";

type DatabaseRegistration = {
  registrationLevel: RegistrationLevel;
  json: PublicKeyCredentialWithAttestationJSON;
};

type DatabaseRegistrations = { [key: Base64urlString]: DatabaseRegistration };

type GlobalState = {
  dbRegistrations: DatabaseRegistrations;
};

export function getGlobalState(): GlobalState {
  const globalState: Partial<GlobalState> = JSON.parse(
    localStorage.webauthnExampleRegistrations || "{}"
  );
  globalState.dbRegistrations ??= {};
  return globalState as GlobalState;
}

function setGlobalState(globalState: GlobalState): void {
  localStorage.webauthnExampleRegistrations = JSON.stringify(
    globalState,
    null,
    "  "
  );
  updateDatabaseView();
}

export function getRegistrations(options?: {
  emptyAllowCredentials?: boolean;
  registrationLevel?: RegistrationLevel;
  doNotExcludeKeyIds?: Base64urlString[];
}): PublicKeyCredentialWithAttestationJSON[] {
  const filteredRegistrations: PublicKeyCredentialWithAttestationJSON[] = [];
  if (!options?.emptyAllowCredentials) {
    const dbRegistrations = getGlobalState()["dbRegistrations"];
    for (const dbRegistration of Object.values(dbRegistrations)) {
      if (
        options?.registrationLevel &&
        dbRegistration.registrationLevel !== options.registrationLevel
      ) {
        continue;
      }
      if (!options?.doNotExcludeKeyIds?.includes(dbRegistration.json.id)) {
        filteredRegistrations.push(dbRegistration.json);
      }
    }
  }
  return filteredRegistrations;
}

export function clearRegistrations(): void {
  setGlobalState({ dbRegistrations: {} });
}

export function saveRegistration(
  type: RegistrationLevel,
  registrationJSON: PublicKeyCredentialWithAttestationJSON
): void {
  const globalState = getGlobalState();
  globalState.dbRegistrations[registrationJSON.id] = {
    registrationLevel: type,
    json: registrationJSON,
  };
  setGlobalState(globalState);
}

export function removeRegistration(keyId: Base64urlString): void {
  const globalState = getGlobalState();
  delete globalState.dbRegistrations[keyId];
  setGlobalState(globalState);
}

export function truncateID(keyID: Base64urlString): string {
  return keyID.slice(0, 8) + "…";
}

const databaseView: HTMLElement = document.querySelector("database-view");
function updateDatabaseView() {
  function createTable(): HTMLTableSectionElement {
    const table = databaseView.appendChild(document.createElement("table"));
    table.innerHTML = `
<thead>
  <td>Key ID</td>
  <td>Registration Level</td>
</thead>
<tbody>
</tbody>
`;
    return table.querySelector("tbody");
  }
  const tbody = databaseView.querySelector("tbody") ?? createTable();
  tbody.textContent = "";
  for (const dbRegistration of Object.values(
    getGlobalState().dbRegistrations
  )) {
    const tr = tbody.appendChild(document.createElement("tr"));
    tr.appendChild(document.createElement("td")).textContent = truncateID(
      dbRegistration.json.id
    );
    tr.appendChild(document.createElement("td")).textContent =
      dbRegistration.registrationLevel;
  }
}
updateDatabaseView();
