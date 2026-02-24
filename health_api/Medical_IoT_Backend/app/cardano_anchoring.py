import os
import requests
import asyncio
from typing import Optional
from dotenv import load_dotenv
from pycardano import (
    BlockFrostChainContext,
    Network,
    TransactionBuilder,
    TransactionOutput,
    PaymentSigningKey,
    PaymentVerificationKey,
    Address,
    Metadata
)

load_dotenv()

BLOCKFROST_PROJECT_ID = os.getenv("BLOCKFROST_PROJECT_ID", "preprod...")
NETWORK = Network.TESTNET
# Replace with the actual wallet mnemonic or key used to fund these anchoring transactions
SIGNING_KEY_FILE = os.getenv("CARDANO_SKEY_FILE", "admin.skey")
WALLET_ADDR = os.getenv("CARDANO_WALLET_ADDR", "addr_test1...")

def get_chain_context() -> Optional[BlockFrostChainContext]:
    try:
        return BlockFrostChainContext(
            project_id=BLOCKFROST_PROJECT_ID,
            base_url="https://cardano-preprod.blockfrost.io/api/v0",
        )
    except Exception as e:
        print(f"Failed to initialize Blockfrost context: {e}")
        return None

async def anchor_hash_on_cardano(record_hash: str, patient_id: str, ts: str, event_type: str = "INGESTION"):
    """
    Submits a 0-ADA transaction to the Cardano Preprod testnet, embedding
    the medical payload hash as transaction metadata.
    """
    context = get_chain_context()
    if not context:
        return None
        
    try:
        # Load the backend's signing key (that pays the tx fee)
        # Note: In a real environment, load this securely from a vault/KMS
        skey = PaymentSigningKey.load(SIGNING_KEY_FILE)
        vkey = PaymentVerificationKey.from_signing_key(skey)
        admin_address = Address(payment_part=vkey.hash(), network=NETWORK)

        # Build Metadata object
        # Cardano metadata follows CIP-20, label 674 is commonly used for standard text messages,
        # but we can use a custom label like 9999 for medical telemetry
        meta_label = 9999 # Arbitrary label for our protocol
        
        metadata_dict = {
            "evt": event_type,
            "pid": patient_id[:16], # Trucate or pseudonimize
            "hash": record_hash,
            "ts": ts
        }
        
        metadata = Metadata({meta_label: metadata_dict})

        # Build transaction
        builder = TransactionBuilder(context)
        builder.add_input_address(admin_address)
        builder.auxiliary_data = metadata
        
        # Send minimal lovelace to ourselves (to validly format the tx)
        builder.add_output(TransactionOutput(admin_address, 1000000))

        # Sign and Submit
        signed_tx = builder.build_and_sign([skey], change_address=admin_address)
        context.submit_tx(signed_tx.to_cbor())
        
        print(f"Successfully anchored to Cardano! Tx Hash: {signed_tx.id}")
        return str(signed_tx.id)
        
    except Exception as e:
        print(f"Error submitting Cardano tx: {e}")
        return None
