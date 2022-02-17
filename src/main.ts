import { Base64urlString } from "@github/webauthn-json/dist/types/base64url";
import {
  create,
  get,
  bufferToBase64url,
  type PublicKeyCredentialWithAssertionJSON,
  type CredentialCreationOptionsJSON,
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
  const cco: CredentialCreationOptionsJSON = {
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
  };
  console.log("create", cco);
  const registration = await create(cco);
  saveRegistration("security-key", registration);
}

async function auth(
  options?: Parameters<typeof getRegistrations>[0]
): Promise<PublicKeyCredentialWithAssertionJSON> {
  return await get({
    publicKey: {
      challenge: randomBase64urlBytes(),
      allowCredentials: getRegistrations(options),
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
  }
);

addButtonFunctionality(
  ".register-security-key",
  { expectedResult: Result.Success },
  registerSecurityKey
);

addButtonFunctionality(
  ".auth-any-registration",
  { expectedResult: Result.Success },
  auth
);

addButtonFunctionality(
  ".auth-trusted-device",
  { expectedResult: Result.Success },
  async () => {
    await auth({ registrationLevel: "trusted-device" });
  }
);

addButtonFunctionality(
  ".register-trusted-device",
  { expectedResult: Result.InvalidStateError },
  registerTrustedDevice
);

let identifiedRegistration: PublicKeyCredentialWithAssertionJSON | null = null;

addButtonFunctionality(
  ".identify-existing-registration",
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
