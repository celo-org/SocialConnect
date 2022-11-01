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
import { OdisUtils } from "@celo/identity";
import {
  AuthenticationMethod,
  AuthSigner,
} from "@celo/identity/lib/odis/query";
import { ethers, Wallet } from "ethers";

const USER_ACCOUNT = "0xf14790BAdd2638cECB5e885fc7fAD1b6660AAc34";
const USER_PHONE_NUMBER = "+18009099991";

const ISSUER_PRIVATE_KEY =
  "0x726e53db4f0a79dfd63f58b19874896fce3748fcb80874665e0c147369c04a37";
const DEK_PUBLIC_KEY =
  "0x026063780c81991c032fb4fa7485c6607b7542e048ef85d08516fe5c4482360e4b";
const DEK_PRIVATE_KEY =
  "0xc2bbdabb440141efed205497a41d5fb6114e0435fd541e368dc628a8e086bfee";

const ALFAJORES_RPC = "https://alfajores-forno.celo-testnet.org";

const NOW_TIMESTAMP = Math.floor(new Date().getTime() / 1000);

class ASv2 {
  provider = new ethers.providers.JsonRpcProvider(ALFAJORES_RPC);
  wallet = new Wallet(ISSUER_PRIVATE_KEY, this.provider);

  authSigner: AuthSigner = {
    authenticationMethod: AuthenticationMethod.ENCRYPTION_KEY,
    rawKey: DEK_PRIVATE_KEY,
  };

  /** Contracts **/
  accountsContract = new ethers.Contract(
    ACCOUNTS_PROXY_ADDRESS,
    ACCOUNTS_CONTRACT.abi,
    this.wallet
  );
  federatedAttestationsContract = new ethers.Contract(
    FA_PROXY_ADDRESS,
    FA_CONTRACT.abi,
    this.wallet
  );
  odisPaymentsContract = new ethers.Contract(
    ODIS_PAYMENTS_PROXY_ADDRESS,
    ODIS_PAYMENTS_CONTRACT.abi,
    this.wallet
  );
  stableTokenContract = new ethers.Contract(
    ALFAJORES_CUSD_ADDRESS,
    STABLE_TOKEN_CONTRACT.abi,
    this.wallet
  );

  constructor() {
    this.accountsContract.setAccountDataEncryptionKey(DEK_PUBLIC_KEY);
  }

  async registerAttestation(phoneNumber: string, account: string) {
    // TODO: once the new version of ODIS has been deployed, issuers will need to
    // ensure their account has sufficient ODIS quota
    // if (getQuotaStatus(this.wallet.address) <= 0) {
    //   const TEN_CUSD = ethers.utils.formatUnits("10", "ether");
    //   await this.stableTokenContract.approve(this.wallet.address, TEN_CUSD);
    //   await this.odisPaymentsContract.payInCUSD(this.wallet.address, TEN_CUSD);
    // }

    // get identifier from phone number using ODIS
    const identifier = (
      await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
        phoneNumber,
        this.wallet.address,
        this.authSigner,
        OdisUtils.Query.getServiceContext("alfajores")
      )
    ).phoneHash;

    // upload identifier <-> address mapping to onchain registry
    await this.federatedAttestationsContract.registerAttestationAsIssuer(
      identifier,
      account,
      NOW_TIMESTAMP
    );
  }

  async lookupAddresses(phoneNumber: string) {
    // get identifier from phone number using ODIS
    const identifier = (
      await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
        phoneNumber,
        this.wallet.address,
        this.authSigner,
        OdisUtils.Query.getServiceContext("alfajores")
      )
    ).phoneHash;

    // query onchain mappings
    const attestations =
      await this.federatedAttestationsContract.lookupAttestations(identifier, [
        this.wallet.address,
      ]);

    return attestations.accounts;
  }
}

(async () => {
  const asv2 = new ASv2();
  try {
    await asv2.registerAttestation(USER_PHONE_NUMBER, USER_ACCOUNT);
  } catch (err) {
    // mostly likely reason registering would fail is if this issuer has already
    // registered a mapping between this number and account
  }
  console.log(await asv2.lookupAddresses(USER_PHONE_NUMBER));
})();
