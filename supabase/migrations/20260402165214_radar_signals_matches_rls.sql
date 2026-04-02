ALTER TABLE radar_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_matches ENABLE ROW LEVEL SECURITY;

-- radar_signals est scopée via company_id -> radar_companies.org_id
DROP POLICY IF EXISTS radar_signals_select ON radar_signals;
CREATE POLICY radar_signals_select ON radar_signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM radar_companies c
      WHERE c.id = company_id
        AND c.org_id = auth.jwt() ->> 'org_id'
    )
  );
DROP POLICY IF EXISTS radar_signals_write ON radar_signals;
CREATE POLICY radar_signals_write ON radar_signals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM radar_companies c
      WHERE c.id = company_id
        AND c.org_id = auth.jwt() ->> 'org_id'
    )
  );

-- radar_matches est scopée via company_id -> radar_companies.org_id
DROP POLICY IF EXISTS radar_matches_select ON radar_matches;
CREATE POLICY radar_matches_select ON radar_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM radar_companies c
      WHERE c.id = company_id
        AND c.org_id = auth.jwt() ->> 'org_id'
    )
  );
DROP POLICY IF EXISTS radar_matches_write ON radar_matches;
CREATE POLICY radar_matches_write ON radar_matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM radar_companies c
      WHERE c.id = company_id
        AND c.org_id = auth.jwt() ->> 'org_id'
    )
  );
