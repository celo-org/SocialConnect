
# SocialConnect Beta

> **Note**
> This page is a draft 🙌 We continually push updates and would love to hear feedback and questions!

## 👋 Getting started

SocialConnect is an open source protocol that makes sending crypto payments as easy as sending text messages.

SocialConnect allows developers map **identifiers** (such as phone numbers, email address, etc...) to **public addresses** (e.g. `0xf93...8fb8`), which are hard to remember and prone to typos. This enables a convenient payment experience without having to first request a recipient's public address.

Here is a short demo payment from [Kaala](https://kaala.app/) to [Libera](https://medium.com/impactmarket/ready-to-unlock-your-potential-meet-libera-your-new-crypto-wallet-d1053f917b95) using only a phone number:

[<img width="800" alt="image" src="https://user-images.githubusercontent.com/46296830/207285114-6ef73be4-10f2-4afc-a066-811e1f3e1042.png">](https://www.loom.com/share/8afddd73ba324ec18aeb63fc96d568f9)


## 🧑‍💻 Quickstart

Follow these steps to **register** and **look up** identifiers:

1. **Install** the [`@celo/identity`](https://www.npmjs.com/package/@celo/identity) package into your project.

2. **Convert** an end-user's plaintext identifier (`+1 415-987-6543`) into an obfuscated identifier (`jasdogu89dfhg...`) using the privacy API.

3. **Register** an end-user's obfuscated identifier (`jasdogu89dfhg...`) and public address (`0xf93...8fb8`) on-chain in the FederatedAttestations contract

4. **Look up** an end-user's public address (`0xf93...8fb8`) on-chain by searching for their obfuscated identifier (`jasdogu89dfhg...`) in the FederatedAttestations contract.

> **Warning**
> We currently only support **phone numbers**, but are adding support for arbitrary identifiers (incl. email addresses, twitter handles, etc).

## 🚀 Demos

### Short code snippets

<details>

<summary><b>Register and look up with ethersjs</b></summary>

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

<summary><b>Register and look up with web3js</b></summary>

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

<summary><b>Register and look up with @celo/contractkit</b></summary>

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

### Longer examples

If you are interested in a working [NodeJS](https://nodejs.org/en/) example take a look at the scripts in the [example-scripts](example-scripts/) folder.

If you'd like to see a minimal demo app using [NextJS](https://nextjs.org/), take a look at the implementation in the [emisianto](https://github.com/isabellewei/emisianto) repository, which is currently hosted at [emisianto.vercel.app](https://emisianto.vercel.app/).

<img width="500" alt="image" src="https://user-images.githubusercontent.com/46296830/205343775-60e429ea-f5e5-42b2-9474-8ca7dfe842cc.png">

## 📄 Documentation

Check out the [developer docs](docs.md) for more details on specific implementation questions you might have.

## 📣 Feedback

**SocialConnect is in beta**! Help us improve by sharing feedback on your experience in the Github Discussion section. You can also open an issue or a PR directly on this repo.
