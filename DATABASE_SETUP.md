# Guide de Configuration de Base de Données

## Option 1 : PostgreSQL avec Prisma (Recommandé)

### Installation

```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

### Configuration

1. Créez un fichier `.env` à la racine :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dcc_db?schema=public"
```

2. Définissez votre schéma dans `prisma/schema.prisma` :
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model IncomePlan {
  id              String   @id @default(cuid())
  userId          String
  loanAmount      Float
  currency        String
  riskTolerance   Int
  ltv             Float
  collateralUSD   Float
  collateralBTC   Float
  bitcoinPrice    Float
  createdAt       DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id])
}
```

3. Créez la migration :
```bash
npx prisma migrate dev --name init
npx prisma generate
```

4. Créez un fichier `lib/prisma.js` :
```javascript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## Option 2 : MongoDB avec Mongoose

### Installation

```bash
npm install mongoose
```

### Configuration

1. Créez un fichier `.env` :
```env
MONGODB_URI="mongodb://localhost:27017/dcc_db"
```

2. Créez un fichier `lib/mongodb.js` :
```javascript
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB
```

3. Créez un modèle dans `models/IncomePlan.js` :
```javascript
import mongoose from 'mongoose'

const IncomePlanSchema = new mongoose.Schema({
  loanAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  riskTolerance: { type: Number, required: true },
  ltv: { type: Number, required: true },
  collateralUSD: { type: Number, required: true },
  collateralBTC: { type: Number, required: true },
  bitcoinPrice: { type: Number, required: true },
}, {
  timestamps: true
})

export default mongoose.models.IncomePlan || mongoose.model('IncomePlan', IncomePlanSchema)
```

## Option 3 : Supabase (PostgreSQL hébergé)

### Installation

```bash
npm install @supabase/supabase-js
```

### Configuration

1. Créez un fichier `.env` :
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Créez un fichier `lib/supabase.js` :
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## Exemple d'utilisation dans une API Route

Créez `app/api/income-plans/route.js` :

```javascript
import { prisma } from '@/lib/prisma'
// ou import connectDB from '@/lib/mongodb'
// ou import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const data = await request.json()
    
    // Avec Prisma
    const plan = await prisma.incomePlan.create({
      data: {
        loanAmount: data.loanAmount,
        currency: data.currency,
        riskTolerance: data.riskTolerance,
        ltv: data.ltv,
        collateralUSD: data.collateralUSD,
        collateralBTC: data.collateralBTC,
        bitcoinPrice: data.bitcoinPrice,
      }
    })
    
    return Response.json({ success: true, plan })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Avec Prisma
    const plans = await prisma.incomePlan.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    return Response.json({ plans })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

## Utilisation dans un composant

```javascript
"use client"
import { useState } from 'react'

export default function SavePlan() {
  const [loading, setLoading] = useState(false)
  
  const savePlan = async (formData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/income-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await response.json()
      console.log('Plan saved:', data)
    } catch (error) {
      console.error('Error saving plan:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <button onClick={() => savePlan(data)} disabled={loading}>
      {loading ? 'Saving...' : 'Save Plan'}
    </button>
  )
}
```

## DCC instruments, snapshots, and reports (MySQL)

After adding the DCC models (`Instrument`, `InstrumentSnapshot`, `DatasetVersion`, `SuitabilityReport`) to `prisma/schema.prisma`:

1. **Run migration** (with MySQL running):
   ```bash
   npx prisma migrate dev --name add_dcc_instruments_snapshots_reports
   ```

2. **Seed the 1A/1B/1C dataset**:
   ```bash
   npx prisma db seed
   ```

3. **Generate Prisma client** (if needed):
   ```bash
   npx prisma generate
   ```
