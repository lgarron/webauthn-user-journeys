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

const ALL_CURRENT_PUBLIC_KEY_CRED_PARAMS: PublicKeyCredentialParameters[] = [
  { type: "public-key", alg: -7 },
  { type: "public-key", alg: -257 },
];

async function registerTrustedDevice(options?: {
  doNotExcludeKeyIds?: Base64urlString[];
  requireResidentKey?: boolean;
  discoverablePasskey?: boolean;
  userID?: Base64urlString;
  pubKeyCredParamsEmptyList?: boolean;
}) {
  console.log("register!");
  const userName =
    "test_user" + (options?.userID ? "_" + truncateID(options.userID) : "");
  const cco: CredentialCreationOptionsJSON = {
    publicKey: {
      // <boilerplate>
      challenge: randomBase64urlBytes(),
      rp: { name: "Localhost, Inc." },
      user: {
        id: options?.userID ?? randomBase64urlBytes(),
        name: userName,
        displayName:
          "Test User" +
          (options?.userID ? " " + truncateID(options.userID) : ""),
      },
      pubKeyCredParams: options?.pubKeyCredParamsEmptyList
        ? []
        : ALL_CURRENT_PUBLIC_KEY_CRED_PARAMS,
      excludeCredentials: getRegistrations({
        ...options,
        forRegistration: true,
      }),
      // </boilerplate>
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
    },
  };
  console.log(cco);
  if (options?.requireResidentKey || options?.discoverablePasskey) {
    cco.publicKey.authenticatorSelection.requireResidentKey = true;
  }
  const registration = await create(cco);
  saveRegistration(
    options?.discoverablePasskey
      ? "discoverable-passkey"
      : options?.requireResidentKey
      ? "discoverable-trusted-device"
      : "trusted-device",
    userName,
    registration
  );
  return registration;
}

async function registerSecurityKey(options?: {
  doNotExcludeKeyIds?: Base64urlString[];
  pubKeyCredParamsEmptyList?: boolean;
}) {
  const userName = "test_user";
  const cco: CredentialCreationOptionsJSON = {
    publicKey: {
      // <boilerplate>
      challenge: randomBase64urlBytes(),
      rp: { name: "Localhost, Inc." },
      user: {
        id: randomBase64urlBytes(),
        name: userName,
        displayName: "Test User",
      },
      pubKeyCredParams: options?.pubKeyCredParamsEmptyList
        ? []
        : ALL_CURRENT_PUBLIC_KEY_CRED_PARAMS,
      excludeCredentials: getRegistrations(options),
      // </boilerplate>
      authenticatorSelection: {
        userVerification: "discouraged",
      },
    },
  };
  console.log("Request for navigator.credentials.create", cco);
  const registration = await create(cco);
  saveRegistration("security-key", userName, registration);
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
  ".auth-discoverable-passkey-passwordless",
  { expectedResult: Result.Success },
  async () => {
    const result = await auth({ emptyAllowCredentials: true });
    console.log({ result });
    if (result.id !== expectedDiscoverablePasskeyRegistration.id) {
      throw new Error("not the same registration!");
    }
    return result;
  }
);

addButtonFunctionality(
  ".auth-discoverable-passkey",
  { expectedResult: Result.Success },
  async () => {
    return auth({ registrationLevel: "discoverable-passkey" });
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

const discoverablePasskeyUserID = "DISCOVERABLE_PASSKEY_USER_";

addButtonFunctionality(
  ".register-duplicate-discoverable-passkey",
  { expectedResult: Result.InvalidStateError },
  () => {
    return registerTrustedDevice({
      discoverablePasskey: true,
      pubKeyCredParamsEmptyList: true,
      userID: discoverablePasskeyUserID,
    });
  }
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

let expectedDiscoverablePasskeyRegistration: PublicKeyCredentialWithAttestationJSON | null =
  null;

addButtonFunctionality(
  ".register-discoverable-passkey-with-identified-exception",
  { expectedResult: Result.Success },
  async () => {
    expectedDiscoverablePasskeyRegistration = await registerTrustedDevice({
      doNotExcludeKeyIds: [identifiedRegistration.id],
      discoverablePasskey: true,
      pubKeyCredParamsEmptyList: true,
      userID: discoverablePasskeyUserID,
    });
    removeRegistration(identifiedRegistration.id);
    return `Removed ID: ${truncateID(identifiedRegistration.id)}
Registered ID: ${truncateID(expectedDiscoverablePasskeyRegistration.id)}`;
  }
);

let expectedDiscoverableRegistration: PublicKeyCredentialWithAttestationJSON | null =
  null;

addButtonFunctionality(
  ".register-discoverable-uvpa",
  { expectedResult: Result.Success },
  async () => {
    const userID = "HARDCODED_ID";
    expectedDiscoverableRegistration = await registerTrustedDevice({
      requireResidentKey: true,
      userID,
    });
    return `ID: ${truncateID(expectedDiscoverableRegistration.id)}
User UUID: ${userID}
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

addButtonFunctionality(
  ".register-pubKeyCredParams-empty-list",
  { expectedResult: Result.Success },
  async () => {
    await registerSecurityKey({ pubKeyCredParamsEmptyList: true });
  }
);
