import { Base64urlString } from "@github/webauthn-json/dist/types/base64url";
import {
  create,
  get,
  bufferToBase64url,
  type PublicKeyCredentialWithAssertionJSON,
} from "@github/webauthn-json/extended";
import {
  clearRegistrations,
  getRegistrations,
  removeRegistration,
  saveRegistration,
} from "./state";

function randomBase64urlBytes(n: number = 32): string {
  return bufferToBase64url(crypto.getRandomValues(new Uint8Array(n)));
}

async function registerTrustedDevice(options?: {
  doNotExcludeKeyIds?: Base64urlString[];
}) {
  const registration = await create({
    publicKey: {
      // <boilerplate>
      challenge: randomBase64urlBytes(),
      rp: { name: "Localhost, Inc." },
      user: {
        id: randomBase64urlBytes(),
        name: "test_user",
        displayName: "Test User",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      excludeCredentials: getRegistrations(options),
      // </boilerplate>
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
    },
  });
  saveRegistration("trusted-device", registration);
}

async function registerSecurityKey(options?: {
  doNotExcludeKeyIds?: Base64urlString[];
}) {
  const registration = await create({
    publicKey: {
      // <boilerplate>
      challenge: randomBase64urlBytes(),
      rp: { name: "Localhost, Inc." },
      user: {
        id: randomBase64urlBytes(),
        name: "test_user",
        displayName: "Test User",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      excludeCredentials: getRegistrations(options),
      // </boilerplate>
      authenticatorSelection: {
        userVerification: "discouraged",
      },
    },
  });
  saveRegistration("security-key", registration);
}

async function auth(): Promise<PublicKeyCredentialWithAssertionJSON> {
  return await get({
    publicKey: {
      challenge: randomBase64urlBytes(),
      allowCredentials: getRegistrations(),
      userVerification: "discouraged",
    },
  });
}

enum Result {
  Success = "Success",
  Error = "Error",
}

function addButtonFunctionality(
  selector: string,
  info: {
    expectedResult: Result;
  },
  fn: () => Promise<void>
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
        await fn();
        result = Result.Success;
      } finally {
        button.disabled = false;
      }
      // outputElem.classList.remove("waiting");
      // matchElem.classList.remove("waiting");
      outputElem.textContent = result;
      matchElem.textContent = result === info.expectedResult ? "✅" : "❌";
    });
  }
}

addButtonFunctionality(
  ".clear-registrations",
  {
    expectedResult: Result.Success,
  },
  async () => {
    clearRegistrations();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
);

addButtonFunctionality(
  ".register-security-key",
  { expectedResult: Result.Success },
  async () => {
    await registerSecurityKey();
  }
);

for (const button of document.querySelectorAll(".auth-any-registration")) {
  button.addEventListener("click", () => {
    auth();
  });
}

let identifiedRegistration: PublicKeyCredentialWithAssertionJSON | null = null;

for (const button of document.querySelectorAll(
  ".identify-existing-security-key-registration"
)) {
  button.addEventListener("click", async () => {
    const received = await auth();
    identifiedRegistration = received;
  });
}

for (const button of document.querySelectorAll(
  ".register-trusted-device-with-identified-exception"
)) {
  button.addEventListener("click", async () => {
    await registerTrustedDevice({
      doNotExcludeKeyIds: [identifiedRegistration.id],
    });
    removeRegistration(identifiedRegistration.id);
  });
}
