import db from '~/lib/db'
import { expect } from 'test/helpers'
import {NotFoundError, ValidationError} from 'objection'
import RootSqlModel from '~/models/root'

class BasicModel extends RootSqlModel {

  static tableName = 'basic'

  static jsonSchema = {
    type: 'object',
    required: ['foo'],
    properties: {
      foo: {type: 'string'},
    }
  }

  static stripFields = ['stripMe']

}

describe('Root SQL Model', function() {

  beforeEach(async function () {

    await db.schema
      .dropTableIfExists('basic')

    await db.schema
      .createTable('basic', (table) => {
        table
          .string('id')
          .primary()
        table
          .string('sid')
          .unique()
        table.enu('status', ['active', 'inactive', 'deleted'])
        table.jsonb('meta')
        table.timestamp('createdAt').defaultTo(db.fn.now())
        table.timestamp('updatedAt').defaultTo(db.fn.now())
        table.string('foo')
      })

    this.model = new BasicModel()

  })

  afterAll(async function() {

    await db.schema
      .dropTableIfExists('basic')

  })

  it('should fail to create when missing required field', function(done) {
    (async () => {

      try {
        await this.model.create()
      } catch (err) {
        expect(err instanceof ValidationError).to.be.true
        expect(err.message).to.equal('foo: is a required property')
        done()
      }

    })()
  })

  it('should fail to create when field is invalid', function(done) {
    (async () => {

      try {
        await this.model.create({foo: []})
      } catch (err) {
        expect(err instanceof ValidationError).to.be.true
        expect(err.message).to.equal('foo: should be string')
        done()
      }

    })()
  })

  it('should fail to create when unexcpeted field is provided', function(done) {
    (async () => {

      try {
        await this.model.create({foo: 'bar', fizz: 'buzz'})
      } catch (err) {
        expect(err instanceof ValidationError).to.be.true
        expect(err.message).to.equal('fizz: is an invalid additional property')
        done()
      }

    })()
  })

  it('should fail to create with multiple validation errors', function(done) {
    (async () => {

      try {
        await this.model.create({fizz: 'buzz'})
      } catch (err) {
        expect(err instanceof ValidationError).to.be.true
        expect(err.message).to.equal(
          'fizz: is an invalid additional property, foo: is a required property'
        )
        done()
      }

    })()
  })

  it('should create', async function() {

    const res = await this.model.create({foo: 'bar'})

    expect(res.foo).to.equal('bar')
    expect(res.id).to.be.a.string
    expect(res.id.length).to.equal(36)
    expect(res.sid).to.be.a.string
    expect(res.sid.length).to.equal(9)
    expect(res.status).to.equal('active')
    expect(res.createdAt).to.be.a.string
    expect(res.updatedAt).to.be.a.string

  })

  it('should fail to get by id when no id provided', function(done) {
    (async () => {

      try {
        await this.model.getById()
      } catch (err) {
        expect(err.message).to.equal('Method requires an ID for lookup')
        done()
      }

    })()
  })

  it('should fail to get by id when id is invalid', function(done) {
    (async () => {

      try {
        await this.model.getById('f4cc6640-b5e3-11e8-b551-9f73efc189f8')
      } catch (err) {
        expect(err instanceof NotFoundError).to.be.true
        done()
      }

    })()
  })

  it('should get by id', async function() {

    const res = await this.model.create({foo: 'bar'})

    const res2 = await this.model.getById(res.id)

    expect(res2.foo).to.equal('bar')
    expect(res2.id).to.be.a.string
    expect(res2.id.length).to.equal(36)
    expect(res2.sid).to.be.a.string
    expect(res2.sid.length).to.equal(9)
    expect(res2.status).to.equal('active')
    expect(res.createdAt).to.be.a.string
    expect(res.updatedAt).to.be.a.string

  })

  it('should fail to get by sid when no sid provided', function(done) {
    (async () => {

      try {
        await this.model.getBySid()
      } catch (err) {
        expect(err.message).to.equal('Method requires a short ID for lookup')
        done()
      }

    })()
  })

  it('should fail to get by sid when sid is invalid', function(done) {
    (async () => {

      try {
        await this.model.getBySid('ZlvpVO')
      } catch (err) {
        expect(err instanceof NotFoundError).to.be.true
        done()
      }

    })()
  })

  it('should get by sid', async function() {

    const res = await this.model.create({foo: 'bar'})

    const res2 = await this.model.getBySid(res.sid)

    expect(res2.foo).to.equal('bar')
    expect(res2.id).to.be.a.string
    expect(res2.id.length).to.equal(36)
    expect(res2.sid).to.be.a.string
    expect(res2.sid.length).to.equal(9)
    expect(res2.status).to.equal('active')
    expect(res.createdAt).to.be.a.string
    expect(res.updatedAt).to.be.a.string

  })

  it('should get by sid by calling get by id with a sid', async function() {

    const res = await this.model.create({foo: 'bar'})

    const res2 = await this.model.getById(res.sid)

    expect(res2.foo).to.equal('bar')
    expect(res2.id).to.be.a.string
    expect(res2.id.length).to.equal(36)
    expect(res2.sid).to.be.a.string
    expect(res2.sid.length).to.equal(9)
    expect(res2.status).to.equal('active')
    expect(res.createdAt).to.be.a.string
    expect(res.updatedAt).to.be.a.string

  })

  it('should get all', async function() {

    const res = await this.model.create({
      foo: 'bar',
      updatedAt: new Date(2018, 0, 0).toISOString()
    })
    const res2 = await this.model.create({
      foo: 'baz',
      updatedAt: new Date(2018, 0, 1).toISOString()
    })

    const res3 = await this.model.getAll()

    expect(res3.length).to.equal(2)
    expect(res3[0].id).to.equal(res2.id)
    expect(res3[1].id).to.equal(res.id)

  })

  it('should get all with ids', async function() {

    const res = await this.model.create({
      foo: 'bar',
      updatedAt: new Date(2018, 0, 0).toISOString()
    })
    await this.model.create({
      foo: 'baz',
      updatedAt: new Date(2018, 0, 1).toISOString()
    })
    const res2 = await this.model.create({
      foo: 'boz',
      updatedAt: new Date(2018, 0, 2).toISOString()
    })

    const res3 = await this.model.getAll([res.id, res2.id])

    expect(res3.length).to.equal(2)
    expect(res3[0].id).to.equal(res2.id)
    expect(res3[1].id).to.equal(res.id)

  })

  it('should get all with filter clause', async function() {

    const res = await this.model.create({
      foo: 'bar',
      updatedAt: new Date(2018, 0, 0).toISOString()
    })
    await this.model.create({
      foo: 'baz',
      updatedAt: new Date(2018, 0, 1).toISOString()
    })
    const res2 = await this.model.create({
      foo: 'bar',
      updatedAt: new Date(2018, 0, 2).toISOString()
    })

    const res3 = await this.model.getAll(null, {
      filter: query => query.where('foo', 'bar')
    })

    expect(res3.length).to.equal(2)
    expect(res3[0].id).to.equal(res2.id)
    expect(res3[1].id).to.equal(res.id)

  })

  it('should get all with asc order dir', async function() {

    const res = await this.model.create({
      foo: 'bar',
      updatedAt: new Date(2018, 0, 0).toISOString()
    })
    const res2 = await this.model.create({
      foo: 'baz',
      updatedAt: new Date(2018, 0, 1).toISOString()
    })

    const res3 = await this.model.getAll(null, {orderDir: 'asc'})

    expect(res3.length).to.equal(2)
    expect(res3[0].id).to.equal(res.id)
    expect(res3[1].id).to.equal(res2.id)

  })

  it('should get all with pagination', async function() {

    const res = await this.model.create({
      foo: 'bar',
      updatedAt: new Date(2018, 0, 0).toISOString()
    })
    const res2 = await this.model.create({
      foo: 'baz',
      updatedAt: new Date(2018, 0, 1).toISOString()
    })

    const res3 = await this.model.getAll(null, {
      pagination: true,
      page: 1,
      limit: 1
    })

    expect(res3.results.length).to.equal(1)
    expect(res3.results[0].id).to.equal(res2.id)

    expect(res3.pagination.pages).to.equal(2)
    expect(res3.pagination.total).to.equal(2)
    expect(res3.pagination.current).to.equal(1)
    expect(res3.pagination.next).to.equal(2)
    expect(res3.pagination.previous).to.be.false

    const res4 = await this.model.getAll(null, {
      pagination: true,
      page: 2,
      limit: 1
    })

    expect(res4.results.length).to.equal(1)
    expect(res4.results[0].id).to.equal(res.id)

    expect(res4.pagination.pages).to.equal(2)
    expect(res4.pagination.total).to.equal(2)
    expect(res4.pagination.current).to.equal(2)
    expect(res4.pagination.next).to.be.false
    expect(res4.pagination.previous).to.equal(1)

  })

  it('should get all with pagination with asc order dir', async function() {

    const res = await this.model.create({
      foo: 'bar',
      updatedAt: new Date(2018, 0, 1).toISOString()
    })
    const res2 = await this.model.create({
      foo: 'baz',
      updatedAt: new Date(2018, 0, 1).toISOString()
    })

    const res3 = await this.model.getAll(null, {
      pagination: true,
      page: 1,
      limit: 1,
      orderDir: 'asc'
    })

    expect(res3.results.length).to.equal(1)
    expect(res3.results[0].id).to.equal(res.id)

    expect(res3.pagination.pages).to.equal(2)
    expect(res3.pagination.total).to.equal(2)
    expect(res3.pagination.current).to.equal(1)
    expect(res3.pagination.next).to.equal(2)
    expect(res3.pagination.previous).to.be.false

    const res4 = await this.model.getAll(null, {
      pagination: true,
      page: 2,
      limit: 1,
      orderDir: 'asc'
    })

    expect(res4.results.length).to.equal(1)
    expect(res4.results[0].id).to.equal(res2.id)

    expect(res4.pagination.pages).to.equal(2)
    expect(res4.pagination.total).to.equal(2)
    expect(res4.pagination.current).to.equal(2)
    expect(res4.pagination.next).to.be.false
    expect(res4.pagination.previous).to.equal(1)

  })

  it('should fail to update by id when no id provided', function(done) {
    (async () => {

      try {
        await this.model.updateById()
      } catch (err) {
        expect(err.message).to.equal('Method requires an ID for lookup')
        done()
      }

    })()
  })

  it('should fail to update by id when id is invalid', function(done) {
    (async () => {

      try {
        await this.model.updateById('f4cc6640-b5e3-11e8-b551-9f73efc189f8', {foo: 'baz'})
      } catch (err) {
        expect(err instanceof NotFoundError).to.be.true
        done()
      }

    })()
  })

  it('should fail to update by id when field is invalid', function(done) {
    (async () => {

      const res = await this.model.create({foo: 'bar'})

      try {
        await this.model.updateById(res.id, {foo: []})
      } catch (err) {
        expect(err instanceof ValidationError).to.be.true
        expect(err.message).to.equal('foo: should be string')
        done()
      }

    })()
  })

  it('should fail to update by id when unexcpeted field is provided', function(done) {
    (async () => {

      const res = await this.model.create({foo: 'bar'})

      try {
        await this.model.updateById(res.id, {fizz: 'buzz'})
      } catch (err) {
        expect(err instanceof ValidationError).to.be.true
        expect(err.message).to.equal('fizz: is an invalid additional property')
        done()
      }

    })()
  })

  it('should update', async function() {

    const res = await this.model.create({foo: 'bar'})

    const res1 = await this.model.updateById(res.id, {foo: 'baz'})

    expect(res1.foo).to.equal('baz')
    expect(res1.id).to.be.a.string
    expect(res1.id.length).to.equal(36)
    expect(res1.sid).to.be.a.string
    expect(res1.sid.length).to.equal(9)
    expect(res1.status).to.equal('active')
    expect(res1.createdAt).to.be.a.string
    expect(res1.updatedAt).to.be.a.string
    expect(res1.updatedAt).to.not.equal(res.updatedAt)

    const res2 = await this.model.getById(res.id)

    expect(res2.foo).to.equal('baz')
    expect(res2.id).to.be.a.string
    expect(res2.id.length).to.equal(36)
    expect(res2.sid).to.be.a.string
    expect(res2.sid.length).to.equal(9)
    expect(res2.status).to.equal('active')
    expect(res2.createdAt).to.be.a.string
    expect(res2.updatedAt).to.be.a.string
    expect(res2.updatedAt).to.not.equal(res.updatedAt)

  })

  it('should fail to delete by id when no id provided', function(done) {
    (async () => {

      try {
        await this.model.deleteById()
      } catch (err) {
        expect(err.message).to.equal('Method requires an ID for lookup')
        done()
      }

    })()
  })

  it('should fail to delete by id when id is invalid', function(done) {
    (async () => {

      try {
        await this.model.deleteById('f4cc6640-b5e3-11e8-b551-9f73efc189f8')
      } catch (err) {
        expect(err instanceof NotFoundError).to.be.true
        done()
      }

    })()
  })

  it('should delete by id', async function() {

    const res = await this.model.create({foo: 'bar'})

    const res1 = await this.model.deleteById(res.id)

    expect(res1.foo).to.equal('bar')
    expect(res1.id).to.be.a.string
    expect(res1.id.length).to.equal(36)
    expect(res1.sid).to.be.a.string
    expect(res1.sid.length).to.equal(9)
    expect(res1.status).to.equal('deleted')
    expect(res1.createdAt).to.be.a.string
    expect(res1.updatedAt).to.be.a.string
    expect(res1.updatedAt).to.not.equal(res.updatedAt)

    const res2 = await this.model.getById(res.id)

    expect(res2.foo).to.equal('bar')
    expect(res2.id).to.be.a.string
    expect(res2.id.length).to.equal(36)
    expect(res2.sid).to.be.a.string
    expect(res2.sid.length).to.equal(9)
    expect(res2.status).to.equal('deleted')
    expect(res2.createdAt).to.be.a.string
    expect(res2.updatedAt).to.be.a.string
    expect(res2.updatedAt).to.not.equal(res.updatedAt)

  })

  it('should get a key value pair', async function() {

    const res1 = await this.model.create({foo: 'bar'})

    expect(res1.foo).to.equal('bar')

    const res2 = await this.model.checkExistence('foo', 'bar')

    expect(res2.exists).to.be.true

  })

  it('should fail to get a key value pair', async function() {

    const res1 = await this.model.create({foo: 'baz'})

    expect(res1.foo).to.equal('baz')

    const res = await this.model.checkExistence('foo', 'bar')

    expect(res.exists).to.be.false

  })

  it('should strip fields defined in baseStripFields/stripFields', async function() {

    const res = await this.model.create({
      foo: 'bar',
      stripMe: 'please',
      __version: '0.1'
    })

    expect(res.foo).to.equal('bar')
    expect(res.stripMe).to.be.undefined
    expect(res.__version).to.be.undefined
    expect(res.id).to.be.a.string
    expect(res.id.length).to.equal(36)
    expect(res.sid).to.be.a.string
    expect(res.sid.length).to.equal(9)
    expect(res.status).to.equal('active')
    expect(res.createdAt).to.be.a.string
    expect(res.updatedAt).to.be.a.string

  })

  describe('Transactions in Root SQL Model', function() {
    it('should create two rows in a transaction', async function() {
      await this.model.transaction(async (trx) => {
        await this.model.create({foo: 'bar'}, {trx})
        await this.model.create({foo: 'baz'}, {trx})
      })

      const res1 = await this.model.getAll()
      expect(res1.length).to.equal(2)
      const res2 = await this.model.checkExistence('foo', 'bar')
      const res3 = await this.model.checkExistence('foo', 'baz')
      expect(res2.exists).to.be.true
      expect(res3.exists).to.be.true
    })

    it('should rollback first create when one fails in a transaction', async function() {
      try {
        await this.model.transaction(async (trx) => {
          await this.model.create({foo: 'bar'}, {trx})
          await this.model.create({foo: 123}, {trx}) // foo should be string
        })
      } catch (err) {
      // make sure 'bar' was not created
        const res1 = await this.model.getAll()
        expect(res1.length).to.equal(0)
        const res2 = await this.model.checkExistence('foo', 'bar')
        expect(res2.exists).to.be.false
      }
    })

    it('should update a document that was created in the same transaction', async function() {
      await this.model.transaction(async (trx) => {
        const row = await this.model.create({foo: 'bar'}, {trx})
        await this.model.updateById(row.id, {foo: 'baz'}, {trx})
      })

      const res1 = await this.model.getAll()
      expect(res1.length).to.equal(1)
      const res2 = await this.model.checkExistence('foo', 'baz')
      expect(res2.exists).to.be.true
    })
  })

})
