import os
from pycardano import PaymentSigningKey, PaymentVerificationKey, Address, Network

def generate_wallet():
    print("Generating a new Cardano Testnet Wallet...\n")
    
    # Generate a new payment signing key
    skey = PaymentSigningKey.generate()
    
    # Derive the verification (public) key
    vkey = PaymentVerificationKey.from_signing_key(skey)
    
    # Create the testnet address
    address = Address(payment_part=vkey.hash(), network=Network.TESTNET)
    
    # Save the signing key to a file so our FastAPI app can use it
    skey_file_path = "admin.skey"
    skey.save(skey_file_path)
    
    print("✅ Wallet Generated Successfully!")
    print(f"Address: {address}")
    print(f"Signing Key saved to: {os.path.abspath(skey_file_path)}\n")
    
    print("--------------------------------------------------")
    print("NEXT STEPS:")
    print("1. Copy the Address above.")
    print("2. Go to the Cardano Preprod Faucet: https://docs.cardano.org/cardano-testnet/tools/faucet/")
    print("3. Request test ADA to this address.")
    print("4. You can now use this wallet for the anchoring transactions!")
    print("--------------------------------------------------")

if __name__ == "__main__":
    generate_wallet()
