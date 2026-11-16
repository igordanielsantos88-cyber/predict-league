-- Predict League: alterações já aplicadas manualmente em 16/11/2026.
-- Preserva pontos, posições e nomes históricos.

BEGIN;

ALTER TABLE public.seasons
ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  r record;
  atual record;
  epoca_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.seasons
    WHERE id = '39551899-2032-4884-a87c-ddf4427fa8fb'::uuid
      AND competition_id = '3d0f0048-d5b9-418e-b5f5-57d19782fe92'::uuid
  ) THEN
    RAISE EXCEPTION 'Época de teste não encontrada. Operação cancelada.';
  END IF;

  UPDATE public.seasons
  SET is_test = true
  WHERE id = '39551899-2032-4884-a87c-ddf4427fa8fb'::uuid;

  FOR r IN
    SELECT * FROM (VALUES
      (1, 'Igor',   106, 14),
      (1, 'João',   103, 15),
      (1, 'Inácio', 103, 11),
      (1, 'Oli',    102, 13),
      (1, 'Rui',    100, 11),
      (1, 'Preto',   91,  8),
      (1, 'Miguel',  88, 12),
      (1, 'Rúben',   83,  9),
      (1, 'David',   64,  6),
      (1, 'Gordo',    0,  0),
      (1, 'Diogo',    0,  0),
      (2, 'João',   102, 15),
      (2, 'Igor',   100, 12),
      (2, 'Diogo',   98, 10),
      (2, 'Rui',     96, 11),
      (2, 'Preto',   92,  9),
      (2, 'Inácio',  85, 10),
      (2, 'Oli',     82,  7),
      (2, 'Rúben',   81,  7),
      (2, 'Miguel',  27,  3),
      (2, 'Gordo',    0,  0),
      (2, 'David',    0,  0),
      (3, 'André',   83, 11),
      (3, 'Oli',     82, 10),
      (3, 'Igor',    77,  7),
      (3, 'Preto',   75,  7),
      (3, 'João',    74,  9),
      (3, 'Miguel',  73,  7),
      (3, 'Rúben',   67,  7)
    ) AS dados(epoca, nome, pontos, exatos)
  LOOP
    epoca_id := CASE r.epoca
      WHEN 1 THEN 'aa10f3d2-e8db-4781-b5ed-2bfccbe7dc1b'::uuid
      WHEN 2 THEN '329eea0f-cd27-4f06-9475-e2c91380d482'::uuid
      WHEN 3 THEN '9f116fec-0e9a-4720-ad3a-f85d48ab379d'::uuid
    END;

    SELECT h.id, h.total_points, h.exact_scores
    INTO STRICT atual
    FROM public.hall_of_fame h
    WHERE h.season_id = epoca_id
      AND h.participant_name = r.nome
    FOR UPDATE;

    IF atual.total_points IS DISTINCT FROM r.pontos
       OR atual.exact_scores IS NULL
       OR atual.exact_scores NOT IN (0, r.exatos) THEN
      RAISE EXCEPTION
        'Dados inesperados para % na época %. Operação cancelada.',
        r.nome, r.epoca;
    END IF;

    UPDATE public.hall_of_fame
    SET exact_scores = r.exatos
    WHERE id = atual.id;
  END LOOP;
END;
$$;

COMMIT;
