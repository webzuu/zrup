CREATE TABLE IF NOT EXISTS states (
    target CHAR(32),
    target_version CHAR(32),
    rule CHAR(32),
    source CHAR(32),
    source_version CHAR(32)
);

CREATE UNIQUE INDEX IF NOT EXISTS target_version_source ON states(target, target_version, source);
CREATE INDEX IF NOT EXISTS source ON states(source);
CREATE INDEX IF NOT EXISTS target ON states(target);
CREATE INDEX IF NOT EXISTS rule ON states(rule);

CREATE TABLE IF NOT EXISTS artifacts (
    key CHAR(32) PRIMARY KEY,
    artifact_type VARCHAR(96),
    identity VARCHAR(1024)
);

CREATE UNIQUE INDEX IF NOT EXISTS artifact_type_identity ON artifacts(artifact_type, identity);

CREATE TRIGGER IF NOT EXISTS multiple_generating_rules_check BEFORE INSERT ON states
BEGIN
    SELECT RAISE(FAIL, "only one rule can create a particular version of a target")
    FROM states
    WHERE target = NEW.target
    AND target_version = NEW.target_version
    AND rule != NEW.rule;
END;
