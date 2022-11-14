> **Note**
> This page is a work in progress 🙌
> We continually push updates and would love to hear feedback and questions!

# SocialConnect ("ASv2")

SocialConnect is an open source protocol to map **identifiers** (e.g. phone numbers, email addresses, twitter handles, etc.) to **account addresses** (e.g. 0xf93...8fb8), which are hard to remember and prone to typos. This lets developers design familiar  user experiences with phone numbers and other social identifiers such as:

- "_Venmo for crypto_"-style discovery and mobile payments,
- Social graph-based reputation and sybil resistance scores, and
- much more.

SocialConnect lets developers leverage their users' carefully curated contact lists and social identifiers to find each other on-chain and construct dense social graphs.

> **Warning**
> We currently only support **phone numbers**, but are working on a release of the SDK to support any string identifier (incl. email addresses, twitter handles, etc).

## Why use SocialConnect?

Contrary to ENS, Unstoppable Domains, and other _web3_ discovery protocols, SocialConnect leverages (_web2_) identifiers that users had and curated before entering web3.

<!-- TODO: Name squatting -->

SocialConnect gives developers the tools to **register** and **look up** account addresses related to social identifiers their users already know and curate in their contact list and social media accounts.

## Protocol Overview

SocialConnect has three main high-level components:

1. an SDK: `@celo/identity`
2. a privacy API: ODIS (short for "Oblivious Decentralised Identity Service"), and
3. two smart contracts: `FederatedAttestations` and `OdisPayments`

Phone number identifiers are currently derived by hashing: `{prefix}{e164_phone_number}{separator}{pepper}`; as a concrete example for a phone number `+123456789` and pepper `123abc` you hash `sha3('tel://+123456789__123abc')`.

**Register Alice’s phone number on-chain**

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201714875-c73d8417-0e0c-47b4-9b41-8529689f0607.png">

**Look up Alice’s phone number on-chain**

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201715097-124a8461-2a45-4a1f-ab2a-1781300befb0.png">

**Obfuscate Alice's phone number**



## Quickstart

In order to have interoperability between issuers and to [preserve user privacy](https://docs.celo.org/protocol/identity/odis-use-case-phone-number-privacy), phone numbers are turned into **obfuscated identifiers** before they are mapped on-chain to addresses. [ODIS](https://docs.celo.org/protocol/identity/odis) is a service that helps to perform this computation in a decentralized and privacy-preserving way.

The steps to register and lookup attestations are:

1. Install the `@celo/identity` package into your project

2. Obfuscate the identifier you want to register using the ODIS API

3. Register your obfuscated identifier on-chain

4. Lookup the address associated with the obfuscated identifier and issuer

Here are simple examples using [web3js](https://www.npmjs.com/package/web3), [@celo/contractkit](https://www.npmjs.com/package/ts-node#command-line) and [ethersjs](https://www.npmjs.com/package/ethers) (WIP ⚠️). For runnable scripts using these code examples, see the `example-scripts` directory.

<details>
<summary><b>Web3js example</b></summary>

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
<summary><b>Contractkit example</b></summary>

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
<summary><b>Ethersjs example</b></summary>

⚠️ WIP (currently working on it)
</details>

