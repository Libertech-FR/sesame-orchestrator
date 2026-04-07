import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { verify as argon2Verify, hash as argon2Hash } from 'argon2'
import crypto from 'node:crypto'
import { Model, Types } from 'mongoose'
import { PasswordHistory, PasswordHistoryDocument } from './_schemas/password-history.schema'
import { PasswdadmService } from '~/settings/passwdadm.service'

type PasswordHistorySource = 'change' | 'reset' | 'force'

@Injectable()
export class PasswordHistoryService {
  private readonly logger = new Logger(PasswordHistoryService.name)

  public constructor(
    @InjectModel(PasswordHistory.name) public readonly model: Model<PasswordHistoryDocument>,
    private readonly passwdadmService: PasswdadmService,
    private readonly configService: ConfigService,
  ) {}

  public async assertNotReused(identityId: Types.ObjectId, newPassword: string): Promise<void> {
    const policies: any = await this.passwdadmService.getPolicies()
    if (!policies?.passwordHistoryEnabled) return

    const historyCount = Number(policies?.passwordHistoryCount || 0)
    if (!Number.isFinite(historyCount) || historyCount <= 0) return

    const lastEntries = await this.model
      .find({ identityId })
      .sort({ createdAt: -1 })
      .limit(historyCount)
      .select({ passwordHash: 1 })
      .lean()

    for (const entry of lastEntries) {
      if (!entry?.passwordHash) continue
      const matches = await argon2Verify(entry.passwordHash, newPassword)
      if (matches) {
        throw new BadRequestException({
          message: 'Le mot de passe a déjà été utilisé récemment',
          error: 'Bad Request',
          statusCode: 400,
        })
      }
    }
  }

  public async recordPassword(identityId: Types.ObjectId, password: string, source: PasswordHistorySource): Promise<void> {
    const policies: any = await this.passwdadmService.getPolicies()
    if (!policies?.passwordHistoryEnabled) return

    const historyCount = Number(policies?.passwordHistoryCount || 0)
    const ttlSeconds = Number(policies?.passwordHistoryTtlSeconds || 0)

    const now = new Date()
    const expiresAt = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? new Date(now.getTime() + ttlSeconds * 1000) : null

    const passwordHash = await argon2Hash(password)

    let hibpSha1Enc: string | null = null
    if (policies?.pwnedRecheckEnabled) {
      try {
        const sha1 = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()
        hibpSha1Enc = this.encryptHibpSha1(sha1)
      } catch (e) {
        this.logger.warn(`Unable to encrypt HIBP sha1 for identity <${identityId.toHexString()}>: ${e?.message || e}`)
        hibpSha1Enc = null
      }
    }

    await this.model.create({
      identityId,
      passwordHash,
      hibpSha1Enc,
      source,
      expiresAt,
    })

    if (Number.isFinite(historyCount) && historyCount > 0) {
      await this.enforceMaxHistory(identityId, historyCount)
    }
  }

  public async enforceMaxHistory(identityId: Types.ObjectId, max: number): Promise<void> {
    const boundedMax = Math.max(Math.floor(max || 0), 0)
    if (boundedMax <= 0) return

    const extraIds = await this.model
      .find({ identityId })
      .sort({ createdAt: -1 })
      .skip(boundedMax)
      .select({ _id: 1 })
      .lean()

    if (!extraIds?.length) return
    await this.model.deleteMany({ _id: { $in: extraIds.map((d) => d._id) } })
  }

  public decryptHibpSha1(enc: string): string {
    const key = this.getHibpEncryptionKey()
    const parts = (enc || '').split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format')
    }
    const [ivB64, tagB64, dataB64] = parts
    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const encrypted = Buffer.from(dataB64, 'base64')

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    return plaintext
  }

  private encryptHibpSha1(sha1: string): string {
    const key = this.getHibpEncryptionKey()
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(sha1, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
  }

  private getHibpEncryptionKey(): Buffer {
    const raw = this.configService.get<string>('SESAME_PASSWORD_HISTORY_HIBP_KEY') || ''
    if (!raw) {
      this.logger.error('Missing encryption key SESAME_PASSWORD_HISTORY_HIBP_KEY')
      throw new Error('Missing SESAME_PASSWORD_HISTORY_HIBP_KEY')
    }

    const trimmed = raw.trim()
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, 'hex')
    }
    const buf = Buffer.from(trimmed, 'base64')
    if (buf.length !== 32) {
      throw new Error('SESAME_PASSWORD_HISTORY_HIBP_KEY must be 32 bytes (base64) or 64 hex chars')
    }
    return buf
  }
}

