"""
Generate a Cardano Preprod Testnet wallet.
Run this once, then fund the address at the Cardano faucet.
"""
from pycardano import PaymentSigningKey, PaymentVerificationKey, Address, Network
import os


def generate_wallet():
    skey_path = "admin.skey"

    # If wallet already exists, just show the address
    if os.path.exists(skey_path):
        print("Wallet already exists! Loading existing key...\n")
        skey = PaymentSigningKey.load(skey_path)
    else:
        print("Generating a new Cardano Preprod Wallet...\n")
        skey = PaymentSigningKey.generate()
        skey.save(skey_path)

    vkey = PaymentVerificationKey.from_signing_key(skey)
    address = Address(payment_part=vkey.hash(), network=Network.TESTNET)

    print("=" * 60)
    print(f"  ADDRESS: {address}")
    print("=" * 60)
    print(f"\n  Signing key saved to: {os.path.abspath(skey_path)}")
    print(f"\n  NEXT STEPS:")
    print(f"  1. Copy the address above")
    print(f"  2. Go to: https://docs.cardano.org/cardano-testnet/tools/faucet/")
    print(f"  3. Select 'Preprod' network")
    print(f"  4. Paste the address and request test ADA")
    print(f"  5. Set your BLOCKFROST_PROJECT_ID in .env (preprod key from blockfrost.io)")
    print("=" * 60)


if __name__ == "__main__":
    generate_wallet()
