-- Record which model produced each embedding so stale/mixed vectors can be detected.
alter table ideas add column if not exists embedding_model text;
alter table ideas add column if not exists embedding_dim int;
