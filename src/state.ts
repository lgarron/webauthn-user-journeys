import { PublicKeyCredentialWithAttestationJSON } from "@github/webauthn-json";
import { Base64urlString } from "@github/webauthn-json/dist/types/base64url";

export type RegistrationLevel =
  | "security-key"
  | "trusted-device"
  | "discoverable-trusted-device"
  | "discoverable-passkey";

type DatabaseRegistration = {
  registrationLevel: RegistrationLevel;
  userName: string;
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
  expectNonEmptyAllowCredentials?: boolean;
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
  if (
    options?.expectNonEmptyAllowCredentials &&
    filteredRegistrations.length === 0
  ) {
    throw new Error("No available registrations.");
  }
  return filteredRegistrations;
}

export function clearRegistrations(): void {
  setGlobalState({ dbRegistrations: {} });
}

export function saveRegistration(
  type: RegistrationLevel,
  userName: string,
  registrationJSON: PublicKeyCredentialWithAttestationJSON
): void {
  const globalState = getGlobalState();
  globalState.dbRegistrations[registrationJSON.id] = {
    registrationLevel: type,
    userName,
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
  return keyID.slice(0, 8) + "???";
}

class UserAgentElement extends HTMLElement {
  connectedCallback() {
    this.appendChild(document.createElement("span")).textContent =
      "Current User Agent";
    this.appendChild(document.createElement("span")).textContent =
      navigator.userAgent;
  }
}

customElements.define("user-agent", UserAgentElement);

const databaseView: HTMLElement = document.querySelector("database-view");
databaseView.prepend(new UserAgentElement());
function updateDatabaseView() {
  function createTable(): HTMLTableSectionElement {
    const table = databaseView.appendChild(document.createElement("table"));
    table.innerHTML = `
<thead>
  <td>Key ID</td>
  <td>User Name</td>
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
      dbRegistration.userName;
    tr.appendChild(document.createElement("td")).textContent =
      dbRegistration.registrationLevel;
  }
}
updateDatabaseView();
