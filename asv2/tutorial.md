# ASv2 tutorial

The following sections walk you through some user flows we found to be most popular.
This tutorial is a draft - the official documentation for interfacing with ASv2 will be released soon (stay tuned 😃)!

## Glossary

| Term | Description                                                                                                                                               |
|------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| **End-user** | End-user that owns a plaintext identifier (e.g. phone number) and blockchain account, typically communicating via a mobile device  |
| **Issuer** | Server that registers an `OwnershipAttestation` in FederatedAttestations.sol, typically having verified the end-user's ownership over the **plaintext identifier** (e.g. phone number) |
| **FederatedAttestations.sol** | Smart contract which stores `OwnershipAttestations` in various mappins (like `identifierToAttestations` and `addressToIdentifiers`) |
| **`OwnershipAttestation`** | Set of 4 attributes recorded in FederatedAttestations.sol, namely `account` (of the end-user), `signer` (account of the issuer), `issuedOn` (date), and `publishedOn` (date) |
| **`identifierToAttestations`** | Mapping from ODIS identifier -> Issuer -> `OwnershipAttestations` (e.g. encrypted "+1 234 567 890" -> "ImpactMarket" -> { `account`: 0xENDUSER123..., `signer`:..., `issuedOn`:..., `publishedOn`:... } ) |
| **`addressToIdentifiers`** | Mapping from blockchain account -> Issuer -> ODIS identifier (e.g. 0xENDUSER123 -> "ImpactMarket" -> encrypted "+1 234 567 890" ) |
| **ODIS** | Privacy API that provides a secret input (or "cryptographic pepper") required to generate ODIS identifiers
| **OdisPayments.sol** | Smart contract to purchase quota required to make privacy API requests       |
| **Quota** | The total number of privacy API requests an account can make                                                  |
| **Plaintext identifier** | Plaintext identifier owned by user (eg. phone number "+1 234 567 890", twitter handle "@CeloOrg", email "alice@celo.org") |
| **Blinded identifier** | Plaintext identifier after encrypting it for security purposes to avoid sending plaintext identifiers to the privacy API (Why? So ODIS doesn't become a honeypot of plaintext identifiers for attackers) |
| **ODIS identifier** | Plaintext identifier after hashing it with the secret input (or "crytographic pepper") requested from ODIS |

## Example

### Registering an Attestation as an Issuer

The following parameters are required 
1. Identifier
2. account 
3. timestamp for when the attestation was issued

The following is the code snippet, using web3js, to register an attestation  

note: the respective ABI's can be generated from the corresponding contact under ./contracts
```typescript
    const identifier = "+18006540202"
    const identifierInBytes32Format = web3.utils.soliditySha3({
        t: "bytes32",
        v: identifier,
    });
    
    const testAccount = web3.eth.accounts.create().address;
    const issuedOnTimestamp = Math.floor(new Date().getTime() / 1000);

    const federatedAttestationsInstance = new web3.eth.Contract(
      FA_CONTRACT.abi,
      FA_PROXY_ADDRESS
    );

    await federatedAttestationsInstance.methods
        .registerAttestationAsIssuer(
            identifierInBytes32Format,
            testAccount,
            issuedOnTimestamp
        ).send()
```

### Looking up an Attestation
When looking up an attestation, make sure to use the same identifier when registering. 
The issuer address should correspond to the account that submitted the transaction. 
```typescript
    const attestations = await federatedAttestationsInstance.methods
      .lookupAttestations(identifierInBytes32Format, [issuerAddress])
      .call();
```


## Appendix

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