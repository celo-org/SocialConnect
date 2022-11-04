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
import { AuthSigner } from "@celo/identity/lib/odis/query";

const ISSUER_PRIVATE_KEY = "0x726e53db4f0a79dfd63f58b19874896fce3748fcb80874665e0c147369c04a37";
const DEK_PUBLIC_KEY = "0x026063780c81991c032fb4fa7485c6607b7542e048ef85d08516fe5c4482360e4b";
const DEK_PRIVATE_KEY = "0xc2bbdabb440141efed205497a41d5fb6114e0435fd541e368dc628a8e086bfee";

const ALFAJORES_RPC = "https://alfajores-forno.celo-testnet.org";

class ASv2 {
    web3 = new Web3(ALFAJORES_RPC);
    issuer = this.web3.eth.accounts.privateKeyToAccount(ISSUER_PRIVATE_KEY);
    authSigner: AuthSigner = {
        authenticationMethod: OdisUtils.Query.AuthenticationMethod.ENCRYPTION_KEY,
        rawKey: DEK_PRIVATE_KEY
    }
    
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
        this.accountsContract.methods.setAccountDataEncryptionKey(DEK_PUBLIC_KEY).send({from: this.issuer.address, gas: 50000})
    }

    async registerAttestation(phoneNumber: string, account: string, attestationIssuedTime: number) {
        // TODO: once the new version of ODIS has been deployed, issuers will need to
        // ensure their account has sufficient ODIS quota
        // if (getQuotaStatus(this.issuer.address) <= 0) {
        //     const TEN_CUSD = this.web3.utils.toWei("10", "ether");
        //     await this.stableTokenContract.methods.approve(this.issuer.address, TEN_CUSD).send({from: this.issuer.address, gas: 500000});
        //     await this.odisPaymentsContract.methods.payInCUSD(this.issuer.address, TEN_CUSD).send({from: this.issuer.address,gas: 500000});
        // }
    
        // get identifier from phone number using ODIS
        const identifier = (await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
            phoneNumber,
            this.issuer.address,
            this.authSigner,
            OdisUtils.Query.getServiceContext('alfajores')
          )).phoneHash
    
        // upload identifier <-> address mapping to onchain registry
        await this.federatedAttestationsContract.methods
            .registerAttestationAsIssuer(
                identifier,
                account,
                attestationIssuedTime
            )
            .send({from: this.issuer.address, gas: 50000});
    }

    async lookupAddresses(phoneNumber: string){
        // get identifier from phone number using ODIS
        const identifier = (await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
            phoneNumber,
            this.issuer.address,
            this.authSigner,
            OdisUtils.Query.getServiceContext('alfajores')
          )).phoneHash
    
    
        // query onchain mappings
        const attestations = await this.federatedAttestationsContract.methods
            .lookupAttestations(identifier, [this.issuer.address])
            .call();

        return attestations.accounts
    }
}

(async () => {
    const asv2 = new ASv2()
    const userAccount = "0xf14790BAdd2638cECB5e885fc7fAD1b6660AAc34";
    const userPhoneNumber = "+18009099999";
    const timeAttestationWasVerified = Math.floor(new Date().getTime() / 1000);
    try{
        await asv2.registerAttestation(userPhoneNumber, userAccount, timeAttestationWasVerified)
    } catch(err){
        // mostly likely reason registering would fail is if this issuer has already
        // registered a mapping between this number and account
    }
    console.log(await asv2.lookupAddresses(userPhoneNumber))
})()
