import { OdisUtils } from "@celo/identity";
import {
  AuthSigner,
  OdisContextName,
  ServiceContext,
} from "@celo/identity/lib/odis/query";
import { ContractKit, newKit } from "@celo/contractkit";
import { Account } from "web3-core";

const ALFAJORES_RPC = "https://alfajores-forno.celo-testnet.org";
const ISSUER_PRIVATE_KEY =
  "0x199abda8320f5af0bb51429d246a4e537d1c85fbfaa30d52f9b34df381bd3a95";
class ASv2 {
  kit: ContractKit;
  issuer: Account;
  authSigner: AuthSigner;
  serviceContext: ServiceContext

  constructor(kit: ContractKit) {
    this.kit = kit;
    this.issuer = kit.web3.eth.accounts.privateKeyToAccount(ISSUER_PRIVATE_KEY);
    this.kit.addAccount(ISSUER_PRIVATE_KEY);
    this.kit.defaultAccount = this.issuer.address;
    this.serviceContext = OdisUtils.Query.getServiceContext(OdisContextName.ALFAJORES);
    this.authSigner = {
      authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
      contractKit: this.kit,
    };
  }

  async registerAttestation(phoneNumber: string, account: string, attestationIssuedTime: number) {
    await this.checkAndTopUpODISQuota();

    // get identifier from phone number using ODIS
    const {obfuscatedIdentifier} = await OdisUtils.Identifier.getObfuscatedIdentifier(
      phoneNumber,
      OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
      this.issuer.address,
      this.authSigner,
      this.serviceContext
    )

    const federatedAttestationsContract =
      await this.kit.contracts.getFederatedAttestations();

    // upload identifier <-> address mapping to onchain registry
    await federatedAttestationsContract
      .registerAttestationAsIssuer(obfuscatedIdentifier, account, attestationIssuedTime)
      .send();
  }

  async lookupAddresses(phoneNumber: string) {
    // get identifier from phone number using ODIS
    const {obfuscatedIdentifier} = await OdisUtils.Identifier.getObfuscatedIdentifier(
      phoneNumber,
      OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
      this.issuer.address,
      this.authSigner,
      this.serviceContext
    )

    const federatedAttestationsContract =
      await this.kit.contracts.getFederatedAttestations();

    // query on-chain mappings
    const attestations = await federatedAttestationsContract.lookupAttestations(
      obfuscatedIdentifier,
      [this.issuer.address]
    );

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
      const stableTokenContract = await this.kit.contracts.getStableToken();
      const odisPaymentsContract = await this.kit.contracts.getOdisPayments();

      // give odis payment contract permission to use cUSD
      const currentAllowance = await stableTokenContract.allowance(
        this.issuer.address,
        odisPaymentsContract.address
      );
      console.log("current allowance:", currentAllowance.toString());
      let enoughAllowance: boolean = false;

      const ONE_CENT_CUSD_WEI = this.kit.web3.utils.toWei("0.01", "ether");

      if (currentAllowance.lt(ONE_CENT_CUSD_WEI)) {
        const approvalTxReceipt = await stableTokenContract
          .increaseAllowance(
            odisPaymentsContract.address,
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
        const odisPayment = await odisPaymentsContract
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
  const kit = await newKit(ALFAJORES_RPC);
  const asv2 = new ASv2(kit);
  const userAccount = "0xf14790BAdd2638cECB5e885fc7fAD1b6660AAc34";
  const userPhoneNumber = "+18009099999";
  const timeAttestationWasVerified = Math.floor(new Date().getTime() / 1000);
  try{
      await asv2.registerAttestation(userPhoneNumber, userAccount, timeAttestationWasVerified)
      console.log("attestation registered")
  } catch (err) {
    // mostly likely reason registering would fail is if this issuer has already
    // registered a mapping between this number and account
  }
  console.log(await asv2.lookupAddresses(userPhoneNumber));
})();
