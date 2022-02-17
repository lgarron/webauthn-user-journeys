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

function addButtonFunctionality(
  selector: string,
  fn: (outputElem: HTMLElement) => void
) {
  for (const button of document.querySelectorAll(
    selector
  ) as Iterable<HTMLButtonElement>) {
    const outputElem = document.createElement("output");
    button.after(outputElem);
    button.addEventListener("click", () => {
      try {
        button.disabled = true;
        outputElem.classList.add("spinner");
        outputElem.textContent = "";
        fn(outputElem);
      } finally {
        button.disabled = false;
        outputElem.classList.remove("spinner");
      }
    });
  }
}

addButtonFunctionality(".clear-registrations", (outputElem: HTMLElement) => {
  try {
    clearRegistrations();
    outputElem.textContent = "✅ Cleared!";
  } catch (e) {
    outputElem.textContent = "❌ Failed to clear.";
    throw e;
  }
});

addButtonFunctionality(
  ".register-security-key",
  async (outputElem: HTMLElement) => {
    try {
      await registerSecurityKey();
      outputElem.textContent = "Registration succeeded.";
    } catch (e) {
      outputElem.textContent = "Registration failed.";
      throw e;
    }
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
