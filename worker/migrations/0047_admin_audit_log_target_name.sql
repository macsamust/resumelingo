-- Adds targetName/targetEmail as denormalized display columns on
-- admin_audit_log, snapshotted at write time the same way adminEmail
-- already is (see AdminAuditLogRepository's doc comments). Needed because
-- several user-targeting actions (most importantly user.delete) log after
-- the target user record no longer exists, so a live join at read time
-- would show blank for exactly the actions that matter most. Nullable and
-- deliberately NOT part of the tamper-evident hash chain (see
-- AdminAuditLogRepository.hashInput) — adding a new field into that chain's
-- input would retroactively change what every historical row's hash should
-- have been, breaking verifyChainIntegrity for the entire existing table.
ALTER TABLE admin_audit_log ADD COLUMN "targetName" TEXT;
ALTER TABLE admin_audit_log ADD COLUMN "targetEmail" TEXT;
