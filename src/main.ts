import { Base64urlString } from "@github/webauthn-json/dist/types/base64url";
import {
  create,
  get,
  bufferToBase64url,
  type PublicKeyCredentialWithAssertionJSON,
} from "@github/webauthn-json/extended";
import { addButtonFunctionality, Result } from "./results";
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
  registerSecurityKey
);

addButtonFunctionality(
  ".register-UVPA-security-key",
  {
    expectedResult: Result.Success,
    alertMessage:
      "In the following prompt, please make sure register a UVPA (e.g. Touch ID, Windows Hello), and use the same one for all subsequent prompts.",
  },
  registerSecurityKey
);

addButtonFunctionality(
  ".auth-any-registration",
  { expectedResult: Result.Success },
  auth
);

addButtonFunctionality(
  ".register-trusted-device",
  { expectedResult: Result.Error },
  registerTrustedDevice
);

let identifiedRegistration: PublicKeyCredentialWithAssertionJSON | null = null;

addButtonFunctionality(
  ".identify-existing-security-key-registration",
  { expectedResult: Result.Success },
  async () => {
    const received = await auth();
    identifiedRegistration = received;
  }
);

addButtonFunctionality(
  ".register-trusted-device-with-identified-exception",
  { expectedResult: Result.Success },
  async () => {
    await registerTrustedDevice({
      doNotExcludeKeyIds: [identifiedRegistration.id],
    });
    removeRegistration(identifiedRegistration.id);
  }
);
