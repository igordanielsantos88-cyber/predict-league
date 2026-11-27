INSERT INTO public.calendar_team_aliases (competition_code, alias, official_name)
VALUES
  ('PD', 'elche', 'elchecf'),
  ('PD', 'atleticomadrid', 'clubatleticodemadrid'),
  ('BL1', 'hamburgo', 'hamburgersv'),
  ('BL1', 'bayern', 'fcbayernmunchen'),
  ('FL1', 'lyon', 'olympiquelyonnais'),
  ('FL1', 'monaco', 'asmonacofc')
ON CONFLICT (competition_code, alias) DO NOTHING;
