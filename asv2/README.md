> **Note**
> This page is a draft and work in progress 🙌
> We continually push updates and would love to hear feedback and questions!

# SocialConnect ("ASv2")

SocialConnect is an open source protocol to map **identifiers** (e.g. phone numbers, email addresses, twitter handles, etc.) to **account addresses** (e.g. `0xf93...8fb8`), which are hard to remember and prone to typos. 

This lets developers design familiar  user experiences with phone numbers and other social identifiers such as:

- "_Venmo for crypto_"-style mobile payments and web3 discovery,
- Social graph-based reputation and sybil resistance scores, and
- much more.

SocialConnect lets developers leverage their users' carefully curated contact lists and social identifiers to find each other on-chain and construct dense social graphs.

> **Warning**
> We currently only support **phone numbers**, but are working on a release of the SDK to support any string identifier (incl. email addresses, twitter handles, etc).

## Why use SocialConnect?

Contrary to ENS, Unstoppable Domains, and other _web3_ discovery protocols, SocialConnect leverages (_web2_) identifiers that users already have and carefully curate in their day-to-day lives.

<!-- TODO: Name squatting -->

SocialConnect gives developers the tools to **register** and **look up** account addresses related to social identifiers their users already know and curate in their contact list and social media accounts.


## Quickstart

Follow these steps to **register** and **look up** attestations:

1. Install the `@celo/identity` package into your project

2. **Obfuscate** and identifier using the ODIS API (e.g. `+1 415-987-6543` becomes `jasdogu89dfhg...`)

3. **Register** an obfuscated identifier and associated address in the FederatedAttestations smart contract (e.g. `jasdogu89dfhg...` and `0xf93...8fb8`)

4. **Look up** an obfuscated identifier in the FederatedAttestations smart contract to find its associated address (`jasdogu89dfhg...` maps to `0xf93...8fb8`)

Read more about why [obfuscating identifiers](#obfuscate-alices-phone-number) matters below.


Code snippets

Here are simple examples using , [@celo/contractkit](https://www.npmjs.com/package/ts-node#command-line) and [ethersjs](https://www.npmjs.com/package/ethers) (WIP ⚠️).

### 1. Code snippets (short examples)

<details>

<summary><b>Using ethersjs</b></summary>

You will need to have created a data encryption key (DEK) and [registered](https://docs.celo.org/developer/contractkit/data-encryption-key) it to your issuer account.

See example NodeJS implementation for more details: [example-scripts/registerAttestation-ethers.ts](example-scripts/registerAttestation-ethers.ts)

```typescript
import { OdisUtils } from '@celo/identity'
import {
    AuthenticationMethod,
    AuthSigner,
} from "@celo/identity/lib/odis/query";
import { ethers, Wallet } from "ethers";

let phoneNumber, account, attestationIssuedTime, DEK_PRIVATE_KEY

const provider = new ethers.providers.JsonRpcProvider(ALFAJORES_RPC);
const wallet = new Wallet(ISSUER_PRIVATE_KEY, provider);

const authSigner: AuthSigner = {
    authenticationMethod: AuthenticationMethod.ENCRYPTION_KEY,
    rawKey: DEK_PRIVATE_KEY,
};

const accountsContract = new ethers.Contract(
    ACCOUNTS_PROXY_ADDRESS,
    ACCOUNTS_CONTRACT.abi,
    wallet
);
const federatedAttestationsContract = new ethers.Contract(
    FA_PROXY_ADDRESS,
    FA_CONTRACT.abi,
    wallet
);
const odisPaymentsContract = new ethers.Contract(
    ODIS_PAYMENTS_PROXY_ADDRESS,
    ODIS_PAYMENTS_CONTRACT.abi,
    wallet
);

accountsContract.setAccountDataEncryptionKey(DEK_PUBLIC_KEY);

const identifier = (
    await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
        phoneNumber,
        wallet.address,
        authSigner,
        OdisUtils.Query.getServiceContext("alfajores")
    )
).phoneHash;

await federatedAttestationsContract.registerAttestationAsIssuer(
    identifier,
    account,
    attestationIssuedTime
);

const attestations =
    await federatedAttestationsContract.lookupAttestations(identifier, [
        wallet.address,
    ]);
```

</details>

<details>

<summary><b>Using web3js</b></summary>

You will need to have created a data encryption key (DEK) and [registered](https://docs.celo.org/developer/contractkit/data-encryption-key) it to your issuer account.

See example NodeJS implementation for more details: [example-scripts/registerAttestation-web3.ts](example-scripts/registerAttestation-web3.ts)

```typescript
import { OdisUtils } from '@celo/identity'

// initialize variables accordingly
let issuer, phoneNumber, account, attestationIssuedTime, DEK_PRIVATE_KEY, federatedAttestationsContract

// get identifier from phone number
const authSigner = {
    authenticationMethod: OdisUtils.Query.AuthenticationMethod.ENCRYPTION_KEY,
    rawKey: DEK_PRIVATE_KEY
}
const identifier = (await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
  phoneNumber,
  issuer.address,
  authSigner,
  OdisUtils.Query.getServiceContext('alfajores')
)).phoneHash

// upload identifier <-> address mapping to onchain registry
await federatedAttestationsContract.methods
  .registerAttestationAsIssuer(
      identifier,
      account,
      attestationIssuedTime
  )
  .send({from: this.issuer.address, gas: 50000});

// lookup accounts mapped to the given phone number
const attestations = await federatedAttestationsContract.methods
  .lookupAttestations(identifier, [this.issuer.address])
  .call();
console.log(attestations.accounts)
```

</details>

<details>

<summary><b>Using @celo/contractkit</b></summary>

Install the `@celo/contractkit` package, using version `>=2.3.0`

See example NodeJS implementation for more details:  [example-scripts/registerAttestation-contractKit.ts](example-scripts/registerAttestation-contractKit.ts)

```typescript
import { OdisUtils } from '@celo/identity'

// initialize variables
let kit, issuer, phoneNumber, account, attestationIssuedTime
const federatedAttestationsContract = await kit.contracts.getFederatedAttestations();

// get identifier from phone number
const authSigner = {
  authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
  contractKit: kit,
};
const identifier = (await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
  phoneNumber,
  issuer.address,
  authSigner,
  OdisUtils.Query.getServiceContext('alfajores')
)).phoneHash

// upload identifier <-> address mapping to onchain registry
await federatedAttestationsContract
  .registerAttestationAsIssuer(identifier, account, attestationIssuedTime)
  .send();

// lookup accounts mapped to the given phone number
const attestations = await federatedAttestationsContract.lookupAttestations(
  identifier,
  [issuer.address]
);
console.log(attestations.accounts)
```

</details>

### 2. NodeJS implementation (long examples)

Take a look at the implementations in the **example-scripts** folder:

- [example-scripts/registerAttestation-ethers.ts](example-scripts/registerAttestation-ethers.ts)
- [example-scripts/registerAttestation-web3.ts](example-scripts/registerAttestation-web3.ts)
- [example-scripts/registerAttestation-contractKit.ts](example-scripts/registerAttestation-contractKit.ts)

## Protocol Overview

SocialConnect has three components:

1. an **SDK**: `@celo/identity`
2. a privacy **API**: ODIS (short for "Oblivious Decentralised Identity Service"), and
3. two **smart contracts**: `FederatedAttestations` and `OdisPayments`

<!-- todo: continue describing how they work together -->

### Obfuscate Alice's phone number

Identifiers are obfuscated by hashing them with a secret. This matters because we want to avoid that anyone can discover the mapping between a plaintext identifier and an address. However, if every developer simply obfuscated identifiers their own way, we wouldn't be able to read each others identifier to address mappings. This where [ODIS](https://docs.celo.org/protocol/identity/odis) comes into play.

[ODIS](https://docs.celo.org/protocol/identity/odis) provides:

1. [privacy for end-users](https://docs.celo.org/protocol/identity/odis-use-case-phone-number-privacy), and
2. interoperability between developers.

All that while being decentralized and privacy-preserving.

Here is a concrete example:

- **Alice's phone number**: `+1 234 567 8901`
- The ODIS secret for Alice's phone number: `123abc` (illustrative only!)
- The obfuscation pattern: `sha3({prefix}{e164_phone_number}{separator}{ODIS_pepper})`
- The actual obfuscation: `sha3('tel://+123456789__123abc')` = `c1fbb1429e94f4a491ee9601fb8cb9150ac3ed06e990d9449c8fba9509df3f1a`
- **Alice's obfuscated phone number**: `c1fbb1429e94f4a491ee9601fb8cb9150ac3ed06e990d9449c8fba9509df3f1a`


| In short, Alice's phone number is converted into an obfuscated phone number before being mapped on-chain. |
|---|

> **Warning**
> We currently only support **phone numbers**. The obfuscation pattern for any other identifier is not finalised and only illustrative at this stage ⚠️

| Identifiers | Obfuscation patterns  | Obfuscation examples |
|------|--------|--------|
| **Phone numbers** | `sha3({prefix}{e164_phone_number}{separator}{ODIS_pepper})` | `sha3(tel://+123456789__123abc)` = c1fbb1429e94...a9509df3f1a |
| **Twitter accounts** | `sha3({prefix}{twitter_handle}{separator}{ODIS_pepper})`  | `sha3(twitter://@CeloOrg__456def)` = 96fdf5e45259f7...760502dba1709 |
| **Email addresses** | `sha3({prefix}{email_address}{separator}{ODIS_pepper})` | `sha3(email://hello@celo.org__789ghi)` = 4b2b6074417fe4d6...2cc6b16aa8c |
| **Reddit accounts** | `sha3({prefix}{reddit_handle}{separator}{ODIS_pepper})` | `sha3(reddit://@celoorg__321jkl)` = bb29224bc50afb46d20...bdfdcb9831abb |
| **Keybase accounts** | `sha3({prefix}{keybase_handle}{separator}{ODIS_pepper})` | `sha3(keybase://@celoorg__759mno)` = ccee4144e17dcac2f...f17ba805032974 |
| **More** | ... | ... |

You can [visualise sha3 hashes online here](https://emn178.github.io/online-tools/sha3_256.html) if you prefer learning by doing.

Here is a visual overview:

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201716282-39e1b1b9-7a88-4e2c-8607-417ddcec2443.png">

### Register Alice’s phone number on-chain

<!-- Blurb -->

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201714875-c73d8417-0e0c-47b4-9b41-8529689f0607.png">

### Look up Alice’s phone number on-chain

<!-- Blurb -->

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201715097-124a8461-2a45-4a1f-ab2a-1781300befb0.png">


