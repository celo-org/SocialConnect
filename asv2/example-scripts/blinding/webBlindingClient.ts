import { randomBytes } from 'crypto'
import thresholdBls from 'blind-threshold-bls'
import { BlsBlindingClient } from '@celo/identity/lib/odis/bls-blinding-client'

interface BlindedMessage {
  blindingFactor: Uint8Array
  message: Uint8Array
}

export class WebBlsBlindingClient implements BlsBlindingClient {
  private odisPubKey: Uint8Array
  private blindedValue: BlindedMessage | undefined
  private rawMessage: Buffer | undefined

  constructor(odisPubKey: string) {
    this.odisPubKey = Buffer.from(odisPubKey, 'base64')
    this.init()
  }

  async init(){
    await thresholdBls.init("/blind_threshold_bls_bg.wasm")
  }

  async blindMessage(base64PhoneNumber: string, seed?: Buffer): Promise<string> {
    const userSeed = seed ?? randomBytes(32)
    if (!seed) {
      console.warn(
        'Warning: Use a private deterministic seed (e.g. DEK private key) to preserve user quota when requests are replayed.'
      )
    }
    this.rawMessage = Buffer.from(base64PhoneNumber, 'base64')
    this.blindedValue = await thresholdBls.blind(this.rawMessage, userSeed)
    const blindedMessage = this.blindedValue.message
    return Buffer.from(blindedMessage).toString('base64')
  }

  async unblindAndVerifyMessage(base64BlindSig: string): Promise<string> {
    if (!this.rawMessage || !this.blindedValue) {
      throw new Error('Must call blind before unblinding')
    }

    const blindedSignature = Buffer.from(base64BlindSig, 'base64')
    const unblindMessage = await thresholdBls.unblind(
      blindedSignature,
      this.blindedValue.blindingFactor
    )
    // this throws on error
    await thresholdBls.verify(this.odisPubKey, this.rawMessage, unblindMessage)
    return Buffer.from(unblindMessage).toString('base64')
  }
}
