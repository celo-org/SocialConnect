import {
    ALFAJORES_CUSD_ADDRESS,
    FA_CONTRACT,
    FA_PROXY_ADDRESS,
    ODIS_PAYMENTS_CONTRACT,
    ODIS_PAYMENTS_PROXY_ADDRESS,
    STABLE_TOKEN_CONTRACT,
} from "./constants";
import Web3 from "web3";
import * as threshold from "blind-threshold-bls";

function getBlindedPhoneNumber(
    phoneNumber: string,
    blindingFactor: Buffer
): string {
    const blindedPhoneNumber = threshold.blind(
        Buffer.from(phoneNumber),
        blindingFactor
    ).message;
    return uint8ArrayToBase64(blindedPhoneNumber);
}

function uint8ArrayToBase64(bytes: Uint8Array) {
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return Buffer.from(binary).toString("base64");
}

// todo replace with API call to ODIS
function getQuota(): number {
    return 3;
}

// todo replace with call to ODIS
function getOdisPepper(blindedIdentifier: string): string {
    return "123";
}

async function registerAttestation() {
    const TEST_ACCOUNT_ADDRESS = "0xf14790BAdd2638cECB5e885fc7fAD1b6660AAc34";
    const PRIVATE_KEY = "0x726e53db4f0a79dfd63f58b19874896fce3748fcb80874665e0c147369c04a37";
    const web3 = new Web3("https://alfajores-forno.celo-testnet.org");
    const issuerAccount = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    const plaintextIdentifier = "+18009099999";
    const NOW_TIMESTAMP = Math.floor(new Date().getTime() / 1000);
    const BLINDING_FACTOR = Buffer.from(
        "0IsBvRfkBrkKCIW6HV0/T1zrzjQSe8wRyU3PKojCnww=",
        "base64"
    );

    web3.eth.accounts.wallet.add(issuerAccount);

    /** Contracts **/
    const federatedAttestationsInstance = new web3.eth.Contract(
        FA_CONTRACT.abi,
        FA_PROXY_ADDRESS
    );

    const odisPaymentsInstance = new web3.eth.Contract(
        ODIS_PAYMENTS_CONTRACT.abi,
        ODIS_PAYMENTS_PROXY_ADDRESS
    );

    const stableTokenContractInstance = new web3.eth.Contract(
        STABLE_TOKEN_CONTRACT.abi,
        ALFAJORES_CUSD_ADDRESS
    );


    /**
     * ODIS is a paid service. A call must be made to ODIS to determine
     * the user's remaining available balance - if the returned value is 0,
     * you must top up the quota by sending funds to the OdisPayments contract.
     *
     */
    const remainingOdisQuota = getQuota();

    if (remainingOdisQuota == 0) {
        const TEN_CUSD = web3.utils.toWei("10", "ether");
        await stableTokenContractInstance.methods
            .approve(web3.defaultAccount, TEN_CUSD)
            .send({ from: issuerAccount.address });
        await odisPaymentsInstance.methods
            .payInCUSD(web3.defaultAccount, TEN_CUSD)
            .send({ from: issuerAccount.address });
    }

    /**
     * The phone number (or arbitrary string) is encrypted in a deterministic way before passed to ODIS
     */
    const blindedIdentifier = getBlindedPhoneNumber(
        plaintextIdentifier,
        BLINDING_FACTOR
    );

    /**
     * A call is made to ODIS in order to retrieve the pepper
     */
    const odisPepper = getOdisPepper(blindedIdentifier);


    /**
     *
     * Do we hash the returned value from ODIS or is there a returned value 'response.combined' already hashed
     *
     * **/
    const combinedIdentifier = `tel//${plaintextIdentifier}__${odisPepper}`;

    // todo hash the combined identifier?

    const combinedIdentifierBytes32 = web3.utils.soliditySha3({
        t: "bytes32",
        v: combinedIdentifier,
    }) as string;

    await federatedAttestationsInstance.methods
        .registerAttestationAsIssuer(
            combinedIdentifierBytes32,
            TEST_ACCOUNT_ADDRESS,
            NOW_TIMESTAMP
        )
        .send({ from: issuerAccount.address, gas: 500000 });

    const attestation = await federatedAttestationsInstance.methods
        .lookupAttestations(combinedIdentifierBytes32, [issuerAccount.address])
        .call({ from: issuerAccount.address });

    const identifiers = await federatedAttestationsInstance.methods
        .lookupIdentifiers(TEST_ACCOUNT_ADDRESS, [issuerAccount.address])
        .call({ from: issuerAccount.address });

    console.log({ attestation });
    console.log({ identifiers });
}

registerAttestation().then();