
# Federated Attestations ("ASv2") Beta

ASv2 is an open source protocol that maps off-chain personal **identifiers** (such as phone numbers, twitter handles, etc.) to on-chain account **addresses**. This enables a convenient and interoperable user experience for use cases such as:

* payments - send money directly to your friend's phone number!
* social discovery - find someone's account based on their twitter!
* any other identity applications!

Here is a short demo of a payment from a user using [Kaala](https://kaala.app/) wallet to a user using [Libera](https://medium.com/impactmarket/ready-to-unlock-your-potential-meet-libera-your-new-crypto-wallet-d1053f917b95) wallet, using only a phone number:

[<img width="800" alt="image" src="https://user-images.githubusercontent.com/46296830/207285114-6ef73be4-10f2-4afc-a066-811e1f3e1042.png">](https://www.loom.com/share/8afddd73ba324ec18aeb63fc96d568f9)

## 🛠 How it Works

ASv2 uses a federated model, meaning that anyone has the power to be an **issuer** of attestation mappings. Issuers have the freedom to decide how to verify that the user actually has ownership of their identifier. After verification, issuers register the mapping as an attestation to the [on-chain smart contract registry](https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/identity/FederatedAttestations.sol). Attestations are stored under the issuer that registered them. When looking up attestations, we then have to decide which issuers are trusted.

Here are some active issuers verifying and registering attestations:

| Issuer Name | Address|
|-----|-----|
|Kaala| 
|Libera|
|Valora

Off-chain identifiers, originally in plaintext, are obfuscated before they are used in on-chain attestations to ensure user privacy and security. This is done with the help of the [Oblivious Decentralized Identifier Service (**ODIS**)](https://docs.celo.org/protocol/identity/odis). The details of the obfuscation process and how to interact with ODIS are described in the [docs about privacy](privacy.md).

## 🧑‍💻 Quickstart

The following steps use the Celo [ContractKit](https://docs.celo.org/developer/contractkit) to quickly set you up to play around with the protocol. If you would like to use a different library instead, please refer to the [example scripts](examples/).

1. Add the [`@celo/identity`](https://www.npmjs.com/package/@celo/identity) package into your project.

    ```console
    yarn add @celo/identity
    ```

2. Derive the obfuscated identifier from your plaintext identifier. Refer to documentation on the [ODIS SDK](privacy.md#using-the-sdk) for detailed explanations on these parameters and steps.

    ```typescript
    import { OdisUtils } from "@celo/identity";
    import { newKit } from "@celo/contractkit";

    // create alfajores contractKit instance with your private key
    const kit = await newKit("https://alfajores-forno.celo-testnet.org");
    kit.addAccount(PRIVATE_KEY)

    // approve and then send payment to OdisPayments to get quota for ODIS
    const stableTokenContract = await kit.contracts.getStableToken();
    const odisPaymentsContract = await kit.contracts.getOdisPayments();
    await stableTokenContract
      .increaseAllowance(odisPaymentsContract.address, ONE_CENT_CUSD_WEI)
      .sendAndWaitForReceipt();
    const ONE_CENT_CUSD_WEI = 10000000000000000
    const odisPayment = await odisPaymentsContract
      .payInCUSD(this.issuer.address, ONE_CENT_CUSD_WEI)
      .sendAndWaitForReceipt();
    
    // get obfuscated identifier from plaintext identifier by querying ODIS
    const plaintextIdentifier = '+12345678910'
    const serviceContext = OdisUtils.Query.getServiceContext(OdisContextName.ALFAJORES);
    const authSigner = {
      authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
      contractKit: kit,
    };
    const { obfuscatedIdentifier } = await OdisUtils.Identifier.getObfuscatedIdentifie(
      plaintextIdentifier,
      OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
      issuerAddress,
      authSigner,
      serviceContext
    )
    ```

3. Register an attestation mapping between the obfuscated identifier and an account address in the `FederatedAttestations` contract. See [docs](protocol.md#registration) for more info.

   ```typescript
   const federatedAttestationsContract = await kit.contracts.getFederatedAttestations();

    // upload identifier <-> address mapping to onchain registry
    await federatedAttestationsContract
      .registerAttestationAsIssuer(obfuscatedIdentifier, userAccountAddress, attestationVerifiedTime)
      .send();
   ```

4. Look up the accounts addresses owned by an identifier by querying the `FederatedAttestations` contract. See [docs](protocol.md#lookups) for more info.

    ```ts
    const attestations = await federatedAttestationsContract.lookupAttestations(
      obfuscatedIdentifier,
      [issuerAddress]
    );

    console.log(attestations.accounts)
    ```

## 🚀 Examples

The best place to get started is the [examples](examples) folder, which contains sample scripts that implement registration and lookups, using [ContractKit](https://docs.celo.org/developer/contractkit), [Ethers](https://ethers.org/), and [web3.js](https://web3js.readthedocs.io/en/v1.8.1/)

You can also check out [emisianto](https://emisianto.vercel.app/), a sample web app that is an implementation of a phone number issuer. The code is hosted [here](https://github.com/isabellewei/emisianto).

<img width="500" alt="image" src="https://user-images.githubusercontent.com/46296830/205343775-60e429ea-f5e5-42b2-9474-8ca7dfe842cc.png">

## 📄 Documentation

For a deeper dive under the hoode and specific implementation details, check out the documentation on the [protocol](protocol.md) for details on how to interact with the on-chain registry,  and [privacy](privacy.md) for how identifiers are obfuscated.

## 📣 Feedback

**ASv2 is in beta**! Help us improve by sharing feedback on your experience in the Github Discussion section. You can also open an issue or a PR directly on this repo.
