import microdiff, { Difference } from "microdiff"
import { Query, Schema, Model, Document, Types } from 'mongoose'
import { Audits } from '~/core/audits/_schemas/audits.schema'
import * as _ from 'radash'
import { RequestContext } from "nestjs-request-context"
import { Logger } from "@nestjs/common"

export const HISTORY_PLUGIN_BEFORE_KEY = '_auditBefore'

export type ChangesType = Difference & {
  type: "REMOVE" | "CHANGE" | "CREATE"
  path: string
  oldValue?: any
  value?: any
}

export enum AuditOperation {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  REPLACE = 'replace',
}

type QueryResultType<T> = T extends Query<infer ResultType, any> ? ResultType : never;

export interface HistoryPluginOptions {
  /**
   * The name of the MongoDB collection; defaults to the Mongoose model's collection name
   */
  collectionName: string

  /**
   * The Mongoose model name for audits; defaults to the Nest model name for Audits
   */
  auditsModelName?: string

  /**
   * Fields to ignore when determining if changes should be audited.
   * If only these fields changed, the audit event will be skipped.
   */
  ignoredFields?: string[]
}

function detectChanges<T = Query<any, any>>(
  before: QueryResultType<T> & { toObject?: Function },
  after: QueryResultType<T> & { toObject?: Function },
  options?: HistoryPluginOptions,
): [boolean, ChangesType[]] {
  before = before ?? {} as any
  after = after ?? {} as any
  const ignoredFields = options?.ignoredFields || []

  const beforeForComparison = JSON.parse(JSON.stringify(
    before?.toObject ? before.toObject() : before,
  ))
  const afterForComparison = JSON.parse(JSON.stringify(
    after?.toObject ? after.toObject() : after,
  ))

  const diff = microdiff(beforeForComparison, afterForComparison)

  const changes = diff.filter(change => {
    // Deal with nested ignored fields
    const key = change.path.join('.')
    for (const ignoredField of ignoredFields) {
      if (key === ignoredField || key.startsWith(ignoredField + '.')) {
        return false
      }
    }
    return true
  }).map(change => {
    return <ChangesType>{
      ...change,
      path: change.path.join('.'),
    }
  })
  const hasChanged = changes.length > 0

  return [hasChanged, changes]
}

function resolveAgent(): any {
  const user = RequestContext.currentContext?.req?.user || {}

  return {
    $ref: user.$ref ?? 'System',
    id: Types.ObjectId.createFromHexString(user._id ?? '000000000000000000000000'),
    name: user.username ?? 'system',
  }
}

export function historyPlugin(schema: Schema, options: HistoryPluginOptions) {
  const defaultOptions = {
    auditsModelName: Audits.name,
    ignoredFields: ['metadata'],
  }
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    ignoredFields: [...(defaultOptions.ignoredFields || []), ...(options.ignoredFields || [])],
  }

  const logger = new Logger('HistoryPlugin')

  schema.pre('save', async function () {
    if (this.isNew) {
      this.$locals[HISTORY_PLUGIN_BEFORE_KEY] = null
      return
    }

    const before = await this.model().findById(this._id)
    Logger.verbose(`Audit before state: ${JSON.stringify(before)}`)
    this.$locals[HISTORY_PLUGIN_BEFORE_KEY] = before
  })

  schema.post('save', async function (after: Document | null) {
    const before: Document | null = this.$locals[HISTORY_PLUGIN_BEFORE_KEY] as Document | null
    const [hasChanged, changes] = detectChanges(before, after, mergedOptions)
    logger.verbose(`Audit after state: ${JSON.stringify(after)}`)

    if (!hasChanged) {
      logger.debug(`No significant changes detected for ${mergedOptions.collectionName} ${after?._id ?? before?._id}, skipping audit log.`)
      return
    }

    logger.log(`Creating audit log for ${mergedOptions.collectionName} ${after?._id ?? before?._id}`)
    const agent = resolveAgent()
    const AuditsModel: Model<any> = this.model(mergedOptions.auditsModelName!)
    await AuditsModel.create({
      coll: mergedOptions.collectionName,
      documentId: after?._id ?? before?._id,
      op: before ? AuditOperation.UPDATE : AuditOperation.INSERT,
      agent,
      data: after,
      changes,
      metadata: {
        createdBy: agent.name || 'anonymous',
        createdAt: new Date(),
      },
    })
  })

  schema.pre('findOneAndUpdate', { query: true, document: false }, async function () {
    const before = await this.model.findOne(this.getFilter())
    logger.verbose(`Audit before state: ${JSON.stringify(before)}`)
    this.setOptions({ [HISTORY_PLUGIN_BEFORE_KEY]: before })
  })

  schema.post('findOneAndUpdate', async function (this: Query<any, any>, after: Document | null) {
    const before: Document | null = this.getOptions()[HISTORY_PLUGIN_BEFORE_KEY]
    const [hasChanged, changes] = detectChanges(before, after, mergedOptions)
    logger.verbose(`Audit after state: ${JSON.stringify(after)}`)

    if (!hasChanged) {
      logger.debug(`No significant changes detected for ${mergedOptions.collectionName} ${after?._id ?? before?._id}, skipping audit log.`)
      return
    }

    logger.log(`Creating audit log for ${mergedOptions.collectionName} ${after?._id ?? before?._id}`)
    const agent = resolveAgent()
    const AuditsModel: Model<any> = this.model.db.model(mergedOptions.auditsModelName!)
    await AuditsModel.create({
      coll: mergedOptions.collectionName,
      documentId: after?._id ?? before?._id,
      op: before ? AuditOperation.UPDATE : AuditOperation.INSERT,
      agent,
      data: after,
      changes,
      metadata: {
        createdBy: agent.name || 'anonymous',
        createdAt: new Date(),
      },
    })
  })

  schema.post('findOneAndDelete', async function (res: any) {
    //TODO: handle delete
  })
}
