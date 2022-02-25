import { Base64urlString } from "@github/webauthn-json/dist/types/base64url";
import {
  bufferToBase64url,
  create,
  get,
  type CredentialCreationOptionsJSON,
  type CredentialRequestOptionsJSON,
  type PublicKeyCredentialWithAssertionJSON,
  type PublicKeyCredentialWithAttestationJSON,
} from "@github/webauthn-json/extended";
import { addButtonFunctionality, Result } from "./results";
import {
  clearRegistrations,
  getRegistrations,
  removeRegistration,
  saveRegistration,
  truncateID,
} from "./state";

function randomBase64urlBytes(n: number = 32): string {
  return bufferToBase64url(crypto.getRandomValues(new Uint8Array(n)));
}

async function registerTrustedDevice(options?: {
  doNotExcludeKeyIds?: Base64urlString[];
  requireResidentKey?: boolean;
  userUUID?: string;
}) {
  const cco: CredentialCreationOptionsJSON = {
    publicKey: {
      // <boilerplate>
      challenge: randomBase64urlBytes(),
      rp: { name: "Localhost, Inc." },
      user: {
        id: randomBase64urlBytes(),
        name: "test_user" + (options?.userUUID ? " " + options.userUUID : ""),
        displayName:
          "Test User" + (options?.userUUID ? " " + options.userUUID : ""),
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      excludeCredentials: getRegistrations(options),
      // </boilerplate>
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
    },
  };
  if (options?.requireResidentKey) {
    cco.publicKey.authenticatorSelection.requireResidentKey = true;
  }
  const registration = await create(cco);
  saveRegistration(
    options?.requireResidentKey
      ? "discoverable-trusted-device"
      : "trusted-device",
    registration
  );
  return registration;
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
  console.log("Request for navigator.credentials.create", cco);
  const registration = await create(cco);
  saveRegistration("security-key", registration);
  return registration;
}

async function auth(
  options?: Parameters<typeof getRegistrations>[0]
): Promise<PublicKeyCredentialWithAssertionJSON> {
  const cro: CredentialRequestOptionsJSON = {
    publicKey: {
      challenge: randomBase64urlBytes(),
      allowCredentials: getRegistrations(options),
      userVerification: "discouraged",
    },
  };
  console.log("Request for navigator.credentials.get", cro);
  return await get(cro);
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
    return auth({ registrationLevel: "trusted-device" });
  }
);

addButtonFunctionality(
  ".register-trusted-device",
  { expectedResult: Result.Success },
  registerTrustedDevice
);

addButtonFunctionality(
  ".register-duplicate-trusted-device",
  { expectedResult: Result.InvalidStateError },
  registerTrustedDevice
);

let identifiedRegistration: PublicKeyCredentialWithAssertionJSON | null = null;

addButtonFunctionality(
  ".identify-existing-registration",
  { expectedResult: Result.Success },
  async () => {
    identifiedRegistration = await auth();
    return identifiedRegistration;
  }
);

addButtonFunctionality(
  ".register-trusted-device-with-identified-exception",
  { expectedResult: Result.Success },
  async () => {
    const newRegistration = await registerTrustedDevice({
      doNotExcludeKeyIds: [identifiedRegistration.id],
    });
    removeRegistration(identifiedRegistration.id);
    return `Removed ID: ${truncateID(identifiedRegistration.id)}
Registered ID: ${truncateID(newRegistration.id)}`;
  }
);

let expectedDiscoverableRegistration: PublicKeyCredentialWithAttestationJSON | null =
  null;

addButtonFunctionality(
  ".register-discoverable-uvpa",
  { expectedResult: Result.Success },
  async () => {
    const uuid = (crypto as any as { randomUUID: () => string })
      .randomUUID()
      .slice(0, 6);
    expectedDiscoverableRegistration = await registerTrustedDevice({
      requireResidentKey: true,
      userUUID: uuid,
    });
    return `ID: ${truncateID(expectedDiscoverableRegistration.id)}
User UUID: ${uuid}
`;
  }
);

addButtonFunctionality(
  ".auth-empty-allow-credentials",
  { expectedResult: Result.Success },
  async () => {
    const result = await auth({ emptyAllowCredentials: true });
    if (result.id !== expectedDiscoverableRegistration.id) {
      throw new Error("not the same registration!");
    }
    return result;
  }
);
