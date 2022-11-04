import { OdisUtils } from "@celo/identity";
import {
  AuthenticationMethod,
  AuthSigner,
} from "@celo/identity/lib/odis/query";
import { ContractKit, newKit } from "@celo/contractkit";
import { Account } from "web3-core";

const USER_ACCOUNT = "0xf14790BAdd2638cECB5e885fc7fAD1b6660AAc34";
const USER_PHONE_NUMBER = "+180090994000";
const ALFAJORES_RPC = "https://alfajores-forno.celo-testnet.org";
const ISSUER_PRIVATE_KEY =
  "0x199abda8320f5af0bb51429d246a4e537d1c85fbfaa30d52f9b34df381bd3a95";

const NOW_TIMESTAMP = Math.floor(new Date().getTime() / 1000);

class ASv2 {
  kit: ContractKit;
  issuer: Account;
  authSigner: AuthSigner;

  constructor(kit: ContractKit) {
    this.kit = kit;
    this.issuer = kit.web3.eth.accounts.privateKeyToAccount(ISSUER_PRIVATE_KEY);
    this.kit.addAccount(ISSUER_PRIVATE_KEY);
    this.kit.defaultAccount = this.issuer.address;

    this.authSigner = {
      authenticationMethod: AuthenticationMethod.WALLET_KEY,
      // @ts-ignore -> package version mismatch (script uses "@celo/contractkit": "2.3.0-beta.1" to access new wrappers)
      contractKit: this.kit,
    };
  }

  async registerAttestation(phoneNumber: string, account: string) {
    // TODO: once the new version of ODIS has been deployed, issuers will need to
    // ensure their account has sufficient ODIS quota
    // if (getQuotaStatus(this.issuer.address) <= 0) {
    //   const stableTokenContract = await this.kit.contracts.getStableToken();
    //   const odisPaymentsContract = await this.kit.contracts.getOdisPayments();
    //   const TEN_CUSD = this.kit.web3.utils.toWei("10", "ether");
    //   await stableTokenContract.approve(this.issuer.address, TEN_CUSD).send();
    //   await odisPaymentsContract
    //     .payInCUSD(this.issuer.address, TEN_CUSD)
    //     .send();
    // }

    // get identifier from phone number using ODIS
    const identifier = (
      await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
        phoneNumber,
        this.issuer.address,
        this.authSigner,
        OdisUtils.Query.getServiceContext("alfajores")
      )
    ).phoneHash;

    const federatedAttestationsContract =
      await this.kit.contracts.getFederatedAttestations();

    // upload identifier <-> address mapping to onchain registry
    await federatedAttestationsContract
      .registerAttestationAsIssuer(identifier, account, NOW_TIMESTAMP)
      .send();
  }

  async lookupAddresses(phoneNumber: string) {
    // get identifier from phone number using ODIS
    const identifier = (
      await OdisUtils.PhoneNumberIdentifier.getPhoneNumberIdentifier(
        phoneNumber,
        this.issuer.address,
        this.authSigner,
        OdisUtils.Query.getServiceContext("alfajores")
      )
    ).phoneHash;

    const federatedAttestationsContract =
      await this.kit.contracts.getFederatedAttestations();

    // query on-chain mappings
    const attestations = await federatedAttestationsContract.lookupAttestations(
      identifier,
      [this.issuer.address]
    );

    return attestations.accounts;
  }
}

(async () => {
  const kit = await newKit(ALFAJORES_RPC);
  const asv2 = new ASv2(kit);
  try {
    await asv2.registerAttestation(USER_PHONE_NUMBER, USER_ACCOUNT);
  } catch (err) {
    // mostly likely reason registering would fail is if this issuer has already
    // registered a mapping between this number and account
  }
  console.log(await asv2.lookupAddresses(USER_PHONE_NUMBER));
})();
