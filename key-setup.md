# Protocol Role Keys Setup

To interact with the SocialConnect protocol, you can use the test keys in the SocialConnect repository we included for convenience. Once you've gained enough experience, the next step is to set up your own keys. Here's how:

- Pro tip: Watch the second video of our mini-series ([Celo Spark: SocialConnect Mini-Series (2/3) — How Does It Work?](https://www.youtube.com/watch?v=bzZbfoPLYM4&list=PLsQbsop73cfErtQwacE4WgqQwoVcLvLZS&index=2)) for a detailed explanation of how different account roles interact with each other.

## Roles

- Issuer
- Issuer attestation signer
- Issuer DEK (Data Encryption Key)
- User
- User DEK (Data Encryption Key)

## Requirements

- To configure the different roles, we will use celocli through the console. If you don’t have it installed, run the following:
`npm install -g @celo/celocli`
- Configure the RPC for the network we want to interact with:
    . `celocli config:set --node wss://forno.celo.org/ws` for mainnet
    . `celocli config:set --node wss://alfajores-forno.celo-testnet.org/ws` for Alfajores testnet

## Setting Accounts

### Issuer

- Create a new account using celocli, run the following:
  `celocli account:new`
- We will see five fields of information about this created account in our console:
  . `mnemonic`
  . `accountAddress`
  . `privateKey`
  . `publicKey`
  . `address`
- To avoid confussion by having to copy paste constantly these values for the different accounts, you can use export to create a temporal variable of such values.
  . `export ISSUER_ADDRESS=address`
  . `export ISSUER_PRIVATE_KEY=privateKey`
- Register account: (to map an attestation signer or an attestation encryption key the issuer needs to be registered as an issuer) * This is a tx, so you need Celo.
  . `celocli account:register --from $ISSUER_ADDRESS --privateKey $ISSUER_PRIVATE_KEY`
- If you don't plan to use attestation signer or the DEK, this account is the one that should pay quota in cUSD. If you want to convert some Celo to cUSD in advance, you can run:
  . `celocli exchange:celo --value 1000000000000000000 --from $ISSUER_ADDRESS --privateKey $ISSUER_PRIVATE_KEY`
  . In this example I convert 1 Celo. You can find a tool [tool](https://celoscan.io/unitconverter) to convert the value to wei in the celoscan website

### Issuer Attestation Signer (optional)

- Create a new account:
    .`celocli account:new`
    . `export ISSUER_ATTESTATION_ADDRESS=address`
    . `export ISSUER_ATTESTATION_PRIVATE_KEY=privateKey`
- Generate proof-of-possession to be used to authorize a signer:
    . `celocli account:proof-of-possession --account $ISSUER_ADDRESS --signer $ISSUER_ATTESTATION_ADDRESS --privateKey $ISSUER_ATTESTATION_PRIVATE_KEY`
    . `export ISSUER_ATTESTATION_POP=0X...`
- Finally map (at this step the issuer account should have balance to do the upcoming tx):
    . `celocli account:authorize --role attestation --signer $ISSUER_ATTESTATION_ADDRESS --signature $ISSUER_ATTESTATION_POP --from $ISSUER_ADDRESS --privateKey $ISSUER_PRIVATE_KEY`

### Issuer DEK

- Create a new account using celocli, run the following:
  .`celocli account:new`
  . `export ISSUER_DEK_PUBLIC_KEY=publicKey`
- Register DEK:
  . `celocli account:register-data-encryption-key --publicKey $ISSUER_DEK_PUBLIC_KEY --from $ISSUER_ADDRESS --privateKey $ISSUER_PRIVATE_KEY`

### User

- Create a new account:
  .`celocli account:new`
  . `export USER_ADDRESS=address`
  . `export USER_PRIVATE_KEY=privateKey`
- Add funds to this account to register DEK account.
- Register account: (to map an attestation encryption key the user needs to be registered) * This is a tx, so you need Celo.
  . `celocli account:register --from $USER_ADDRESS --privateKey $USER_PRIVATE_KEY`

### User DEK

- Create a new account:
  .`celocli account:new`
  . `export USER_DEK_PUBLIC_KEY=publicKey`
- Register DEK:
  . `celocli account:register-data-encryption-key --publicKey $USER_DEK_PUBLIC_KEY --from $USER_ADDRESS --privateKey $USER_PRIVATE_KEY`

## Considerations

The maintainer of the issuer accounts should keep track of the balance of CELO and cUSD tokens to avoid an interruption.
