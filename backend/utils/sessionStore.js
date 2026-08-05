// Centralized session registry.
//
// Tokens are stateless JWTs, but logout needs to invalidate an issued token so
// other clients (e.g. the browser extension) that cached the same session stop
// authenticating. We keep a revocation set keyed by the token's `jti` claim.
// The set is in-memory; it resets on restart, which is acceptable because the
// JWT secret (and therefore every token) is already invalidated on restart when
// JWT_SECRET is not persisted.

const revoked = new Set();

module.exports = {
  revoke(jti) {
    if (jti) revoked.add(jti);
  },
  isRevoked(jti) {
    return Boolean(jti) && revoked.has(jti);
  }
};
