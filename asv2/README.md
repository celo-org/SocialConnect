# SocialConnect ("ASv2")

> **Note**
> This page is a work in progress 🙌
> We continually push updates and would love to hear feedback and questions!

SocialConnect is an open source protocol for creating attestations mapping **off-chain identifiers** (phone numbers, email addresses, twitter handles, etc.) to **account addresses**.

> We temporarily only support phone numbers (we're working on the SDK and documentation to support all identifier types)

The protocol leverages issuers to steward the creation and maintenance of attestations. Issuers have the freedom to choose the process they use to verify the user's ownership of their phone number, and each attestation stored on-chain is associated with the issuer who registered it. Looking up an attestation then involves choosing the issuer(s) that we trust.


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
