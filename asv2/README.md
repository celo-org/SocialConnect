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

In order to have interoperability between issuers and to [preserve user privacy](https://docs.celo.org/protocol/identity/odis-use-case-phone-number-privacy), phone numbers are turned into **obfuscated identifiers** before they are mapped on-chain to addresses. [ODIS](https://docs.celo.org/protocol/identity/odis) is a service that helps to perform this computation in a decentralized and privacy-preserving way.

Code snippets

Here are simple examples using [web3js](https://www.npmjs.com/package/web3), [@celo/contractkit](https://www.npmjs.com/package/ts-node#command-line) and [ethersjs](https://www.npmjs.com/package/ethers) (WIP ⚠️).



NodeJS script you can run:

<details>
<summary><b>NodeJS</b></summary>

For runnable scripts using these code examples, see the `example-scripts` directory.

</details>

Web3js setup:

<details>
<summary><b>Code snippets</b></summary>

You will need to have created a data encryption key (DEK) and [registered](https://docs.celo.org/developer/contractkit/data-encryption-key) it to your issuer account.

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
<summary><b>Contractkit code snippets</b></summary>

Install the `@celo/contractkit` package, using version `>=2.3.0`

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

<details>
<summary><b>Ethersjs code snippets</b></summary>

⚠️ WIP (currently working on it)
</details>

## Protocol Overview

SocialConnect has three components:

1. an **SDK**: `@celo/identity`
2. a privacy **API**: ODIS (short for "Oblivious Decentralised Identity Service"), and
3. two **smart contracts**: `FederatedAttestations` and `OdisPayments`

<!-- todo: continue describing how they work together -->

### Register Alice’s phone number on-chain

<!-- Blurb -->

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201714875-c73d8417-0e0c-47b4-9b41-8529689f0607.png">

### Look up Alice’s phone number on-chain

<!-- Blurb -->

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201715097-124a8461-2a45-4a1f-ab2a-1781300befb0.png">

### Obfuscate Alice's phone number

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201716282-39e1b1b9-7a88-4e2c-8607-417ddcec2443.png">

Social identifiers are obfuscated by hashing them with a secret. This makes the on-chain mapping between Alice's phone number and her address only discoverable by those who know the relevant secret.

As a concrete example:

- **Alice's phone number**: `+1 234 567 8901`
- ODIS secret for Alice's phone number: `123abc` (illustrative only!)
- Obfuscation pattern: `sha3({prefix}{e164_phone_number}{separator}{ODIS_pepper})`
- Obfuscation example: `sha3('tel://+123456789__123abc')` = `c1fbb1429e94f4a491ee9601fb8cb9150ac3ed06e990d9449c8fba9509df3f1a`
- **Alice's obfuscated phone number**: `c1fbb1429e94f4a491ee9601fb8cb9150ac3ed06e990d9449c8fba9509df3f1a`

In short, Alice's phone number is converted into an obfuscated phone number before being mapped on-chain.

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

