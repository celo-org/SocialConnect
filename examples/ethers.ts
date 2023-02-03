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
  OdisContextName,
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
  issuer = new Wallet(ISSUER_PRIVATE_KEY, this.provider);
  serviceContext = OdisUtils.Query.getServiceContext(OdisContextName.ALFAJORES);

  authSigner: AuthSigner = {
    authenticationMethod: AuthenticationMethod.ENCRYPTION_KEY,
    rawKey: DEK_PRIVATE_KEY,
  };

  /** Contracts **/
  accountsContract = new ethers.Contract(
    ACCOUNTS_PROXY_ADDRESS,
    ACCOUNTS_CONTRACT.abi,
    this.issuer
  );
  federatedAttestationsContract = new ethers.Contract(
    FA_PROXY_ADDRESS,
    FA_CONTRACT.abi,
    this.issuer
  );
  odisPaymentsContract = new ethers.Contract(
    ODIS_PAYMENTS_PROXY_ADDRESS,
    ODIS_PAYMENTS_CONTRACT.abi,
    this.issuer
  );
  stableTokenContract = new ethers.Contract(
    ALFAJORES_CUSD_ADDRESS,
    STABLE_TOKEN_CONTRACT.abi,
    this.issuer
  );

  constructor() {
    this.accountsContract.setAccountDataEncryptionKey(DEK_PUBLIC_KEY);
  }

  async registerAttestation(phoneNumber: string, account: string) {
    await this.checkAndTopUpODISQuota();

    // get identifier from phone number using ODIS
    const obfuscatedIdentifier = (
      await OdisUtils.Identifier.getObfuscatedIdentifier(
        phoneNumber,
        OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
        this.issuer.address,
        this.authSigner,
        this.serviceContext
      )
    ).obfuscatedIdentifier;

    // upload identifier <-> address mapping to onchain registry
    await this.federatedAttestationsContract.registerAttestationAsIssuer(
      obfuscatedIdentifier,
      account,
      NOW_TIMESTAMP
    );
  }

  async lookupAddresses(phoneNumber: string) {
    // get identifier from phone number using ODIS
    const obfuscatedIdentifier = (
      await OdisUtils.Identifier.getObfuscatedIdentifier(
        phoneNumber,
        OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
        this.issuer.address,
        this.authSigner,
        this.serviceContext
      )
    ).obfuscatedIdentifier;

    // query onchain mappings
    const attestations =
      await this.federatedAttestationsContract.lookupAttestations(obfuscatedIdentifier, [
        this.issuer.address,
      ]);

    return attestations.accounts;
  }

  private async checkAndTopUpODISQuota() {
    //check remaining quota
    const { remainingQuota } = await OdisUtils.Quota.getPnpQuotaStatus(
      this.issuer.address,
      this.authSigner,
      this.serviceContext
    );

    console.log("remaining ODIS quota", remainingQuota);
    if (remainingQuota < 1) {
      // give odis payment contract permission to use cUSD
      const currentAllowance = await this.stableTokenContract.allowance(
        this.issuer.address,
        this.odisPaymentsContract.address
      );
      console.log("current allowance:", currentAllowance.toString());
      let enoughAllowance: boolean = false;

      const ONE_CENT_CUSD_WEI = ethers.utils.parseEther("0.01");

      if (ONE_CENT_CUSD_WEI.gt(currentAllowance)) {
        const approvalTxReceipt = await this.stableTokenContract
          .increaseAllowance(
            this.odisPaymentsContract.address,
            ONE_CENT_CUSD_WEI
          )
          .sendAndWaitForReceipt();
        console.log("approval status", approvalTxReceipt.status);
        enoughAllowance = approvalTxReceipt.status;
      } else {
        enoughAllowance = true;
      }

      // increase quota
      if (enoughAllowance) {
        const odisPayment = await this.odisPaymentsContract
          .payInCUSD(this.issuer.address, ONE_CENT_CUSD_WEI)
          .sendAndWaitForReceipt();
        console.log("odis payment tx status:", odisPayment.status);
        console.log("odis payment tx hash:", odisPayment.transactionHash);
      } else {
        throw "cUSD approval failed";
      }
    }
  }
}

(async () => {
  const asv2 = new ASv2();
  try {
    await asv2.registerAttestation(USER_PHONE_NUMBER, USER_ACCOUNT);
    console.log("attestation registered")
  } catch (err) {
    // mostly likely reason registering would fail is if this issuer has already
    // registered a mapping between this number and account
  }
  console.log(await asv2.lookupAddresses(USER_PHONE_NUMBER));
})();
