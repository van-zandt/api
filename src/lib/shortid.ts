const nanoid = require('nanoid')

/**
 * Generate a short ID
 *
 * We are using nanoid's default dictionary and a length of 7 characters. At a
 * rate of 50 sids per hour, it would take ~248 days for there to be 1% chance
 * of a collision. With postgres, a collision will fail to save to the
 * database.
 *
 * If looking at modifying the dictionary or sid length, you can use this very
 * handy collision probability tool - https://zelark.github.io/nano-id-cc/
 *
 * @public
 * @return {Object} The generated short ID
 */
export default function shortid() {
  return nanoid(9)
}
