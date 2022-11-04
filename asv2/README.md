
<!-- TOC ignore:true -->
# Federated Attestations

>❗️This is a work in progress - we are continually pushing updates and would love to hear feedback and questions!

This updated version of the Attestations protocol leverages issuers to steward the creation and maintenance of attestations. Issuers have the freedom to choose the process they use to verify the user's ownership of their phone number, and each attestation stored on-chain is associated with the issuer who registered it. Looking up an attestation then involves choosing the issuer(s) that we trust.

<!-- TOC -->

  - [Quickstart](#quickstart)
  - [Getting identifiers from ODIS](#getting-identifiers-from-odis)
      - [Authentication](#authentication)
      - [Rate Limits](#rate-limits)
      - [Runtime Environments](#runtime-environments)
          - [Node](#node)
          - [React Native](#react-native)
          - [Web](#web)
  - [Registering Attestations](#registering-attestations)
      - [Using signer keys](#using-signer-keys)
      - [Registering directly with the issuer](#registering-directly-with-the-issuer)
  - [Looking up an Attestation](#looking-up-an-attestation)
  - [Appendix](#appendix)
      - [Can I generate identifiers myself?](#can-i-generate-identifiers-myself)
      - [Contract Addresses](#contract-addresses)

<!-- /TOC -->

## Quickstart

In order to have interoperability between issuers and to [preserve user privacy](https://docs.celo.org/protocol/identity/odis-use-case-phone-number-privacy), phone numbers are turned into **obfuscated identifiers** before they are mapped on-chain to addresses. [ODIS](https://docs.celo.org/protocol/identity/odis) is a service that helps to perform this computation in a decentralized and privacy-preserving way.

The steps to register and lookup attestations are:

1. Install `@celo/identity` into your project
2. Query ODIS to obtain obfuscated identifier of your phone number
3. Register on-chain attestation of obfuscated identifier <-> account mapping
4. Use the obfuscated identifier and issuer to lookup attested accounts

<details>
<summary><b>web3.js code example</b></summary>

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
<summary><b>contractkit code example</b></summary>

```typescript
authSigner: AuthSigner = {
        authenticationMethod: AuthenticationMethod.ENCRYPTION_KEY,
        rawKey: DEK_PRIVATE_KEY
    }

const identifier = (await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
  phoneNumber,
  this.issuer.address,
  this.authSigner,
  OdisUtils.Query.getServiceContext('alfajores')
)).phoneHash

// upload identifier <-> address mapping to onchain registry
await federatedAttestationsContract.methods
  .registerAttestationAsIssuer(
      identifier,
      account,
      NOW_TIMESTAMP
  )
  .send({from: this.issuer.address, gas: 50000});

```

</details>

For runnable scripts using these code examples, see `example-scripts`.

## Getting identifiers from ODIS


The `@celo/identity` sdk package provides the [`getPhoneNumberIdentifier` function](https://celo-sdk-docs.readthedocs.io/en/latest/identity/modules/_odis_phone_number_identifier_/#getphonenumberidentifier) to query ODIS for identifiers

> There is a bug in versions `>=2.0.0` of `@celo/identity`. We will soon publish a new version that fixes it, but for now you must revert to `<=1.5.2` to use this function

### Authentication

There are two authentication methods for your ODIS request: `WalletKeySigner` for a wallet key or `EncryptionKeySigner` for the [data encryption key (DEK)](https://docs.celo.org/developer/contractkit/data-encryption-key). The DEK method is preferred, since it doesn't require the user to access the same key that manages their funds.

You may use the DEK by passing in the raw private key

```typescript
const authSigner: AuthSigner = {
  authenticationMethod: OdisUtils.Query.AuthenticationMethod.ENCRYPTION_KEY,
  rawKey: privateDataKey,
};
```

Alternatively, you can use a contractkit instance with the account unlocked:

```typescript
const authSigner: AuthSigner = {
  authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
  contractKit,
};
```

### Rate Limits

ODIS requests are rate-limited based on transaction history and balance. Ensure the account that is performing the queries has a balance and has performed transactions on the network. If an out of quota error is hit, this indicates that more transactions need to be sent from the querying account.

> The updated version of ODIS that will soon be deployed will instead directly accept on-chain payments for more quota

### Runtime Environments

#### Node

The default blinding client runs in Node, so the function can be called directly

```typescript
const {phoneHash} = await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
  phoneNumber,
  issuerAddress,
  authSigner,
  OdisUtils.Query.getServiceContext(network)
)
```

#### React Native

You will need to add the `react-native-blind-threshold-bls` package to your project, and use the `ReactNativeBlsBlindingClient`

```typescript
import { ReactNativeBlsBlindingClient } from './blinding/reactNativeBlindingClient'

const serviceContext = OdisUtils.Query.getServiceContext(network),

const {phoneHash} = await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
  phoneNumber,
  issuerAddress,
  authSigner,
  serviceContext,
  undefined,
  undefined,
  undefined,
  new ReactNativeBlsBlindingClient(serviceContext.odisPubKey)
)
```

#### Web

You will need to override `blind-threshold-bls-wasm` to use the [web-compatible version](https://github.com/celo-org/blind-threshold-bls-wasm/tree/web-compatible). To do so, add this to your `package.json`, making sure that you're referencing the right commit:

```json
"resolutions": {
    "blind-threshold-bls": "https://github.com/celo-org/blind-threshold-bls-wasm#3d1013af"
  }
```

Copy `blind_threshold_bls_bg.wasm` into the `/public` folder of your web project, so that it's accessible via an absolute path. Ensure that its location matches the path specified in the call to the `init` function in the `WebBlsBlindingClient` that is used.

```typescript
import { WebBlsBlindingClient } from './blinding/webBlindingClient'

const serviceContext = OdisUtils.Query.getServiceContext(network),

const {phoneHash} = await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
  phoneNumber,
  issuerAddress,
  authSigner,
  serviceContext,
  undefined,
  undefined,
  undefined,
  new WebBlsBlindingClient(serviceContext.odisPubKey)
)
```

## Registering Attestations

We recommend that issuers create separate signer addresses to sign attestations when registering them. This is to avoid using the issuer key for multiple functions. If a signer key is compromised or lost, the issuer can simply rotate its signer keys and update its attestations accordingly. However, for convenience, issuers can directly register an attestation as well.

### Using signer keys

The signer key needs to be authorized by the issuer, under the `AttestationSigner` role.

```typescript
import { encodePacked, keccak256 } from 'web3-utils'

const signerRole = keccak256(encodePacked('celo.org/core/attestation'))
await accountsContract.methods.authorizeSigner(signer, signerRole, { from: issuer })
```

The signer is then used to sign an EIP712 typed data object representing the attestation.

```typescript
import { ensureLeading0x } from '@celo/base'
import { generateTypedDataHash } from '@celo/utils/src/sign-typed-data-utils'
import { parseSignatureWithoutPrefix } from '@celo/utils/src/signatureUtils'

const getSignatureForAttestation = async (
  identifier: string,
  issuer: string,
  account: string,
  issuedOn: number,
  signer: string,
  chainId: number,
  contractAddress: string
) => {
  const typedData =  {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256'}, 
        { name: 'verifyingContract', type: 'address'}, 
      ],
      OwnershipAttestation: [
          { name: 'identifier', type: 'bytes32' },
          { name: 'issuer', type: 'address'},
          { name: 'account', type: 'address' },
          { name: 'signer', type: 'address' },
          { name: 'issuedOn', type: 'uint64' },
      ],
    },
    primaryType: 'OwnershipAttestation',
    domain: {
      name: 'FederatedAttestations',
      version: '1.0',
      chainId,
      verifyingContract: contractAddress
    },
    message:{ 
      identifier,
      issuer,
      account, 
      signer, 
      issuedOn
    }
  }

  const signature = await new Promise<string>((resolve, reject) => {
    web3.currentProvider.send(
      {
        method: 'eth_signTypedData',
        params: [signer, typedData],
      },
      (error, resp) => {
        if (error) {
          reject(error)
        } else {
          resolve(resp.result)
        }
      }
    )
  })

  const messageHash = ensureLeading0x(generateTypedDataHash(typedData).toString('hex'))
  const parsedSignature = parseSignatureWithoutPrefix(messageHash, signature, signer)
  return parsedSignature
}

const identifier = phoneHash
const {v,r,s} = getSignatureForAttestation(identifier, issuer, account, issuedOnTimestamp, signer, chainId, contractAddress)
await federatedAttestationsContract.methods
  .registerAttestation(
      identifier,
      issuer,
      account,
      signer,
      issuedOnTimestamp,
      v,
      r,
      s
  ).send()
```

### Registering directly with the issuer

If the issuer itself is acting as its signer, then the attestation does not need to be signed, and can be directly registered.

```typescript
const identifier = phoneHash
await federatedAttestationsContract.methods
  .registerAttestationAsIssuer(
      identifier,
      account,
      issuedOnTimestamp
  ).send()
```

## Looking up an Attestation

When looking up an attestion, make sure to use the same ODIS identifier that was used to register it.
The issuer address should correspond to the account that submitted the transaction.

```typescript
    const attestations = await federatedAttestationsInstance.methods
      .lookupAttestations(identifier, [issuer])
      .call();
```

## Appendix

### Can I generate identifiers myself?

Yes! If you want to bypass the SDK, you can compute onChain identifiers with ODIS yourself.

1. Blind identifier

Using the right blinding client for your runtime environment, blind your identifier before passing it to ODIS. This ensures that none of the signers see your personal information.

```typescript
const plaintextIdentifier = "your phone number, email, twitter handle, etc."

const base64Identifier = Buffer.from(plaintextIdentifier).toString('base64')
const blindedIdentifier = blsBlindingClient.blindMessage(base64Identifier, seed)
```

2. Get signature from ODIS

```typescript
const body: SignMessageRequest = {
  account,
  blindedQueryPhoneNumber: base64BlindedMessage,
  version: clientVersion,
  authenticationMethod: signer.authenticationMethod,
  sessionID,
}

const response = await queryOdis(
  body,
  context,
  CombinerEndpoint.PNP_SIGN,
  SignMessageResponseSchema,
  {
    [KEY_VERSION_HEADER]: keyVersion?.toString(),
    Authorization: await getOdisPnpRequestAuth(body, signer),
  }
)

try {
  res = await fetch(context.odisUrl + endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
} catch (error) {
  throw new Error(`${ErrorMessages.ODIS_FETCH_ERROR}: ${error}`)
}

if (!response.success) {
  throw new Error(response.error)
}

const blindedSignature = response.signature
```

3. Construct obfuscated identifier from ODIS signature

```typescript
import { createHash } from 'crypto'
import { soliditySha3 } from '@celo/utils/lib/solidity'
const sha3 = (v: string) => soliditySha3({ type: 'string', value: v })

const unblindedSig = await blsBlindingClient.unblindAndVerifyMessage(blindedSignature)
const sigBuf = Buffer.from(unblindedSig, 'base64')

// converting sig to pepper
const PEPPER_CHAR_LENGTH = 13
const PEPPER_SEPARATOR = '__'
const odisPepper = createHash('sha256').update(sigBuf).digest('base64').slice(0, PEPPER_CHAR_LENGTH)
const obfuscatedIdentifier = sha3(prefix + plaintextIdentifier + PEPPER_SEPARATOR + odisPepper) as string
```

### Contract Addresses

Mainnet:

- [FederatedAttestations](https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/identity/FederatedAttestations.sol):
  - [`0x0aD5b1d0C25ecF6266Dd951403723B2687d6aff2`](https://explorer.celo.org/address/0x0aD5b1d0C25ecF6266Dd951403723B2687d6aff2/transactions) (proxy)
  - [`0x76A4daaC43912A443f098D413DED2Cb7A153EA85`](https://explorer.celo.org/address/0x76A4daaC43912A443f098D413DED2Cb7A153EA85/transactions) (implementation)
- [OdisPayments](https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/identity/OdisPayments.sol):
  - [`0xAE6B29f31B96e61DdDc792f45fDa4e4F0356D0CB`](https://explorer.celo.org/address/0xAE6B29f31B96e61DdDc792f45fDa4e4F0356D0CB/transactions) (proxy)
  - [`0x9Ea5E9b9B48a72325D59B3EBA147F42b1b14BF78`](https://explorer.celo.org/address/0x9Ea5E9b9B48a72325D59B3EBA147F42b1b14BF78/transactions) (implementation)
- [Escrow](https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/identity/Escrow.sol):
  - [`0xf4Fa51472Ca8d72AF678975D9F8795A504E7ada5`](https://explorer.celo.org/address/0xf4Fa51472Ca8d72AF678975D9F8795A504E7ada5/transactions) (proxy)
  - [`0xcC4E6caBe88EBb7FCCB40d862bf1C3a89f88e835`](https://explorer.celo.org/address/0xcC4E6caBe88EBb7FCCB40d862bf1C3a89f88e835/transactions) (implementation)

Alfajores:

- [FederatedAttestations](https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/identity/FederatedAttestations.sol):
  - [`0x70F9314aF173c246669cFb0EEe79F9Cfd9C34ee3`](https://alfajores-blockscout.celo-testnet.org/address/0x70F9314aF173c246669cFb0EEe79F9Cfd9C34ee3/transactions) (proxy)
  - [`0x926E88a280902Bfff5047693B9CeAfdb9F4d5095`](https://alfajores-blockscout.celo-testnet.org/address/0x926E88a280902Bfff5047693B9CeAfdb9F4d5095/transactions) (implementation)
- [OdisPayments](https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/identity/OdisPayments.sol):
  - [`0x645170cdB6B5c1bc80847bb728dBa56C50a20a49`](https://alfajores-blockscout.celo-testnet.org/address/0x645170cdB6B5c1bc80847bb728dBa56C50a20a49/transactions) (proxy)
  - [`0x72eAC1F0518213Ad405560eFd3fB647FbDAdb703`](https://alfajores-blockscout.celo-testnet.org/address/0x72eAC1F0518213Ad405560eFd3fB647FbDAdb703/transactions) (implementation)
- [Escrow](https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/identity/Escrow.sol):
  - [`0xb07E10c5837c282209c6B9B3DE0eDBeF16319a37`](https://alfajores-blockscout.celo-testnet.org/address/0xb07E10c5837c282209c6B9B3DE0eDBeF16319a37/transactions) (proxy)
  - [`0xa34117B48313dE0093d599720998415bAb5FD61d`](https://alfajores-blockscout.celo-testnet.org/address/0xa34117B48313dE0093d599720998415bAb5FD61d/transactions) (implementation)
