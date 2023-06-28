# SocialConnect

SocialConnect is an open source protocol that maps off-chain personal **identifiers** (such as phone numbers, twitter handles, etc.) to on-chain account **addresses**. This enables a convenient and interoperable user experience for use cases such as:

-   payments - send money directly to your friend's phone number!
-   social discovery - find someone's account based on their twitter!
-   any other identity applications!

Here is a short demo of a payment from a [Kaala](https://kaala.app/) wallet user to a [Libera](https://medium.com/impactmarket/ready-to-unlock-your-potential-meet-libera-your-new-crypto-wallet-d1053f917b95) wallet user, with only a phone number:

[<img width="800" alt="image" src="https://user-images.githubusercontent.com/46296830/207285114-6ef73be4-10f2-4afc-a066-811e1f3e1042.png">](https://www.loom.com/share/8afddd73ba324ec18aeb63fc96d568f9)

## 🛠 How it Works

SocialConnect uses a federated model, meaning that anyone has the power to be an **issuer** of attestation mappings. Issuers have the freedom to decide how to verify that the user actually has ownership of their identifier. After verification, issuers register the mapping as an attestation to the [on-chain smart contract registry](https://github.com/celo-org/celo-monorepo/blob/master/packages/protocol/contracts/identity/FederatedAttestations.sol). Attestations are stored under the issuer that registered them. When looking up attestations, we then have to decide which issuers are trusted.

Here are some active issuers verifying and registering attestations:

| Issuer Name | Address                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| Kaala       | `0x6549aF2688e07907C1b821cA44d6d65872737f05` (mainnet)                                                          |
| Libera      | `0x388612590F8cC6577F19c9b61811475Aa432CB44` (mainnet) `0xe3475047EF9F9231CD6fAe02B3cBc5148E8eB2c8` (alfajores) |

Off-chain identifiers, originally in plaintext, are obfuscated before they are used in on-chain attestations to ensure user privacy and security. This is done with the help of the [Oblivious Decentralized Identifier Service (**ODIS**)](https://docs.celo.org/protocol/identity/odis). The details of the obfuscation process and how to interact with ODIS are described in the [docs about privacy](privacy.md).

### Want a more profound understanding?

We've made a mini-series to explain you:

- [Celo Spark: SocialConnect Mini-Series (1/3) — What Is It?](https://www.youtube.com/watch?v=a_756GRPcV4&list=PLsQbsop73cfErtQwacE4WgqQwoVcLvLZS&index=1)
- [Celo Spark: SocialConnect Mini-Series (2/3) — How Does It Works?](https://www.youtube.com/watch?v=bzZbfoPLYM4&list=PLsQbsop73cfErtQwacE4WgqQwoVcLvLZS&index=2)
- [Celo Spark: SocialConnect Mini-Series (3/3) — Coding Session](https://www.youtube.com/watch?v=qrIHC496avs&list=PLsQbsop73cfErtQwacE4WgqQwoVcLvLZS&index=3)

## 🧑‍💻 Quickstart

The following steps use the Celo [ContractKit](https://docs.celo.org/developer/contractkit) to quickly set you up to play around with the protocol. If you would like to use a different library instead, please refer to the [example scripts](examples/).

1. Add the [`@celo/identity`](https://www.npmjs.com/package/@celo/identity) package into your project.

    ```console
    npm install @celo/identity
    ```

2. Set up your issuer (read "Authentication" section in [privacy.md](privacy.md#authentication)), which is the account registering attestations. When a user requests for the issuer to register an attestation, the issuer should [verify](protocol.md#verification) somehow that the user owns their identifier (ex. SMS verification for phone number identifiers).

    ```ts
    import { newKit } from "@celo/contractkit";

    // the issuer is the account that is registering the attestation
    let ISSUER_PRIVATE_KEY;

    // create alfajores contractKit instance with the issuer private key
    const kit = await newKit("https://alfajores-forno.celo-testnet.org");
    kit.addAccount(ISSUER_PRIVATE_KEY);
    const issuerAddress =
        kit.web3.eth.accounts.privateKeyToAccount(ISSUER_PRIVATE_KEY).address;
    kit.defaultAccount = issuerAddress;

    // information provided by user, issuer should confirm they do own the identifier
    const userPlaintextIdentifier = "+12345678910";
    const userAccountAddress = "0x000000000000000000000000000000000000user";

    // time at which issuer verified the user owns their identifier
    const attestationVerifiedTime = Date.now();
    ```

3. Check and top up [quota for querying ODIS](privacy.md#rate-limit) if necessary.

    ```ts
    import { OdisUtils } from "@celo/identity";
    import { AuthSigner } from "@celo/identity/lib/odis/query";

    // authSigner provides information needed to authenticate with ODIS
    const authSigner: AuthSigner = {
        authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
        contractKit: kit,
    };
    // serviceContext provides the ODIS endpoint and public key
    const serviceContext = OdisUtils.Query.getServiceContext(
        OdisContextName.ALFAJORES
    );

    // check existing quota on issuer account
    const { remainingQuota } = await OdisUtils.Quota.getPnpQuotaStatus(
        issuerAddress,
        authSigner,
        serviceContext
    );

    // if needed, approve and then send payment to OdisPayments to get quota for ODIS
    if (remainingQuota < 1) {
        const stableTokenContract = await kit.contracts.getStableToken();
        const odisPaymentsContract = await kit.contracts.getOdisPayments();
        const ONE_CENT_CUSD_WEI = 10000000000000000;
        await stableTokenContract
            .increaseAllowance(odisPaymentsContract.address, ONE_CENT_CUSD_WEI)
            .sendAndWaitForReceipt();
        const odisPayment = await odisPaymentsContract
            .payInCUSD(issuerAddress, ONE_CENT_CUSD_WEI)
            .sendAndWaitForReceipt();
    }
    ```

4. Derive the obfuscated identifier from your plaintext identifier. Refer to documentation on the [ODIS SDK](privacy.md#using-the-sdk) for detailed explanations on these parameters and steps.

    ```typescript
    // get obfuscated identifier from plaintext identifier by querying ODIS
    const { obfuscatedIdentifier } =
        await OdisUtils.Identifier.getObfuscatedIdentifier(
            userPlaintextIdentifier,
            OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
            issuerAddress,
            authSigner,
            serviceContext
        );
    ```

5. Register an attestation mapping between the obfuscated identifier and an account address in the `FederatedAttestations` contract. This attestation is associated under the issuer. See [docs](protocol.md#registration) for more info.

    ```typescript
    const federatedAttestationsContract =
        await kit.contracts.getFederatedAttestations();

    // upload identifier <-> address mapping to onchain registry
    await federatedAttestationsContract
        .registerAttestationAsIssuer(
            obfuscatedIdentifier,
            userAccountAddress,
            attestationVerifiedTime
        )
        .send();
    ```

6. Look up the account addresses owned by an identifier, as attested by the issuers that you trust (in this example only your own issuer), by querying the `FederatedAttestations` contract. See [docs](protocol.md#lookups) for more info.

    ```ts
    const attestations = await federatedAttestationsContract.lookupAttestations(
        obfuscatedIdentifier,
        [issuerAddress]
    );

    console.log(attestations.accounts);
    ```

## 🚀 Examples

|                                             Type                                              |
| :-------------------------------------------------------------------------------------------: |
|                            [ContractKit](examples/contractKit.ts)                             |
|                              [EthersJS (v5)](examples/ethers.ts)                              |
|                                  [web3.js](examples/web3.ts)                                  |
|         [NextJS based web app (Phone Number)](https://github.com/celo-org/emisianto)          |
| [React Native App (Phone Number)](https://github.com/celo-org/SocialConnect-ReactNative-Demo) |
|      [NextJS based web app (Twitter)](https://github.com/celo-org/SocialConnect-Twitter)      |
| [Server side NextJS (Twitter)](https://github.com/celo-org/SocialConnect-Twitter-Server-Side) |

<!-- -   [@celo/contractkit](https://docs.celo.org/developer/contractkit) (see [`examples/contractKit.ts`](examples/contractKit.ts)),
-   [ethers.js](https://ethers.org/) (see [`examples/ethers.ts`](examples/ethers.ts)), and
-   [web3.js](https://web3js.readthedocs.io/en/v1.8.1/) (see [`examples/web3.ts`](examples/web3.ts)). -->

The [Runtime Environments section](privacy.md#runtime-environments) shows instructions for using SocialConnect with:

-   [NodeJS](https://nodejs.org) (see [Runtime Environments > Node](privacy.md#node)),
-   [React Native](https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwiK9paNjYH9AhUIesAKHQZ1CvYQFnoECA0QAQ&url=https%3A%2F%2Freactnative.dev%2F&usg=AOvVaw3N725EvNXK2_crezzoIs9d) (see [Runtime Environments > React Native](privacy.md#react-native)), and
-   Web (see [Runtime Environments > Web](privacy.md#web))
<!--
The [emisianto web app](https://emisianto.vercel.app/) is a sample implementation of a phone number issuer. The code is hosted at [celo-org/emisianto](https://github.com/celo-org/emisianto). -->

<img width="500" alt="image" src="https://user-images.githubusercontent.com/46296830/205343775-60e429ea-f5e5-42b2-9474-8ca7dfe842cc.png">

## 📄 Documentation

For a deeper dive under the hood and specific implementation details, check out the documentation of the [protocol](protocol.md) for details on how to interact with the on-chain registry, [privacy](privacy.md) for how identifiers are obfuscated, and [key-setup](key-setup.md) to setup your role keys to interact with the protocol.

## 🤝 Get In Touch

Interested in Integrating SocialConnect, get in touch by filling this [form](https://docs.google.com/forms/d/e/1FAIpQLSeePUyzd2VQfawO8OsXdvmut3OiyICoLPRtfNfPpvtRw3tEfw/viewform).

## 📣 Feedback

**SocialConnect is in beta**! Help us improve by sharing feedback on your experience in the Github Discussion section. You can also open an issue or a PR directly on this repo.
