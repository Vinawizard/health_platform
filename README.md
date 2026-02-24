# Health Platform

## Privacy-First IoT Health Monitoring with Blockchain Anchoring and Zero-Knowledge Proofs

---

## 1. What This Project Does

This platform collects real-time health vital signs from IoT sensors (ESP32 and ESP8266 microcontrollers), encrypts them using AES-256-GCM envelope encryption, computes a SHA-256 hash of the encrypted bundle, and anchors that hash on the Cardano preprod testnet as an immutable audit trail. Simultaneously, it generates zero-knowledge proof (ZKP) claims that allow doctors and insurance companies to verify a patient's health status — such as "vitals are normal" or "a hypoxia event occurred" — without ever seeing the actual raw medical values.

The core idea is simple: the patient's exact numbers (e.g., SpO2 = 97.5%) remain private. A doctor only sees "Blood Oxygen: NORMAL". An insurance company only sees "Hypoxia event: VERIFIED". Both can trust these claims because they are backed by cryptographic proofs and blockchain timestamps that cannot be forged.

This project merges two earlier codebases (`health_monitor` for sensor ingestion and `health_api` for encryption and blockchain anchoring) into a single unified backend.

---

## 2. Architecture

```
ESP32 (Sensors)              ESP8266 (SpO2)
  |                            |
  | DS18B20 -> temperature     | MAX30102 -> spo2
  | HW-827  -> pulse bpm       |
  | AD8232  -> ecg waveform    |
  | MQ-135  -> air quality     |
  |                            |
  +------------ HTTP POST -----+
               |
               v
    +------------------------------------------+
    |        FastAPI Backend (Python)           |
    |                                          |
    |  Step 1: Receive sensor data             |
    |  Step 2: Merge if within 2 seconds       |
    |  Step 3: Encrypt payload (AES-256-GCM)   |
    |  Step 4: Hash the ciphertext (SHA-256)   |
    |  Step 5: Store to local JSON or MongoDB  |
    |  Step 6: Generate ZKP proofs (4 circuits)|
    |  Step 7: Anchor hash on Cardano (async)  |
    +-------+---------------------+------------+
            |                     |
            v                     v
    +---------------+    +-------------------+
    |   Cardano     |    |   ZKP Proofs      |
    |   Preprod     |    |   (local storage) |
    |               |    |                   |
    |   data hash   |    |  NORMAL / WARNING |
    |   in metadata |    |  / CRITICAL       |
    |   label 9999  |    |  (no raw values)  |
    |               |    |                   |
    |   immutable   |    |  for doctors and  |
    |   audit trail |    |  insurance cos    |
    +---------------+    +-------------------+
```

**How this works in practice**: The two microcontrollers (ESP32 and ESP8266) each read different sensors and POST their data to the backend every second. The backend has a smart merge window — if two POSTs arrive within 2 seconds of each other, their fields are combined into a single reading (because the ESP32 sends temperature, pulse, ECG, and air quality, while the ESP8266 sends SpO2, and they may arrive at slightly different times).

Once a complete reading is assembled, the backend encrypts the raw sensor values using AES-256-GCM with a randomly generated Data Encryption Key (DEK). That DEK is then wrapped (encrypted) by a Patient Master Key (PMK) — this is called envelope encryption. The encrypted payload (ciphertext + nonce) is hashed with SHA-256, and that hash is submitted as transaction metadata on the Cardano preprod blockchain under label 9999.

At the same time, the backend runs four ZKP circuits against the raw values to classify each vital as NORMAL, WARNING, or CRITICAL. These classifications are stored as proof objects — crucially, the proof objects contain the status but never the raw value. This means a doctor or insurance company can call the proof endpoints and see that "Heart Rate is WARNING" without ever knowing the actual BPM was 110.

---

## 3. Directory Structure

```
health_platform/
|-- README.md                       This file
|-- backend/
    |-- .env                        Environment configuration
    |-- admin.skey                  Cardano wallet signing key (private)
    |-- requirements.txt            Python dependencies
    |-- generate_wallet.py          One-time wallet generator
    |-- test_api.py                 Full pipeline test script
    |
    |-- app/
    |   |-- __init__.py             Package init
    |   |-- main.py                 FastAPI entry point, v2.0
    |   |-- database.py             Storage layer (JSON or MongoDB)
    |   |-- models.py               Pydantic data models
    |   |-- crypto_utils.py         AES-256-GCM encryption + SHA-256
    |   |-- json_store.py           Local JSON file storage engine
    |   |-- cardano_anchoring.py    Cardano preprod tx submission
    |   |-- zkp_engine.py           ZKP proof generation, 4 circuits
    |   |-- routes/
    |       |-- __init__.py
    |       |-- sensors.py          Sensor ingestion pipeline
    |       |-- zkp.py              ZKP proof endpoints
    |
    |-- data/                       Created at runtime
        |-- sensor_readings.json    Encrypted sensor readings
        |-- zk_proofs.json          Generated ZKP proof claims
        |-- chain_events.json       Cardano transaction log
```

**What each file does**:

- `main.py` is the FastAPI application. It registers two routers — one for sensor data ingestion and one for ZKP proof endpoints. It also sets up CORS middleware (allowing the ESP32 and any frontend to connect) and initializes the storage layer on startup.

- `database.py` provides an abstraction over storage. If the environment variable `STORAGE_MODE` is set to `json` (the default), it uses local JSON files in the `data/` directory. If set to `mongo`, it connects to MongoDB via the `motor` async driver. This means you can test everything without needing a MongoDB instance.

- `models.py` defines the Pydantic models for sensor data. `PartialSensorData` allows any field to be optional (because a single POST from ESP32 might not include SpO2, which comes from the ESP8266). `SensorData` requires all fields. `StoredReading` extends the sensor data with encryption fields (ciphertext, nonce, encrypted_dek) and blockchain fields (hash, anchored, cardano_tx_id).

- `crypto_utils.py` handles all cryptographic operations. It generates random 256-bit Data Encryption Keys, encrypts payloads using AES-256-GCM (which provides both confidentiality and integrity), wraps the DEK using a Patient Master Key, and computes SHA-256 hashes of the encrypted bundle.

- `json_store.py` is the local file storage engine. It reads and writes to JSON files in the `data/` directory. It supports saving sensor readings, updating the latest reading (for the 2-second merge), saving chain events, and saving/querying ZKP proofs.

- `cardano_anchoring.py` handles real blockchain transactions. It uses PyCardano to build a transaction containing the reading hash as metadata (under label 9999), signs it with the wallet's signing key, and submits it to the Cardano preprod testnet via the Blockfrost API. The transaction hash is then stored alongside the reading.

- `zkp_engine.py` contains four circuits that classify vitals without exposing raw values. Each circuit takes private inputs (the actual numbers) and produces public outputs (NORMAL/WARNING/CRITICAL status + a proof hash). The `generate_all_proofs()` function runs all circuits on every new reading.

- `sensors.py` is the core ingestion pipeline. When a POST arrives, it: checks for merge eligibility, encrypts, hashes, saves, generates ZKP proofs, and queues Cardano anchoring as a background task (so the ESP32 gets a fast response and doesn't wait for the blockchain).

- `zkp.py` exposes the proof data through REST endpoints — allowing doctors and insurance companies to query health status, request insurance claim verification, and check compliance over time.

---

## 4. Sensor Readings

The platform collects five types of readings from two microcontrollers:

| Sensor | Board | Pin | Field Name | Unit | Normal Range | Warning Range | Critical |
|---|---|---|---|---|---|---|---|
| DS18B20 (Temperature) | ESP32 | GPIO 4 | `temperature_f` | Fahrenheit | 97.0 – 99.5 | 95.0–97.0 or 99.5–100.4 | Below 95.0 or above 100.4 |
| HW-827 (Pulse) | ESP32 | GPIO 34 | `pulse_bpm` | BPM | 60 – 100 | 40–60 or 100–150 | Below 40 or above 150 |
| MAX30102 (SpO2) | ESP8266 | I2C | `spo2_percent` | Percent | 95 – 100 | 90 – 94 | Below 90 |
| MQ-135 (Air Quality) | ESP32 | GPIO 36 | `air_quality_ppm` | PPM | 0 – 400 | 400 – 1000 | Above 1000 |
| AD8232 (ECG) | ESP32 | GPIO 35 | `ecg_wave` | Raw analog (array of 100 values) | Low variance | Medium variance | Flatline or chaotic |

These thresholds are based on standard clinical ranges. They are defined in `zkp_engine.py` under the `THRESHOLDS` dictionary and are used by all four ZKP circuits to classify each vital.

The ESP32 reads temperature, pulse, ECG, and air quality. The ESP8266 reads SpO2 via the MAX30102 sensor over I2C. Both boards send HTTP POST requests to the backend, and the 2-second merge window combines them into a single unified reading.

---

## 5. API Endpoints

### 5.1 Sensor and Blockchain Endpoints

**POST /sensor-data**

Receives sensor data from the IoT devices. This is the main ingestion endpoint. When called, it: merges with the previous reading if within 2 seconds, encrypts the payload, computes the hash, saves to storage, generates ZKP proofs, and queues Cardano anchoring. Returns the reading ID, hash, and number of proofs generated.

**GET /latest-data**

Returns the most recent sensor reading with all fields including raw values, encryption info, hash, and blockchain status (anchored true/false, Cardano tx ID). This endpoint exposes raw data — it would be restricted by authentication in a production system.

**GET /history**

Returns the last 50 sensor readings in reverse chronological order. Each entry includes timestamp, raw vitals, hash, and Cardano anchoring status.

**GET /verify/{record_hash}**

Looks up a specific reading by its SHA-256 hash and returns whether it has been anchored on Cardano, along with the transaction ID and a link to view it on cardanoscan.

### 5.2 Zero-Knowledge Proof Endpoints

These endpoints are what doctors and insurance companies would use. They return health status claims without any raw medical values.

**GET /proofs/latest**

Returns all ZKP proof claims for the most recent sensor reading. This includes individual vital checks (each classified as NORMAL, WARNING, or CRITICAL), the health certificate (combined grade), and any auto-detected insurance claim events. No raw values are included in the response.

**GET /proofs/health-certificate**

Returns a combined health score for the latest reading. The output includes a score (e.g., "3/4"), a letter grade (A through F), per-vital status summaries, and a proof hash. An insurance company would use this to assess whether a patient qualifies for a policy or a premium discount.

**POST /proofs/verify-claim?claim_type=HYPOXIA**

Verifies whether a specific health event occurred. The `claim_type` parameter accepts: `HYPOXIA`, `MILD_HYPOXIA`, `FEVER`, `TACHYCARDIA`, `BRADYCARDIA`, or `AIR_HAZARD`. Returns verified true/false along with the Cardano transaction ID as evidence. An insurance company would use this to validate a claim payout — they can confirm the event happened and is on-chain, but cannot see the exact SpO2 or BPM value.

**GET /proofs/compliance-report?vital=spo2_percent&readings_count=50**

Returns a compliance percentage over the last N readings for a specific vital. For example, "96% of readings in the last 50 were in the safe range for Blood Oxygen." A doctor would use this for ongoing monitoring; an insurance company for compliance verification.

**GET /proofs/all**

Returns every ZKP proof ever generated, across all readings.

**GET /proofs/verify/{proof_hash}**

Looks up a specific proof by its SHA-256 proof hash. Anyone holding a proof hash can verify its authenticity.

**GET /proofs/available-claims**

Lists all supported claim types with their conditions and thresholds, and all supported vitals with their normal ranges. Useful as a reference for API consumers.

The interactive Swagger documentation is available at `http://localhost:8000/docs` when the server is running.

---

## 6. Encryption and Hashing

The security pipeline uses envelope encryption — a standard pattern used by AWS KMS and similar systems.

```
Raw sensor data (plaintext)
    |
    v
[Generate random DEK] --- 256-bit AES key, unique per reading
    |
    v
[AES-256-GCM encrypt] --- payload encrypted with DEK
    |                      produces ciphertext + 12-byte nonce
    v                      auth tag appended to ciphertext
[Wrap DEK with PMK] ------ DEK encrypted with Patient Master Key
    |                      PMK is derived from a seed (would be KMS in prod)
    v
[SHA-256 hash] ----------- hash(timestamp | ciphertext | nonce)
    |                      this hash is what goes on Cardano
    v
[Cardano metadata] ------- submitted as tx metadata under label 9999
                          immutable, timestamped, publicly verifiable
```

AES-256-GCM was chosen because it provides both encryption (confidentiality) and authentication (integrity) — if anyone tampers with the ciphertext, decryption will fail. The SHA-256 hash binds the timestamp, ciphertext, and nonce together, creating a unique fingerprint for each reading that can be independently verified against the blockchain.

---

## 7. ZKP Circuits

The ZKP engine runs four circuits on each reading. In the current implementation, these are computed in Python with SHA-256 proof hashes. The architecture is designed to migrate to real cryptographic ZK proofs on the Midnight blockchain (Cardano's privacy-focused partner chain).

### Circuit 1: vital_range_check

Checks one vital against its clinical thresholds. Produces a status (NORMAL, WARNING, or CRITICAL) and a proof hash. The raw value is never included in the output. This circuit runs once per vital, so a reading with 4 vitals produces 4 proofs.

### Circuit 2: health_certificate

Combines all four vital checks into a single health score. Outputs a score like "3/4" and a letter grade: A (all normal), B (one issue), C (two issues), or F (majority abnormal). Insurance companies use this as a quick health assessment without accessing any individual value.

### Circuit 3: insurance_claim_proof

Verifies whether a specific insurance-claimable event occurred. For example, if a patient claims they experienced hypoxia, this circuit checks whether SpO2 was below 90% and returns verified true/false. It also links the proof to the Cardano transaction that anchored the reading, providing blockchain-backed evidence. The insurance company sees "Hypoxia event verified, Cardano tx: 39a970..." but never sees the actual SpO2 percentage.

This circuit auto-detects claimable events on ingestion. If a reading has SpO2 below 90%, both HYPOXIA and MILD_HYPOXIA proofs are generated automatically.

### Circuit 4: monitoring_compliance

Operates on historical data rather than a single reading. It takes the last N readings and calculates what percentage were in the safe range for a given vital. Output example: "48 out of 50 readings had safe Blood Oxygen levels (96% compliance)." Individual readings are never exposed.

---

## 8. JSON Storage Format

The platform uses three JSON files in the `data/` directory. These serve as a lightweight storage layer for testing without requiring MongoDB.

### sensor_readings.json

Each entry represents one sensor reading with both raw and encrypted data:

```json
{
  "temperature_f": 98.6,
  "pulse_bpm": 72,
  "spo2_percent": 97.5,
  "air_quality_ppm": 300.0,
  "ecg_wave": [500, 500, 700, 500, ...],
  "timestamp": "2026-02-24 07:22:46.861691",
  "ciphertext": "mPwufV3EKAi38osX8fBGxBG...",
  "nonce": "xmzAW+kzQPf05OPe",
  "encrypted_dek": "E3I+ge35cSDZrB62aVsCJT...",
  "hash": "10121291b1a453c39cfb9b4d5fed585a7d5ae76dd56f4427a3d6b65c129c898c",
  "anchored": true,
  "cardano_tx_id": "2022ddfc850a55df3d420218d004d91e4396bc4911d70f87b2debd05b84e129b",
  "_id": "local_2"
}
```

The `ciphertext` is the AES-256-GCM encrypted payload. The `encrypted_dek` is the wrapped Data Encryption Key. The `hash` is what was anchored on Cardano. When `anchored` is `true`, the `cardano_tx_id` points to the real on-chain transaction.

### zk_proofs.json

Each entry is a ZKP proof claim. Note the absence of any raw vital value:

```json
{
  "circuit": "vital_range_check",
  "vital": "spo2_percent",
  "label": "Blood Oxygen (SpO2)",
  "status": "CRITICAL",
  "normal_range": "95-100 %",
  "proof_hash": "22cefc0fca11f051e3fb577fd13d...",
  "reading_hash": "9b57eb6dbbdcb9f0d96ed205f25...",
  "timestamp": "2026-02-24T08:57:05.863132",
  "_id": "proof_3"
}
```

The `reading_hash` links this proof to the corresponding sensor reading and its Cardano transaction. A verifier can follow the chain: proof_hash -> reading_hash -> cardano_tx_id -> cardanoscan.

### chain_events.json

Each entry records a successful Cardano transaction:

```json
{
  "record_hash": "10121291b1a453c39cfb9b4d...",
  "tx_hash": "2022ddfc850a55df3d420218d004d...",
  "timestamp": "2026-02-24T07:22:46.861691",
  "_id": "evt_1"
}
```

---

## 9. Wallet and Blockchain Details

The platform uses the Cardano preprod testnet for anchoring. A wallet was generated using PyCardano and funded via the Cardano testnet faucet.

| Item | Value |
|---|---|
| Network | Cardano Preprod Testnet |
| Wallet Address | `addr_test1vzasxjyws8a0n7xuq0ycmcvzqdf32dqsv7vrkljlkege8fc5m82m7` |
| Signing Key File | `backend/admin.skey` |
| Balance | 10,000 test ADA |
| Blockfrost API Key | Configured in `backend/.env` (preprod key) |
| Metadata Label | 9999 (custom medical telemetry label) |
| Explorer | https://preprod.cardanoscan.io |
| Faucet | https://docs.cardano.org/cardano-testnet/tools/faucet/ |

To view any anchored reading on the blockchain, search the `cardano_tx_id` on the explorer. Under the transaction's Metadata section, you will see label 9999 containing the application name, record type, hash, and timestamp.

### Verified Transactions

These are real transactions on the Cardano preprod testnet, each containing a health reading hash:

| Transaction | Reading |
|---|---|
| [2022ddfc850a...](https://preprod.cardanoscan.io/transaction/2022ddfc850a55df3d420218d004d91e4396bc4911d70f87b2debd05b84e129b) | First anchored reading (temp=98.6, bpm=72) |
| [ddc9e486198f...](https://preprod.cardanoscan.io/transaction/ddc9e486198f3c93f4b9677be08bdc65e62747fd7ad062229b4232e857289e7a) | Swagger UI test reading |
| [35b030d9b119...](https://preprod.cardanoscan.io/transaction/35b030d9b119ecbbf4f71057f60fd74d1a7a4b931b3287a0baef304963938775) | Large-value test reading |
| [39a970255b32...](https://preprod.cardanoscan.io/transaction/39a970255b325c1fc943865ed6998bef2c3564f238fd49ef540af39f4d597ccc) | Unhealthy reading with 8 ZKP proofs |

---

## 10. Quick Start

```bash
# Install dependencies
cd health_platform/backend
pip install -r requirements.txt

# Start the server
python -m uvicorn app.main:app --reload --port 8000

# Open API docs in browser
# http://localhost:8000/docs

# Run the automated test
python test_api.py
```

### Environment Variables

The `.env` file in the backend directory controls configuration:

```
STORAGE_MODE=json                           # "json" for local files, "mongo" for MongoDB
MONGODB_URI=mongodb://localhost:27017       # Only used if STORAGE_MODE=mongo
BLOCKFROST_PROJECT_ID=preprodeFmgdl...      # Blockfrost preprod API key
CARDANO_SKEY_FILE=admin.skey                # Path to wallet signing key
```

### Dependencies

fastapi, uvicorn, pydantic, motor, python-dotenv, cryptography, pycardano, requests, httpx

---

## 11. Verification

Every component of the pipeline has been tested and verified:

| Component | Status | How to verify |
|---|---|---|
| API server starts | Verified | GET http://localhost:8000/ returns endpoint list |
| Sensor data ingestion | Verified | POST /sensor-data returns 201 with hash |
| 2-second merge | Verified | Two rapid POSTs produce one combined reading |
| AES-256-GCM encryption | Verified | `ciphertext` field present in sensor_readings.json |
| SHA-256 hashing | Verified | `hash` field computed for every reading |
| Cardano anchoring | Verified | `anchored: true` with real tx ID, viewable on cardanoscan |
| ZKP proof generation | Verified | POST /sensor-data returns `proofs_generated: 8` |
| ZKP hides raw values | Verified | GET /proofs/latest shows NORMAL/WARNING/CRITICAL only |
| Health certificate | Verified | GET /proofs/health-certificate returns grade C for unhealthy data |
| Insurance claim | Verified | POST /proofs/verify-claim?claim_type=HYPOXIA returns verified: true |
| Compliance report | Verified | GET /proofs/compliance-report returns compliance percentage |

---

## 12. Roadmap

| Phase | Status | Description |
|---|---|---|
| Phase 1 | Complete | Merge projects, encryption, Cardano anchoring, local JSON storage |
| Phase 2 | Complete | ZKP engine with 4 circuits, proof endpoints, auto-proof on ingestion |
| Phase 3 | Planned | Real ZK proofs on Midnight blockchain (Cardano's privacy partner chain) |
| Phase 4 | Planned | Authentication, consent management, scoped data access |
| Phase 5 | Planned | Next.js frontend dashboard for patients and doctors |
