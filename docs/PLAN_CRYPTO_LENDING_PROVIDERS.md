# Crypto Lending Providers – Plan (updated: apyMin / apyMax)

## Schema change vs original plan

- **Use `apyMin` and `apyMax`** (Decimal or Float, optional, in %) instead of a single `apyRange` string.
- Example: APY 4%–8% → `apyMin: 4`, `apyMax: 8`.

---

## 1. Database model (Prisma)

- **provider** – String (e.g. "Nexo") – required  
- **type** – String (e.g. "DeFi", "CeFi") – required  
- **apyMin** – Decimal? (e.g. 4 for 4%)  
- **apyMax** – Decimal? (e.g. 8 for 8%)  
- **hv30Pct** – Decimal? (e.g. 8 for 8%)  
- **liquidity** – String?  
- **comment** – String? (Text)  
- **createdAt** / **updatedAt**

---

## 2. API

- **GET/POST** `api/crypto-lending-providers`: accept and return `apyMin`, `apyMax` (numbers), not `apyRange`.
- **PATCH** `api/crypto-lending-providers/[id]`: same fields.
- **POST** `api/crypto-lending-providers/sync`: ChatGPT prompt must ask for a JSON array with **apyMin** and **apyMax** (numbers) per provider instead of `apyRange`. Parse and persist `apyMin` / `apyMax`.

---

## 3. Admin UI

- Table columns: Provider, Type, **APY (min–max)** (display as e.g. `${apyMin}% – ${apyMax}%` or "—" if null).
- Create/Edit form: two inputs **APY min (%)** and **APY max (%)** (numeric), no single "APY range" text field.
- TAB_CONFIG sortKeys/filterKeys: use `apyMin`, `apyMax` instead of `apyRange`.

---

All other aspects of the original plan (sync button, OpenAI, CRUD, stats, English content) unchanged.
