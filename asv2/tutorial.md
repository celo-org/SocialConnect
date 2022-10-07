# ASv2 tutorial
The following sections walk you through some user flows we found to be most popular.
This tutorial is a draft - the official documentation for interfacing with ASv2 will be released soon (stay tuned 😃)! 


## Glossary
| Term | Description                                                                                                                                               |
|------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| user | User that owns the off-chain identifier and account, usually communicating via a mobile device                                                           |
|issuer| Server verifying identifiers and creating ASv2 attestations, usually belonging to a wallet or dApp                                                       |
|quota  | The number of ODIS queries an account can make, obtained by providing funds to the ODIS smart contract                                                  |   
|ODIS  | ODIS service, including combiner and signers, that signs blinded identifiers                                                                             |   
|OdisPayments.sol  | Smart contract used to pay for ODIS quota (queries).                                                                                         |   
|FederatedAttestations.sol  | On-chain registry for ASv2 which records attestations of ownership between identifiers and addresses, indexed by issuer.            |   
|off-chain identifier  | Plaintext identifier owned by user (eg. phone number, twitter handle, email)                                                             |   
|blinded identifier  | Derived by blinding the off-chain identifier using the BLS library, passed to ODIS to be signed                                            |   
|on-chain identifier  | Identifier used in the ASv2 on-chain registry - derived by unblinding the signature from ODIS and hashing it with the off-chain identifier|   

## Contract Addresses
### Alfajores
| Contract                  | Proxy Address                              | Implementation Address | 
|---------------------------|--------------------------------------------|-------------------------|
| Federated Attestations    | 0x70F9314aF173c246669cFb0EEe79F9Cfd9C34ee3 | 0x926E88a280902Bfff5047693B9CeAfdb9F4d5095|
| Escrow                    | 0xb07E10c5837c282209c6B9B3DE0eDBeF16319a37 |0xa34117B48313dE0093d599720998415bAb5FD61d |
| Odis Payments             | 0x645170cdB6B5c1bc80847bb728dBa56C50a20a49 | 0x72eAC1F0518213Ad405560eFd3fB647FbDAdb703|

## Registering an Attestation as an Issuer
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

## Looking up an Attestation
When looking up an attestation, make sure to use the same identifier when registering. 
The issuer address should correspond to the account that submitted the transaction. 
```typescript
    const attestations = await federatedAttestationsInstance.methods
      .lookupAttestations(identifier, [issuerAddress])
      .call();
```