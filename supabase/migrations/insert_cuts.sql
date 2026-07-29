DO $$
DECLARE
  v_filet_id uuid;
  v_camarao_16_20_id uuid;
  v_sirigado_id uuid;
  v_salmao_id uuid;
  v_camarao_exe_id uuid;
  v_stinco_id uuid;
  v_lagosta_id uuid;
  v_polvo_id uuid;
  v_lagarto_id uuid;
  v_bacalhau_id uuid;
BEGIN
  -- Identifica os IDs das proteínas existentes
  SELECT id INTO v_filet_id FROM proteins WHERE name ILIKE '%FILET MIGNON%' LIMIT 1;
  SELECT id INTO v_camarao_16_20_id FROM proteins WHERE name ILIKE '%CAMARÃO 16/20%' LIMIT 1;
  SELECT id INTO v_sirigado_id FROM proteins WHERE name ILIKE '%SIRIGADO%' LIMIT 1;
  SELECT id INTO v_salmao_id FROM proteins WHERE name ILIKE '%SALMÃO%' LIMIT 1;
  SELECT id INTO v_camarao_exe_id FROM proteins WHERE name ILIKE '%CAMARÃO EXE%' LIMIT 1;
  SELECT id INTO v_stinco_id FROM proteins WHERE name ILIKE '%STINCO%' LIMIT 1;
  SELECT id INTO v_lagosta_id FROM proteins WHERE name ILIKE '%LAGOSTA%' LIMIT 1;
  SELECT id INTO v_polvo_id FROM proteins WHERE name ILIKE '%POLVO%' LIMIT 1;
  SELECT id INTO v_lagarto_id FROM proteins WHERE name ILIKE '%LAGARTO%' LIMIT 1;
  SELECT id INTO v_bacalhau_id FROM proteins WHERE name ILIKE '%BACALHAU%' LIMIT 1;

  -- FILET MIGNON
  IF v_filet_id IS NOT NULL THEN
    INSERT INTO cuts (protein_id, name, gramatura) VALUES
      (v_filet_id, 'SP FILE 200g', 200),
      (v_filet_id, 'SP FILE 180g', 180),
      (v_filet_id, 'SP FILE 500g', 500),
      (v_filet_id, 'Aparas file para molho', 0),
      (v_filet_id, 'Aparas para croquete', 0),
      (v_filet_id, 'Aparas alim. funcionarios', 0),
      (v_filet_id, 'sangue / couro / saco', 0);
  END IF;

  -- CAMARÃO 16/20
  IF v_camarao_16_20_id IS NOT NULL THEN
    INSERT INTO cuts (protein_id, name, gramatura) VALUES
      (v_camarao_16_20_id, 'SP CAMARÃO 180g', 180),
      (v_camarao_16_20_id, 'casca / saco', 0);
  END IF;

  -- SIRIGADO
  IF v_sirigado_id IS NOT NULL THEN
    INSERT INTO cuts (protein_id, name, gramatura) VALUES
      (v_sirigado_id, 'SP SIRIGADO 200g', 200),
      (v_sirigado_id, 'Aparas sirigado alim. fuincionario', 0),
      (v_sirigado_id, 'buxo / aparas com vermes', 0);
  END IF;

  -- SALMÃO
  IF v_salmao_id IS NOT NULL THEN
    INSERT INTO cuts (protein_id, name, gramatura) VALUES
      (v_salmao_id, 'SP SALMÃO 200g', 200),
      (v_salmao_id, 'SP CARPACCIO SALMÃO 100g', 100),
      (v_salmao_id, 'SP CARPACCIO SALMÃO 40g', 40),
      (v_salmao_id, 'SP TARTARE DE SALMÃO 120g', 120),
      (v_salmao_id, 'Aparas para tartare de salmão', 0),
      (v_salmao_id, 'couro de salmão', 0);
  END IF;

  -- CAMARÃO EXE
  IF v_camarao_exe_id IS NOT NULL THEN
    INSERT INTO cuts (protein_id, name, gramatura) VALUES
      (v_camarao_exe_id, 'SP CAMARÃO 120g', 120),
      (v_camarao_exe_id, 'cabeças / casca', 0);
  END IF;

  -- STINCO
  IF v_stinco_id IS NOT NULL THEN
    INSERT INTO cuts (protein_id, name, gramatura) VALUES
      (v_stinco_id, 'SP STINCO 400g', 400),
      (v_stinco_id, 'perca stinco', 0);
  END IF;

  -- LAGOSTA
  IF v_lagosta_id IS NOT NULL THEN
    INSERT INTO cuts (protein_id, name, gramatura) VALUES
      (v_lagosta_id, 'SP LAGOSTA 150g', 150),
      (v_lagosta_id, 'perca lagosta', 0);
  END IF;

  -- POLVO
  IF v_polvo_id IS NOT NULL THEN
    INSERT INTO cuts (protein_id, name, gramatura) VALUES
      (v_polvo_id, 'SP POLVO 150g', 150),
      (v_polvo_id, 'cabeça / saco / agua', 0);
  END IF;

  -- LAGARTO
  IF v_lagarto_id IS NOT NULL THEN
    INSERT INTO cuts (protein_id, name, gramatura) VALUES
      (v_lagarto_id, 'SP CARPACCIO CLÁSSICO 100g', 100),
      (v_lagarto_id, 'SP CARPACCIO CLÁSSICO 40g', 40),
      (v_lagarto_id, 'pele / gordura / nervo / couro', 0);
  END IF;

  -- BACALHAU
  IF v_bacalhau_id IS NOT NULL THEN
    INSERT INTO cuts (protein_id, name, gramatura) VALUES
      (v_bacalhau_id, 'SP BACALHAU 200g', 200);
  END IF;

END $$;
