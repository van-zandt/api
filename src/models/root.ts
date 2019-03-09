const logger = require('~/lib/logger')
import { Model, RelationMappings } from 'objection'
import {
  DbErrors, UniqueViolationError, ForeignKeyViolationError,
  CheckViolationError, DataError, DBError
} from 'objection-db-errors'
import shortid from '~/lib/shortid'
import uuid from '~/lib/uuid'

export default abstract class RootModel extends DbErrors(Model) {
  ['constructor']: any // We don't know which constructor has extended the RootModel

  /**
   * Check the existence of a key/value pair. Key should be an indexed column.
   *
   * @public
   * @param {String} key - Key to check
   * @param {String} val - Value to find in key
   */
  async checkExistence(key, val) {

    const row = await this.constructor
      .query()
      .where(key, val)
      .andWhere('status', 'active')
      .first()

    const exists = Boolean(row)

    return exists

  }

  /**
   * For each array of fields on uniqueFields, ensure that a non-deleted row
   * with the same values does not alreay exist.
   *
   * @private
   * @param {String} id Optional ID of the row we are updating
   * @param {Object} pkg The pkg to check unique fields of
   * @param {Function} trx Optional transaction
   */
  async checkUniqueFields(id, pkg, trx) {

    if (this.constructor.uniqueFields.length === 0) {
      return
    }

    if (id) {

      const doc = await this.getById(id, { trx })
      pkg = {
        ...doc,
        ...pkg
      }

    }

    for (const fields of this.constructor.uniqueFields) {
      const whereClause = {}
      let found = false

      for (const field of fields) {

        if (pkg[field]) {
          found = true
        }

        whereClause[field] = pkg[field]

      }

      if (!found) {
        continue
      }

      let query = this.constructor
        .query(trx)
        .where({...whereClause})
        .andWhere('status', '!=', 'deleted')

      if (id) {

        query = query
          .andWhere('id', '!=', id)

      }

      const existing = await query

      if (existing.length > 0) {
        logger.error('Not unqiue')
      }
    }
  }

  /**
   * Clean package before create or update.
   *
   * @private
   * @param {Object} pkg - The pkg being cleaned
   */
  cleanPkg(pkg) {

    this.stripRelatedFields(pkg)

  }

  /**
   * Create a row in the table.
   *
   * @public
   * @param {Object} pkg - Data to be saved
   * @param {Object} options - Options for create
   * @param {String} options.eager - Optional relations to eager load
   * @param {Boolean} options.modifiers - Optional modifier functions for eager
   * @param {Function} options.trx - Optional payload to turn query into transaction
   * @return {Object} The created row
   */
  async create(pkg: any = {}, options: any = {}) {

    pkg.createdAt = pkg.createdAt || new Date().toISOString()
    pkg.id = pkg.id || uuid()
    pkg.sid = pkg.sid || shortid()
    pkg.status = pkg.status || 'active'
    pkg.updatedAt = pkg.updatedAt || new Date().toISOString()

    this.cleanPkg(pkg)
    await this.checkUniqueFields(null, pkg, options.trx)

    try {

      let query = this.constructor
        .query(options.trx)
        .insert(pkg)

      const created = await query

      await this.updateListFieldRelations(created, options)

      if (options.eager) {
        return await this.constructor
          .query(options.trx)
          .findById(created.id)
          .eager(options.eager, options.modifiers)
      }

      for (const field of this.constructor.privateFields) {
        delete created[field]
      }

      return created

    } catch (err) {

      logger.error('Could not create row', {table: this.constructor.tableName, pkg, err})
      throw this.sanitize_error(err)

    }

  }

  /**
   * Get a row by ID.
   * If the provided ID is in fact a short ID, forward to getBySid.
   *
   * @public
   * @param {String} id - ID of the row to fetch
   * @param {Object} options - Options for get by id
   * @param {String} options.eager - Optional relations to eager load
   * @param {Boolean} options.modifiers - Optional modifier functions for eager
   * @param {Function} options.trx - Optional payload to turn query into transaction
   * @return {Object} The fetched row
   */
  async getById(id, options: any = {}) {

    if (!id) {
      throw new Error('Method requires an ID for lookup')
    }

    if (id.length <= 10) {
      return this.getBySid(id, options)
    }

    try {

      let query = this.constructor
        .query(options.trx)
        .findById(id)
        .throwIfNotFound()

      if (options.eager) {
        query = query
          .eager(options.eager, options.modifiers)
      }

      const row = await query

      return row

    } 
    catch (err) {

      logger.error('Could not get row by ID', {table: this.constructor.tableName, id, err})
      throw this.sanitize_error(err)

    }

  }

  /**
   * Get a row by short ID.
   *
   * @public
   * @param {String} sid - Short ID of the row to fetch
   * @param {Object} options - Options for get by id
   * @param {String} options.eager - Optional relations to eager load
   * @param {Function} options.trx - Optional payload to turn query into transaction
   * @return {Object} The fetched row
   */
  async getBySid(sid, options: any = {}) {

    if (!sid) {
      throw new Error('Method requires a short ID for lookup')
    }

    try {

      let query = this.constructor
        .query(options.trx)
        .findOne({sid})
        .throwIfNotFound()

      if (options.eager) {

        query = query
          .eager(options.eager, options.modifiers)

      }

      const row = await query

      return row

    }
    catch (err) {

      logger.error('Could not get row by ID', {table: this.constructor.tableName, sid, err})
      throw this.sanitize_error(err)

    }

  }

  /**
   * Clean errors to make them safe / generic.
   * Errors raised by Objection can potentially include SQL.
   *
   * @private
   * @param {Object} err - Error to sanitize
   */
  sanitize_error(err) {

    if (err instanceof UniqueViolationError) {
      err.message = `Unique constraint ${err.constraint} failed for table ${err.table} and columns ${err.columns}`
    } else if (err instanceof ForeignKeyViolationError) {
      err.message = `Unique constraint ${err.constraint} failed for table ${err.table}`
    } else if (err instanceof CheckViolationError) {
      err.message = `Check constraint ${err.constraint} failed for table ${err.table}`
    } else if (err instanceof DataError) {
      err.message = `Invalid data for table ${this.constructor.tableName}`
    } else if (err instanceof DBError) {
      err.message = `Unknown DB error for table ${this.constructor.tableName}`
    }

    return err

  }

  /**
   * Strip fields that represent relations. If present, Objection seems to be
   * applying the behaviour of `insertGraph`, when I'm only calling `insert`,
   * which means it will try and take those related objects and create rows
   * from them.
   *
   * @private
   * @param {Object} pkg - The pkg to strip fields from
   */
  stripRelatedFields(pkg) {

    if (!this.constructor.relationMappings) {
      return
    }

    for (const relationName of Object.keys(this.constructor.relationMappings)) {
      delete pkg[relationName]
    }

  }

  /**
   * Update any related many-to-many join tables.
   * This works by looking up relation mappings defined on the model that have
   * a `listField` specified. Having a `listField` denotes that there is a
   * field containing an array of IDs which is used to keep the assocated
   * many-to-many join table in sync.
   *
   * @private
   * @param {Object} row - Row to update join tables of
   * @param {Function} options.trx - Optional payload to turn query into transaction
   */
  async updateListFieldRelations(row, options = {}) {

    if (!this.constructor.relationMappings) {
      return
    }

    for (const relationName of Object.keys(this.constructor.relationMappings)) {

      const relationMapping = this.constructor.relationMappings[relationName]

      if (!relationMapping.listField) {
        continue
      }

      await this.updateManyToManyRelation(
        row,
        relationName,
        row[relationMapping.listField],
        options
      )

    }

  }

  /**
   * Update a given related many-to-many join table with a list of ids.
   * What this will do exactly is:
   * 1) "unrelate" the relation, which will remove all entries from the join
   * table where the ID on the left side of the join is the ID of the current
   * row
   * 2) "relate" for each provided ID, which will create new entries in the
   * join table for each [id of given row, id of ids].
   *
   * @private
   * @param {Object} row - Row to update relation of
   * @param {Object} relationName - Name of the relation to update
   * @param {Array<String>} ids - IDs to update the relation with
   * @param {Function} options.trx - Optional payload to turn query into transaction
   */
  async updateManyToManyRelation(row, relationName, ids, options: any = {}) {

    await row.$relatedQuery(relationName, options.trx).unrelate()

    if (!ids) {
      return
    }

    for (const id of ids) {
      await row.$relatedQuery(relationName, options.trx).relate(id)
    }

  }

}
