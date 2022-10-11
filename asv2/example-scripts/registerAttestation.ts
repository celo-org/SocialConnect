import {
    ACCOUNTS_CONTRACT,
    ACCOUNTS_PROXY_ADDRESS,
    ALFAJORES_CUSD_ADDRESS,
    FA_CONTRACT,
    FA_PROXY_ADDRESS,
    ODIS_PAYMENTS_CONTRACT,
    ODIS_PAYMENTS_PROXY_ADDRESS,
    STABLE_TOKEN_CONTRACT,
} from "./constants";
import Web3 from "web3";
import { OdisUtils } from '@celo/identity'
import { AuthenticationMethod, AuthSigner } from "@celo/identity/lib/odis/query";
import { getPhoneNumberIdentifier } from "@celo/identity/lib/odis/phone-number-identifier";

const USER_ACCOUNT = "0xf14790BAdd2638cECB5e885fc7fAD1b6660AAc34";
const USER_PHONE_NUMBER = "+18009099999";

const ISSUER_PRIVATE_KEY = "0x726e53db4f0a79dfd63f58b19874896fce3748fcb80874665e0c147369c04a37";
const DEK_PUBLIC_KEY = "0x026063780c81991c032fb4fa7485c6607b7542e048ef85d08516fe5c4482360e4b";
const DEK_PRIVATE_KEY = "0xc2bbdabb440141efed205497a41d5fb6114e0435fd541e368dc628a8e086bfee";

const ALFAJORES_RPC = "https://alfajores-forno.celo-testnet.org";

const NOW_TIMESTAMP = Math.floor(new Date().getTime() / 1000);

class ASv2 {
    web3 = new Web3(ALFAJORES_RPC);
    issuer = this.web3.eth.accounts.privateKeyToAccount(ISSUER_PRIVATE_KEY);
    
    /** Contracts **/
    accountsContract = new this.web3.eth.Contract(
        ACCOUNTS_CONTRACT.abi,
        ACCOUNTS_PROXY_ADDRESS
    );
    federatedAttestationsContract = new this.web3.eth.Contract(
        FA_CONTRACT.abi,
        FA_PROXY_ADDRESS
    );
    odisPaymentsContract = new this.web3.eth.Contract(
        ODIS_PAYMENTS_CONTRACT.abi,
        ODIS_PAYMENTS_PROXY_ADDRESS
    );
    stableTokenContract = new this.web3.eth.Contract(
        STABLE_TOKEN_CONTRACT.abi,
        ALFAJORES_CUSD_ADDRESS
    );

    constructor(){
        this.web3.eth.accounts.wallet.add(this.issuer);
        this.web3.eth.defaultAccount = this.issuer.address
    }

    // TODO: replace with API call to ODIS
    getQuota(): number {return 3}

    async registerAttestation() {
        // setup
        await this.accountsContract.methods.setDataEncryptionKey(DEK_PUBLIC_KEY).send()
    
        // make sure issuer account has sufficient ODIS quota
        if (this.getQuota() <= 0) {
            const TEN_CUSD = this.web3.utils.toWei("10", "ether");
            await this.stableTokenContract.methods.approve(this.issuer.address, TEN_CUSD).send();
            await this.odisPaymentsContract.methods.payInCUSD(this.issuer.address, TEN_CUSD).send();
        }
    
        // get identifier from phone number using ODIS
        const authSigner: AuthSigner = {
            authenticationMethod: AuthenticationMethod.ENCRYPTION_KEY,
            rawKey: DEK_PRIVATE_KEY
        }
        const identifier = await getPhoneNumberIdentifier(
            USER_PHONE_NUMBER,
            this.issuer.address,
            authSigner,
            OdisUtils.Query.getServiceContext('alfajores')
          )
    
        // upload identifier <-> address mapping to onchain registry
        await this.federatedAttestationsContract.methods
            .registerAttestationAsIssuer(
                identifier,
                USER_ACCOUNT,
                NOW_TIMESTAMP
            )
            .send();
    
        // query onchain mappings
        const attestations = await this.federatedAttestationsContract.methods
            .lookupAttestations(identifier, [this.issuer.address])
            .call();
        const identifiers = await this.federatedAttestationsContract.methods
            .lookupIdentifiers(USER_ACCOUNT, [this.issuer.address])
            .call();
    
        console.log({ attestations });
        console.log({ identifiers });
    }
}


const asv2 = new ASv2()
asv2.registerAttestation()