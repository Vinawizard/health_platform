"""
Cardano Preprod Testnet Anchoring — submits SHA-256 hash as transaction metadata.
Uses PyCardano + Blockfrost API.
"""
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

BLOCKFROST_PROJECT_ID = os.getenv("BLOCKFROST_PROJECT_ID", "")
SIGNING_KEY_FILE = os.getenv("CARDANO_SKEY_FILE", "admin.skey")


def get_chain_context():
    """Create a Blockfrost chain context for Cardano preprod."""
    if not BLOCKFROST_PROJECT_ID:
        print("⚠️  No BLOCKFROST_PROJECT_ID set — skipping Cardano anchoring")
        return None

    try:
        from pycardano import BlockFrostChainContext
        return BlockFrostChainContext(
            project_id=BLOCKFROST_PROJECT_ID,
            base_url="https://cardano-preprod.blockfrost.io/api",
        )
    except Exception as e:
        print(f"❌ Failed to connect to Blockfrost: {e}")
        return None


async def anchor_hash_on_cardano(record_hash: str, timestamp: str) -> Optional[str]:
    """
    Submit a transaction to Cardano Preprod testnet with the record hash as metadata.
    Returns the tx hash if successful, None otherwise.
    """
    context = get_chain_context()
    if not context:
        return None

    try:
        from pycardano import (
            TransactionBuilder,
            TransactionOutput,
            PaymentSigningKey,
            PaymentVerificationKey,
            Address,
            AuxiliaryData,
            Metadata,
            Network,
        )

        # Load signing key
        skey = PaymentSigningKey.load(SIGNING_KEY_FILE)
        vkey = PaymentVerificationKey.from_signing_key(skey)
        admin_address = Address(payment_part=vkey.hash(), network=Network.TESTNET)

        # Metadata label 9999 — our custom medical telemetry label
        metadata_dict = {
            "app": "health_platform",
            "type": "SENSOR_READING",
            "hash": record_hash,
            "ts": timestamp[:64],  # Cardano metadata has size limits
        }

        metadata = Metadata({9999: metadata_dict})
        auxiliary_data = AuxiliaryData(data=metadata)

        # Build transaction
        builder = TransactionBuilder(context)
        builder.add_input_address(admin_address)
        builder.auxiliary_data = auxiliary_data

        # Send minimum ADA to ourselves (tx must have an output)
        builder.add_output(TransactionOutput(admin_address, 1_000_000))

        # Sign and submit
        signed_tx = builder.build_and_sign([skey], change_address=admin_address)
        context.submit_tx(signed_tx.to_cbor())

        tx_hash = str(signed_tx.id)
        print(f"✅ Anchored on Cardano! Tx: {tx_hash}")
        print(f"   View: https://preprod.cardanoscan.io/transaction/{tx_hash}")
        return tx_hash

    except Exception as e:
        print(f"❌ Cardano anchoring failed: {e}")
        return None
