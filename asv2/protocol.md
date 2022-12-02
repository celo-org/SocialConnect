# Protocol Overview

## Components

ASv2 has 3 main components:

1. an **SDK** for developers `@celo/identity`
2. a **privacy API** ODIS (short for "Oblivious Decentralised Identity Service"), and
3. two **smart contracts** (`FederatedAttestations` and `OdisPayments`)

| Component | Maintained by | Owned by | Description |
|-----------|--------|----|--------|
| App | Developer (**You**) | Developer (**You**) | Any application (web/mobile/server) that wishes to register or lookup users. The app imports the JS package to use ASv2. |
| JS package | cLabs | Celo community (fully open source public good) | A JS package that helps developers (**you**) register and look up users. Includes helper functions to use the privacy API to obfuscate identifiers. |
| ODIS Combiner (server) | cLabs | Celo community (fully open source public good) | An API that produces secrets for developers (**you**) to obfuscate identifiers before registering or looking them up on-chain. ODIS is short for "Oblivious Decentralised Identity Service". |
| ODIS Signer (client) | cLabs | 8 independent community members (fully open source public good) |  Clients run by 8 independent community members that contribute **secret shares** used by the ODIS Combiner to produce secrets for developers (you). |
| FederatedAttestations contract | cLabs | Celo community (governed by CELO token holders) | The smart contract  |
| OdisPayments contract | cLabs | Celo community (governed by CELO token holders) |  |
<!-- |  |  |  |  -->


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

|`sha3({prefix}{plaintext_identifier}{separator}{ODIS_pepper})` |
|--|

| Plaintext Identifier | Prefix |  
|----------------------|--------|
| Phone numbers | `tel` |
| Twitter accounts | `twit` |
| Email addresses | `mailto` |
| ... | ... |

PRs welcome if you'd like to add a new prefix and identifier type.

For example `sha3({prefix}{e164_phone_number}{separator}{ODIS_pepper})` | `sha3(tel://+123456789__123abc)` = c1fbb1429e94...a9509df3f1a 

<!-- | Identifiers | Obfuscation patterns  | Obfuscation examples |
|------|--------|--------|
| **Phone numbers** | `sha3({prefix}{e164_phone_number}{separator}{ODIS_pepper})` | `sha3(tel://+123456789__123abc)` = c1fbb1429e94...a9509df3f1a |
| **Twitter accounts** | `sha3({prefix}{twitter_handle}{separator}{ODIS_pepper})`  | `sha3(twitter://@CeloOrg__456def)` = 96fdf5e45259f7...760502dba1709 |
| **Email addresses** | `sha3({prefix}{email_address}{separator}{ODIS_pepper})` | `sha3(email://hello@celo.org__789ghi)` = 4b2b6074417fe4d6...2cc6b16aa8c |
| **Reddit accounts** | `sha3({prefix}{reddit_handle}{separator}{ODIS_pepper})` | `sha3(reddit://@celoorg__321jkl)` = bb29224bc50afb46d20...bdfdcb9831abb |
| **Keybase accounts** | `sha3({prefix}{keybase_handle}{separator}{ODIS_pepper})` | `sha3(keybase://@celoorg__759mno)` = ccee4144e17dcac2f...f17ba805032974 |
| **More** | ... | ... | -->

You can [visualise sha3 hashes online here](https://emn178.github.io/online-tools/sha3_256.html) if you prefer learning by doing.

Here is a visual overview:

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201716282-39e1b1b9-7a88-4e2c-8607-417ddcec2443.png">

### Register Alice’s phone number on-chain

<!-- Blurb -->

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201714875-c73d8417-0e0c-47b4-9b41-8529689f0607.png">

### Look up Alice’s phone number on-chain

<!-- Blurb -->

<img width="1200" alt="image" src="https://user-images.githubusercontent.com/46296830/201715097-124a8461-2a45-4a1f-ab2a-1781300befb0.png">
