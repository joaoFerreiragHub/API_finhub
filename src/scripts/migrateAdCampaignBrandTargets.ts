import '../config/env'
import mongoose from 'mongoose'
import { DirectoryEntry } from '../models/DirectoryEntry'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finhub'
const APPLY = process.argv.includes('--apply')

const log = (message: string) => {
  console.log(`[migrate:ads:brand-targets] ${message}`)
}

const run = async () => {
  await mongoose.connect(MONGODB_URI)
  log(`Mongo ligado (${mongoose.connection.host})`)

  const collection = mongoose.connection.collection('adcampaigns')
  const campaigns = await collection
    .find({
      sponsorType: 'brand',
      brand: { $exists: true, $ne: null },
    })
    .toArray()

  log(`Campanhas sponsorType=brand com campo legacy "brand": ${campaigns.length}`)
  if (!APPLY) {
    log('Modo dry-run ativo (usa --apply para persistir alteracoes).')
  }

  let updated = 0
  let unresolved = 0
  let conflicts = 0

  for (const campaign of campaigns) {
    const campaignId = String(campaign._id)
    const legacyBrandRaw = campaign.brand
    if (!legacyBrandRaw) {
      unresolved += 1
      log(`Campanha ${campaignId} sem brand valido - ignorada.`)
      continue
    }

    const legacyBrandId = String(legacyBrandRaw)
    const mappedDirectory = await DirectoryEntry.findOne({
      'metadata.legacyBrandId': legacyBrandId,
    })
      .select('_id slug')
      .lean()

    if (!mappedDirectory) {
      unresolved += 1
      log(`Sem mapeamento para brandId ${legacyBrandId} (campanha ${campaignId}).`)
      continue
    }

    const mappedDirectoryId = String(mappedDirectory._id)
    const existingDirectoryId = campaign.directoryEntry ? String(campaign.directoryEntry) : null
    if (existingDirectoryId && existingDirectoryId !== mappedDirectoryId) {
      conflicts += 1
      log(
        `Conflito campanha ${campaignId}: directoryEntry atual=${existingDirectoryId}, mapeado=${mappedDirectoryId}.`
      )
      continue
    }

    if (!APPLY) {
      updated += 1
      continue
    }

    await collection.updateOne(
      { _id: campaign._id },
      {
        $set: {
          directoryEntry: new mongoose.Types.ObjectId(mappedDirectoryId),
          updatedAt: new Date(),
        },
        $unset: { brand: '' },
      }
    )
    updated += 1
  }

  log(`Resumo: updated=${updated} unresolved=${unresolved} conflicts=${conflicts}`)

  await mongoose.disconnect()
  log('Mongo desligado')
}

run().catch(async (error) => {
  console.error('[migrate:ads:brand-targets] ERRO:', error)
  try {
    await mongoose.disconnect()
  } catch {
    // no-op
  }
  process.exitCode = 1
})
